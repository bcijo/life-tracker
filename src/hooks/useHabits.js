import useSupabaseData from './useSupabaseData';

function useHabits() {
    const { data: habits, loading, error, insert, update, remove } = useSupabaseData('habits');

    const addHabit = async (name) => {
        const newHabit = {
            name,
            history: [],
        };
        return await insert(newHabit);
    };

    const toggleHabit = async (id) => {
        const habit = habits.find(h => h.id === id);
        if (!habit) return { error: 'Habit not found' };

        const today = new Date().toISOString().split('T')[0];
        let newHistory = [...(habit.history || [])];

        // Check if already logged today
        const todayIndex = newHistory.findIndex(date => date.startsWith(today));

        if (todayIndex >= 0) {
            // Remove today's entry
            newHistory.splice(todayIndex, 1);
        } else {
            // Add today's entry at the beginning
            newHistory.unshift(new Date().toISOString());
        }

        return await update(id, { history: newHistory });
    };

    const deleteHabit = async (id) => {
        return await remove(id);
    };

    return {
        habits,
        loading,
        error,
        addHabit,
        toggleHabit,
        deleteHabit,
    };
}

export default useHabits;
