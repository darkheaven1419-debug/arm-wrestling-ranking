CREATE OR REPLACE FUNCTION add_admin_with_name(target_email TEXT, admin_name TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE target_uid UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin') THEN
    RETURN 'error: only super_admin';
  END IF;
  SELECT id INTO target_uid FROM auth.users WHERE email = target_email;
  IF target_uid IS NULL THEN RETURN 'error: user not found'; END IF;
  INSERT INTO admin_users (user_id, role, display_name) VALUES (target_uid, 'admin', admin_name)
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin', display_name = COALESCE(admin_name, admin_users.display_name);
  RETURN 'ok';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
