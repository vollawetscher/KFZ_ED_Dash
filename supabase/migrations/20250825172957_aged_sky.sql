/*
  # Add INSERT policy for dashboard_users table

  1. Changes
    - Add INSERT policy for dashboard_users table to allow public inserts
    - This is needed for the admin panel user creation functionality to work properly

  2. Security
    - Allow public inserts to dashboard_users (needed for admin functions)
    - In a production environment, you might want more restrictive policies
*/

-- Add INSERT policy for dashboard_users table
CREATE POLICY "Allow public insert access to dashboard_users"
  ON dashboard_users
  FOR INSERT
  TO public
  WITH CHECK (true);