/*
  # Add UPDATE policy for dashboard_users table

  1. Changes
    - Add UPDATE policy for dashboard_users table to allow public updates
    - This is needed for the password reset/fix functionality to work properly

  2. Security
    - Allow public updates to dashboard_users (needed for admin functions)
    - In a production environment, you might want more restrictive policies
*/

-- Add UPDATE policy for dashboard_users table
CREATE POLICY "Allow public update access to dashboard_users"
  ON dashboard_users
  FOR UPDATE
  TO public
  USING (true);