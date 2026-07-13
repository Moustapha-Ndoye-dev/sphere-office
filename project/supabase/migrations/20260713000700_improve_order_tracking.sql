/*
  Make post-order tracking reliable and auditable.
  - staff status changes go through one atomic RPC;
  - invalid backward transitions are rejected server-side;
  - every status change receives a timestamped history entry;
  - the public tracking RPC exposes fulfillment dates and history without
    granting direct access to orders or history.
*/

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS estimated_delivery_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_status_changed_at timestamptz;

UPDATE public.orders
SET last_status_changed_at = COALESCE(updated_at, created_at, now())
WHERE last_status_changed_at IS NULL;

ALTER TABLE public.orders
  ALTER COLUMN last_status_changed_at SET DEFAULT now(),
  ALTER COLUMN last_status_changed_at SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status public.order_status,
  new_status public.order_status NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text,
  note text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_status_history_actor_name_check
    CHECK (actor_name IS NULL OR char_length(actor_name) <= 254),
  CONSTRAINT order_status_history_note_check
    CHECK (note IS NULL OR char_length(note) <= 1000)
);

CREATE INDEX IF NOT EXISTS order_status_history_order_changed_idx
  ON public.order_status_history (order_id, changed_at DESC);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_status_history_staff_select" ON public.order_status_history;
CREATE POLICY "order_status_history_staff_select"
ON public.order_status_history
FOR SELECT
TO authenticated
USING (public.is_staff());

REVOKE ALL ON TABLE public.order_status_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.order_status_history TO authenticated;

INSERT INTO public.order_status_history (
  order_id,
  old_status,
  new_status,
  actor_name,
  note,
  changed_at
)
SELECT
  orders.id,
  NULL,
  orders.status,
  'Historique importe',
  'Etat present lors de l''activation du suivi horodate',
  COALESCE(orders.last_status_changed_at, orders.updated_at, orders.created_at, now())
FROM public.orders
WHERE NOT EXISTS (
  SELECT 1
  FROM public.order_status_history history
  WHERE history.order_id = orders.id
);

