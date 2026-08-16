-- Feedback table for user feedback submissions
-- Admin (abhin.vinu@gmail.com) can read all feedback
-- Users can insert their own feedback and read their own submissions

CREATE TABLE IF NOT EXISTS feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    user_email TEXT,
    user_display_name TEXT,
    category TEXT DEFAULT 'general' CHECK (category IN ('bug', 'feature', 'general')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback" ON feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can read their own feedback
CREATE POLICY "Users can read own feedback" ON feedback
    FOR SELECT USING (auth.uid() = user_id);

-- Admin can read ALL feedback (identified by email)
CREATE POLICY "Admin can read all feedback" ON feedback
    FOR SELECT USING (
        auth.jwt() ->> 'email' = 'abhinb2703@gmail.com'
    );
