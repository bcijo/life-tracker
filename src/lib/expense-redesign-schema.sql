-- =============================================
-- EXPENSE TRACKER REDESIGN - DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Expense Cards (for grouping categories into visual cards)
CREATE TABLE IF NOT EXISTS expense_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT NOT NULL,
    category_ids TEXT[],
    budget_amount DECIMAL(10,2),
    is_default BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bank Accounts (for tracking multiple banks)
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('savings', 'credit', 'wallet')),
    current_balance DECIMAL(12,2) DEFAULT 0,
    color TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bank Balance Snapshots (for daily balance history)
CREATE TABLE IF NOT EXISTS bank_balance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE,
    balance DECIMAL(12,2) NOT NULL,
    snapshot_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bank_account_id, snapshot_date)
);

-- 4. Recurring Expenses (for monthly recurring expenses)
CREATE TABLE IF NOT EXISTS recurring_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL,
    day_of_month INTEGER DEFAULT 1 CHECK (day_of_month >= 1 AND day_of_month <= 31),
    is_active BOOLEAN DEFAULT true,
    last_processed DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_expense_cards_user_id ON expense_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_balance_snapshots_user_id ON bank_balance_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_balance_snapshots_date ON bank_balance_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user_id ON recurring_expenses(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE expense_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_balance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for now, restrict in production)
CREATE POLICY "Allow all operations on expense_cards" ON expense_cards
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on bank_accounts" ON bank_accounts
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on bank_balance_snapshots" ON bank_balance_snapshots
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on recurring_expenses" ON recurring_expenses
    FOR ALL USING (true) WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_expense_cards_updated_at BEFORE UPDATE ON expense_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_expenses_updated_at BEFORE UPDATE ON recurring_expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- NOTE: Default expense cards are NOT inserted here because user_id is required.
-- The app handles this by using the existing categories as fallback cards.
-- Cards will be created per-user when they use the "Add Card" feature.
