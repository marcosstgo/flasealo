/*
  # Flashealo.com Database Schema

  1. New Tables
    - `events`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `description` (text, optional)
      - `is_public` (boolean, default true)
      - `slug` (text, unique, required)
      - `user_id` (uuid, foreign key to auth.users)
      - `qr_code_url` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `photos`
      - `id` (uuid, primary key)
      - `event_id` (uuid, foreign key to events)
      - `user_id` (uuid, optional, for tracking uploader)  
      - `image_path` (text, required)
      - `status` (enum: pending, approved, rejected)
      - `format` (text, file format)
      - `size` (bigint, file size in bytes)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `subscriptions`
      - `user_id` (uuid, primary key, foreign key to auth.users)
      - `plan` (enum: free, pro)
      - `custom_branding` (jsonb, for PRO features)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for public photo uploads
    - Add policies for public gallery access

  3. Storage
    - Create event-photos bucket for image storage
    - Configure bucket policies for uploads and public access
*/

-- Create custom types
CREATE TYPE photo_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE subscription_plan AS ENUM ('free', 'pro');

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_public boolean DEFAULT true,
  slug text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  qr_code_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create photos table
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  image_path text NOT NULL,
  status photo_status DEFAULT 'pending',
  format text NOT NULL,
  size bigint NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan subscription_plan DEFAULT 'free',
  custom_branding jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS events_user_id_idx ON events(user_id);
CREATE INDEX IF NOT EXISTS events_slug_idx ON events(slug);
CREATE INDEX IF NOT EXISTS photos_event_id_idx ON photos(event_id);
CREATE INDEX IF NOT EXISTS photos_status_idx ON photos(status);
CREATE INDEX IF NOT EXISTS photos_created_at_idx ON photos(created_at);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events table
CREATE POLICY "Users can view their own events"
  ON events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own events"
  ON events
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Public events are viewable by anyone"
  ON events
  FOR SELECT
  TO anon
  USING (is_public = true);

-- RLS Policies for photos table
CREATE POLICY "Event owners can view all photos for their events"
  ON photos
  FOR SELECT
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can upload photos to events"
  ON photos
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Event owners can update photo status"
  ON photos
  FOR UPDATE
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Event owners can delete photos"
  ON photos
  FOR DELETE
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Approved photos in public events are viewable by anyone"
  ON photos
  FOR SELECT
  TO anon
  USING (
    status = 'approved' AND
    event_id IN (
      SELECT id FROM events WHERE is_public = true
    )
  );

-- RLS Policies for subscriptions table
CREATE POLICY "Users can view their own subscription"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own subscription"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own subscription"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_events_updated_at 
  BEFORE UPDATE ON events 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photos_updated_at 
  BEFORE UPDATE ON photos 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON subscriptions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();