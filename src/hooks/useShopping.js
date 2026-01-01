import useSupabaseData from './useSupabaseData';

function useShopping() {
    const { data: items, loading, error, insert, update, remove } = useSupabaseData('shopping_items');

    const addItem = async (name, category = 'grocery') => {
        const newItem = {
            name,
            category,
            is_bought: false,
            added_to_expenses: false,
        };
        return await insert(newItem);
    };

    const toggleBought = async (id) => {
        const item = items.find(i => i.id === id);
        if (!item) return { error: 'Item not found' };

        return await update(id, { is_bought: !item.is_bought });
    };

    const markAddedToExpenses = async (id) => {
        return await update(id, { added_to_expenses: true });
    };

    const deleteItem = async (id) => {
        return await remove(id);
    };

    return {
        items,
        loading,
        error,
        addItem,
        toggleBought,
        markAddedToExpenses,
        deleteItem,
    };
}

export default useShopping;
