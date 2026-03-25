/*
  # Add thumbnail support for faster gallery loading

  1. Changes
    - Add `thumbnail_url` column to photos table to store compressed preview images
    - Add index on thumbnail_url for faster queries
  
  2. Performance Impact
    - Gallery will load thumbnails (~50-100KB) instead of full images (2-5MB+)
    - Expected 10-20x faster initial gallery load time
    - Full resolution images only loaded when user clicks to view
*/

-- Add thumbnail_url column to store compressed preview images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photos' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE photos ADD COLUMN thumbnail_url text;
  END IF;
END $$;

-- Add index for faster thumbnail queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_photos_thumbnail_url'
  ) THEN
    CREATE INDEX idx_photos_thumbnail_url ON photos(thumbnail_url) WHERE thumbnail_url IS NOT NULL;
  END IF;
END $$;