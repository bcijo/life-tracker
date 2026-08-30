import { useState, useMemo, useCallback } from 'react';
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

    const [localDifficulties, setLocalDifficulties] = useState(getLocalDifficulties);

    const saveLocalDifficulty = useCallback((id, difficulty) => {
        if (!id) return;
        setLocalDifficulties(prev => {
            const next = { ...prev, [id]: difficulty };
            try {
                localStorage.setItem('todo_difficulties', JSON.stringify(next));
            } catch (e) {
                console.error(e);
            }
            return next;
        });
    }, []);

    const addTodo = async (text, deadline = null, difficulty = 'medium') => {
        const tempClientId = 'client-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
        saveLocalDifficulty(tempClientId, difficulty);

        const newTodo = {
            text,
            completed: false,
            deadline,
            difficulty,
            client_id: tempClientId
        };

        let res = await insert(newTodo);
        if (res?.error && typeof res.error === 'string' && (res.error.toLowerCase().includes('difficulty') || res.error.toLowerCase().includes('column') || res.error.toLowerCase().includes('schema'))) {
            // Fallback without difficulty column if DB table doesn't have the column yet
            res = await insert({ text, completed: false, deadline, client_id: tempClientId });
        }

        const realId = res?.data?.id || (Array.isArray(res?.data) ? res?.data?.[0]?.id : null);
        if (realId) {
            saveLocalDifficulty(realId, difficulty);
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
        if (res?.error && typeof res.error === 'string' && (res.error.toLowerCase().includes('difficulty') || res.error.toLowerCase().includes('column'))) {
            const { difficulty, ...safeUpdates } = updates;
            res = await update(id, safeUpdates);
        }
        return res;
    };

    const deleteTodo = async (id) => {
        setLocalDifficulties(prev => {
            const next = { ...prev };
            delete next[id];
            try {
                localStorage.setItem('todo_difficulties', JSON.stringify(next));
            } catch (e) {
                console.error(e);
            }
            return next;
        });
        return await remove(id);
    };

    // Blend local difficulties seamlessly
    const enrichedTodos = useMemo(() => {
        return (todos || []).map(t => {
            const localDiff = localDifficulties[t.id] || (t.client_id ? localDifficulties[t.client_id] : null);
            return {
                ...t,
                difficulty: t.difficulty || localDiff || 'medium'
            };
        });
    }, [todos, localDifficulties]);

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

