-- Add category column to shopping_items table
-- This links shopping items to expense categories for better organization

ALTER TABLE shopping_items 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL;

-- Add index for category lookups
CREATE INDEX IF NOT EXISTS idx_shopping_items_category ON shopping_items(category);
