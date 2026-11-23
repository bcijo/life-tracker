-- ============================================================
-- Vital Seven + habit emojis
-- Run once in the Supabase SQL editor. Safe to run more than once.
-- ============================================================

-- 1. Habit emoji and pack membership
ALTER TABLE habits ADD COLUMN IF NOT EXISTS emoji TEXT;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS pack_key TEXT;

-- One row per Vital Seven habit per user (prevents duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS habits_user_pack_key_unique
    ON habits (user_id, pack_key)
    WHERE pack_key IS NOT NULL;

-- 2. Daily Vital Seven progress, readable by accepted friends.
--    Only which Vital Seven habits were done is stored here, never
--    personal habits, so this is all friends can see.
CREATE TABLE IF NOT EXISTS vital_progress (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    done_keys TEXT[] NOT NULL DEFAULT '{}',
    done_count INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 7,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_vital_progress_date ON vital_progress (date);

ALTER TABLE vital_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own vital progress" ON vital_progress;
CREATE POLICY "Own vital progress" ON vital_progress
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Friends can view vital progress" ON vital_progress;
CREATE POLICY "Friends can view vital progress" ON vital_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM friendships f
            WHERE f.status = 'accepted'
              AND (
                  (f.requester_id = auth.uid() AND f.addressee_id = vital_progress.user_id)
                  OR (f.addressee_id = auth.uid() AND f.requester_id = vital_progress.user_id)
              )
        )
    );
