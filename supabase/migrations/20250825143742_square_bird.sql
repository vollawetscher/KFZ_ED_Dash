/*
  # Add INSERT policy for agents table

  1. Changes
    - Add INSERT policy for agents table to allow public inserts
    - This is needed for the admin panel agent creation functionality to work properly

  2. Security
    - Allow public inserts to agents (needed for admin functions)
    - In a production environment, you might want more restrictive policies
*/

-- Add INSERT policy for agents table
CREATE POLICY "Allow public insert access to agents"
  ON agents
  FOR INSERT
  TO public
  WITH CHECK (true);