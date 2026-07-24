/*
# Create profiles table

1. New Tables
   - `profiles`
     - `user_id` (uuid, primary key, FK to auth.users)
     - `full_name` (text, not null) — nombre completo del usuario
     - `profession` (text) — profesión seleccionada de una lista curada
     - `referral_source` (text) — cómo se enteró de Flashealo
     - `created_at` (timestamptz)

2. Security
   - RLS enabled.
   - Authenticated users can read and update only their own profile.
   - Authenticated users can insert their own profile (on signup).
*/

CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  profession text,
  referral_source text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
TO authenticated USING (auth.uid() = user_id);
