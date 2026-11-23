import React, { useEffect, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import HabitPackSheet from './HabitPackSheet';
import { packOfferKey } from '../../lib/habitPacks';

/**
 * Offers the starter habit pack once, to a signed-in user who has no habits
 * yet (typically right after sign-up). Dismissing or adding records that the
 * offer was shown, per user, so it never pops up again on its own.
 */
const HabitPackPrompt = ({ habits = [], loading, addHabit, onAdded }) => {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!user?.id || loading || habits.length > 0) return;
        let seen = false;
        try { seen = Boolean(localStorage.getItem(packOfferKey(user.id))); } catch { seen = false; }
        if (seen) return;
        // Small delay so it doesn't fight the page's own entrance animation
        const t = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(t);
    }, [user?.id, loading, habits.length]);

    const close = () => {
        setOpen(false);
        try { localStorage.setItem(packOfferKey(user?.id), new Date().toISOString()); } catch { /* ignore */ }
    };

    return (
        <HabitPackSheet
            isOpen={open}
            onClose={close}
            habits={habits}
            addHabit={addHabit}
            onAdded={onAdded}
        />
    );
};

export default HabitPackPrompt;
