-- Add new event fields
ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_fee TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS prizes TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS contact_person TEXT;
