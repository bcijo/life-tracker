import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { format, subDays } from 'date-fns';
import { useEncryption } from '../contexts/EncryptionContext';

/**
 * Hook for managing daily journal entries with Client-Side Zero-Knowledge Encryption
 * Handles fetching today's entry, creating/updating entries, and getting historical data
 */
function useJournal() {
    const { encrypt, decrypt, isEncryptionReady } = useEncryption();
    const [todayEntry, setTodayEntry] = useState(null);
    const [weekEntries, setWeekEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const today = format(new Date(), 'yyyy-MM-dd');

    // Helper to decrypt an individual entry
    const decryptEntry = useCallback(async (entry) => {
        if (!entry) return entry;
        const [howWasToday, onYourMind, changeTomorrow] = await Promise.all([
            decrypt(entry.how_was_today),
            decrypt(entry.on_your_mind),
            decrypt(entry.change_for_tomorrow)
        ]);

        return {
            ...entry,
            how_was_today: howWasToday ?? '',
            on_your_mind: onYourMind ?? '',
            change_for_tomorrow: changeTomorrow ?? '',
        };
    }, [decrypt]);

    // Fetch today's journal entry and last 7 days
    useEffect(() => {
        let isMounted = true;

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
                    .maybeSingle();

                const decryptedToday = todayData ? await decryptEntry(todayData) : null;

                // Fetch last 7 days for weekly summary
                const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
                const { data: weekData } = await supabase
                    .from('journal_entries')
                    .select('*')
                    .eq('user_id', user.id)
                    .gte('date', weekAgo)
                    .order('date', { ascending: false });

                const decryptedWeek = weekData 
                    ? await Promise.all(weekData.map(e => decryptEntry(e))) 
                    : [];

                if (isMounted) {
                    setTodayEntry(decryptedToday);
                    setWeekEntries(decryptedWeek);
                }
            } catch (err) {
                console.error('Error fetching journal:', err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchJournalData();

        return () => {
            isMounted = false;
        };
    }, [today, isEncryptionReady, decryptEntry]);

    // Save or update today's journal entry
    const saveEntry = useCallback(async (updates) => {
        try {
            setSaving(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Encrypt sensitive reflection fields before storing in database
            const encryptedUpdates = { ...updates };
            if (updates.how_was_today !== undefined) {
                encryptedUpdates.how_was_today = await encrypt(updates.how_was_today);
            }
            if (updates.on_your_mind !== undefined) {
                encryptedUpdates.on_your_mind = await encrypt(updates.on_your_mind);
            }
            if (updates.change_for_tomorrow !== undefined) {
                encryptedUpdates.change_for_tomorrow = await encrypt(updates.change_for_tomorrow);
            }

            const entryData = {
                user_id: user.id,
                date: today,
                ...encryptedUpdates,
                updated_at: new Date().toISOString()
            };

            // Local state should retain clear text
            const clearTextState = {
                user_id: user.id,
                date: today,
                ...updates,
                updated_at: entryData.updated_at
            };

            if (todayEntry?.id) {
                // Update existing entry in Supabase with ciphertext
                const { data, error } = await supabase
                    .from('journal_entries')
                    .update(entryData)
                    .eq('id', todayEntry.id)
                    .select()
                    .single();

                if (error) throw error;
                // Keep clean plaintext in local UI state
                setTodayEntry(prev => ({ ...prev, ...clearTextState, id: data.id }));
            } else {
                // Create new entry in Supabase with ciphertext
                const { data, error } = await supabase
                    .from('journal_entries')
                    .insert([entryData])
                    .select()
                    .single();

                if (error) throw error;
                const newClearEntry = { ...clearTextState, id: data.id };
                setTodayEntry(newClearEntry);
                setWeekEntries(prev => [newClearEntry, ...prev]);
            }

            return { error: null };
        } catch (err) {
            console.error('Error saving journal:', err);
            return { error: err.message };
        } finally {
            setSaving(false);
        }
    }, [today, todayEntry, encrypt]);

    // Update a specific field with debouncing handled by component
    const updateField = useCallback((field, value) => {
        // Optimistic update (stays plaintext in memory)
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

