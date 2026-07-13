/*
  Grants admin access to ablayediawo1@gmail.com when the Supabase Auth user
  already exists. If no Auth user exists yet, create/invite the user from
  Supabase Auth first, then rerun this migration or the UPDATE/INSERT block.
  No password is stored in source control.
*/

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = 'ablayediawo1@gmail.com'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Create or invite ablayediawo1@gmail.com in Supabase Auth, then rerun this migration to attach the admin role.';
    RETURN;
  END IF;

  UPDATE public.profiles
  SET role = 'admin',
      user_id = COALESCE(user_id, v_user_id),
      updated_at = now()
  WHERE lower(login) = 'ablayediawo1@gmail.com';

  IF NOT FOUND THEN
    INSERT INTO public.profiles (user_id, login, mdp, role)
    VALUES (v_user_id, 'ablayediawo1@gmail.com', '', 'admin')
    ON CONFLICT (user_id) DO UPDATE
    SET login = EXCLUDED.login,
        role = 'admin',
        updated_at = now();
  END IF;
END $$;
