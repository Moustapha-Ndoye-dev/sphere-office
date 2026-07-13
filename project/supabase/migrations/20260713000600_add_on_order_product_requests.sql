/*
  Publish made-to-order products without turning them into financial orders.

  Important compatibility rule: CREATE OR REPLACE VIEW may only append columns.
  The first 15 columns below therefore keep the exact historical order of
  public.public_products; availability is deliberately appended as column 16.
*/

BEGIN;

CREATE OR REPLACE VIEW public.public_products AS
SELECT
  p.id,
  p.name,
  p.slug,
  p.description,
  p.price,
  p.sale_price,
  p.sku,
  p.is_featured,
  p.category_id,
  p.images,
  p.created_at,
  p.updated_at,
  (
    p.availability = 'available'
    AND p.stock > 0
    AND COALESCE(p.sale_price, p.price) > 0
  ) AS is_in_stock,
  c.name AS category_name,
  c.slug AS category_slug,
  p.availability
FROM public.products p
JOIN public.categories c ON c.id = p.category_id
WHERE p.status = 'active'
  AND (
    p.availability = 'on_order'
    OR (
      p.availability = 'available'
      AND COALESCE(p.sale_price, p.price) > 0
    )
  );

REVOKE ALL ON public.public_products FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_products TO anon, authenticated;

DO $$
BEGIN
  CREATE TYPE public.product_request_status AS ENUM (
    'pending',
    'contacted',
    'quoted',
    'confirmed',
    'cancelled',
    'completed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.product_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  product_reference text,
  quantity integer NOT NULL,
  customer_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  notes text,
  status public.product_request_status NOT NULL DEFAULT 'pending',
  idempotency_key uuid NOT NULL UNIQUE,
  idempotency_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_requests_quantity_check CHECK (quantity BETWEEN 1 AND 100),
  CONSTRAINT product_requests_product_name_check CHECK (char_length(trim(product_name)) BETWEEN 1 AND 300),
  CONSTRAINT product_requests_customer_name_check CHECK (char_length(trim(customer_name)) BETWEEN 2 AND 120),
  CONSTRAINT product_requests_phone_check CHECK (char_length(trim(phone)) BETWEEN 7 AND 32),
  CONSTRAINT product_requests_address_check CHECK (char_length(trim(address)) BETWEEN 5 AND 500),
  CONSTRAINT product_requests_notes_check CHECK (notes IS NULL OR char_length(notes) <= 2000),
  CONSTRAINT product_requests_fingerprint_check CHECK (char_length(idempotency_fingerprint) = 32)
);

CREATE INDEX IF NOT EXISTS product_requests_status_created_at_idx
  ON public.product_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS product_requests_product_id_idx
  ON public.product_requests (product_id);

CREATE OR REPLACE FUNCTION public.set_product_request_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_product_request_updated_at ON public.product_requests;
CREATE TRIGGER set_product_request_updated_at
BEFORE UPDATE ON public.product_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_product_request_updated_at();

ALTER TABLE public.product_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_requests_staff_select" ON public.product_requests;
DROP POLICY IF EXISTS "product_requests_staff_update" ON public.product_requests;

CREATE POLICY "product_requests_staff_select"
ON public.product_requests
FOR SELECT
TO authenticated
USING (public.is_staff());

CREATE POLICY "product_requests_staff_update"
ON public.product_requests
FOR UPDATE
TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

REVOKE ALL ON TABLE public.product_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.product_requests TO authenticated;
GRANT UPDATE (status) ON TABLE public.product_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.create_product_request_secure(
  p_product_id uuid,
  p_quantity integer,
  p_customer_name text,
  p_phone text,
  p_address text,
  p_notes text,
  p_idempotency_key uuid
)
RETURNS public.product_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_request public.product_requests%ROWTYPE;
  v_customer_name text := trim(coalesce(p_customer_name, ''));
  v_phone text := trim(coalesce(p_phone, ''));
  v_address text := trim(coalesce(p_address, ''));
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
  v_fingerprint text;
BEGIN
  IF p_product_id IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Produit ou cle d''idempotence invalide';
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quantite invalide';
  END IF;

  IF char_length(v_customer_name) < 2 OR char_length(v_customer_name) > 120 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Nom client invalide';
  END IF;

  IF char_length(v_phone) < 7 OR char_length(v_phone) > 32 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Telephone invalide';
  END IF;

  IF char_length(v_address) < 5 OR char_length(v_address) > 500 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Adresse invalide';
  END IF;

  IF v_notes IS NOT NULL AND char_length(v_notes) > 2000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Notes trop longues';
  END IF;

  v_fingerprint := md5(jsonb_build_object(
    'product_id', p_product_id,
    'quantity', p_quantity,
    'customer_name', v_customer_name,
    'phone', v_phone,
    'address', v_address,
    'notes', v_notes
  )::text);

  SELECT *
  INTO v_request
  FROM public.product_requests
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_request.idempotency_fingerprint <> v_fingerprint THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Cle d''idempotence deja utilisee pour une autre demande';
    END IF;
    RETURN v_request;
  END IF;

  SELECT p.*
  INTO v_product
  FROM public.products p
  WHERE p.id = p_product_id
    AND p.status = 'active'
    AND p.availability = 'on_order'
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Produit sur commande indisponible';
  END IF;

  INSERT INTO public.product_requests (
    product_id,
    product_name,
    product_reference,
    quantity,
    customer_name,
    phone,
    address,
    notes,
    idempotency_key,
    idempotency_fingerprint
  )
  VALUES (
    v_product.id,
    v_product.name,
    nullif(trim(coalesce(v_product.sku, '')), ''),
    p_quantity,
    v_customer_name,
    v_phone,
    v_address,
    v_notes,
    p_idempotency_key,
    v_fingerprint
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING * INTO v_request;

  IF NOT FOUND THEN
    SELECT *
    INTO v_request
    FROM public.product_requests
    WHERE idempotency_key = p_idempotency_key;

    IF v_request.id IS NULL OR v_request.idempotency_fingerprint <> v_fingerprint THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Cle d''idempotence deja utilisee pour une autre demande';
    END IF;
  END IF;

  RETURN v_request;
END;
$$;

REVOKE ALL ON FUNCTION public.create_product_request_secure(
  uuid, integer, text, text, text, text, uuid
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_product_request_secure(
  uuid, integer, text, text, text, text, uuid
) TO anon, authenticated;

COMMIT;
