-- Fixes live SQL blockers found during the full app review.
-- Apply this in Supabase SQL editor or with `supabase db push`.

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

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text := to_char(now(), 'YYYY');
  v_next_number integer;
BEGIN
  SELECT COALESCE(
    MAX(NULLIF(regexp_replace(public.invoices.invoice_number, '^INV-' || v_year || '-', ''), '')::integer),
    0
  ) + 1
  INTO v_next_number
  FROM public.invoices
  WHERE public.invoices.invoice_number LIKE 'INV-' || v_year || '-%';

  RETURN 'INV-' || v_year || '-' || lpad(v_next_number::text, 5, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO authenticated;
