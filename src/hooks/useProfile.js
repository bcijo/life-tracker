import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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

    return { profile, loading, updateProfile, refetch: fetchProfile };
};
