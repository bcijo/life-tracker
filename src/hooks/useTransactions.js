import useSupabaseData from './useSupabaseData';

function useTransactions() {
    const { data: transactions, loading, error, insert, remove } = useSupabaseData('transactions', 'date', false);

    const addTransaction = async (transactionData) => {
        const newTransaction = {
            amount: parseFloat(transactionData.amount),
            description: transactionData.description,
            type: transactionData.type,
            category: transactionData.category,
            date: transactionData.date || new Date().toISOString(),
        };
        return await insert(newTransaction);
    };

    const deleteTransaction = async (id) => {
        return await remove(id);
    };

    return {
        transactions,
        loading,
        error,
        addTransaction,
        deleteTransaction,
    };
}

export default useTransactions;
