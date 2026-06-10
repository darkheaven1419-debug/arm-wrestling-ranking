CREATE OR REPLACE FUNCTION get_user_id_by_email(target_email TEXT)
RETURNS TEXT AS $$
DECLARE uid UUID;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = target_email;
  IF uid IS NULL THEN RETURN 'error: user not found'; END IF;
  RETURN uid::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
