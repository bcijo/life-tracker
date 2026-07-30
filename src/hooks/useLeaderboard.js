import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import useAuth from './useAuth';

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
      
      const { data, error: rpcError } = await supabase.rpc('get_habit_leaderboard', {
        p_user_id: user.id,
        p_scope: scope
      });
      
      if (rpcError) throw rpcError;
      
      if (data) {
        setLeaderboard(data);
        
        const myRankIndex = data.findIndex(entry => entry.user_id === user.id);
        if (myRankIndex !== -1) {
          setMyRank(data[myRankIndex].rank);
        } else {
          setMyRank(null);
        }
      } else {
        setLeaderboard([]);
        setMyRank(null);
      }
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
