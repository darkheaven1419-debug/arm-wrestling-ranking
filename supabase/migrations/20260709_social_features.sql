-- athlete_views: track page views for trending calculation
CREATE TABLE IF NOT EXISTS athlete_views (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  athlete_id  BIGINT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  viewer_ip   TEXT,
  user_id     UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_athlete_views_athlete_date ON athlete_views (athlete_id, created_at);
ALTER TABLE athlete_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert athlete_views" ON athlete_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read athlete_views" ON athlete_views FOR SELECT USING (true);

-- comments: polymorphic comments for events and training_locations
CREATE TABLE IF NOT EXISTS comments (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('event', 'training_location')),
  target_id   BIGINT NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_target ON comments (target_type, target_id, created_at DESC);
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Auth users can insert comments" ON comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- likes: polymorphic likes for events and training_locations
CREATE TABLE IF NOT EXISTS likes (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('event', 'training_location')),
  target_id   BIGINT NOT NULL,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (target_type, target_id, user_id)
);
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Auth users can toggle likes" ON likes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can unlike" ON likes FOR DELETE USING (auth.uid() = user_id);

-- Ensure is_admin function exists for admin delete policy on comments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    CREATE FUNCTION is_admin() RETURNS boolean AS $$
      SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid());
    $$ LANGUAGE sql SECURITY DEFINER STABLE;
  END IF;
END $$;
