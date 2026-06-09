DROP POLICY IF EXISTS "Admins can read admin_users" ON admin_users;
CREATE POLICY "Authenticated users can read admin_users" ON admin_users FOR SELECT USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS admin_applications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admin_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert applications" ON admin_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own applications" ON admin_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all applications" ON admin_applications FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));
CREATE POLICY "Super admins can update applications" ON admin_applications FOR UPDATE USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "Users can delete own rejected" ON admin_applications FOR DELETE USING (auth.uid() = user_id AND status = 'rejected');
