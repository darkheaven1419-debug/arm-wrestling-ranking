DO $$ BEGIN
  CREATE POLICY "Admins can update admin_users" ON admin_users FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
