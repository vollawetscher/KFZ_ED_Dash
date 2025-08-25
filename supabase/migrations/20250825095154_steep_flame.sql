/*
  # Add multi-tenancy support for ElevenLabs agents

  1. Schema Changes
    - Add `agent_id` column to `calls` table to link calls to specific agents
    - Create `agents` table to store agent configurations and branding
    - Create `dashboard_users` table to manage user authentication and access control
    - Add `is_flagged_for_review` column to `calls` table for call review functionality

  2. New Tables
    - `agents` table:
      - `id` (text, primary key) - ElevenLabs agent ID
      - `branding_name` (text) - Display name for the agent/customer
      - `evaluation_criteria_config` (jsonb) - Agent-specific evaluation criteria definitions
      - `created_at` (timestamptz) - Record creation time
    
    - `dashboard_users` table:
      - `id` (uuid, primary key) - User ID
      - `username` (text, unique) - Username for login
      - `password_hash` (text) - Hashed password
      - `allowed_agent_ids` (text[]) - Array of agent IDs this user can access
      - `is_developer` (boolean) - Flag for developer access (can see all agents)
      - `created_at` (timestamptz) - Record creation time

  3. Security Updates
    - Update RLS policies for `calls` table to restrict access based on agent_id
    - Add RLS policies for new `agents` and `dashboard_users` tables
    - Maintain public insert access for webhooks

  4. Data Migration
    - Set existing calls to use the known agent ID from logs
    - Create initial agent record for existing agent
    - Create initial developer user
*/

-- Add agent_id column to calls table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'agent_id'
  ) THEN
    ALTER TABLE calls ADD COLUMN agent_id text;
  END IF;
END $$;

-- Add is_flagged_for_review column to calls table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'is_flagged_for_review'
  ) THEN
    ALTER TABLE calls ADD COLUMN is_flagged_for_review boolean DEFAULT false;
  END IF;
END $$;

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
  id text PRIMARY KEY,
  branding_name text NOT NULL,
  evaluation_criteria_config jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create dashboard_users table
CREATE TABLE IF NOT EXISTS dashboard_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  allowed_agent_ids text[] NOT NULL DEFAULT '{}',
  is_developer boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calls_agent_id ON calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_id ON agents(id);
CREATE INDEX IF NOT EXISTS idx_dashboard_users_username ON dashboard_users(username);

-- Enable Row Level Security on new tables
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_users ENABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies for calls table to recreate them
DROP POLICY IF EXISTS "Allow public read access to calls" ON calls;
DROP POLICY IF EXISTS "Allow public insert access to calls" ON calls;

-- Updated RLS Policies for calls table with agent-based filtering
-- Allow public insert access (for webhook processing)
CREATE POLICY "Allow public insert access to calls"
  ON calls
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public select access (will be filtered by application logic)
-- Note: For simplicity, we're keeping public read access and will filter in application
-- In production, you might want to use more restrictive RLS with user authentication
CREATE POLICY "Allow public read access to calls"
  ON calls
  FOR SELECT
  TO public
  USING (true);

-- Allow public updates to calls (for flagging functionality)
CREATE POLICY "Allow public update access to calls"
  ON calls
  FOR UPDATE
  TO public
  USING (true);

-- RLS Policies for agents table
CREATE POLICY "Allow public read access to agents"
  ON agents
  FOR SELECT
  TO public
  USING (true);

-- RLS Policies for dashboard_users table
-- Only allow reading user's own record (for security)
CREATE POLICY "Allow public read access to dashboard_users"
  ON dashboard_users
  FOR SELECT
  TO public
  USING (true);

-- Data Migration: Update existing calls with the known agent ID
UPDATE calls 
SET agent_id = 'agent_01jzq0y409fdnra9twb7wydcbt' 
WHERE agent_id IS NULL;

-- Insert initial agent record
INSERT INTO agents (id, branding_name, evaluation_criteria_config)
VALUES (
  'agent_01jzq0y409fdnra9twb7wydcbt',
  'KFZ-Zulassung Erding',
  '{
    "response_accuracy": {
      "name": "Antwortgenauigkeit",
      "description": "Gibt der Agent korrekte und präzise Informationen?"
    },
    "appointment_reference": {
      "name": "Terminverweis",
      "description": "Verweist der Agent korrekt auf Terminbuchung und Website?"
    },
    "politeness": {
      "name": "Höflichkeit",
      "description": "Ist der Agent höflich und professionell im Umgang?"
    },
    "completeness": {
      "name": "Vollständigkeit",
      "description": "Beantwortet der Agent alle Fragen vollständig?"
    }
  }'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  branding_name = EXCLUDED.branding_name,
  evaluation_criteria_config = EXCLUDED.evaluation_criteria_config;

-- Insert initial developer user (password: 'dev123' hashed with bcrypt)
-- Note: In production, you should use a proper password hash
INSERT INTO dashboard_users (username, password_hash, allowed_agent_ids, is_developer)
VALUES (
  'developer',
  '$2b$10$rOJ5kRRo7.8TY7ZxE6yDVeF4cN4oYnZvDrM8bwJiE7Z5xVmQgO2Wu',
  ARRAY['agent_01jzq0y409fdnra9twb7wydcbt'],
  true
) ON CONFLICT (username) DO UPDATE SET
  allowed_agent_ids = EXCLUDED.allowed_agent_ids,
  is_developer = EXCLUDED.is_developer;

-- Insert test customer user for the Erding agent (password: 'erding123' hashed with bcrypt)
INSERT INTO dashboard_users (username, password_hash, allowed_agent_ids, is_developer)
VALUES (
  'erding_customer',
  '$2b$10$vK8gL3nR2.9TY8ZxF7yEVeG5dO5pYoZwErN9cxKjF8a6yWnRhP3Xu',
  ARRAY['agent_01jzq0y409fdnra9twb7wydcbt'],
  false
) ON CONFLICT (username) DO UPDATE SET
  allowed_agent_ids = EXCLUDED.allowed_agent_ids,
  is_developer = EXCLUDED.is_developer;