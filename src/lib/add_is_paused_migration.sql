-- Migration to add is_paused column to habits table
-- Run this in your Supabase SQL Editor

ALTER TABLE habits 
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;

UPDATE habits 
SET is_paused = false 
WHERE is_paused IS NULL;
