-- Add deadline column to todos table
ALTER TABLE todos 
ADD COLUMN IF NOT EXISTS deadline DATE;

-- Index for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_todos_deadline ON todos(deadline);
