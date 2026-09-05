-- ============================================================
-- Mutual Habit Tracking (Duo Pacts) Schema Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create habit_pacts table
CREATE TABLE IF NOT EXISTS habit_pacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  creator_habit_id UUID REFERENCES habits(id) ON DELETE SET NULL,
  partner_habit_id UUID REFERENCES habits(id) ON DELETE SET NULL,
  active_days INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
  time_of_day TEXT DEFAULT 'morning',
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'active', 'declined', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (creator_id != partner_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_habit_pacts_creator ON habit_pacts(creator_id);
CREATE INDEX IF NOT EXISTS idx_habit_pacts_partner ON habit_pacts(partner_id);
CREATE INDEX IF NOT EXISTS idx_habit_pacts_status ON habit_pacts(status);

-- Enable RLS on habit_pacts
ALTER TABLE habit_pacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for habit_pacts
DROP POLICY IF EXISTS "Users can view own pacts" ON habit_pacts;
CREATE POLICY "Users can view own pacts" ON habit_pacts
  FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = partner_id);

DROP POLICY IF EXISTS "Users can create pacts" ON habit_pacts;
CREATE POLICY "Users can create pacts" ON habit_pacts
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can update own pacts" ON habit_pacts;
CREATE POLICY "Users can update own pacts" ON habit_pacts
  FOR UPDATE USING (auth.uid() = creator_id OR auth.uid() = partner_id);

DROP POLICY IF EXISTS "Users can delete own pacts" ON habit_pacts;
CREATE POLICY "Users can delete own pacts" ON habit_pacts
  FOR DELETE USING (auth.uid() = creator_id OR auth.uid() = partner_id);

-- 2. Create pact_nudges table (for nudges, cheers/high-fives, and invites)
CREATE TABLE IF NOT EXISTS pact_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pact_id UUID REFERENCES habit_pacts(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('nudge', 'high_five', 'invite', 'reminder')),
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for nudges
CREATE INDEX IF NOT EXISTS idx_pact_nudges_receiver ON pact_nudges(receiver_id, read);
CREATE INDEX IF NOT EXISTS idx_pact_nudges_pact ON pact_nudges(pact_id);

-- Enable RLS on pact_nudges
ALTER TABLE pact_nudges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pact_nudges
DROP POLICY IF EXISTS "Users can view received or sent nudges" ON pact_nudges;
CREATE POLICY "Users can view received or sent nudges" ON pact_nudges
  FOR SELECT USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can send nudges" ON pact_nudges;
CREATE POLICY "Users can send nudges" ON pact_nudges
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update received nudges (mark as read)" ON pact_nudges;
CREATE POLICY "Users can update received nudges (mark as read)" ON pact_nudges
  FOR UPDATE USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can delete nudges" ON pact_nudges;
CREATE POLICY "Users can delete nudges" ON pact_nudges
  FOR DELETE USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

-- 3. Enable Realtime on habit_pacts and pact_nudges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'habit_pacts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE habit_pacts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'pact_nudges'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE pact_nudges;
  END IF;
END $$;
