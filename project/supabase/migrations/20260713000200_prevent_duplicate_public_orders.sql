/*
  Serialize anonymous public checkouts by customer fingerprint and reject a
  second insert in the accidental double-submit window. This complements the
  client-side submission lock and also covers concurrent HTTP retries.
*/

CREATE OR REPLACE FUNCTION public.prevent_duplicate_public_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fingerprint text;
BEGIN
  IF auth.role() <> 'anon' OR NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  v_fingerprint := lower(trim(NEW.email)) || '|' || regexp_replace(coalesce(NEW.phone, ''), '\D', '', 'g');

  PERFORM pg_advisory_xact_lock(hashtextextended(v_fingerprint, 0));

  IF EXISTS (
    SELECT 1
    FROM public.orders existing
    WHERE lower(trim(existing.email)) || '|' || regexp_replace(coalesce(existing.phone, ''), '\D', '', 'g') = v_fingerprint
      AND existing.status = 'pending'
      AND existing.created_at > now() - interval '10 seconds'
  ) THEN
    RAISE EXCEPTION 'Une commande identique vient deja d etre enregistree. Patientez quelques secondes.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_duplicate_public_order() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_prevent_duplicate_public_order ON public.orders;
CREATE TRIGGER orders_prevent_duplicate_public_order
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_public_order();
