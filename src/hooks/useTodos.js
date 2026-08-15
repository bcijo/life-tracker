import useSupabaseData from './useSupabaseData';

function useTodos() {
    const { data: todos, loading, error, insert, update, remove } = useSupabaseData('todos');

    const getLocalDifficulties = () => {
        try {
            return JSON.parse(localStorage.getItem('todo_difficulties') || '{}');
        } catch {
            return {};
        }
    };

    const saveLocalDifficulty = (id, difficulty) => {
        try {
            const current = getLocalDifficulties();
            current[id] = difficulty;
            localStorage.setItem('todo_difficulties', JSON.stringify(current));
        } catch (e) {
            console.error(e);
        }
    };

    const addTodo = async (text, deadline = null, difficulty = 'medium') => {
        const newTodo = {
            text,
            completed: false,
            deadline,
            difficulty,
        };

        let res = await insert(newTodo);
        if (res?.error && typeof res.error === 'string' && res.error.toLowerCase().includes('difficulty')) {
            // Fallback without difficulty column if DB table hasn't added column yet
            res = await insert({ text, completed: false, deadline });
        }

        if (res?.data?.[0]?.id) {
            saveLocalDifficulty(res.data[0].id, difficulty);
        }
        return res;
    };

    const toggleTodo = async (id) => {
        const todo = todos.find(t => t.id === id);
        if (!todo) return { error: 'Todo not found' };

        const isCompleted = !todo.completed;
        return await update(id, { completed: isCompleted });
    };

    const updateTodo = async (id, updates) => {
        if (updates.difficulty) {
            saveLocalDifficulty(id, updates.difficulty);
        }
        let res = await update(id, updates);
        if (res?.error && typeof res.error === 'string' && res.error.toLowerCase().includes('difficulty')) {
            const { difficulty, ...safeUpdates } = updates;
            res = await update(id, safeUpdates);
        }
        return res;
    };

    const deleteTodo = async (id) => {
        try {
            const current = getLocalDifficulties();
            delete current[id];
            localStorage.setItem('todo_difficulties', JSON.stringify(current));
        } catch (e) {
            console.error(e);
        }
        return await remove(id);
    };

    // Blend local difficulties seamlessly
    const enrichedTodos = (todos || []).map(t => {
        const localDiff = getLocalDifficulties()[t.id];
        return {
            ...t,
            difficulty: t.difficulty || localDiff || 'medium'
        };
    });

    return {
        todos: enrichedTodos,
        loading,
        error,
        addTodo,
        toggleTodo,
        updateTodo,
        deleteTodo,
        saveLocalDifficulty
    };
}

export default useTodos;
