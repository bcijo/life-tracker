-- ============================================================
-- Social Features Schema Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create profiles table (with social columns included)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  username TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow all authenticated users to read profiles (non-sensitive data: username, display_name, full_name)
DROP POLICY IF EXISTS "Users can search profiles" ON profiles;
CREATE POLICY "Users can search profiles" ON profiles
  FOR SELECT USING (true);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Case-insensitive unique index for username lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower 
  ON profiles (LOWER(username));

-- 2. Create friendships table (referencing profiles.id for PostgREST joins)
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  addressee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

-- Ensure foreign keys point to profiles table for existing installations
DO $$
BEGIN
  -- Add requester FK to profiles if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'friendships_requester_id_fkey_profiles'
  ) THEN
    ALTER TABLE friendships DROP CONSTRAINT IF EXISTS friendships_requester_id_fkey;
    ALTER TABLE friendships ADD CONSTRAINT friendships_requester_id_fkey_profiles 
      FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- Add addressee FK to profiles if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'friendships_addressee_id_fkey_profiles'
  ) THEN
    ALTER TABLE friendships DROP CONSTRAINT IF EXISTS friendships_addressee_id_fkey;
    ALTER TABLE friendships ADD CONSTRAINT friendships_addressee_id_fkey_profiles 
      FOREIGN KEY (addressee_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Indexes for efficient friend lookups
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- 3. RLS Policies for friendships
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own friendships" ON friendships;
CREATE POLICY "Users can view own friendships" ON friendships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Users can send friend requests" ON friendships;
CREATE POLICY "Users can send friend requests" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can update own friendships" ON friendships;
CREATE POLICY "Users can update own friendships" ON friendships
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Users can delete own friendships" ON friendships;
CREATE POLICY "Users can delete own friendships" ON friendships
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- 5. Server-side habit score computation (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_habit_score(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_completions INTEGER := 0;
  v_active_habits INTEGER := 0;
  v_rate NUMERIC := 0;
  v_score NUMERIC := 0;
BEGIN
  -- Count active (non-paused) habits
  SELECT COUNT(*) INTO v_active_habits
  FROM habits
  WHERE user_id = target_user_id AND (is_paused IS NULL OR is_paused = false);

  -- Count completions in last 30 days from JSONB history
  SELECT COALESCE(SUM(completion_count), 0) INTO v_completions
  FROM (
    SELECT COUNT(*) as completion_count
    FROM habits h,
         LATERAL jsonb_array_elements(COALESCE(h.history, '[]'::jsonb)) AS elem
    WHERE h.user_id = target_user_id
      AND (h.is_paused IS NULL OR h.is_paused = false)
      AND (
        -- Handle object format {date, status}
        (elem ? 'date' AND elem->>'status' = 'completed' 
         AND (elem->>'date')::date >= CURRENT_DATE - INTERVAL '30 days')
        OR
        -- Handle legacy string format
        (NOT elem ? 'date' AND jsonb_typeof(elem) = 'string'
         AND (elem #>> '{}')::date >= CURRENT_DATE - INTERVAL '30 days')
      )
  ) sub;

  -- Completion rate: completions / (active_habits * 30) * 100
  IF v_active_habits > 0 THEN
    v_rate := ROUND((v_completions::NUMERIC / (v_active_habits * 30)) * 100, 1);
    IF v_rate > 100 THEN v_rate := 100; END IF;
  END IF;

  -- Score = (completions × 10) + (rate × 2)
  v_score := (v_completions * 10) + (v_rate * 2);

  result := json_build_object(
    'completions_30d', v_completions,
    'active_habits', v_active_habits,
    'completion_rate', v_rate,
    'score', v_score
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Leaderboard function — returns ranked users with scores
CREATE OR REPLACE FUNCTION get_habit_leaderboard(
  p_user_id UUID,
  p_scope TEXT DEFAULT 'friends'
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH eligible_users AS (
    SELECT p.id as user_id, p.username, p.display_name, p.full_name
    FROM profiles p
    WHERE p.username IS NOT NULL
      AND (
        p_scope = 'global'
        OR p.id = p_user_id
        OR EXISTS (
          SELECT 1 FROM friendships f
          WHERE f.status = 'accepted'
            AND (
              (f.requester_id = p_user_id AND f.addressee_id = p.id)
              OR (f.addressee_id = p_user_id AND f.requester_id = p.id)
            )
        )
      )
  ),
  scored AS (
    SELECT 
      eu.*,
      get_user_habit_score(eu.user_id) AS score_data
    FROM eligible_users eu
  ),
  ranked AS (
    SELECT
      scored.*,
      ROW_NUMBER() OVER (ORDER BY (scored.score_data->>'score')::numeric DESC) AS rank
    FROM scored
  )
  SELECT json_agg(
    json_build_object(
      'user_id', ranked.user_id,
      'username', ranked.username,
      'display_name', ranked.display_name,
      'full_name', ranked.full_name,
      'score', (ranked.score_data->>'score')::numeric,
      'completions_30d', (ranked.score_data->>'completions_30d')::integer,
      'active_habits', (ranked.score_data->>'active_habits')::integer,
      'completion_rate', (ranked.score_data->>'completion_rate')::numeric,
      'rank', ranked.rank
    )
    ORDER BY ranked.rank
  ) INTO result
  FROM ranked;

  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Enable realtime for friendships table
ALTER PUBLICATION supabase_realtime ADD TABLE friendships;
