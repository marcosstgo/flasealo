-- Add optional gallery password to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS gallery_password text DEFAULT NULL;
