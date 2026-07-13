-- Completes the admin business model for products, orders, payments and invoices.

ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'preparing';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'cancelled';

DO $$
BEGIN
  CREATE TYPE public.payment_status AS ENUM ('unpaid', 'partial', 'paid', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.product_status AS ENUM ('active', 'draft', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.product_availability AS ENUM ('available', 'unavailable', 'on_order');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS status public.product_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS availability public.product_availability NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS purchase_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weight numeric,
  ADD COLUMN IF NOT EXISTS volume numeric;

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique
ON public.products (lower(sku))
WHERE sku IS NOT NULL AND trim(sku) <> '';

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_low_stock_threshold_non_negative_check,
  ADD CONSTRAINT products_low_stock_threshold_non_negative_check CHECK (low_stock_threshold >= 0) NOT VALID;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_purchase_price_non_negative_check,
  ADD CONSTRAINT products_purchase_price_non_negative_check CHECK (purchase_price >= 0) NOT VALID;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_weight_non_negative_check,
  ADD CONSTRAINT products_weight_non_negative_check CHECK (weight IS NULL OR weight >= 0) NOT VALID;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_volume_non_negative_check,
  ADD CONSTRAINT products_volume_non_negative_check CHECK (volume IS NULL OR volume >= 0) NOT VALID;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS subtotal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ht numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ttc numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_note text;

UPDATE public.orders
SET subtotal = CASE WHEN subtotal = 0 THEN total ELSE subtotal END,
    total_ht = CASE WHEN total_ht = 0 THEN total ELSE total_ht END,
    total_ttc = CASE WHEN total_ttc = 0 THEN total ELSE total_ttc END,
    payment_status = CASE
      WHEN amount_paid > 0 AND amount_paid < total THEN 'partial'::public.payment_status
      WHEN amount_paid >= total THEN 'paid'::public.payment_status
      WHEN status = 'delivered' THEN 'paid'::public.payment_status
      ELSE payment_status
    END,
    amount_paid = CASE
      WHEN amount_paid = 0 AND status = 'delivered' THEN total
      ELSE amount_paid
    END,
    balance_due = GREATEST(
      CASE WHEN total_ttc = 0 THEN total ELSE total_ttc END -
      CASE WHEN amount_paid = 0 AND status = 'delivered' THEN total ELSE amount_paid END,
      0
    ),
    paid_at = CASE
      WHEN paid_at IS NULL AND status = 'delivered' THEN updated_at
      ELSE paid_at
    END;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_amounts_non_negative_check,
  ADD CONSTRAINT orders_amounts_non_negative_check CHECK (
    subtotal >= 0 AND
    discount_total >= 0 AND
    delivery_fee >= 0 AND
    total_ht >= 0 AND
    tax_total >= 0 AND
    total_ttc >= 0 AND
    amount_paid >= 0 AND
    balance_due >= 0
  ) NOT VALID;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_allowed_check,
  ADD CONSTRAINT orders_payment_method_allowed_check CHECK (
    payment_method IS NULL OR payment_method IN ('cash', 'orange_money', 'wave', 'bank_transfer', 'card', 'other')
  ) NOT VALID;

CREATE OR REPLACE FUNCTION public.create_order_secure(
  p_customer_name text,
  p_email text,
  p_phone text,
  p_address text,
  p_notes text,
  p_items jsonb,
  p_discount_total numeric DEFAULT 0,
  p_delivery_fee numeric DEFAULT 0
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
  v_subtotal numeric := 0;
  v_discount numeric := GREATEST(COALESCE(p_discount_total, 0), 0);
  v_delivery numeric := GREATEST(COALESCE(p_delivery_fee, 0), 0);
  v_total_ht numeric := 0;
  v_tax numeric := 0;
  v_total_ttc numeric := 0;
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
    customer_name, email, phone, address, notes, total, status,
    payment_status, subtotal, discount_total, delivery_fee,
    total_ht, tax_total, total_ttc, amount_paid, balance_due
  )
  VALUES (
    trim(p_customer_name), lower(trim(p_email)), trim(p_phone), trim(p_address),
    nullif(trim(coalesce(p_notes, '')), ''), 0, 'pending',
    'unpaid', 0, v_discount, v_delivery, 0, 0, 0, 0, 0
  )
  RETURNING * INTO v_order;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    IF v_product_id IS NULL OR v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid order item';
    END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = v_product_id
      AND status = 'active'
      AND availability <> 'unavailable'
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found';
    END IF;

    IF v_product.stock < v_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for %', v_product.name;
    END IF;

    v_unit_price := COALESCE(v_product.sale_price, v_product.price);
    v_subtotal := v_subtotal + (v_unit_price * v_quantity);

    UPDATE public.products
    SET stock = stock - v_quantity,
        updated_at = now()
    WHERE id = v_product_id;

    INSERT INTO public.order_items (order_id, product_id, item_name, quantity, price)
    VALUES (v_order.id, v_product_id, v_product.name, v_quantity, v_unit_price);
  END LOOP;

  v_discount := LEAST(v_discount, v_subtotal);
  v_total_ht := GREATEST(v_subtotal - v_discount + v_delivery, 0);
  v_tax := 0;
  v_total_ttc := v_total_ht + v_tax;

  UPDATE public.orders
  SET subtotal = v_subtotal,
      discount_total = v_discount,
      delivery_fee = v_delivery,
      total_ht = v_total_ht,
      tax_total = v_tax,
      total_ttc = v_total_ttc,
      total = v_total_ttc,
      amount_paid = 0,
      balance_due = v_total_ttc,
      updated_at = now()
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_secure(text, text, text, text, text, jsonb, numeric, numeric) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_pos_order_secure(
  p_customer_name text,
  p_email text,
  p_phone text,
  p_address text,
  p_notes text,
  p_items jsonb,
  p_payment_method text DEFAULT 'cash',
  p_amount_paid numeric DEFAULT NULL,
  p_payment_note text DEFAULT NULL
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
  v_subtotal numeric := 0;
  v_total_ttc numeric := 0;
  v_amount_paid numeric := 0;
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

  IF p_payment_method IS NOT NULL AND p_payment_method NOT IN ('cash', 'orange_money', 'wave', 'bank_transfer', 'card', 'other') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  INSERT INTO public.orders (
    customer_name, email, phone, address, notes, total, status,
    payment_status, subtotal, discount_total, delivery_fee,
    total_ht, tax_total, total_ttc, amount_paid, balance_due,
    payment_method, payment_note
  )
  VALUES (
    coalesce(nullif(trim(p_customer_name), ''), 'Client au comptoir'),
    coalesce(nullif(lower(trim(p_email)), ''), 'comptoir@sphere-office.com'),
    coalesce(nullif(trim(p_phone), ''), '0000000000'),
    coalesce(nullif(trim(p_address), ''), 'Vente au comptoir'),
    nullif(trim(coalesce(p_notes, '')), ''),
    0, 'delivered', 'unpaid', 0, 0, 0, 0, 0, 0, 0, 0,
    coalesce(p_payment_method, 'cash'),
    nullif(trim(coalesce(p_payment_note, '')), '')
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
      SELECT * INTO v_product
      FROM public.products
      WHERE id = v_product_id
        AND status = 'active'
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

    INSERT INTO public.order_items (order_id, product_id, item_name, quantity, price)
    VALUES (v_order.id, v_product_id, v_item_name, v_quantity, v_unit_price);

    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  END LOOP;

  v_total_ttc := v_subtotal;
  v_amount_paid := COALESCE(p_amount_paid, v_total_ttc);
  v_amount_paid := LEAST(GREATEST(v_amount_paid, 0), v_total_ttc);

  UPDATE public.orders
  SET subtotal = v_subtotal,
      total_ht = v_total_ttc,
      tax_total = 0,
      total_ttc = v_total_ttc,
      total = v_total_ttc,
      amount_paid = v_amount_paid,
      balance_due = GREATEST(v_total_ttc - v_amount_paid, 0),
      payment_status = CASE
        WHEN v_amount_paid <= 0 THEN 'unpaid'::public.payment_status
        WHEN v_amount_paid < v_total_ttc THEN 'partial'::public.payment_status
        ELSE 'paid'::public.payment_status
      END,
      paid_at = CASE WHEN v_amount_paid >= v_total_ttc THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_pos_order_secure(text, text, text, text, text, jsonb, text, numeric, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
