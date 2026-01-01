-- =============================================
-- EXPENSE TRACKER REDESIGN - DATABASE SCHEMA (UPDATE)
-- Execute this to add subcategories and update transactions
-- =============================================

-- 5. Expense Subcategories
CREATE TABLE IF NOT EXISTS expense_subcategories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID REFERENCES expense_cards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_expense_subcategories_card_id ON expense_subcategories(card_id);

-- Enable RLS
ALTER TABLE expense_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on expense_subcategories" ON expense_subcategories
    FOR ALL USING (true) WITH CHECK (true);

-- 6. Update Transactions table to support Card and Subcategory linkage
-- We strictly link transactions to an expense_card (category grouping) and optionally a subcategory
-- Existing 'category' text column will still be used as a fallback or for the legacy category ID string

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES expense_cards(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES expense_subcategories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_card_id ON transactions(card_id);
