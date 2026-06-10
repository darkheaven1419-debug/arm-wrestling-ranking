CREATE OR REPLACE FUNCTION list_auth_users()
RETURNS TABLE(user_id UUID, email TEXT)
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY SELECT u.id, u.email::TEXT FROM auth.users u ORDER BY u.created_at DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION list_auth_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_auth_users() TO authenticated;
