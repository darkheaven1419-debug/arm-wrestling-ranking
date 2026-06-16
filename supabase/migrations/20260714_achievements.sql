CREATE TABLE IF NOT EXISTS user_achievements (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, achievement_type TEXT NOT NULL, earned_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, achievement_type));
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read user_achievements" ON user_achievements;
CREATE POLICY "Anyone can read user_achievements" ON user_achievements FOR SELECT USING (true);
