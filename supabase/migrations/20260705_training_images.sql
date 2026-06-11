-- Support multiple images per training location
ALTER TABLE training_locations ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';
ALTER TABLE training_locations ADD COLUMN IF NOT EXISTS cover_index INTEGER DEFAULT 0;
