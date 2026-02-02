-- Migration: Add active_days column to habits table
-- This allows users to specify which days of the week a habit should be tracked
-- Array of day indices: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
-- Default: all days active [0,1,2,3,4,5,6]

-- Add the active_days column
ALTER TABLE habits 
ADD COLUMN IF NOT EXISTS active_days JSONB DEFAULT '[0,1,2,3,4,5,6]'::jsonb;

-- Update existing habits to have all days active (this is the default behavior they had before)
UPDATE habits 
SET active_days = '[0,1,2,3,4,5,6]'::jsonb 
WHERE active_days IS NULL;
