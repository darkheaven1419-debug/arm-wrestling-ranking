ALTER TABLE athletes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE OR REPLACE FUNCTION add_admin_by_uid(target_uid UUID, admin_name TEXT DEFAULT NULL)
RETURNS TEXT AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin') THEN
    RETURN 'error: only super_admin';
  END IF;
  INSERT INTO admin_users (user_id, role, display_name) VALUES (target_uid, 'admin', admin_name)
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin', display_name = COALESCE(admin_name, admin_users.display_name);
  RETURN 'ok';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
