import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { generateUsername } from '../lib/usernameGenerator';

export const useProfile = () => {
    const [profile, setProfile] = useState(() => {
        try {
            const cached = localStorage.getItem('supa_cache_profile');
            return cached ? JSON.parse(cached) : null;
        } catch { return null; }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error && error.code === 'PGRST116') {
                // Profile not found, create one
                const newProfile = { id: user.id, display_name: user.email.split('@')[0], email: user.email };
                const { data: created } = await supabase.from('profiles').insert([newProfile]).select().single();
                if (created) {
                    setProfile(created);
                    localStorage.setItem('supa_cache_profile', JSON.stringify(created));
                }
            } else if (data) {
                setProfile(data);
                localStorage.setItem('supa_cache_profile', JSON.stringify(data));
            }

            setLoading(false);
        } catch (err) {
            console.error('Error fetching profile:', err);
            setLoading(false);
        }
    };

    const updateProfile = async (updates) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { error: 'Not authenticated' };

            // Optimistic update
            const oldProfile = profile;
            const optimistic = { ...profile, ...updates };
            setProfile(optimistic);
            localStorage.setItem('supa_cache_profile', JSON.stringify(optimistic));

            const { data, error } = await supabase
                .from('profiles')
                .upsert({ id: user.id, ...updates })
                .select()
                .single();

            if (error) {
                setProfile(oldProfile); // Rollback
                throw error;
            }

            setProfile(data);
            localStorage.setItem('supa_cache_profile', JSON.stringify(data));
            return { data, error: null };
        } catch (err) {
            return { error: err.message };
        }
    };

    // Check if a username is available (case-insensitive)
    const checkUsernameAvailable = useCallback(async (username) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .ilike('username', username)
                .maybeSingle();

            if (error) throw error;

            // If no row found, it's available
            // If found but it's the current user's, it's also "available" (it's theirs)
            if (!data) return true;

            const { data: { user } } = await supabase.auth.getUser();
            return data.id === user?.id;
        } catch (err) {
            console.error('Error checking username:', err);
            return false;
        }
    }, []);

    // Generate a random username that doesn't collide with existing ones
    const generateUniqueUsername = useCallback(async () => {
        let attempts = 0;
        while (attempts < 10) {
            const candidate = generateUsername();
            const isAvailable = await checkUsernameAvailable(candidate);
            if (isAvailable) return candidate;
            attempts++;
        }
        // Fallback: add more random digits
        return generateUsername() + Math.floor(Math.random() * 1000);
    }, [checkUsernameAvailable]);

    // Generate and save a new random username
    const rerollUsername = useCallback(async () => {
        const newUsername = await generateUniqueUsername();
        const result = await updateProfile({ username: newUsername });
        return { username: newUsername, ...result };
    }, [generateUniqueUsername]);

    return { profile, loading, updateProfile, refetch: fetchProfile, checkUsernameAvailable, generateUniqueUsername, rerollUsername };
};
