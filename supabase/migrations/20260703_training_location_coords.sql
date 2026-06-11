-- Add coordinate fields to training_locations for map display
ALTER TABLE training_locations ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE training_locations ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
