/*
  Remove database-level minimum lengths that block updates to valid historical
  orders, while retaining every upper bound. Public order creation keeps its
  business minimums in create_order_secure().

  The migration is explicitly transactional and aborts before changing any
  constraint if an existing row exceeds a proposed upper bound.
*/

BEGIN;

LOCK TABLE public.orders IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  v_over_limit_count bigint;
BEGIN
  SELECT count(*)
  INTO v_over_limit_count
  FROM public.orders
  WHERE char_length(customer_name) > 120
     OR char_length(email) > 254
     OR char_length(phone) > 30
     OR char_length(address) > 500
     OR (notes IS NOT NULL AND char_length(notes) > 2000);

  IF v_over_limit_count <> 0 THEN
    RAISE EXCEPTION '% existing orders exceed the proposed text limits', v_over_limit_count;
  END IF;
END;
$$;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_customer_name_length_check,
  DROP CONSTRAINT IF EXISTS orders_email_length_check,
  DROP CONSTRAINT IF EXISTS orders_phone_length_check,
  DROP CONSTRAINT IF EXISTS orders_address_length_check,
  DROP CONSTRAINT IF EXISTS orders_notes_length_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_customer_name_length_check CHECK (char_length(customer_name) <= 120) NOT VALID,
  ADD CONSTRAINT orders_email_length_check CHECK (char_length(email) <= 254) NOT VALID,
  ADD CONSTRAINT orders_phone_length_check CHECK (char_length(phone) <= 30) NOT VALID,
  ADD CONSTRAINT orders_address_length_check CHECK (char_length(address) <= 500) NOT VALID,
  ADD CONSTRAINT orders_notes_length_check CHECK (notes IS NULL OR char_length(notes) <= 2000) NOT VALID;

ALTER TABLE public.orders VALIDATE CONSTRAINT orders_customer_name_length_check;
ALTER TABLE public.orders VALIDATE CONSTRAINT orders_email_length_check;
ALTER TABLE public.orders VALIDATE CONSTRAINT orders_phone_length_check;
ALTER TABLE public.orders VALIDATE CONSTRAINT orders_address_length_check;
ALTER TABLE public.orders VALIDATE CONSTRAINT orders_notes_length_check;

DO $$
DECLARE
  v_constraint_count integer;
BEGIN
  SELECT count(*)
  INTO v_constraint_count
  FROM pg_constraint
  WHERE conrelid = 'public.orders'::regclass
    AND conname IN (
      'orders_customer_name_length_check',
      'orders_email_length_check',
      'orders_phone_length_check',
      'orders_address_length_check',
      'orders_notes_length_check'
    )
    AND contype = 'c'
    AND convalidated;

  IF v_constraint_count <> 5 THEN
    RAISE EXCEPTION 'Expected 5 order text constraints, found %', v_constraint_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND conname IN ('orders_customer_name_length_check', 'orders_address_length_check')
      AND pg_get_constraintdef(oid) ~* 'BETWEEN|>='
  ) THEN
    RAISE EXCEPTION 'A blocking lower-bound constraint is still present';
  END IF;
END;
$$;

COMMIT;