CREATE OR REPLACE FUNCTION public.record_initial_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.order_status_history (
    order_id,
    old_status,
    new_status,
    actor_id,
    actor_name,
    note,
    changed_at
  )
  VALUES (
    NEW.id,
    NULL,
    NEW.status,
    auth.uid(),
    CASE WHEN auth.uid() IS NULL THEN 'Commande en ligne' ELSE 'Equipe Sphere Office' END,
    'Commande enregistree',
    COALESCE(NEW.last_status_changed_at, NEW.created_at, now())
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_record_initial_status ON public.orders;
CREATE TRIGGER orders_record_initial_status
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.record_initial_order_status();

REVOKE ALL ON FUNCTION public.record_initial_order_status() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_order_status_secure(
  p_order_id uuid,
  p_status public.order_status,
  p_estimated_delivery_at timestamptz DEFAULT NULL,
  p_update_estimate boolean DEFAULT false
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_updated public.orders%ROWTYPE;
  v_actor_name text;
  v_recipient_email text;
  v_status_changed boolean;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Acces refuse';
  END IF;

  IF p_order_id IS NULL OR p_status IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Commande ou statut invalide';
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Commande introuvable';
  END IF;

  v_status_changed := v_order.status IS DISTINCT FROM p_status;

  IF v_status_changed AND NOT (
    (v_order.status = 'pending' AND p_status IN ('confirmed', 'cancelled'))
    OR (v_order.status = 'confirmed' AND p_status IN ('preparing', 'cancelled'))
    OR (v_order.status = 'preparing' AND p_status IN ('shipped', 'cancelled'))
    OR (v_order.status = 'shipped' AND p_status IN ('delivered', 'cancelled'))
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = format('Transition de statut interdite: %s vers %s', v_order.status, p_status);
  END IF;

  IF p_update_estimate
    AND p_estimated_delivery_at IS NOT NULL
    AND p_estimated_delivery_at < v_order.created_at
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'La date estimee precede la commande';
  END IF;

  SELECT COALESCE(NULLIF(trim(profiles.login), ''), 'Equipe Sphere Office')
  INTO v_actor_name
  FROM public.profiles
  WHERE profiles.user_id = auth.uid()
  LIMIT 1;

  v_actor_name := COALESCE(v_actor_name, 'Equipe Sphere Office');

  UPDATE public.orders
  SET status = p_status,
      estimated_delivery_at = CASE
        WHEN p_update_estimate THEN p_estimated_delivery_at
        ELSE v_order.estimated_delivery_at
      END,
      last_status_changed_at = CASE
        WHEN v_status_changed THEN now()
        ELSE v_order.last_status_changed_at
      END,
      updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_updated;

  IF v_status_changed THEN
    INSERT INTO public.order_status_history (
      order_id,
      old_status,
      new_status,
      actor_id,
      actor_name,
      changed_at
    )
    VALUES (
      v_updated.id,
      v_order.status,
      v_updated.status,
      auth.uid(),
      v_actor_name,
      v_updated.last_status_changed_at
    );

    SELECT NULLIF(trim(site_settings.location_email), '')
    INTO v_recipient_email
    FROM public.site_settings
    LIMIT 1;

    INSERT INTO public.notifications (
      type,
      title,
      content,
      recipient_email,
      is_read,
      metadata
    )
    VALUES (
      'order_status_changed',
      'Statut commande modifie',
      format(
        '%s a change le statut de la commande #%s de %s a %s.',
        v_actor_name,
        left(v_updated.id::text, 8),
        v_order.status,
        v_updated.status
      ),
      COALESCE(v_recipient_email, 'admin@sphere-office.com'),
      false,
      jsonb_build_object(
        'order_id', v_updated.id,
        'change_kind', 'order_status',
        'old_status', v_order.status,
        'new_status', v_updated.status,
        'actor_id', auth.uid(),
        'actor_name', v_actor_name,
        'changed_at', v_updated.last_status_changed_at
      )
    );
  END IF;

  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.update_order_status_secure(
  uuid, public.order_status, timestamptz, boolean
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.update_order_status_secure(
  uuid, public.order_status, timestamptz, boolean
) TO authenticated;

REVOKE UPDATE ON TABLE public.orders FROM authenticated;
GRANT UPDATE (
  payment_status,
  payment_method,
  amount_paid,
  balance_due,
  paid_at,
  payment_note,
  updated_at
) ON TABLE public.orders TO authenticated;

CREATE OR REPLACE FUNCTION public.get_order_tracking(
  p_order_id uuid,
  p_tracking_token uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT jsonb_build_object(
    'id', orders.id,
    'customer_name', orders.customer_name,
    'email', orders.email,
    'phone', orders.phone,
    'address', orders.address,
    'total', orders.total,
    'status', orders.status,
    'payment_status', orders.payment_status,
    'amount_paid', orders.amount_paid,
    'balance_due', orders.balance_due,
    'created_at', orders.created_at,
    'updated_at', orders.updated_at,
    'last_status_changed_at', orders.last_status_changed_at,
    'estimated_delivery_at', orders.estimated_delivery_at,
    'notes', orders.notes,
    'status_history', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', history.id,
            'old_status', history.old_status,
            'new_status', history.new_status,
            'changed_at', history.changed_at,
            'note', history.note
          )
          ORDER BY history.changed_at DESC
        )
        FROM public.order_status_history history
        WHERE history.order_id = orders.id
      ),
      '[]'::jsonb
    ),
    'items', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', order_items.id,
            'quantity', order_items.quantity,
            'price', order_items.price,
            'item_name', order_items.item_name,
            'item_reference', order_items.item_reference,
            'product', CASE
              WHEN products.id IS NULL THEN NULL
              ELSE jsonb_build_object('name', products.name, 'images', products.images)
            END
          )
          ORDER BY order_items.id
        )
        FROM public.order_items
        LEFT JOIN public.products ON products.id = order_items.product_id
        WHERE order_items.order_id = orders.id
      ),
      '[]'::jsonb
    )
  )
  FROM public.orders
  WHERE orders.id = p_order_id
    AND orders.tracking_token = p_tracking_token
$$;

REVOKE ALL ON FUNCTION public.get_order_tracking(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_tracking(uuid, uuid) TO anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
