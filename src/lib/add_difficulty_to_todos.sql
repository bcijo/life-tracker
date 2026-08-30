-- Add difficulty column to todos table
ALTER TABLE todos 
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium';

-- Add check constraint for difficulty tiers if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'todos_difficulty_check'
    ) THEN
        ALTER TABLE todos ADD CONSTRAINT todos_difficulty_check CHECK (difficulty IN ('easy', 'medium', 'hard'));
    END IF;
END $$;

-- Index for filtering by difficulty
CREATE INDEX IF NOT EXISTS idx_todos_difficulty ON todos(difficulty);
