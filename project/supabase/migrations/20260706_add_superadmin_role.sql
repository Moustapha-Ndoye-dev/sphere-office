/*
  Add a superadmin role for sensitive user administration.

  - superadmin: can manage Auth users through the server API and has all admin RLS access
  - admin: keeps normal back-office access
  - cashier: keeps POS/staff access

  Required fixed roles:
  - youneshachami9@gmail.com: superadmin
  - ibrahimadiawo582@gmail.com: superadmin
  - ablayediawo1@gmail.com: admin
*/

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('superadmin', 'admin', 'cashier'));

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(public.current_user_role() IN ('superadmin', 'admin', 'cashier'), false)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(public.current_user_role() IN ('superadmin', 'admin'), false)
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(public.current_user_role() = 'superadmin', false)
$$;

CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_requested_role text;
  v_role text;
BEGIN
  v_email := lower(COALESCE(NEW.email, ''));
  v_requested_role := NULLIF(NEW.raw_app_meta_data->>'role', '');

  v_role := CASE
    WHEN v_email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com') THEN 'superadmin'
    WHEN v_email = 'ablayediawo1@gmail.com' THEN 'admin'
    WHEN v_requested_role IN ('superadmin', 'admin', 'cashier') THEN v_requested_role
    ELSE 'cashier'
  END;

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
    VALUES (NEW.id, NEW.email, '', v_role)
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

DO $$
DECLARE
  v_record record;
  v_role text;
BEGIN
  FOR v_record IN
    SELECT id, lower(email) AS email
    FROM auth.users
    WHERE lower(email) IN (
      'youneshachami9@gmail.com',
      'ibrahimadiawo582@gmail.com',
      'ablayediawo1@gmail.com'
    )
  LOOP
    v_role := CASE
      WHEN v_record.email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com') THEN 'superadmin'
      ELSE 'admin'
    END;

    UPDATE public.profiles
    SET role = v_role,
        user_id = COALESCE(user_id, v_record.id),
        updated_at = now()
    WHERE lower(login) = v_record.email OR user_id = v_record.id;

    IF NOT FOUND THEN
      INSERT INTO public.profiles (user_id, login, mdp, role)
      VALUES (v_record.id, v_record.email, '', v_role)
      ON CONFLICT (user_id) DO UPDATE
      SET login = EXCLUDED.login,
          role = EXCLUDED.role,
          updated_at = now();
    END IF;
  END LOOP;
END $$;
