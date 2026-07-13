/*
  Replace customer/time-window duplicate detection with request idempotency.

  Each public checkout attempt supplies a UUID. Concurrent or later retries of
  the same payload return the first order, while a reused UUID with a different
  payload is rejected. Distinct UUIDs remain distinct legitimate orders.
*/

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS idempotency_key uuid,
  ADD COLUMN IF NOT EXISTS idempotency_fingerprint text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_unique
ON public.orders (idempotency_key);

COMMENT ON COLUMN public.orders.idempotency_key IS
  'Client-generated UUID used to make public checkout retries idempotent.';

COMMENT ON COLUMN public.orders.idempotency_fingerprint IS
  'Server-generated fingerprint used to reject reuse of an idempotency key with a different payload.';

DROP TRIGGER IF EXISTS orders_prevent_duplicate_public_order ON public.orders;
DROP FUNCTION IF EXISTS public.prevent_duplicate_public_order();

CREATE OR REPLACE FUNCTION public.create_order_secure(
  p_customer_name text,
  p_email text,
  p_phone text,
  p_address text,
  p_notes text,
  p_items jsonb,
  p_idempotency_key uuid,
  p_discount_total numeric DEFAULT 0,
  p_delivery_fee numeric DEFAULT 0
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_quantity integer;
  v_unit_price numeric;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_delivery numeric := GREATEST(COALESCE(p_delivery_fee, 0), 0);
  v_total numeric := 0;
  v_request_fingerprint text;
BEGIN
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Cle d idempotence requise';
  END IF;

  IF length(trim(coalesce(p_customer_name, ''))) < 2 THEN
    RAISE EXCEPTION 'Nom client invalide';
  END IF;

  IF coalesce(p_email, '') !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'Email invalide';
  END IF;

  IF length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 8 THEN
    RAISE EXCEPTION 'Telephone invalide';
  END IF;

  IF length(trim(coalesce(p_address, ''))) < 4 THEN
    RAISE EXCEPTION 'Adresse invalide';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Articles invalides';
  END IF;

  IF COALESCE(p_discount_total, 0) <> 0 THEN
    RAISE EXCEPTION 'Remise non autorisee depuis le checkout public';
  END IF;

  v_request_fingerprint := md5(concat_ws(
    E'\x1f',
    trim(p_customer_name),
    lower(trim(p_email)),
    regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'),
    trim(p_address),
    trim(coalesce(p_notes, '')),
    p_items::text,
    COALESCE(p_discount_total, 0)::text,
    v_delivery::text
  ));

  INSERT INTO public.orders (
    customer_name, email, phone, address, notes, total, status,
    payment_status, subtotal, discount_total, delivery_fee,
    total_ht, tax_total, total_ttc, amount_paid, balance_due,
    idempotency_key, idempotency_fingerprint
  )
  VALUES (
    trim(p_customer_name), lower(trim(p_email)), trim(p_phone), trim(p_address), nullif(trim(coalesce(p_notes, '')), ''),
    0, 'pending',
    'unpaid', 0, 0, v_delivery,
    0, 0, 0, 0, 0,
    p_idempotency_key, v_request_fingerprint
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING * INTO v_order;

  IF v_order.id IS NULL THEN
    SELECT *
    INTO v_order
    FROM public.orders
    WHERE idempotency_key = p_idempotency_key;

    IF v_order.id IS NULL THEN
      RAISE EXCEPTION 'Impossible de recuperer la commande idempotente';
    END IF;

    IF v_order.idempotency_fingerprint IS DISTINCT FROM v_request_fingerprint THEN
      RAISE EXCEPTION 'Cle d idempotence reutilisee avec un contenu different';
    END IF;

    RETURN v_order;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF NOT (v_item ? 'product_id') OR NOT (v_item ? 'quantity') THEN
      RAISE EXCEPTION 'Article invalide';
    END IF;

    v_quantity := (v_item->>'quantity')::integer;
    IF v_quantity <= 0 OR v_quantity > 100 THEN
      RAISE EXCEPTION 'Quantite invalide';
    END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::uuid
      AND status = 'active'
      AND availability <> 'unavailable'
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produit indisponible';
    END IF;

    IF v_product.stock < v_quantity THEN
      RAISE EXCEPTION 'Stock insuffisant pour %', v_product.name;
    END IF;

    v_unit_price := COALESCE(v_product.sale_price, v_product.price);
    IF v_unit_price <= 0 THEN
      RAISE EXCEPTION 'Prix produit invalide';
    END IF;

    INSERT INTO public.order_items (order_id, product_id, item_name, item_reference, quantity, price)
    VALUES (v_order.id, v_product.id, v_product.name, nullif(trim(coalesce(v_product.sku, '')), ''), v_quantity, v_unit_price);

    UPDATE public.products
    SET stock = stock - v_quantity,
        updated_at = now()
    WHERE id = v_product.id;

    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  END LOOP;

  v_total := GREATEST(v_subtotal - v_discount + v_delivery, 0);

  IF v_subtotal <= 0 OR v_total <= 0 THEN
    RAISE EXCEPTION 'Total commande invalide';
  END IF;

  UPDATE public.orders
  SET subtotal = v_subtotal,
      discount_total = v_discount,
      delivery_fee = v_delivery,
      total_ht = v_total,
      tax_total = 0,
      total_ttc = v_total,
      total = v_total,
      amount_paid = 0,
      balance_due = v_total,
      updated_at = now()
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_secure(text, text, text, text, text, jsonb, uuid, numeric, numeric)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_secure(text, text, text, text, text, jsonb, uuid, numeric, numeric)
TO anon, authenticated;

REVOKE ALL ON FUNCTION public.create_order_secure(text, text, text, text, text, jsonb, numeric, numeric)
FROM PUBLIC, anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
