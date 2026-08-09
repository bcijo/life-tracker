import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import useAuth from './useAuth';
import { fetchScoreForUser } from './useFriends';

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

      let targetUserIds = [];

      if (scope === 'friends') {
        // Fetch accepted friends
        const { data: rawFriendships } = await supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

        const friendIds = (rawFriendships || []).map(f =>
          f.requester_id === user.id ? f.addressee_id : f.requester_id
        );
        targetUserIds = [...new Set([user.id, ...friendIds])];
      } else {
        // Global scope: fetch all profiles with a username
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .not('username', 'is', null);

        targetUserIds = (profiles || []).map(p => p.id);
        if (!targetUserIds.includes(user.id)) {
          targetUserIds.push(user.id);
        }
      }

      // Fetch profiles for target users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, full_name')
        .in('id', targetUserIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Calculate score for each user
      const list = await Promise.all(
        targetUserIds.map(async (uid) => {
          const profile = profileMap.get(uid) || { id: uid, username: 'User' };
          const scoreData = await fetchScoreForUser(uid);
          return {
            user_id: uid,
            username: profile.username,
            display_name: profile.display_name,
            full_name: profile.full_name,
            ...scoreData
          };
        })
      );

      // Sort by score descending
      list.sort((a, b) => b.score - a.score || b.completions_30d - a.completions_30d);

      // Assign ranks
      list.forEach((item, index) => {
        item.rank = index + 1;
      });

      setLeaderboard(list);

      const myEntry = list.find(e => e.user_id === user.id);
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
