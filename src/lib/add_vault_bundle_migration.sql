-- ============================================================
-- Zero-Knowledge Encryption Key Sync Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add encrypted_vault_bundle column to profiles table
-- Stored format: { salt: "...", iv: "...", encryptedKey: "..." }
-- This bundle is encrypted client-side with the user's secret PIN.
-- Even the database administrator cannot decrypt this key without the PIN.

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS encrypted_vault_bundle JSONB DEFAULT NULL;
