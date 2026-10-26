-- ============================================================
-- CALORIE & MACRO TRACKER SCHEMA (Intake + Burn + Food Catalog)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Global / Shared Food Catalog (stores per-100g nutritional data fetched via Web Search)
CREATE TABLE IF NOT EXISTS food_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    normalized_name TEXT UNIQUE NOT NULL,
    category TEXT DEFAULT 'Indian',
    calories_per_100g DECIMAL(8, 2) NOT NULL,
    protein_per_100g DECIMAL(8, 2) DEFAULT 0,
    carbs_per_100g DECIMAL(8, 2) DEFAULT 0,
    fat_per_100g DECIMAL(8, 2) DEFAULT 0,
    fiber_per_100g DECIMAL(8, 2) DEFAULT 0,
    source TEXT DEFAULT 'web_search',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_catalog_normalized_name ON food_catalog(normalized_name);
CREATE INDEX IF NOT EXISTS idx_food_catalog_name ON food_catalog(name);

ALTER TABLE food_catalog ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can search the shared food catalog and insert newly discovered foods
DROP POLICY IF EXISTS "Anyone can read food_catalog" ON food_catalog;
CREATE POLICY "Anyone can read food_catalog" ON food_catalog
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert into food_catalog" ON food_catalog;
CREATE POLICY "Authenticated users can insert into food_catalog" ON food_catalog
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR true);

DROP POLICY IF EXISTS "Authenticated users can update food_catalog" ON food_catalog;
CREATE POLICY "Authenticated users can update food_catalog" ON food_catalog
    FOR UPDATE USING (auth.role() = 'authenticated' OR true);

-- 2. User Daily Calorie Logs (both Food Intake and Exercise Burn)
CREATE TABLE IF NOT EXISTS calorie_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date TEXT NOT NULL, -- YYYY-MM-DD local date
    type TEXT NOT NULL CHECK (type IN ('intake', 'burn')),
    meal_type TEXT DEFAULT 'snack', -- breakfast | lunch | dinner | snack | exercise
    name TEXT NOT NULL,
    grams DECIMAL(8, 2), -- weight in grams for intake items
    calories_per_100g DECIMAL(8, 2), -- per-100g multiplier base for intake items
    duration_mins INTEGER, -- duration in minutes for exercise burn
    calories DECIMAL(8, 2) NOT NULL,
    protein_g DECIMAL(8, 2) DEFAULT 0,
    carbs_g DECIMAL(8, 2) DEFAULT 0,
    fat_g DECIMAL(8, 2) DEFAULT 0,
    fiber_g DECIMAL(8, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calorie_logs_user_date ON calorie_logs(user_id, date);

ALTER TABLE calorie_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own calorie_logs" ON calorie_logs;
CREATE POLICY "Users can manage own calorie_logs" ON calorie_logs
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Add BMR & body metric fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5, 2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_cm DECIMAL(5, 2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bmr_override INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS calorie_goal INTEGER;

-- 4. User Daily Weight Logs
CREATE TABLE IF NOT EXISTS weight_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date TEXT NOT NULL, -- YYYY-MM-DD local date
    weight_kg DECIMAL(5, 2) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON weight_logs(user_id, date);

ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own weight_logs" ON weight_logs;
CREATE POLICY "Users can manage own weight_logs" ON weight_logs
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Migration: Add Fiber and Source columns if upgrading existing tables
ALTER TABLE food_catalog ADD COLUMN IF NOT EXISTS fiber_per_100g DECIMAL(8, 2) DEFAULT 0;
ALTER TABLE food_catalog ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web';
ALTER TABLE calorie_logs ADD COLUMN IF NOT EXISTS fiber_g DECIMAL(8, 2) DEFAULT 0;

-- 6. User Daily Water Logs
CREATE TABLE IF NOT EXISTS water_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date TEXT NOT NULL, -- YYYY-MM-DD local date
    amount_ml INTEGER NOT NULL, -- e.g. 250, 500, 750, 1000
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_water_logs_user_date ON water_logs(user_id, date);

ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own water_logs" ON water_logs;
CREATE POLICY "Users can manage own water_logs" ON water_logs
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS water_goal_ml INTEGER DEFAULT 3000;

