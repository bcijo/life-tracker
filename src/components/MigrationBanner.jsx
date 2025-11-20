import React, { useState, useEffect } from 'react';
import { X, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const MigrationBanner = () => {
    const [hasLocalData, setHasLocalData] = useState(false);
    const [migrating, setMigrating] = useState(false);
    const [migrated, setMigrated] = useState(false);
    const [error, setError] = useState(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Check if migration was already done
        const migrationDone = localStorage.getItem('supabase-migration-done');
        if (migrationDone) {
            setDismissed(true);
            return;
        }

        // Check if there's any localStorage data to migrate
        const todos = localStorage.getItem('todos');
        const habits = localStorage.getItem('habits');
        const shopping = localStorage.getItem('shopping-items');
        const transactions = localStorage.getItem('transactions');
        const categories = localStorage.getItem('expense-categories');

        if (todos || habits || shopping || transactions || categories) {
            setHasLocalData(true);
        }
    }, []);

    const migrateData = async () => {
        setMigrating(true);
        setError(null);

        try {
            // Migrate todos
            const todosData = JSON.parse(localStorage.getItem('todos') || '[]');
            if (todosData.length > 0) {
                const todosToInsert = todosData.map(todo => ({
                    text: todo.text,
                    completed: todo.completed || false,
                    created_at: todo.createdAt || new Date().toISOString(),
                }));
                const { error: todosError } = await supabase.from('todos').insert(todosToInsert);
                if (todosError) throw todosError;
            }

            // Migrate habits
            const habitsData = JSON.parse(localStorage.getItem('habits') || '[]');
            if (habitsData.length > 0) {
                const habitsToInsert = habitsData.map(habit => ({
                    name: habit.name,
                    history: habit.history || [],
                    created_at: new Date().toISOString(),
                }));
                const { error: habitsError } = await supabase.from('habits').insert(habitsToInsert);
                if (habitsError) throw habitsError;
            }

            // Migrate shopping items
            const shoppingData = JSON.parse(localStorage.getItem('shopping-items') || '[]');
            if (shoppingData.length > 0) {
                const shoppingToInsert = shoppingData.map(item => ({
                    name: item.name,
                    is_bought: item.isBought || false,
                    added_to_expenses: item.addedToExpenses || false,
                    created_at: item.createdAt || new Date().toISOString(),
                }));
                const { error: shoppingError } = await supabase.from('shopping_items').insert(shoppingToInsert);
                if (shoppingError) throw shoppingError;
            }

            // Migrate categories
            const categoriesData = JSON.parse(localStorage.getItem('expense-categories') || '[]');
            if (categoriesData.length > 0) {
                const categoriesToInsert = categoriesData.map(cat => ({
                    id: cat.id,
                    name: cat.name,
                    color: cat.color,
                    type: cat.type,
                }));
                // Use upsert to avoid conflicts with default categories
                const { error: categoriesError } = await supabase
                    .from('categories')
                    .upsert(categoriesToInsert, { onConflict: 'id' });
                if (categoriesError) throw categoriesError;
            }

            // Migrate transactions
            const transactionsData = JSON.parse(localStorage.getItem('transactions') || '[]');
            if (transactionsData.length > 0) {
                const transactionsToInsert = transactionsData.map(t => ({
                    amount: t.amount,
                    description: t.description,
                    type: t.type,
                    category: t.category,
                    date: t.date,
                }));
                const { error: transactionsError } = await supabase.from('transactions').insert(transactionsToInsert);
                if (transactionsError) throw transactionsError;
            }

            // Mark migration as complete
            localStorage.setItem('supabase-migration-done', 'true');
            setMigrated(true);

            // Clear old localStorage data after successful migration
            setTimeout(() => {
                localStorage.removeItem('todos');
                localStorage.removeItem('habits');
                localStorage.removeItem('shopping-items');
                localStorage.removeItem('transactions');
                localStorage.removeItem('expense-categories');
            }, 2000);

        } catch (err) {
            console.error('Migration error:', err);
            setError(err.message);
        } finally {
            setMigrating(false);
        }
    };

    const skipMigration = () => {
        localStorage.setItem('supabase-migration-done', 'true');
        setDismissed(true);
    };

    if (dismissed || !hasLocalData) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            background: 'linear-gradient(135deg, rgba(69, 183, 209, 0.95) 0%, rgba(78, 205, 196, 0.95) 100%)',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
                <button
                    onClick={skipMigration}
                    style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        background: 'rgba(255,255,255,0.3)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#fff',
                    }}
                >
                    <X size={16} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <Database size={24} color="#fff" />
                    <h3 style={{ color: '#fff', margin: 0, fontSize: '16px' }}>
                        {migrated ? 'Migration Complete!' : 'Migrate to Cloud Database'}
                    </h3>
                </div>

                {migrated ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                        <CheckCircle size={18} />
                        <p style={{ margin: 0, fontSize: '14px' }}>
                            Your data has been successfully migrated to Supabase. You can now access it from any device!
                        </p>
                    </div>
                ) : (
                    <>
                        <p style={{ color: '#fff', margin: '0 0 12px 0', fontSize: '14px', opacity: 0.95 }}>
                            We've detected existing data in your browser. Migrate it to the cloud to sync across all your devices.
                        </p>

                        {error && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(255,255,255,0.2)',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                marginBottom: '12px',
                                color: '#fff'
                            }}>
                                <AlertCircle size={16} />
                                <span style={{ fontSize: '13px' }}>{error}</span>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={migrateData}
                                disabled={migrating}
                                style={{
                                    flex: 1,
                                    padding: '10px 16px',
                                    background: '#fff',
                                    color: '#45b7d1',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    cursor: migrating ? 'not-allowed' : 'pointer',
                                    opacity: migrating ? 0.7 : 1,
                                }}
                            >
                                {migrating ? 'Migrating...' : 'Migrate Now'}
                            </button>
                            <button
                                onClick={skipMigration}
                                disabled={migrating}
                                style={{
                                    padding: '10px 16px',
                                    background: 'rgba(255,255,255,0.2)',
                                    color: '#fff',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    borderRadius: '8px',
                                    fontWeight: '500',
                                    fontSize: '14px',
                                    cursor: migrating ? 'not-allowed' : 'pointer',
                                }}
                            >
                                Skip
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MigrationBanner;
