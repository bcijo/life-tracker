-- Migration: Add missing columns to habits table
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- This adds tracking_start_date and is_paused which were missing from the schema,
-- causing habits to fail to save.

-- Add tracking_start_date column (stores YYYY-MM-DD, used to calculate success rate)
ALTER TABLE habits 
ADD COLUMN IF NOT EXISTS tracking_start_date TEXT;

-- Add is_paused column (allows pausing a habit while preserving streak)
ALTER TABLE habits 
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;

-- Backfill existing habits with created_at date as tracking start date
UPDATE habits 
SET tracking_start_date = TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
WHERE tracking_start_date IS NULL;

-- Backfill is_paused to false for existing habits
UPDATE habits 
SET is_paused = false
WHERE is_paused IS NULL;
