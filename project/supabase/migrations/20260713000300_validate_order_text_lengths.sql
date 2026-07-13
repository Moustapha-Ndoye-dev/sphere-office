/*
  Original order text constraints as first applied remotely.

  This migration is retained unchanged as historical evidence. A later,
  uniquely versioned migration removes the blocking lower bounds without
  rewriting this applied migration.
*/

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_customer_name_length_check,
  DROP CONSTRAINT IF EXISTS orders_email_length_check,
  DROP CONSTRAINT IF EXISTS orders_phone_length_check,
  DROP CONSTRAINT IF EXISTS orders_address_length_check,
  DROP CONSTRAINT IF EXISTS orders_notes_length_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_customer_name_length_check CHECK (char_length(customer_name) BETWEEN 2 AND 120) NOT VALID,
  ADD CONSTRAINT orders_email_length_check CHECK (char_length(email) <= 254) NOT VALID,
  ADD CONSTRAINT orders_phone_length_check CHECK (char_length(phone) <= 30) NOT VALID,
  ADD CONSTRAINT orders_address_length_check CHECK (char_length(address) BETWEEN 4 AND 500) NOT VALID,
  ADD CONSTRAINT orders_notes_length_check CHECK (notes IS NULL OR char_length(notes) <= 2000) NOT VALID;
