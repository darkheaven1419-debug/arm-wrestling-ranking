CREATE TABLE IF NOT EXISTS error_logs (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message     TEXT,
  stack       TEXT,
  url         TEXT,
  user_agent  TEXT,
  user_id     UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert error_logs" ON error_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can read error_logs" ON error_logs FOR SELECT USING (
  auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);
