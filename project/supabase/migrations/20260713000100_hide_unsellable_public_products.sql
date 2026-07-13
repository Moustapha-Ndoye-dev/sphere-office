/*
  Keep products with missing or non-positive effective prices out of the public
  catalogue. The secure checkout RPC already rejects those products; exposing
  them publicly created an action that could never complete.

  M23 and bafc are known zero-price, made-to-order catalogue records. Preserve
  their prices and data, and align their availability with that business state.
*/

UPDATE public.products
SET availability = 'on_order',
    updated_at = now()
WHERE slug IN ('M23', 'bafc')
  AND COALESCE(sale_price, price, 0) <= 0
  AND availability <> 'on_order';

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
  (p.stock > 0) AS is_in_stock,
  c.name AS category_name,
  c.slug AS category_slug
FROM public.products p
JOIN public.categories c ON c.id = p.category_id
WHERE p.status = 'active'
  AND p.availability <> 'unavailable'
  AND COALESCE(p.sale_price, p.price) > 0;

REVOKE ALL ON public.public_products FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_products TO anon, authenticated;
