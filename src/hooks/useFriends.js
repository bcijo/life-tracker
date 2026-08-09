import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import useAuth from './useAuth';

/**
 * Client-side calculation for the logged-in user's own habit score.
 * (Always works for user.id because RLS allows users to read their own habits table rows).
 */
const computeMyHabitScore = async (userId) => {
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

      if (history.length > 0) activeHabitCount++;

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
      (totalCompletions30d * 10) + (completionRate * 2)
    );

    return { score, completions_30d: totalCompletions30d, active_habits: activeHabitCount, completion_rate: completionRate };
  } catch (err) {
    console.error('Error computing score for self:', err);
    return defaultScore;
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

      // 1. Fetch raw friendships for current user (requester or addressee)
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
        // 2. Collect all other user IDs involved in friendships
        const otherUserIds = [...new Set(
          rawFriendships.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id)
        )];

        // 3. Fetch profiles for all involved users in a single query
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

        // 4. Process friendships into categorized lists
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
            // Fetch score for friend via RPC (bypasses RLS)
            let scoreInfo = { score: 0, completions_30d: 0, active_habits: 0, completion_rate: 0 };
            const { data: scoreData, error: scoreError } = await supabase.rpc('get_user_habit_score', {
              target_user_id: otherUserId
            });
            
            if (!scoreError && scoreData) {
              scoreInfo = Array.isArray(scoreData) ? (scoreData[0] || scoreInfo) : scoreData;
            }

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

      // 5. Fetch my own score: try client calculation first, fallback to RPC
      const selfScore = await computeMyHabitScore(user.id);
      if (selfScore && selfScore.score > 0) {
        setMyScore(selfScore);
      } else {
        const { data: rpcScore } = await supabase.rpc('get_user_habit_score', { target_user_id: user.id });
        setMyScore(rpcScore || selfScore);
      }

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

  const sendFriendRequest = async (username) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    try {
      const cleanUsername = username ? username.trim().replace(/^@/, '') : '';
      if (!cleanUsername) return { success: false, error: 'Please enter a username' };

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, full_name')
        .ilike('username', cleanUsername)
        .limit(1);
        
      if (profileError) throw profileError;
      if (!profiles || profiles.length === 0) {
        return { success: false, error: `No user found with username "@${cleanUsername}"` };
      }
      
      const targetUserId = profiles[0].id;
      if (targetUserId === user.id) return { success: false, error: 'Cannot send a friend request to yourself' };

      const { data: existing, error: existingError } = await supabase
        .from('friendships')
        .select('id, status, requester_id')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
        .limit(1);
        
      if (existingError) throw existingError;

      if (existing && existing.length > 0) {
        const item = existing[0];
        if (item.status === 'accepted') return { success: false, error: `You are already friends with @${cleanUsername}!` };
        if (item.requester_id === user.id) return { success: false, error: `Friend request is already pending with @${cleanUsername}` };
        return { success: false, error: `@${cleanUsername} has already sent you a request! Check incoming requests.` };
      }

      const { error: insertError } = await supabase
        .from('friendships')
        .insert({ requester_id: user.id, addressee_id: targetUserId, status: 'pending' });
        
      if (insertError) {
        if (insertError.code === '23505') return { success: false, error: `A request is already pending with @${cleanUsername}` };
        throw insertError;
      }
      
      fetchFriendsAndScores();
      return { success: true };
    } catch (err) {
      console.error('Error sending friend request:', err);
      return { success: false, error: err.message || 'Failed to send friend request' };
    }
  };

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

  const searchUsers = async (query) => {
    if (!user || !query || query.trim().length < 2) return [];
    try {
      const cleanQuery = query.trim().replace(/^@/, '');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, full_name')
        .ilike('username', `%${cleanQuery}%`)
        .neq('id', user.id)
        .limit(10);
        
      if (error) throw error;
      
      return data.map(profile => ({
        ...profile,
        isFriend: friends.some(f => f.id === profile.id),
        isPending: pendingSent.some(p => p.addressee.id === profile.id) || pendingReceived.some(p => p.requester.id === profile.id)
      }));
    } catch (err) {
      console.error('Error searching users:', err);
      return [];
    }
  };

  return {
    friends, pendingReceived, pendingSent, myScore, loading, error,
    sendFriendRequest, acceptRequest, declineRequest, removeFriend, searchUsers, refresh: fetchFriendsAndScores
  };
};

export default useFriends;
