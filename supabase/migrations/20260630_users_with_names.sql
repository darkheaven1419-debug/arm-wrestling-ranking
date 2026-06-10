CREATE OR REPLACE FUNCTION list_users_with_athletes()
RETURNS TABLE(user_id UUID, email TEXT, athlete_name TEXT, athlete_contact TEXT)
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email::TEXT, a.name, a.contact
  FROM auth.users u
  LEFT JOIN athletes a ON a.user_id = u.id AND a.status = 'approved'
  ORDER BY a.name IS NULL, a.name, u.created_at DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION list_users_with_athletes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_users_with_athletes() TO authenticated;
