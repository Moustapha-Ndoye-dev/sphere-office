/*
  Store a frozen optional item reference on order_items and print it on invoices.

  Catalog orders use products.sku when available.
  POS manual items use p_items[].item_reference when provided.
*/

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS item_reference text;

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
  v_order public.orders%ROWTYPE;
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_quantity integer;
  v_unit_price numeric;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_delivery numeric := GREATEST(COALESCE(p_delivery_fee, 0), 0);
  v_total numeric := 0;
  v_client_fingerprint text;
  v_duplicate_count integer := 0;
BEGIN
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

  v_client_fingerprint := lower(trim(p_email)) || '|' || regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  SELECT count(*) INTO v_duplicate_count
  FROM public.orders
  WHERE lower(trim(email)) || '|' || regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_client_fingerprint
    AND status = 'pending'
    AND created_at > now() - interval '90 seconds';

  IF v_duplicate_count >= 3 THEN
    RAISE EXCEPTION 'Trop de commandes en peu de temps. Reessayez dans quelques instants.';
  END IF;

  INSERT INTO public.orders (
    customer_name, email, phone, address, notes, total, status,
    payment_status, subtotal, discount_total, delivery_fee,
    total_ht, tax_total, total_ttc, amount_paid, balance_due
  )
  VALUES (
    trim(p_customer_name), lower(trim(p_email)), trim(p_phone), trim(p_address), nullif(trim(coalesce(p_notes, '')), ''),
    0, 'pending',
    'unpaid', 0, 0, v_delivery,
    0, 0, 0, 0, 0
  )
  RETURNING * INTO v_order;

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
  v_order public.orders%ROWTYPE;
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_quantity integer;
  v_unit_price numeric;
  v_item_name text;
  v_item_reference text;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_amount_paid numeric := 0;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Acces caisse refuse';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION 'Articles invalides';
  END IF;

  IF p_payment_method NOT IN ('cash', 'card', 'transfer', 'mobile_money', 'check', 'other') THEN
    RAISE EXCEPTION 'Methode de paiement invalide';
  END IF;

  INSERT INTO public.orders (
    customer_name, email, phone, address, notes, total, status,
    payment_status, subtotal, discount_total, delivery_fee,
    total_ht, tax_total, total_ttc, amount_paid, balance_due,
    payment_method, payment_note
  )
  VALUES (
    trim(coalesce(nullif(p_customer_name, ''), 'Client au comptoir')),
    lower(trim(coalesce(nullif(p_email, ''), 'comptoir@sphere-office.com'))),
    trim(coalesce(nullif(p_phone, ''), '0000000000')),
    trim(coalesce(nullif(p_address, ''), 'Vente au comptoir')),
    nullif(trim(coalesce(p_notes, '')), ''),
    0, 'delivered',
    'unpaid', 0, 0, 0,
    0, 0, 0, 0, 0,
    p_payment_method, nullif(trim(coalesce(p_payment_note, '')), '')
  )
  RETURNING * INTO v_order;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := (v_item->>'quantity')::integer;
    v_item_reference := nullif(trim(coalesce(v_item->>'item_reference', '')), '');

    IF v_quantity <= 0 OR v_quantity > 100 THEN
      RAISE EXCEPTION 'Quantite invalide';
    END IF;

    IF (v_item->>'product_id') IS NOT NULL AND (v_item->>'product_id') <> '' THEN
      SELECT * INTO v_product
      FROM public.products
      WHERE id = (v_item->>'product_id')::uuid
        AND status = 'active'
        AND availability <> 'unavailable'
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Produit indisponible en caisse';
      END IF;

      IF v_product.stock < v_quantity THEN
        RAISE EXCEPTION 'Stock insuffisant pour %', v_product.name;
      END IF;

      v_unit_price := COALESCE(v_product.sale_price, v_product.price);
      v_item_name := v_product.name;
      v_item_reference := COALESCE(v_item_reference, nullif(trim(coalesce(v_product.sku, '')), ''));

      UPDATE public.products
      SET stock = stock - v_quantity,
          updated_at = now()
      WHERE id = v_product.id;
    ELSE
      v_item_name := trim(coalesce(v_item->>'item_name', ''));
      v_unit_price := (v_item->>'unit_price')::numeric;

      IF length(v_item_name) < 2 THEN
        RAISE EXCEPTION 'Designation article manuel invalide';
      END IF;
    END IF;

    IF v_unit_price <= 0 THEN
      RAISE EXCEPTION 'Prix article invalide';
    END IF;

    INSERT INTO public.order_items (order_id, product_id, item_name, item_reference, quantity, price)
    VALUES (
      v_order.id,
      NULLIF(v_item->>'product_id', '')::uuid,
      v_item_name,
      v_item_reference,
      v_quantity,
      v_unit_price
    );

    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  END LOOP;

  v_total := v_subtotal;
  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Total caisse invalide';
  END IF;

  v_amount_paid := LEAST(GREATEST(COALESCE(p_amount_paid, v_total), 0), v_total);

  UPDATE public.orders
  SET subtotal = v_subtotal,
      discount_total = 0,
      delivery_fee = 0,
      total_ht = v_total,
      tax_total = 0,
      total_ttc = v_total,
      total = v_total,
      amount_paid = v_amount_paid,
      balance_due = GREATEST(v_total - v_amount_paid, 0),
      payment_status = CASE
        WHEN v_amount_paid <= 0 THEN 'unpaid'::public.payment_status
        WHEN v_amount_paid < v_total THEN 'partial'::public.payment_status
        ELSE 'paid'::public.payment_status
      END,
      paid_at = CASE WHEN v_amount_paid >= v_total THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_pos_order_secure(text, text, text, text, text, jsonb, text, numeric, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
