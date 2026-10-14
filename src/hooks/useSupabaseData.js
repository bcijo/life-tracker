import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Module-level broadcaster for cross-hook synchronization within the same window
const tableListeners = new Map();

const broadcastChange = (table, event, sourceListener) => {
    const listeners = tableListeners.get(table);
    if (listeners) {
        listeners.forEach(listener => {
            if (listener !== sourceListener) {
                try {
                    listener(event);
                } catch (err) {
                    console.error(`Error notifying listener for ${table}:`, err);
                }
            }
        });
    }
};

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
    const listenerRef = useRef(null);

    // Register cross-hook listener for the same table across components
    useEffect(() => {
        if (!tableListeners.has(table)) {
            tableListeners.set(table, new Set());
        }

        const listener = (event) => {
            if (event.type === 'INSERT') {
                setData((current) => {
                    if (current.some(item => item.id === event.item.id)) return current;
                    return [event.item, ...current];
                });
            } else if (event.type === 'UPDATE') {
                setData((current) =>
                    current.map((item) =>
                        item.id === event.id ? { ...item, ...event.updates } : item
                    )
                );
            } else if (event.type === 'DELETE') {
                setData((current) => current.filter((item) => item.id !== event.id));
            } else if (event.type === 'REPLACE_TEMP') {
                setData((current) =>
                    current.map((item) =>
                        item.id === event.tempId ? event.finalItem : item
                    )
                );
            } else if (event.type === 'ROLLBACK_INSERT') {
                setData((current) => current.filter((item) => item.id !== event.tempId));
            } else if (event.type === 'ROLLBACK_DELETE') {
                setData((current) => [event.item, ...current]);
            } else if (event.type === 'ROLLBACK_UPDATE') {
                setData((current) =>
                    current.map((item) =>
                        item.id === event.id ? event.oldItem : item
                    )
                );
            }
        };

        listenerRef.current = listener;
        tableListeners.get(table).add(listener);

        return () => {
            const listeners = tableListeners.get(table);
            if (listeners) {
                listeners.delete(listener);
                if (listeners.size === 0) {
                    tableListeners.delete(table);
                }
            }
        };
    }, [table]);

    // Update localStorage whenever data changes (debounced to avoid blocking on every change)
    useEffect(() => {
        if (loading) return;
        const timer = setTimeout(() => {
            try {
                localStorage.setItem(`supa_cache_${table}`, JSON.stringify(data));
            } catch (e) {
                console.warn(`Error caching ${table}`, e);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [data, table, loading]);

    useEffect(() => {
        let cancelled = false;
        let channel = null;

        const init = async () => {
            try {
                // Get current user from local session quickly without extra network round-trips
                const { data: { session } } = await supabase.auth.getSession();
                let userId = session?.user?.id;
                if (!userId) {
                    const { data: { user } } = await supabase.auth.getUser();
                    userId = user?.id;
                }
                if (cancelled) return;

                // Subscribe first (server-side filtered to this user's rows only)
                if (userId) {
                    channel = supabase
                        .channel(`${table}_changes_${Math.random().toString(36).slice(2, 9)}`)
                        .on(
                            'postgres_changes',
                            {
                                event: '*',
                                schema: 'public',
                                table: table,
                                filter: `user_id=eq.${userId}`,
                            },
                            (payload) => {
                                if (payload.eventType === 'INSERT') {
                                    setData((current) => {
                                        // Prevent duplicates if already added by optimistic update
                                        if (current.some(item => item.id === payload.new.id)) return current;
                                        return [payload.new, ...current];
                                    });
                                    broadcastChange(table, { type: 'INSERT', item: payload.new }, listenerRef.current);
                                } else if (payload.eventType === 'UPDATE') {
                                    setData((current) =>
                                        current.map((item) =>
                                            item.id === payload.new.id ? payload.new : item
                                        )
                                    );
                                    broadcastChange(table, { type: 'UPDATE', id: payload.new.id, updates: payload.new }, listenerRef.current);
                                }
                            }
                        )
                        // Realtime filters are not supported for DELETE events; match by id instead
                        .on(
                            'postgres_changes',
                            { event: 'DELETE', schema: 'public', table: table },
                            (payload) => {
                                const deletedId = payload.old?.id;
                                if (deletedId === undefined) return;
                                setData((current) => current.filter((item) => item.id !== deletedId));
                                broadcastChange(table, { type: 'DELETE', id: deletedId }, listenerRef.current);
                            }
                        )
                        .subscribe();
                }

                // If we have cached data, don't show full loading, just background refresh
                if (data.length === 0) setLoading(true);

                const { data: fetchedData, error: fetchError } = await supabase
                    .from(table)
                    .select('*')
                    .eq('user_id', userId || '00000000-0000-0000-0000-000000000000')
                    .order(orderBy, { ascending });

                if (fetchError) throw fetchError;
                if (cancelled) return;

                setData(fetchedData || []);
                setError(null);
            } catch (err) {
                console.error(`Error fetching ${table}:`, err);
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        init();

        // Cleanup subscription
        return () => {
            cancelled = true;
            if (channel) supabase.removeChannel(channel);
        };
    }, [table, orderBy, ascending]); // Keep dependencies stable

    // Generic CRUD operations
    const insert = async (newItem) => {
        try {
            // Get current user from local session (no network round-trip)
            const { data: { session } } = await supabase.auth.getSession();
            let user = session?.user;
            if (!user) {
                ({ data: { user } } = await supabase.auth.getUser());
            }
            const payload = { ...newItem, user_id: user?.id, created_at: new Date().toISOString() };

            // Optimistic update
            const tempId = 'temp-' + Date.now();
            const optimisticItem = { ...payload, id: tempId };

            setData(current => {
                const next = [optimisticItem, ...current];
                try {
                    localStorage.setItem(`supa_cache_${table}`, JSON.stringify(next));
                } catch (e) {}
                return next;
            });
            broadcastChange(table, { type: 'INSERT', item: optimisticItem }, listenerRef.current);

            // Strip client-side transient fields before sending to Supabase
            const { client_id, ...dbPayload } = payload;

            const { data: insertedData, error: insertError } = await supabase
                .from(table)
                .insert([dbPayload])
                .select()
                .single();

            if (insertError) {
                // Rollback
                setData(current => {
                    const next = current.filter(item => item.id !== tempId);
                    try {
                        localStorage.setItem(`supa_cache_${table}`, JSON.stringify(next));
                    } catch (e) {}
                    return next;
                });
                broadcastChange(table, { type: 'ROLLBACK_INSERT', tempId }, listenerRef.current);
                throw insertError;
            }

            // Replace temp item with real item, preserving client_id for seamless animations
            if (insertedData) {
                const finalItem = { ...optimisticItem, ...insertedData };
                setData(current => {
                    const next = current.map(item => item.id === tempId ? finalItem : item);
                    try {
                        localStorage.setItem(`supa_cache_${table}`, JSON.stringify(next));
                    } catch (e) {}
                    return next;
                });
                broadcastChange(table, { type: 'REPLACE_TEMP', tempId, finalItem }, listenerRef.current);
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
            setData(current => {
                const next = current.map(item => item.id === id ? { ...item, ...updates } : item);
                try {
                    localStorage.setItem(`supa_cache_${table}`, JSON.stringify(next));
                } catch (e) {}
                return next;
            });
            broadcastChange(table, { type: 'UPDATE', id, updates }, listenerRef.current);

            const { data: updatedData, error: updateError } = await supabase
                .from(table)
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (updateError) {
                // Rollback
                if (oldData) {
                    setData(current => {
                        const next = current.map(item => item.id === id ? oldData : item);
                        try {
                            localStorage.setItem(`supa_cache_${table}`, JSON.stringify(next));
                        } catch (e) {}
                        return next;
                    });
                    broadcastChange(table, { type: 'ROLLBACK_UPDATE', id, oldItem: oldData }, listenerRef.current);
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
            setData(current => {
                const next = current.filter(item => item.id !== id);
                try {
                    localStorage.setItem(`supa_cache_${table}`, JSON.stringify(next));
                } catch (e) {}
                return next;
            });
            broadcastChange(table, { type: 'DELETE', id }, listenerRef.current);

            const { error: deleteError } = await supabase
                .from(table)
                .delete()
                .eq('id', id);

            if (deleteError) {
                // Rollback
                if (oldData) {
                    setData(current => {
                        const next = [oldData, ...current];
                        try {
                            localStorage.setItem(`supa_cache_${table}`, JSON.stringify(next));
                        } catch (e) {}
                        return next;
                    });
                    broadcastChange(table, { type: 'ROLLBACK_DELETE', item: oldData }, listenerRef.current);
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
