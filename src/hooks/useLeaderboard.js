import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import useAuth from './useAuth';

/**
 * Compute habit score for a user directly from their habits data.
 * Identical logic to the one in useFriends.js — computes completions,
 * active habits, completion rate, and a weighted overall score.
 */
const computeScoreFromHabits = async (userId) => {
  const defaultScore = { score: 0, completions_30d: 0, active_habits: 0, completion_rate: 0 };

  try {
    const { data: habits, error } = await supabase
      .from('habits')
      .select('history, active_days, is_paused')
      .eq('user_id', userId);

    if (error || !habits || habits.length === 0) return defaultScore;

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    let totalCompletions30d = 0;
    let activeHabitCount = 0;
    let totalActiveDays30d = 0;
    let totalCompletedActiveDays30d = 0;

    for (const habit of habits) {
      if (habit.is_paused) continue;

      const history = habit.history || [];
      const activeDays = habit.active_days || [0, 1, 2, 3, 4, 5, 6];

      if (history.length > 0) {
        activeHabitCount++;
      }

      let habitCompletions30d = 0;
      for (const entry of history) {
        const date = typeof entry === 'string' ? entry.split('T')[0] : entry.date;
        const status = typeof entry === 'string' ? 'completed' : entry.status;

        if (date >= thirtyDaysAgoStr && date <= todayStr && status === 'completed') {
          habitCompletions30d++;
        }
      }
      totalCompletions30d += habitCompletions30d;

      const completedDates = new Set(
        history
          .filter(e => (typeof e === 'string' ? 'completed' : e.status) === 'completed')
          .map(e => typeof e === 'string' ? e.split('T')[0] : e.date)
      );

      const cursor = new Date(thirtyDaysAgo);
      while (cursor <= now) {
        if (activeDays.includes(cursor.getDay())) {
          totalActiveDays30d++;
          if (completedDates.has(cursor.toISOString().split('T')[0])) {
            totalCompletedActiveDays30d++;
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    const completionRate = totalActiveDays30d > 0
      ? Math.round((totalCompletedActiveDays30d / totalActiveDays30d) * 100)
      : 0;

    const score = Math.round(
      (totalCompletions30d * 2) +
      (completionRate * 1.5) +
      (activeHabitCount * 10)
    );

    return { score, completions_30d: totalCompletions30d, active_habits: activeHabitCount, completion_rate: completionRate };
  } catch (err) {
    console.error('Error computing score for user:', userId, err);
    return defaultScore;
  }
};

export const useLeaderboard = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [scope, setScope] = useState('friends');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);

      let userIds = [];

      if (scope === 'friends') {
        // Get friend user IDs
        const { data: friendships, error: fError } = await supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

        if (fError) throw fError;

        const friendUserIds = (friendships || []).map(f =>
          f.requester_id === user.id ? f.addressee_id : f.requester_id
        );

        // Include self + friends
        userIds = [user.id, ...new Set(friendUserIds)];
      } else {
        // Global: get all users who have a profile
        const { data: profiles, error: pError } = await supabase
          .from('profiles')
          .select('id')
          .not('username', 'is', null);

        if (pError) throw pError;
        userIds = (profiles || []).map(p => p.id);
        // Ensure current user is included
        if (!userIds.includes(user.id)) {
          userIds.push(user.id);
        }
      }

      // Fetch profiles for all users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Compute scores for all users
      const entries = await Promise.all(
        userIds.map(async (uid) => {
          const scoreData = await computeScoreFromHabits(uid);
          const profile = profileMap.get(uid) || { username: 'Unknown', display_name: null, full_name: null };

          return {
            user_id: uid,
            username: profile.username,
            display_name: profile.display_name,
            full_name: profile.full_name,
            ...scoreData,
          };
        })
      );

      // Sort by score descending, then by completions
      entries.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.completions_30d - a.completions_30d;
      });

      // Assign ranks
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      setLeaderboard(entries);

      const myEntry = entries.find(e => e.user_id === user.id);
      setMyRank(myEntry ? myEntry.rank : null);

    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err);
      setLeaderboard([]);
      setMyRank(null);
    } finally {
      setLoading(false);
    }
  }, [user, scope]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    leaderboard,
    myRank,
    scope,
    setScope,
    loading,
    error,
    refresh: fetchLeaderboard
  };
};

export default useLeaderboard;
