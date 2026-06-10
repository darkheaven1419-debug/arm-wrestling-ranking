CREATE OR REPLACE FUNCTION list_auth_users()
RETURNS TABLE(user_id UUID, email TEXT) AS $$
BEGIN
  RETURN QUERY SELECT u.id, u.email FROM auth.users u ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
