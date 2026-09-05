import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import useAuth from './useAuth';
import { getLocalDateStr } from '../utils/duoHabitGamification';

export function useMutualHabits() {
  const { user } = useAuth();
  const [pacts, setPacts] = useState([]);
  const [nudges, setNudges] = useState([]);
  const [partnerHabitsMap, setPartnerHabitsMap] = useState({});
  const [partnerProfilesMap, setPartnerProfilesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all pacts & related details
  const fetchPacts = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch pacts for current user
      const { data: pactsData, error: pactsErr } = await supabase
        .from('habit_pacts')
        .select('*')
        .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (pactsErr) {
        // If table doesn't exist yet, handle gracefully
        if (pactsErr.code === '42P01' || pactsErr.message?.includes('does not exist')) {
          console.warn('habit_pacts table does not exist yet. Run mutual-habits-schema.sql in Supabase.');
          setPacts([]);
          setLoading(false);
          return;
        }
        throw pactsErr;
      }

      const allPacts = pactsData || [];
      setPacts(allPacts);

      // 2. Fetch profiles for partners
      const partnerUserIds = [
        ...new Set(
          allPacts.map(p => (p.creator_id === user.id ? p.partner_id : p.creator_id))
        )
      ].filter(Boolean);

      if (partnerUserIds.length > 0) {
        const { data: profiles, error: profErr } = await supabase
          .from('profiles')
          .select('id, username, display_name, full_name')
          .in('id', partnerUserIds);

        if (!profErr && profiles) {
          const profMap = {};
          profiles.forEach(p => {
            const resolvedName = p.display_name?.trim() || p.full_name?.trim() || p.username || 'Friend';
            profMap[p.id] = {
              ...p,
              name: resolvedName,
              display_name: resolvedName,
            };
          });
          setPartnerProfilesMap(profMap);
        }

        // 3. Fetch habits for active pacts
        const activePacts = allPacts.filter(p => p.status === 'active');
        const partnerHabitIds = activePacts.map(p => 
          p.creator_id === user.id ? p.partner_habit_id : p.creator_habit_id
        ).filter(Boolean);

        if (partnerHabitIds.length > 0) {
          const { data: habitsData, error: habitsErr } = await supabase
            .from('habits')
            .select('id, name, history, active_days, time_of_day, user_id')
            .in('id', partnerHabitIds);

          if (!habitsErr && habitsData) {
            const hMap = {};
            habitsData.forEach(h => {
              hMap[h.id] = h;
            });
            setPartnerHabitsMap(hMap);
          }
        }
      }

      // 4. Fetch unread nudges
      try {
        const { data: nudgesData, error: nudgesErr } = await supabase
          .from('pact_nudges')
          .select('*')
          .eq('receiver_id', user.id)
          .eq('read', false)
          .order('created_at', { ascending: false });

        if (!nudgesErr && nudgesData) {
          setNudges(nudgesData);
        }
      } catch (nErr) {
        console.warn('Error fetching pact nudges:', nErr);
      }

    } catch (err) {
      console.error('Error in useMutualHabits:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load + Realtime subscriptions
  useEffect(() => {
    fetchPacts();
    if (!user) return;

    // Realtime channel for pacts
    const channel = supabase
      .channel(`mutual_habits_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'habit_pacts',
        },
        () => {
          fetchPacts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pact_nudges',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchPacts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'habits',
        },
        () => {
          // Re-fetch when partner habit changes
          fetchPacts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchPacts]);

  // Send a new pact invitation to a friend
  const sendPactInvite = async ({
    partnerId,
    habitName,
    activeDays = [0, 1, 2, 3, 4, 5, 6],
    timeOfDay = 'morning',
    existingHabitId = null,
  }) => {
    if (!user) throw new Error('User not logged in');

    const { data: newPact, error: pactErr } = await supabase
      .from('habit_pacts')
      .insert({
        name: habitName,
        creator_id: user.id,
        partner_id: partnerId,
        creator_habit_id: existingHabitId,
        active_days: activeDays,
        time_of_day: timeOfDay,
        status: 'pending',
      })
      .select()
      .single();

    if (pactErr) throw pactErr;

    // Also send an invite nudge
    try {
      await supabase.from('pact_nudges').insert({
        pact_id: newPact.id,
        sender_id: user.id,
        receiver_id: partnerId,
        type: 'invite',
        message: `invited you to an accountability pact for "${habitName}"!`,
      });
    } catch (e) {
      console.warn('Failed to send invite nudge:', e);
    }

    await fetchPacts();
    return newPact;
  };

  // Accept incoming pact
  const acceptPactInvite = async ({ pactId, habitId }) => {
    if (!user) throw new Error('User not logged in');

    const { error: updateErr } = await supabase
      .from('habit_pacts')
      .update({
        partner_habit_id: habitId,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', pactId);

    if (updateErr) throw updateErr;

    // Send confirmation nudge to creator
    const pact = pacts.find(p => p.id === pactId);
    if (pact) {
      try {
        await supabase.from('pact_nudges').insert({
          pact_id: pactId,
          sender_id: user.id,
          receiver_id: pact.creator_id,
          type: 'high_five',
          message: `accepted your pact for "${pact.name}"! Time to build momentum 🔥`,
        });
      } catch (e) {
        console.warn('Failed to send accept nudge:', e);
      }
    }

    await fetchPacts();
  };

  // Decline incoming pact
  const declinePactInvite = async (pactId) => {
    const { error: updateErr } = await supabase
      .from('habit_pacts')
      .update({
        status: 'declined',
        updated_at: new Date().toISOString(),
      })
      .eq('id', pactId);

    if (updateErr) throw updateErr;
    await fetchPacts();
  };

  // Cancel or leave active pact
  const cancelPact = async (pactId) => {
    const { error: delErr } = await supabase
      .from('habit_pacts')
      .delete()
      .eq('id', pactId);

    if (delErr) throw delErr;
    await fetchPacts();
  };

  // Send real-time nudge or high-five to partner
  const sendNudge = async ({ pactId, partnerId, type = 'nudge', habitName = '' }) => {
    if (!user) return;

    const defaultMessages = {
      nudge: `nudged you: Don't forget your "${habitName}" today! ⚡`,
      high_five: `gave you a high-five for completing "${habitName}"! ✋🔥`,
    };

    const { error: nudgeErr } = await supabase.from('pact_nudges').insert({
      pact_id: pactId,
      sender_id: user.id,
      receiver_id: partnerId,
      type,
      message: defaultMessages[type] || `sent you a ${type}!`,
    });

    if (nudgeErr) throw nudgeErr;
  };

  // Dismiss / mark nudges as read
  const markNudgesAsRead = async (nudgeIds) => {
    if (!nudgeIds || nudgeIds.length === 0) return;
    try {
      await supabase
        .from('pact_nudges')
        .update({ read: true })
        .in('id', nudgeIds);

      setNudges(prev => prev.filter(n => !nudgeIds.includes(n.id)));
    } catch (e) {
      console.error('Failed to mark nudges read:', e);
    }
  };

  // Split into active, pending sent, and pending received
  const activePacts = useMemo(() => {
    return pacts.filter(p => p.status === 'active');
  }, [pacts]);

  const pendingReceivedPacts = useMemo(() => {
    return pacts.filter(p => p.status === 'pending' && p.partner_id === user?.id);
  }, [pacts, user?.id]);

  const pendingSentPacts = useMemo(() => {
    return pacts.filter(p => p.status === 'pending' && p.creator_id === user?.id);
  }, [pacts, user?.id]);

  // Map user habits to their associated pacts for quick O(1) lookup
  const habitToPactMap = useMemo(() => {
    const map = {};
    if (!user) return map;

    activePacts.forEach(p => {
      const myHabitId = p.creator_id === user.id ? p.creator_habit_id : p.partner_habit_id;
      const partnerId = p.creator_id === user.id ? p.partner_id : p.creator_id;
      const partnerHabitId = p.creator_id === user.id ? p.partner_habit_id : p.creator_habit_id;

      if (myHabitId) {
        map[myHabitId] = {
          pact: p,
          partnerId,
          partnerProfile: partnerProfilesMap[partnerId] || { display_name: 'Partner', username: 'partner' },
          partnerHabit: partnerHabitsMap[partnerHabitId] || null,
        };
      }
    });

    return map;
  }, [activePacts, user, partnerProfilesMap, partnerHabitsMap]);

  return {
    pacts,
    activePacts,
    pendingReceivedPacts,
    pendingSentPacts,
    nudges,
    partnerHabitsMap,
    partnerProfilesMap,
    habitToPactMap,
    loading,
    error,
    sendPactInvite,
    acceptPactInvite,
    declinePactInvite,
    cancelPact,
    sendNudge,
    markNudgesAsRead,
    refresh: fetchPacts,
  };
}

export default useMutualHabits;
