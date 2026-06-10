ALTER TABLE athletes ALTER COLUMN rank_score SET DEFAULT NULL;
UPDATE athletes SET rank_score = NULL WHERE rank_score = 0;
