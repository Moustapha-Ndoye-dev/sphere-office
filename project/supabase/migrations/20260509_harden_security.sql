/*
  # Harden production security

  Removes permissive policies, centralizes role checks, and moves checkout into
  one atomic database operation that recalculates prices and locks stock rows.
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

CREATE OR REPLACE FUNCTION public.create_order_secure(
  p_customer_name text,
  p_email text,
  p_phone text,
  p_address text,
  p_notes text,
  p_items jsonb
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_product_id uuid;
  v_quantity integer;
  v_unit_price numeric;
  v_total numeric := 0;
BEGIN
  IF trim(coalesce(p_customer_name, '')) = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;

  IF trim(coalesce(p_email, '')) !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Valid email is required';
  END IF;

  IF trim(coalesce(p_phone, '')) = '' OR trim(coalesce(p_address, '')) = '' THEN
    RAISE EXCEPTION 'Phone and address are required';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  INSERT INTO public.orders (
    customer_name,
    email,
    phone,
    address,
    notes,
    total,
    status
  )
  VALUES (
    trim(p_customer_name),
    lower(trim(p_email)),
    trim(p_phone),
    trim(p_address),
    nullif(trim(coalesce(p_notes, '')), ''),
    0,
    'pending'
  )
  RETURNING * INTO v_order;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    IF v_product_id IS NULL OR v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid order item';
    END IF;

    SELECT *
    INTO v_product
    FROM public.products
    WHERE id = v_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found';
    END IF;

    IF v_product.stock < v_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for %', v_product.name;
    END IF;

    v_unit_price := COALESCE(v_product.sale_price, v_product.price);
    v_total := v_total + (v_unit_price * v_quantity);

    UPDATE public.products
    SET stock = stock - v_quantity,
        updated_at = now()
    WHERE id = v_product_id;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      quantity,
      price
    )
    VALUES (
      v_order.id,
      v_product_id,
      v_quantity,
      v_unit_price
    );
  END LOOP;

  UPDATE public.orders
  SET total = v_total,
      updated_at = now()
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_secure(text, text, text, text, text, jsonb) TO anon, authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_public_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_auth_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_delete" ON public.profiles;

CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_admin_insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "profiles_admin_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "profiles_admin_delete"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "products_public_select" ON public.products;
DROP POLICY IF EXISTS "products_staff_write" ON public.products;
CREATE POLICY "products_public_select"
ON public.products
FOR SELECT
TO public
USING (true);

CREATE POLICY "products_staff_write"
ON public.products
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "categories_public_select" ON public.categories;
DROP POLICY IF EXISTS "categories_staff_write" ON public.categories;
CREATE POLICY "categories_public_select"
ON public.categories
FOR SELECT
TO public
USING (true);

CREATE POLICY "categories_staff_write"
ON public.categories
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "orders_staff_select" ON public.orders;
DROP POLICY IF EXISTS "orders_staff_update" ON public.orders;
CREATE POLICY "orders_staff_select"
ON public.orders
FOR SELECT
TO authenticated
USING (public.is_staff());

CREATE POLICY "orders_staff_update"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "order_items_staff_select" ON public.order_items;
CREATE POLICY "order_items_staff_select"
ON public.order_items
FOR SELECT
TO authenticated
USING (public.is_staff());

DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "Reviews can be created by anyone" ON public.reviews;
DROP POLICY IF EXISTS "reviews_public_approved_select" ON public.reviews;
DROP POLICY IF EXISTS "reviews_public_insert_pending" ON public.reviews;
DROP POLICY IF EXISTS "reviews_admin_all" ON public.reviews;

CREATE POLICY "reviews_public_approved_select"
ON public.reviews
FOR SELECT
TO public
USING (is_approved = true OR public.is_admin());

CREATE POLICY "reviews_public_insert_pending"
ON public.reviews
FOR INSERT
TO public
WITH CHECK (is_approved IS DISTINCT FROM true);

CREATE POLICY "reviews_admin_all"
ON public.reviews
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "product_images_public_select" ON storage.objects;
DROP POLICY IF EXISTS "product_images_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_admin_delete" ON storage.objects;

CREATE POLICY "product_images_public_select"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'products');

CREATE POLICY "product_images_admin_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products' AND public.is_admin());

CREATE POLICY "product_images_admin_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'products' AND public.is_admin())
WITH CHECK (bucket_id = 'products' AND public.is_admin());

CREATE POLICY "product_images_admin_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'products' AND public.is_admin());
