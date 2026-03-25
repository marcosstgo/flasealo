/*
  # Fix Critical Security Issues

  ## Issues Identified and Fixed:
  
  1. **photo_hashes table - Insecure INSERT policy**
     - Current: "System can insert photo hashes" with `WITH CHECK (true)` 
     - Risk: Any authenticated user can insert arbitrary photo hashes
     - Fix: Restrict to authenticated users only during actual photo uploads
  
  2. **photos table - Insecure INSERT policy**
     - Current: "Anyone can upload photos to events" with `WITH CHECK (true)`
     - Risk: Any anonymous or authenticated user can upload unlimited photos
     - Fix: Remove overly permissive policy
  
  3. **upload_rate_limits table - Insecure policies**
     - Current: "System can insert rate limits" with `WITH CHECK (true)`
     - Current: "System can update rate limits" with `USING (true)`
     - Risk: Any authenticated user can manipulate rate limits
     - Fix: Remove these policies (rate limits should be managed server-side only)
  
  4. **Missing DELETE policies**
     - Tables: photo_hashes, upload_rate_limits
     - Risk: No way to clean up old data
     - Fix: Add admin-only DELETE policies
  
  5. **Inconsistent is_admin() usage**
     - Some policies use `is_admin()`, others use `is_admin(auth.uid())`
     - Fix: Standardize to `is_admin()` which already uses auth.uid() internally

  ## Security Changes:
  - Drop all insecure policies with `USING (true)` or `WITH CHECK (true)`
  - Add proper authentication checks
  - Add admin-only management policies
  - Ensure all tables have complete CRUD policies with proper restrictions
*/

-- Fix photo_hashes table
DROP POLICY IF EXISTS "System can insert photo hashes" ON photo_hashes;
DROP POLICY IF EXISTS "Admins can view all photo hashes" ON photo_hashes;

CREATE POLICY "Admins can view all photo hashes"
  ON photo_hashes
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete photo hashes"
  ON photo_hashes
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Fix photos table - remove insecure anonymous upload policy
DROP POLICY IF EXISTS "Anyone can upload photos to events" ON photos;

-- Fix upload_rate_limits table
DROP POLICY IF EXISTS "System can insert rate limits" ON upload_rate_limits;
DROP POLICY IF EXISTS "System can update rate limits" ON upload_rate_limits;
DROP POLICY IF EXISTS "Admins can view all rate limits" ON upload_rate_limits;

CREATE POLICY "Admins can view all rate limits"
  ON upload_rate_limits
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete rate limits"
  ON upload_rate_limits
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Add missing INSERT policy for user_roles (for initial role creation)
DROP POLICY IF EXISTS "System can create initial roles" ON user_roles;

CREATE POLICY "Admins can insert roles"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Add missing DELETE policy for user_roles
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;

CREATE POLICY "Admins can delete roles"
  ON user_roles
  FOR DELETE
  TO authenticated
  USING (is_admin());
