import { useState, useEffect } from 'react';

// Using localStorage for budgets to avoid Supabase schema errors for a new entity
export default function useBudgets() {
    const [budgets, setBudgets] = useState([]);

    useEffect(() => {
        const stored = localStorage.getItem('life_tracker_budgets');
        if (stored) {
            try {
                setBudgets(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse budgets');
            }
        } else {
            // Default example budget
            const defaultBudget = {
                id: 'default-1',
                name: 'Monthly Essentials',
                amount: 15000,
                category_ids: [],
                account_id: null,
                created_at: new Date().toISOString()
            };
            setBudgets([defaultBudget]);
            localStorage.setItem('life_tracker_budgets', JSON.stringify([defaultBudget]));
        }
    }, []);

    const saveBudgets = (newBudgets) => {
        setBudgets(newBudgets);
        localStorage.setItem('life_tracker_budgets', JSON.stringify(newBudgets));
    };

    const addBudget = (name, amount, categoryIds = [], accountId = null) => {
        const newBudget = {
            id: Date.now().toString(),
            name,
            amount: parseFloat(amount),
            category_ids: categoryIds,
            account_id: accountId,
            created_at: new Date().toISOString()
        };
        saveBudgets([...budgets, newBudget]);
        return newBudget;
    };

    const updateBudget = (id, updates) => {
        const newBudgets = budgets.map(b => b.id === id ? { ...b, ...updates } : b);
        saveBudgets(newBudgets);
    };

    const deleteBudget = (id) => {
        const newBudgets = budgets.filter(b => b.id !== id);
        saveBudgets(newBudgets);
    };

    return { budgets, addBudget, updateBudget, deleteBudget };
}
