CREATE TABLE IF NOT EXISTS match_records (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, winner_id BIGINT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE, loser_id BIGINT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE, winner_score INT NOT NULL DEFAULT 3, loser_score INT NOT NULL DEFAULT 0, event_name TEXT, match_date DATE NOT NULL DEFAULT CURRENT_DATE, weight_class TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
ALTER TABLE match_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read match_records" ON match_records;
CREATE POLICY "Anyone can read match_records" ON match_records FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert match_records" ON match_records;
CREATE POLICY "Admins can insert match_records" ON match_records FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Admins can delete match_records" ON match_records;
CREATE POLICY "Admins can delete match_records" ON match_records FOR DELETE USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

ALTER TABLE athletes ADD COLUMN IF NOT EXISTS elo_score INT DEFAULT 1000;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS total_matches INT DEFAULT 0;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS total_wins INT DEFAULT 0;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS total_losses INT DEFAULT 0;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS max_streak INT DEFAULT 0;

CREATE OR REPLACE FUNCTION update_elo_and_stats() RETURNS TRIGGER AS $$
DECLARE we INT; le INT; ew FLOAT; el FLOAT; K INT:=32;
BEGIN
  SELECT elo_score INTO we FROM athletes WHERE id=NEW.winner_id;
  SELECT elo_score INTO le FROM athletes WHERE id=NEW.loser_id;
  ew:=1.0/(1.0+POWER(10,(le-we)/400.0)); el:=1.0-ew;
  UPDATE athletes SET elo_score=we+ROUND(K*(1-ew)), total_matches=total_matches+1, total_wins=total_wins+1, current_streak=CASE WHEN current_streak>0 THEN current_streak+1 ELSE 1 END, max_streak=GREATEST(max_streak,CASE WHEN current_streak>0 THEN current_streak+1 ELSE 1 END) WHERE id=NEW.winner_id;
  UPDATE athletes SET elo_score=le+ROUND(K*(0-el)), total_matches=total_matches+1, total_losses=total_losses+1, current_streak=CASE WHEN current_streak<0 THEN current_streak-1 ELSE -1 END WHERE id=NEW.loser_id;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_match_elo ON match_records;
CREATE TRIGGER trg_match_elo AFTER INSERT ON match_records FOR EACH ROW EXECUTE FUNCTION update_elo_and_stats();
