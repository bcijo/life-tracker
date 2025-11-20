import useSupabaseData from './useSupabaseData';

function useCategories() {
    const { data: categories, loading, error, insert, remove } = useSupabaseData('categories');

    const addCategory = async (id, name, color, type) => {
        const newCategory = {
            id,
            name,
            color,
            type,
        };
        return await insert(newCategory);
    };

    const deleteCategory = async (id) => {
        return await remove(id);
    };

    return {
        categories,
        loading,
        error,
        addCategory,
        deleteCategory,
    };
}

export default useCategories;
