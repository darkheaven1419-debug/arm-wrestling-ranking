-- Events table for competition calendar
CREATE TABLE IF NOT EXISTS events (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title         TEXT NOT NULL,
  event_date    DATE NOT NULL,
  location      TEXT,
  description   TEXT,
  weight_classes TEXT[],
  poster_url    TEXT,
  contact_info  TEXT,
  created_by    UUID,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone read events" ON events FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins insert events" ON events FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins update events" ON events FOR UPDATE USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins delete events" ON events FOR DELETE USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Battle records table for head-to-head match tracking
CREATE TABLE IF NOT EXISTS battle_records (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  winner_id     BIGINT NOT NULL,
  loser_id      BIGINT NOT NULL,
  hand          TEXT NOT NULL CHECK (hand IN ('左手', '右手')),
  event_name    TEXT,
  notes         TEXT,
  recorded_by   UUID,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE battle_records ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone read battle_records" ON battle_records FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Auth users insert battle_records" ON battle_records FOR INSERT WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins delete battle_records" ON battle_records FOR DELETE USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Articles table for technique/training content
CREATE TABLE IF NOT EXISTS articles (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  category      TEXT DEFAULT 'other' CHECK (category IN ('technique', 'training', 'nutrition', 'gear', 'other')),
  author_id     UUID,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone read articles" ON articles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins insert articles" ON articles FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins update articles" ON articles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins delete articles" ON articles FOR DELETE USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add video_urls column to athletes
DO $$ BEGIN
  ALTER TABLE athletes ADD COLUMN IF NOT EXISTS video_urls JSONB DEFAULT '[]';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
