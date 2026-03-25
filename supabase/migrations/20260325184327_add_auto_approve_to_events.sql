/*
  # Add auto-approve functionality to events

  1. Changes
    - Add `auto_approve` boolean column to events table
    - Default to false (requires manual approval)
    - Allows event creators to bypass moderation queue
  
  2. Security
    - No RLS changes needed (existing policies cover this column)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'auto_approve'
  ) THEN
    ALTER TABLE events ADD COLUMN auto_approve boolean DEFAULT false;
  END IF;
END $$;