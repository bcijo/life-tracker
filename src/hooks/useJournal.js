import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { format, subDays } from 'date-fns';

/**
 * Hook for managing daily journal entries
 * Handles fetching today's entry, creating/updating entries, and getting historical data
 */
function useJournal() {
    const [todayEntry, setTodayEntry] = useState(null);
    const [weekEntries, setWeekEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const today = format(new Date(), 'yyyy-MM-dd');

    // Fetch today's journal entry and last 7 days
    useEffect(() => {
        const fetchJournalData = async () => {
            try {
                setLoading(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Fetch today's entry
                const { data: todayData } = await supabase
                    .from('journal_entries')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('date', today)
                    .single();

                setTodayEntry(todayData || null);

                // Fetch last 7 days for weekly summary
                const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
                const { data: weekData } = await supabase
                    .from('journal_entries')
                    .select('*')
                    .eq('user_id', user.id)
                    .gte('date', weekAgo)
                    .order('date', { ascending: false });

                setWeekEntries(weekData || []);
            } catch (err) {
                console.error('Error fetching journal:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchJournalData();
    }, [today]);

    // Save or update today's journal entry
    const saveEntry = useCallback(async (updates) => {
        try {
            setSaving(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const entryData = {
                user_id: user.id,
                date: today,
                ...updates,
                updated_at: new Date().toISOString()
            };

            if (todayEntry?.id) {
                // Update existing entry
                const { data, error } = await supabase
                    .from('journal_entries')
                    .update(entryData)
                    .eq('id', todayEntry.id)
                    .select()
                    .single();

                if (error) throw error;
                setTodayEntry(data);
            } else {
                // Create new entry
                const { data, error } = await supabase
                    .from('journal_entries')
                    .insert([entryData])
                    .select()
                    .single();

                if (error) throw error;
                setTodayEntry(data);
                setWeekEntries(prev => [data, ...prev]);
            }

            return { error: null };
        } catch (err) {
            console.error('Error saving journal:', err);
            return { error: err.message };
        } finally {
            setSaving(false);
        }
    }, [today, todayEntry]);

    // Update a specific field with debouncing handled by component
    const updateField = useCallback((field, value) => {
        // Optimistic update
        setTodayEntry(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    return {
        todayEntry,
        weekEntries,
        loading,
        saving,
        saveEntry,
        updateField
    };
}

export default useJournal;
