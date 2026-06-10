UPDATE athletes SET rank_score_left = rank_score WHERE rank_score IS NOT NULL AND rank_score_left IS NULL;
