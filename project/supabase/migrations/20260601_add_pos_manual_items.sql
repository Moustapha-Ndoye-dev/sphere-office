-- Allows staff to create counter sales with an editable price and optional
-- free-form items while keeping storefront checkout price-controlled.

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS item_name text;

CREATE OR REPLACE FUNCTION public.create_pos_order_secure(
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
  v_item_name text;
  v_quantity integer;
  v_unit_price numeric;
  v_total numeric := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND role IN ('superadmin', 'admin', 'cashier')
  ) THEN
    RAISE EXCEPTION 'Staff access required';
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
    coalesce(nullif(trim(p_customer_name), ''), 'Client au comptoir'),
    coalesce(nullif(lower(trim(p_email)), ''), 'comptoir@sphere-office.com'),
    coalesce(nullif(trim(p_phone), ''), '0000000000'),
    coalesce(nullif(trim(p_address), ''), 'Vente au comptoir'),
    nullif(trim(coalesce(p_notes, '')), ''),
    0,
    'delivered'
  )
  RETURNING * INTO v_order;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := nullif(v_item->>'product_id', '')::uuid;
    v_item_name := nullif(trim(v_item->>'item_name'), '');
    v_quantity := (v_item->>'quantity')::integer;
    v_unit_price := (v_item->>'unit_price')::numeric;

    IF v_quantity IS NULL OR v_quantity <= 0 OR v_unit_price IS NULL OR v_unit_price < 0 THEN
      RAISE EXCEPTION 'Invalid POS item';
    END IF;

    IF v_product_id IS NOT NULL THEN
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

      v_item_name := coalesce(v_item_name, v_product.name);

      UPDATE public.products
      SET stock = stock - v_quantity,
          updated_at = now()
      WHERE id = v_product_id;
    ELSIF v_item_name IS NULL THEN
      RAISE EXCEPTION 'Manual item name is required';
    END IF;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      item_name,
      quantity,
      price
    )
    VALUES (
      v_order.id,
      v_product_id,
      v_item_name,
      v_quantity,
      v_unit_price
    );

    v_total := v_total + (v_unit_price * v_quantity);
  END LOOP;

  UPDATE public.orders
  SET total = v_total,
      updated_at = now()
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_pos_order_secure(text, text, text, text, text, jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
