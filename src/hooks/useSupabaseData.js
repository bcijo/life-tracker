import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Generic hook for real-time Supabase data synchronization with LocalStorage caching
 * @param {string} table - The name of the Supabase table
 * @param {string} orderBy - Column to order by (default: 'created_at')
 * @param {boolean} ascending - Sort order (default: false for descending)
 */
function useSupabaseData(table, orderBy = 'created_at', ascending = false) {
    const [data, setData] = useState(() => {
        // Initial state from localStorage
        try {
            const cached = localStorage.getItem(`supa_cache_${table}`);
            return cached ? JSON.parse(cached) : [];
        } catch (e) {
            console.warn(`Error parsing cache for ${table}`, e);
            return [];
        }
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Update localStorage whenever data changes
    useEffect(() => {
        if (data.length > 0) {
            localStorage.setItem(`supa_cache_${table}`, JSON.stringify(data));
        }
    }, [data, table]);

    useEffect(() => {
        // Fetch initial data
        const fetchData = async () => {
            try {
                // Determine if we show loading state:
                // If we have cached data, don't show full loading, just background refresh
                if (data.length === 0) setLoading(true);

                // Get current user
                const { data: { user } } = await supabase.auth.getUser();

                const { data: fetchedData, error: fetchError } = await supabase
                    .from(table)
                    .select('*')
                    .eq('user_id', user?.id || '00000000-0000-0000-0000-000000000000')
                    .order(orderBy, { ascending });

                if (fetchError) throw fetchError;

                // Only update state if data is different (deep compare could be expensive, so we just set it)
                setData(fetchedData || []);
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
                        setData((current) => {
                            // Prevent duplicates if already added by optimistic update
                            if (current.some(item => item.id === payload.new.id)) return current;
                            return [payload.new, ...current];
                        });
                    } else if (payload.eventType === 'UPDATE' && payload.new.user_id === userId) {
                        setData((current) =>
                            current.map((item) =>
                                item.id === payload.new.id ? payload.new : item
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
    }, [table, orderBy, ascending]); // Keep dependencies stable

    // Generic CRUD operations
    const insert = async (newItem) => {
        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            const payload = { ...newItem, user_id: user?.id, created_at: new Date().toISOString() };

            // Optimistic update
            const tempId = 'temp-' + Date.now();
            const optimisticItem = { ...payload, id: tempId };

            setData(current => [optimisticItem, ...current]);

            const { data: insertedData, error: insertError } = await supabase
                .from(table)
                .insert([payload])
                .select()
                .single();

            if (insertError) {
                // Rollback
                setData(current => current.filter(item => item.id !== tempId));
                throw insertError;
            }

            // Replace temp item with real item
            if (insertedData) {
                setData(current => current.map(item => item.id === tempId ? insertedData : item));
            }

            return { data: insertedData, error: null };
        } catch (err) {
            console.error(`Error inserting into ${table}:`, err);
            return { data: null, error: err.message };
        }
    };

    const update = async (id, updates) => {
        try {
            // Optimistic update
            const oldData = data.find(item => item.id === id);
            setData(current =>
                current.map(item => item.id === id ? { ...item, ...updates } : item)
            );

            const { data: updatedData, error: updateError } = await supabase
                .from(table)
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (updateError) {
                // Rollback
                if (oldData) {
                    setData(current =>
                        current.map(item => item.id === id ? oldData : item)
                    );
                }
                throw updateError;
            }

            return { data: updatedData, error: null };
        } catch (err) {
            console.error(`Error updating ${table}:`, err);
            return { data: null, error: err.message };
        }
    };

    const remove = async (id) => {
        try {
            // Optimistic update
            const oldData = data.find(item => item.id === id);
            setData(current => current.filter(item => item.id !== id));

            const { error: deleteError } = await supabase
                .from(table)
                .delete()
                .eq('id', id);

            if (deleteError) {
                // Rollback
                if (oldData) {
                    setData(current => [oldData, ...current]);
                }
                throw deleteError;
            }

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
