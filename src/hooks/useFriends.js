import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import useAuth from './useAuth';

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
            // Fetch score for this friend via RPC
            const { data: scoreData, error: scoreError } = await supabase.rpc('get_user_habit_score', {
              target_user_id: otherUserId
            });
            
            let scoreInfo = { score: 0, completions_30d: 0, active_habits: 0, completion_rate: 0 };
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

      // 5. Fetch my own score
      const { data: myScoreData, error: myScoreError } = await supabase.rpc('get_user_habit_score', {
        target_user_id: user.id
      });
      
      if (!myScoreError && myScoreData) {
        const parsed = Array.isArray(myScoreData) ? myScoreData[0] : myScoreData;
        setMyScore(parsed || { score: 0, completions_30d: 0, active_habits: 0, completion_rate: 0 });
      } else {
        setMyScore({ score: 0, completions_30d: 0, active_habits: 0, completion_rate: 0 });
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

    // Single unfiltered subscription — handles any changes involving current user
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

    // Auto-refresh when user switches back to the tab
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
      if (!cleanUsername) {
        return { success: false, error: 'Please enter a username' };
      }

      // 1. Find user by username (case-insensitive)
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
      
      if (targetUserId === user.id) {
        return { success: false, error: 'Cannot send a friend request to yourself' };
      }

      // 2. Check for existing friendship in either direction
      const { data: existing, error: existingError } = await supabase
        .from('friendships')
        .select('id, status, requester_id')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
        .limit(1);
        
      if (existingError) throw existingError;

      if (existing && existing.length > 0) {
        const item = existing[0];
        if (item.status === 'accepted') {
          return { success: false, error: `You are already friends with @${cleanUsername}!` };
        } else if (item.requester_id === user.id) {
          return { success: false, error: `Friend request is already pending with @${cleanUsername}` };
        } else {
          return { success: false, error: `@${cleanUsername} has already sent you a request! Check your incoming requests.` };
        }
      }

      // 3. Create request
      const { error: insertError } = await supabase
        .from('friendships')
        .insert({
          requester_id: user.id,
          addressee_id: targetUserId,
          status: 'pending'
        });
        
      if (insertError) {
        if (insertError.code === '23505') {
          return { success: false, error: `A request is already pending with @${cleanUsername}` };
        }
        throw insertError;
      }
      
      // Trigger instant refetch
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
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);
        
      if (error) throw error;
      fetchFriendsAndScores();
    } catch (err) {
      console.error('Error declining friend request:', err);
      throw err;
    }
  };

  const removeFriend = async (friendshipId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);
        
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
      
      return data.map(profile => {
        let isFriend = false;
        let isPending = false;
        
        if (friends.some(f => f.id === profile.id)) {
          isFriend = true;
        } else if (pendingSent.some(p => p.addressee.id === profile.id)) {
          isPending = true;
        } else if (pendingReceived.some(p => p.requester.id === profile.id)) {
          isPending = true;
        }
        
        return {
          ...profile,
          isFriend,
          isPending
        };
      });
    } catch (err) {
      console.error('Error searching users:', err);
      return [];
    }
  };

  return {
    friends,
    pendingReceived,
    pendingSent,
    myScore,
    loading,
    error,
    sendFriendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    searchUsers,
    refresh: fetchFriendsAndScores
  };
};

export default useFriends;
