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

      // Fetch friendships
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select(`
          id,
          requester_id,
          addressee_id,
          status,
          created_at,
          requester:profiles!requester_id(id, username, display_name, full_name),
          addressee:profiles!addressee_id(id, username, display_name, full_name)
        `)
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (friendshipsError) throw friendshipsError;

      const acceptedFriends = [];
      const received = [];
      const sent = [];

      // Process friendships
      for (const f of friendships) {
        if (f.status === 'accepted') {
          const isRequester = f.requester_id === user.id;
          const friendProfile = isRequester ? f.addressee : f.requester;
          
          if (!friendProfile) continue;

          // Fetch score for this friend
          const { data: scoreData, error: scoreError } = await supabase.rpc('get_user_habit_score', {
            target_user_id: friendProfile.id
          });
          
          let scoreInfo = { score: 0, completions_30d: 0, active_habits: 0, completion_rate: 0 };
          if (!scoreError && scoreData && scoreData.length > 0) {
              scoreInfo = scoreData[0];
          }

          acceptedFriends.push({
            id: friendProfile.id,
            friendship_id: f.id,
            username: friendProfile.username,
            display_name: friendProfile.display_name,
            full_name: friendProfile.full_name,
            ...scoreInfo
          });
        } else if (f.status === 'pending') {
          if (f.addressee_id === user.id) {
            received.push({
              friendship_id: f.id,
              requester: f.requester,
              created_at: f.created_at
            });
          } else {
            sent.push({
              friendship_id: f.id,
              addressee: f.addressee,
              created_at: f.created_at
            });
          }
        }
      }

      setFriends(acceptedFriends);
      setPendingReceived(received);
      setPendingSent(sent);

      // Fetch my score
      const { data: myScoreData, error: myScoreError } = await supabase.rpc('get_user_habit_score', {
        target_user_id: user.id
      });
      
      if (!myScoreError && myScoreData && myScoreData.length > 0) {
        setMyScore(myScoreData[0]);
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

    // Single unfiltered subscription — more reliable for both sides of a friendship
    const subscription = supabase
      .channel(`friendships_${user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'friendships'
      }, (payload) => {
        // Only refresh if this change involves the current user
        const row = payload.new || payload.old;
        if (row && (row.requester_id === user.id || row.addressee_id === user.id)) {
          fetchFriendsAndScores();
        }
      })
      .subscribe();

    // Auto-refresh when user returns to the tab
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
      // 1. Find user by username (case-insensitive)
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', username)
        .limit(1);
        
      if (profileError) throw profileError;
      if (!profiles || profiles.length === 0) {
        return { success: false, error: 'User not found' };
      }
      
      const targetUserId = profiles[0].id;
      
      if (targetUserId === user.id) {
        return { success: false, error: 'Cannot send request to yourself' };
      }

      // 2. Check for existing friendship
      const { data: existing, error: existingError } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
        .limit(1);
        
      if (existingError) throw existingError;
      if (existing && existing.length > 0) {
        return { success: false, error: 'Friendship or request already exists' };
      }

      // 3. Create request
      const { error: insertError } = await supabase
        .from('friendships')
        .insert({
          requester_id: user.id,
          addressee_id: targetUserId,
          status: 'pending'
        });
        
      if (insertError) throw insertError;
      
      return { success: true };
    } catch (err) {
      console.error('Error sending friend request:', err);
      return { success: false, error: err.message };
    }
  };

  const acceptRequest = async (friendshipId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', friendshipId);
        
      if (error) throw error;
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
    } catch (err) {
      console.error('Error removing friend:', err);
      throw err;
    }
  };

  const searchUsers = async (query) => {
    if (!user || !query || query.trim().length < 2) return [];
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, full_name')
        .ilike('username', `%${query}%`)
        .neq('id', user.id)
        .limit(10);
        
      if (error) throw error;
      
      return data.map(profile => {
        let isFriend = false;
        let isPending = false;
        
        // Check if in friends list
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
