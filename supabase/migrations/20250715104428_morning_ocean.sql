/*
  # Add evaluation results column to calls table

  1. Changes
    - Add `evaluation_results` column to store ElevenLabs evaluation data
    - Column is JSONB type for flexible storage of evaluation criteria and scores
    - Column is nullable as not all calls may have evaluation results

  2. Security
    - No changes to RLS policies needed as this is just adding a column to existing table
*/

-- Add evaluation_results column to calls table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'evaluation_results'
  ) THEN
    ALTER TABLE calls ADD COLUMN evaluation_results JSONB;
  END IF;
END $$;