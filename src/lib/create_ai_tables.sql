-- Table for storing AI-generated reports
CREATE TABLE IF NOT EXISTS ai_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Assumes auth.users
    type TEXT NOT NULL CHECK (type IN ('weekly', 'monthly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_ai_reports_user_type_period ON ai_reports(user_id, type, period_start);

-- RLS
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own reports" ON ai_reports
    FOR ALL USING (auth.uid() = user_id);
