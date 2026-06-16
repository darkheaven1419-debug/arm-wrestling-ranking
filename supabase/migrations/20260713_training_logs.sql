CREATE TABLE IF NOT EXISTS training_logs (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, check_in_date DATE NOT NULL DEFAULT CURRENT_DATE, note TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, check_in_date));
ALTER TABLE training_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read training_logs" ON training_logs;
CREATE POLICY "Anyone can read training_logs" ON training_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth users can insert own training_logs" ON training_logs;
CREATE POLICY "Auth users can insert own training_logs" ON training_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
