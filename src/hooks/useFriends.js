import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import useAuth from './useAuth';
import { computeGamifiedHabitMetrics, getLocalDateStr } from '../utils/habitGamification';

export const computeScoreForUserHabits = (userHabits, startDateStr = null) => {
  if (!userHabits || userHabits.length === 0) {
    return { 
      score: 0, 
      completions: 0, 
      completions_30d: 0, 
      active_habits: 0, 
      completion_rate: 0,
      level: 1,
      rankTitle: 'Habit Novice',
      rankIcon: '🌱'
    };
  }

  const metrics = computeGamifiedHabitMetrics(
    userHabits, 
    startDateStr ? 'this_week' : 'all_time'
  );

  return {
    score: metrics.score,
    completions: metrics.completions,
    completions_30d: metrics.thirtyDayCompletions || metrics.completions,
    active_habits: metrics.activeHabits,
    completion_rate: metrics.consistencyRate,
    level: metrics.level,
    rankTitle: metrics.rankTitle,
    rankIcon: metrics.rankIcon,
    breakdown: metrics.breakdown,
    startDate: startDateStr || metrics.startDate
  };
};

export const fetchHabitsForUser = async (userId) => {
  try {
    const { data: habits, error } = await supabase
      .from('habits')
      .select('id, name, history, active_days')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching habits for user:', userId, error);
      return [];
    }
    return habits || [];
  } catch (err) {
    console.error('Error fetching habits for user:', userId, err);
    return [];
  }
};

export const fetchScoreForUser = async (userId, startDateStr = null) => {
  try {
    const habits = await fetchHabitsForUser(userId);
    return computeScoreForUserHabits(habits, startDateStr);
  } catch (err) {
    console.error('Error fetching score for user:', userId, err);
    return { score: 0, completions: 0, completions_30d: 0, active_habits: 0, completion_rate: 0 };
  }
};

export const useFriends = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [pendingReceived, setPendingReceived] = useState([]);
  const [pendingSent, setPendingSent] = useState([]);
  const [myScore, setMyScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFriendsAndScores = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch raw friendships for current user
      const { data: rawFriendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('id, requester_id, addressee_id, status, created_at')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (friendshipsError) throw friendshipsError;

      if (!rawFriendships || rawFriendships.length === 0) {
        setFriends([]);
        setPendingReceived([]);
        setPendingSent([]);
      } else {
        const otherUserIds = [...new Set(
          rawFriendships.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id)
        )];

        let profileMap = new Map();
        if (otherUserIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, display_name, full_name')
            .in('id', otherUserIds);

          if (profilesError) console.warn('Error fetching friend profiles:', profilesError);
          else {
            profileMap = new Map((profilesData || []).map(p => [p.id, p]));
          }
        }

        const acceptedFriends = [];
        const received = [];
        const sent = [];

        for (const f of rawFriendships) {
          const isRequester = f.requester_id === user.id;
          const otherUserId = isRequester ? f.addressee_id : f.requester_id;
          const otherProfile = profileMap.get(otherUserId) || {
            id: otherUserId,
            username: 'User',
            display_name: 'User',
            full_name: ''
          };

          if (f.status === 'accepted') {
            const scoreInfo = await fetchScoreForUser(otherUserId);
            acceptedFriends.push({
              id: otherProfile.id,
              friendship_id: f.id,
              username: otherProfile.username,
              display_name: otherProfile.display_name,
              full_name: otherProfile.full_name,
              ...scoreInfo
            });
          } else if (f.status === 'pending') {
            if (f.addressee_id === user.id) {
              received.push({
                friendship_id: f.id,
                requester: otherProfile,
                created_at: f.created_at
              });
            } else {
              sent.push({
                friendship_id: f.id,
                addressee: otherProfile,
                created_at: f.created_at
              });
            }
          }
        }

        setFriends(acceptedFriends);
        setPendingReceived(received);
        setPendingSent(sent);
      }

      // 5. Fetch my own score
      const selfScore = await fetchScoreForUser(user.id);
      setMyScore(selfScore);

    } catch (err) {
      console.error('Error fetching friends:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFriendsAndScores();
    if (!user) return;

    const subscription = supabase
      .channel(`friendships_channel_${user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'friendships'
      }, (payload) => {
        const row = payload.new || payload.old;
        if (row && (row.requester_id === user.id || row.addressee_id === user.id)) {
          fetchFriendsAndScores();
        }
      })
      .subscribe();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchFriendsAndScores();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      supabase.removeChannel(subscription);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, fetchFriendsAndScores]);

  const acceptRequest = async (friendshipId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', friendshipId);
      if (error) throw error;
      fetchFriendsAndScores();
    } catch (err) {
      console.error('Error accepting friend request:', err);
      throw err;
    }
  };

  const declineRequest = async (friendshipId) => {
    try {
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
      if (error) throw error;
      fetchFriendsAndScores();
    } catch (err) {
      console.error('Error declining friend request:', err);
      throw err;
    }
  };

  const removeFriend = async (friendshipId) => {
    try {
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
      if (error) throw error;
      fetchFriendsAndScores();
    } catch (err) {
      console.error('Error removing friend:', err);
      throw err;
    }
  };

  return {
    friends, pendingReceived, pendingSent, myScore, loading, error,
    acceptRequest, declineRequest, removeFriend, refresh: fetchFriendsAndScores
  };
};

export default useFriends;

