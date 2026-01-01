import useSupabaseData from './useSupabaseData';

function useTodos() {
    const { data: todos, loading, error, insert, update, remove } = useSupabaseData('todos');

    const addTodo = async (text, deadline = null) => {
        const newTodo = {
            text,
            completed: false,
            deadline,
        };
        return await insert(newTodo);
    };

    const toggleTodo = async (id) => {
        const todo = todos.find(t => t.id === id);
        if (!todo) return { error: 'Todo not found' };

        return await update(id, { completed: !todo.completed });
    };

    const deleteTodo = async (id) => {
        return await remove(id);
    };

    return {
        todos,
        loading,
        error,
        addTodo,
        toggleTodo,
        deleteTodo,
    };
}

export default useTodos;
