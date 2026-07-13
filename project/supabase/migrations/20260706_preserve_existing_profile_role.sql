/*
  Prevent auth.users updates from downgrading existing staff profiles.
  The previous trigger recalculated the role from raw_app_meta_data on every
  auth user update and defaulted to cashier when no role metadata was present.
*/

CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_role text;
BEGIN
  v_email := lower(COALESCE(NEW.email, ''));

  v_role := COALESCE(
    NULLIF(NEW.raw_app_meta_data->>'role', ''),
    CASE
      WHEN v_email IN (
        'youneshachami9@gmail.com',
        'ibrahimadiawo582@gmail.com'
      ) THEN 'superadmin'
      WHEN v_email = 'ablayediawo1@gmail.com' THEN 'admin'
      ELSE 'cashier'
    END
  );

  IF v_email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com') THEN
    v_role := 'superadmin';
  ELSIF v_email = 'ablayediawo1@gmail.com' THEN
    v_role := 'admin';
  ELSIF v_role NOT IN ('superadmin', 'admin', 'cashier') THEN
    v_role := 'cashier';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    UPDATE public.profiles
    SET login = COALESCE(NULLIF(NEW.email, ''), login),
        role = CASE
          WHEN v_email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com') THEN 'superadmin'
          WHEN v_email = 'ablayediawo1@gmail.com' THEN 'admin'
          ELSE COALESCE(public.profiles.role, v_role)
        END,
        updated_at = now()
    WHERE user_id = NEW.id;
  ELSE
    INSERT INTO public.profiles (user_id, login, mdp, role)
    VALUES (
      NEW.id,
      NEW.email,
      '',
      v_role
    )
    ON CONFLICT (user_id) DO UPDATE
    SET login = EXCLUDED.login,
        role = CASE
          WHEN v_email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com') THEN 'superadmin'
          WHEN v_email = 'ablayediawo1@gmail.com' THEN 'admin'
          ELSE COALESCE(public.profiles.role, EXCLUDED.role)
        END,
        updated_at = now();
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erreur lors de la creation/mise a jour du profil: %', SQLERRM;
    RETURN NEW;
END;
$$;
