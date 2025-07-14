/*
  # Create calls table for ElevenLabs webhook data

  1. New Tables
    - `calls`
      - `id` (uuid, primary key)
      - `caller_number` (text, phone number of caller)
      - `transcript` (text, full call transcript)
      - `timestamp` (timestamptz, when call occurred)
      - `duration` (integer, call duration in seconds, optional)
      - `processed_at` (timestamptz, when webhook was processed)
      - `created_at` (timestamptz, record creation time)

  2. Security
    - Enable RLS on `calls` table
    - Add policy for public read access (for dashboard viewing)
    - Add policy for webhook insertion

  3. Indexes
    - Index on caller_number for filtering
    - Index on timestamp for date range queries
    - Index on created_at for ordering
*/

CREATE TABLE IF NOT EXISTS calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_number text NOT NULL,
  transcript text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  duration integer,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calls_caller_number ON calls(caller_number);
CREATE INDEX IF NOT EXISTS idx_calls_timestamp ON calls(timestamp);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);

-- RLS Policies
-- Allow public read access to all calls (for dashboard viewing)
CREATE POLICY "Allow public read access to calls"
  ON calls
  FOR SELECT
  TO public
  USING (true);

-- Allow public insert access (for webhook processing)
CREATE POLICY "Allow public insert access to calls"
  ON calls
  FOR INSERT
  TO public
  WITH CHECK (true);