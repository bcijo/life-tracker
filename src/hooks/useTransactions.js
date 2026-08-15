import useSupabaseData from './useSupabaseData';

function useTransactions() {
    const { data: transactions, loading, error, insert, remove } = useSupabaseData('transactions', 'date', false);

    const addTransaction = async (transactionData) => {
        const newTransaction = {
            amount: parseFloat(transactionData.amount),
            description: transactionData.description,
            type: transactionData.type,
            category: transactionData.category, // Legacy or fallback string
            card_id: transactionData.card_id || null, // Link to expense card
            subcategory_id: transactionData.subcategory_id || null, // Link to subcategory
            date: transactionData.date || new Date().toISOString(),
        };
        return await insert(newTransaction);
    };

    const updateTransaction = async (id, updates) => {
        const payload = { ...updates };
        if (payload.amount !== undefined) {
            payload.amount = parseFloat(payload.amount);
        }
        return await update(id, payload);
    };

    const deleteTransaction = async (id) => {
        return await remove(id);
    };

    return {
        transactions,
        loading,
        error,
        addTransaction,
        updateTransaction,
        deleteTransaction,
    };
}

export default useTransactions;
