-- Drop existing public access policies
DROP POLICY IF EXISTS "Allow all" ON todos;
DROP POLICY IF EXISTS "Allow all" ON habits;
DROP POLICY IF EXISTS "Allow all" ON shopping_items;
DROP POLICY IF EXISTS "Allow all" ON categories;
DROP POLICY IF EXISTS "Allow all" ON transactions;

-- Create user-specific policies
CREATE POLICY "Users can manage own todos" ON todos
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own habits" ON habits
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own shopping items" ON shopping_items
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own categories" ON categories
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own transactions" ON transactions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
