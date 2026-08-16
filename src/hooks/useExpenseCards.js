import useSupabaseData from './useSupabaseData';
import { supabase } from '../lib/supabase';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

function useExpenseCards() {
    const { data: cards, loading, error, insert, update, remove } = useSupabaseData('expense_cards', 'sort_order', true);

    const addCard = async (name, color, categoryIds = [], icon = '📁', budgetAmount = null) => {
        const maxOrder = cards.reduce((max, c) => Math.max(max, c.sort_order || 0), 0);
        const newCard = {
            name,
            icon,
            color,
            category_ids: categoryIds,
            budget_amount: budgetAmount,
            is_default: false,
            sort_order: maxOrder + 1,
        };
        return await insert(newCard);
    };

    const updateCard = async (id, updates) => {
        return await update(id, updates);
    };

    const deleteCard = async (id) => {
        return await remove(id);
    };

    const setBudget = async (cardId, amount) => {
        return await update(cardId, { budget_amount: parseFloat(amount) || null });
    };

    const getCardForCategory = (categoryId) => {
        return cards.find(card =>
            card.category_ids && card.category_ids.includes(categoryId)
        );
    };

    // Helper to check if a transaction is in the current month
    const isCurrentMonth = (dateStr) => {
        try {
            const date = parseISO(dateStr);
            const now = new Date();
            const monthStart = startOfMonth(now);
            const monthEnd = endOfMonth(now);
            return isWithinInterval(date, { start: monthStart, end: monthEnd });
        } catch {
            return false;
        }
    };

    const getCardTotal = (card, transactions) => {
        if (!card.category_ids) return 0;
        return transactions
            .filter(t => t.type === 'expense' && card.category_ids.includes(t.category) && isCurrentMonth(t.date))
            .reduce((acc, t) => acc + parseFloat(t.amount), 0);
    };

    const getCardTransactions = (card, transactions) => {
        return transactions.filter(t => {
            if (t.type !== 'expense') return false;
            // Only include transactions from current month
            if (!isCurrentMonth(t.date)) return false;
            // Match by direct card_id link OR by category_ids
            if (t.card_id === card.id) return true;
            if (card.category_ids && card.category_ids.includes(t.category)) return true;
            return false;
        });
    };

    const getBudgetProgress = (card, transactions) => {
        const cardTransactions = getCardTransactions(card, transactions);
        const totalSpent = cardTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const budget = parseFloat(card.budget_amount || 0);

        return {
            spent: totalSpent,
            budget: budget,
            percentage: budget > 0 ? (totalSpent / budget) * 100 : 0,
            isOverBudget: budget > 0 && totalSpent > budget
        };
    };

    const addSubcategory = async (cardId, name) => {
        try {
            const { data, error } = await supabase
                .from('expense_subcategories')
                .insert([{ card_id: cardId, name }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error adding subcategory:', error);
            return null;
        }
    };

    const fetchSubcategories = async (cardId) => {
        try {
            const { data, error } = await supabase
                .from('expense_subcategories')
                .select('*')
                .eq('card_id', cardId)
                .order('name');

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching subcategories:', error);
            return [];
        }
    };

    const fetchAllSubcategories = async () => {
        try {
            const { data, error } = await supabase
                .from('expense_subcategories')
                .select('*')
                .order('name');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching all subcategories:', error);
            return [];
        }
    };

    const deleteSubcategory = async (id) => {
        try {
            const { error } = await supabase
                .from('expense_subcategories')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true; // Indicate success
        } catch (error) {
            console.error('Error deleting subcategory:', error);
            return false; // Indicate failure
        }
    };

    const initializeDefaults = async () => {
        if (loading || cards.length > 0) return;

        const defaultCards = [
            { name: 'Food & Dining', icon: '🍔', color: '#FF6B6B', category_ids: ['food', 'dining'], sort_order: 1, subcategories: ['Groceries', 'Restaurants', 'Coffee & Drinks', 'Delivery'] },
            { name: 'Transport', icon: '🚗', color: '#4ECDC4', category_ids: ['transport', 'travel', 'fuel'], sort_order: 2, subcategories: ['Fuel / Petrol', 'Metro / Bus', 'Cab / Uber', 'Maintenance'] },
            { name: 'Shopping & Lifestyle', icon: '🛍️', color: '#A855F7', category_ids: ['shopping', 'clothes'], sort_order: 3, subcategories: ['Clothing', 'Electronics', 'Personal Care', 'Home'] },
            { name: 'Bills & Utilities', icon: '💡', color: '#F59E0B', category_ids: ['bills', 'utilities', 'rent'], sort_order: 4, subcategories: ['Electricity', 'Wi-Fi / Internet', 'Mobile Recharge', 'Rent'] },
            { name: 'Entertainment', icon: '🎬', color: '#EC4899', category_ids: ['entertainment', 'movies'], sort_order: 5, subcategories: ['Movies', 'Subscriptions', 'Events'] },
            { name: 'Health & Wellness', icon: '🏥', color: '#10B981', category_ids: ['health', 'medical'], sort_order: 6, subcategories: ['Pharmacy / Medicines', 'Doctor', 'Fitness / Gym'] },
        ];

        try {
            const { count } = await supabase.from('expense_cards').select('*', { count: 'exact', head: true });

            if (count === 0) {
                console.log('Initializing default curated expense categories...');
                for (const card of defaultCards) {
                    const { subcategories, ...cardData } = card;
                    const inserted = await insert(cardData);
                    if (inserted?.id && subcategories?.length) {
                        for (const sub of subcategories) {
                            try {
                                await supabase.from('expense_subcategories').insert([{ card_id: inserted.id, name: sub }]);
                            } catch (e) {
                                console.error('Error inserting default subcategory:', e);
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Error initializing defaults:', err);
        }
    };

    return {
        cards,
        loading,
        error,
        addCard,
        updateCard,
        deleteCard,
        setBudget,
        getCardForCategory,
        getCardTotal,
        getCardTransactions,
        getBudgetProgress,
        addSubcategory,
        fetchSubcategories,
        fetchAllSubcategories,
        deleteSubcategory,
        initializeDefaults
    };
}

export default useExpenseCards;
