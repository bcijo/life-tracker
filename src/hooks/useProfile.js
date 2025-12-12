import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const useProfile = () => {
    const [profile, setProfile] = useState(null);
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

            if (error && error.code !== 'PGRST116') { // Not found error
                console.error('Error fetching profile:', error);
            }

            setProfile(data);
            setLoading(false);
        } catch (err) {
            console.error('Error:', err);
            setLoading(false);
        }
    };

    const updateProfile = async (updates) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return { error: 'Not authenticated' };

            const { data, error } = await supabase
                .from('profiles')
                .upsert({ id: user.id, ...updates })
                .select()
                .single();

            if (error) throw error;

            setProfile(data);
            return { data, error: null };
        } catch (err) {
            console.error('Error updating profile:', err);
            return { error: err.message };
        }
    };

    return { profile, loading, updateProfile, refetch: fetchProfile };
};
