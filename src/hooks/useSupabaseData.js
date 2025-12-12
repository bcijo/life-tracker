import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Convert snake_case object keys to camelCase
 * @param {Object} obj - Object with snake_case keys
 * @returns {Object} Object with camelCase keys
 */
const camelizeKeys = (obj) => {
    if (Array.isArray(obj)) {
        return obj.map(item => camelizeKeys(item));
    }

    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    return Object.keys(obj).reduce((acc, key) => {
        // Convert snake_case to camelCase
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        acc[camelKey] = camelizeKeys(obj[key]);
        return acc;
    }, {});
};

/**
 * Generic hook for real-time Supabase data synchronization
 * @param {string} table - The name of the Supabase table
 * @param {string} orderBy - Column to order by (default: 'created_at')
 * @param {boolean} ascending - Sort order (default: false for descending)
 */
function useSupabaseData(table, orderBy = 'created_at', ascending = false) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Fetch initial data
        const fetchData = async () => {
            try {
                setLoading(true);

                // Get current user
                const { data: { user } } = await supabase.auth.getUser();

                const { data: fetchedData, error: fetchError } = await supabase
                    .from(table)
                    .select('*')
                    .eq('user_id', user?.id || '00000000-0000-0000-0000-000000000000')
                    .order(orderBy, { ascending });

                if (fetchError) throw fetchError;
                setData(camelizeKeys(fetchedData) || []);
                setError(null);
            } catch (err) {
                console.error(`Error fetching ${table}:`, err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Subscribe to real-time changes
        const channel = supabase
            .channel(`${table}_changes`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: table,
                },
                async (payload) => {
                    // Get current user to filter events
                    const { data: { user } } = await supabase.auth.getUser();
                    const userId = user?.id || '00000000-0000-0000-0000-000000000000';

                    if (payload.eventType === 'INSERT' && payload.new.user_id === userId) {
                        setData((current) => [camelizeKeys(payload.new), ...current]);
                    } else if (payload.eventType === 'UPDATE' && payload.new.user_id === userId) {
                        setData((current) =>
                            current.map((item) =>
                                item.id === payload.new.id ? camelizeKeys(payload.new) : item
                            )
                        );
                    } else if (payload.eventType === 'DELETE' && payload.old.user_id === userId) {
                        setData((current) =>
                            current.filter((item) => item.id !== payload.old.id)
                        );
                    }
                }
            )
            .subscribe();

        // Cleanup subscription
        return () => {
            supabase.removeChannel(channel);
        };
    }, [table, orderBy, ascending]);

    // Generic CRUD operations
    const insert = async (newItem) => {
        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();

            const { data: insertedData, error: insertError } = await supabase
                .from(table)
                .insert([{ ...newItem, user_id: user?.id }])
                .select()
                .single();

            if (insertError) throw insertError;
            return { data: insertedData, error: null };
        } catch (err) {
            console.error(`Error inserting into ${table}:`, err);
            return { data: null, error: err.message };
        }
    };

    const update = async (id, updates) => {
        try {
            const { data: updatedData, error: updateError } = await supabase
                .from(table)
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;
            return { data: updatedData, error: null };
        } catch (err) {
            console.error(`Error updating ${table}:`, err);
            return { data: null, error: err.message };
        }
    };

    const remove = async (id) => {
        try {
            const { error: deleteError } = await supabase
                .from(table)
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;
            return { error: null };
        } catch (err) {
            console.error(`Error deleting from ${table}:`, err);
            return { error: err.message };
        }
    };

    return {
        data,
        loading,
        error,
        insert,
        update,
        remove,
    };
}

export default useSupabaseData;
