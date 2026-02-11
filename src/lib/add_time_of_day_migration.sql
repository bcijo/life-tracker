-- Migration to add time_of_day column to habits table
-- Run this in your Supabase SQL Editor

-- Add the time_of_day column with 'morning' as default value
ALTER TABLE habits 
ADD COLUMN IF NOT EXISTS time_of_day TEXT DEFAULT 'morning';

-- Update existing habits to have 'morning' as their time_of_day
UPDATE habits 
SET time_of_day = 'morning' 
WHERE time_of_day IS NULL;
