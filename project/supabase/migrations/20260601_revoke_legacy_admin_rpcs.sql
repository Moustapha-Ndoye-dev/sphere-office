/*
  Close legacy data exposure and remove obsolete SECURITY DEFINER entry points.
  User administration now goes through the authenticated server API only.
*/

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(public.current_user_role() IN ('admin', 'cashier'), false)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(public.current_user_role() = 'admin', false)
$$;

DROP FUNCTION IF EXISTS public.create_user_with_profile(text, text, text);
DROP FUNCTION IF EXISTS public.delete_user_with_profile(uuid);
DROP FUNCTION IF EXISTS public.admin_confirm_user(uuid);
DROP FUNCTION IF EXISTS public.get_all_auth_users();
DROP FUNCTION IF EXISTS public.query_all_users();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS tracking_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS orders_tracking_token_key
ON public.orders (tracking_token);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_customer_name_length_check') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_customer_name_length_check CHECK (char_length(trim(customer_name)) BETWEEN 1 AND 160) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_email_length_check') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_email_length_check CHECK (char_length(email) <= 320) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_phone_length_check') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_phone_length_check CHECK (char_length(phone) <= 40) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_address_length_check') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_address_length_check CHECK (char_length(address) BETWEEN 1 AND 1000) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_notes_length_check') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_notes_length_check CHECK (char_length(coalesce(notes, '')) <= 2000) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_total_non_negative_check') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_total_non_negative_check CHECK (total >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_quantity_check') THEN
    ALTER TABLE public.order_items ADD CONSTRAINT order_items_quantity_check CHECK (quantity BETWEEN 1 AND 1000) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_price_check') THEN
    ALTER TABLE public.order_items ADD CONSTRAINT order_items_price_check CHECK (price >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_name_length_check') THEN
    ALTER TABLE public.order_items ADD CONSTRAINT order_items_name_length_check CHECK (char_length(coalesce(item_name, '')) <= 300) NOT VALID;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.enforce_order_item_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.order_items WHERE order_id = NEW.order_id) >= 100 THEN
    RAISE EXCEPTION 'Order cannot contain more than 100 items';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_order_item_limit_trigger ON public.order_items;
CREATE TRIGGER enforce_order_item_limit_trigger
BEFORE INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.enforce_order_item_limit();

CREATE OR REPLACE FUNCTION public.get_order_tracking(
  p_order_id uuid,
  p_tracking_token uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
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
    'created_at', orders.created_at,
    'notes', orders.notes,
    'items', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', order_items.id,
            'quantity', order_items.quantity,
            'price', order_items.price,
            'item_name', order_items.item_name,
            'product', CASE
              WHEN products.id IS NULL THEN NULL
              ELSE jsonb_build_object('name', products.name, 'images', products.images)
            END
          )
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

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles',
        'orders',
        'order_items',
        'notifications',
        'invoices',
        'promotions',
        'promotion_products',
        'site_settings',
        'products',
        'categories',
        'reviews'
      )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  END LOOP;
END
$$;

CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_admin_write"
ON public.profiles FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "orders_staff_select"
ON public.orders FOR SELECT TO authenticated
USING (public.is_staff());

CREATE POLICY "orders_staff_update"
ON public.orders FOR UPDATE TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

CREATE POLICY "order_items_staff_select"
ON public.order_items FOR SELECT TO authenticated
USING (public.is_staff());

CREATE POLICY "notifications_staff_all"
ON public.notifications FOR ALL TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

CREATE POLICY "invoices_staff_select"
ON public.invoices FOR SELECT TO authenticated
USING (public.is_staff());

CREATE POLICY "promotions_admin_all"
ON public.promotions FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "promotion_products_admin_all"
ON public.promotion_products FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "site_settings_public_select"
ON public.site_settings FOR SELECT TO public
USING (true);

CREATE POLICY "site_settings_admin_write"
ON public.site_settings FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "products_public_select"
ON public.products FOR SELECT TO public
USING (true);

CREATE POLICY "products_admin_write"
ON public.products FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "categories_public_select"
ON public.categories FOR SELECT TO public
USING (true);

CREATE POLICY "categories_admin_write"
ON public.categories FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "reviews_public_approved_select"
ON public.reviews FOR SELECT TO public
USING (is_approved = true OR public.is_admin());

CREATE POLICY "reviews_public_insert_pending"
ON public.reviews FOR INSERT TO public
WITH CHECK (
  is_approved IS DISTINCT FROM true
  AND rating BETWEEN 1 AND 5
  AND char_length(trim(customer_name)) BETWEEN 1 AND 120
  AND char_length(coalesce(comment, '')) <= 2000
);

CREATE POLICY "reviews_admin_all"
ON public.reviews FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

REVOKE ALL ON TABLE public.profiles, public.orders, public.order_items, public.notifications, public.invoices, public.promotions, public.promotion_products FROM anon;
GRANT SELECT ON TABLE public.site_settings, public.products, public.categories, public.reviews TO anon;
GRANT INSERT ON TABLE public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.orders TO authenticated;
GRANT SELECT ON TABLE public.order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notifications TO authenticated;
GRANT SELECT ON TABLE public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.promotions, public.promotion_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.site_settings, public.products, public.categories, public.reviews TO authenticated;

DO $$
BEGIN
  IF to_regprocedure('public.generate_invoice_number()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.generate_invoice_number() FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO authenticated;
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
