import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Swords, 
  ChevronDown, 
  Flame, 
  Target, 
  Sparkles, 
  Plus, 
  Check, 
  RefreshCw, 
  Lock,
  Unlock,
  Rocket,
  Zap,
  Crown,
  Award,
  HelpCircle,
  Shield,
  Star,
  X,
  TrendingUp,
  Smile
} from 'lucide-react';
import { fetchHabitsForUser } from '../../hooks/useFriends';
import useHabits from '../../hooks/useHabits';
import { analyzeHabitMatch } from '../../lib/groq';
import AppLoader from '../common/AppLoader';
import { 
  computeGamifiedHabitMetrics, 
  computeWeeklyClashMatrix 
} from '../../utils/habitGamification';

const CompareView = ({ 
  friends, 
  myScore, 
  currentUserId, 
  myProfile,
  initialSelectedFriendId 
}) => {
  const { habits: myContextHabits, addHabit: addHabitDb } = useHabits();

  const [viewMode, setViewMode] = useState('arena'); // 'arena' | 'habit_match'
  const [selectedFriendId, setSelectedFriendId] = useState(
    initialSelectedFriendId || friends?.[0]?.friendship_id || ''
  );
  const [compareMode, setCompareMode] = useState('all_time'); // 'all_time' | 'this_week'
  const [showXPInspector, setShowXPInspector] = useState(false);
  const [socialToast, setSocialToast] = useState(null);

  const [friendHabits, setFriendHabits] = useState([]);
  const [loadingFriendHabits, setLoadingFriendHabits] = useState(false);

  // AI Habit Match state
  const [aiMatchResult, setAiMatchResult] = useState(null);
  const [loadingAiMatch, setLoadingAiMatch] = useState(false);
  const [acceptedHabits, setAcceptedHabits] = useState(new Set());

  // Privacy: explicitly approved habits to share
  const [sharedHabitPermissions, setSharedHabitPermissions] = useState(() => {
    try {
      const saved = localStorage.getItem(`shared_habits_${selectedFriendId}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    if (initialSelectedFriendId) {
      setSelectedFriendId(initialSelectedFriendId);
    } else if (friends?.length > 0 && !selectedFriendId) {
      setSelectedFriendId(friends[0].friendship_id);
    }
  }, [friends, initialSelectedFriendId, selectedFriendId]);

  const selectedFriend = friends?.find(f => f.friendship_id === selectedFriendId);

  // Load friend's habits
  const loadFriendHabits = useCallback(async () => {
    if (!selectedFriend?.id) return;
    setLoadingFriendHabits(true);
    try {
      const habits = await fetchHabitsForUser(selectedFriend.id);
      setFriendHabits(habits || []);
    } catch (err) {
      console.error('Error fetching friend habits:', err);
    } finally {
      setLoadingFriendHabits(false);
    }
  }, [selectedFriend?.id]);

  useEffect(() => {
    loadFriendHabits();
    setAiMatchResult(null);
    try {
      const saved = localStorage.getItem(`shared_habits_${selectedFriendId}`);
      setSharedHabitPermissions(saved ? new Set(JSON.parse(saved)) : new Set());
    } catch {
      setSharedHabitPermissions(new Set());
    }
  }, [loadFriendHabits, selectedFriendId]);

  const handleToggleShareHabit = (habitTitle) => {
    setSharedHabitPermissions(prev => {
      const next = new Set(prev);
      if (next.has(habitTitle)) {
        next.delete(habitTitle);
      } else {
        next.add(habitTitle);
      }
      try {
        localStorage.setItem(`shared_habits_${selectedFriendId}`, JSON.stringify([...next]));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleRunAiMatch = async () => {
    if (loadingAiMatch) return;
    setLoadingAiMatch(true);
    try {
      const friendDisplayName = selectedFriend?.display_name || selectedFriend?.username || 'Friend';
      const myDisplayName = myProfile?.display_name || myProfile?.username || 'You';

      const result = await analyzeHabitMatch(myContextHabits, friendHabits, myDisplayName, friendDisplayName);
      if (result) setAiMatchResult(result);
    } catch (err) {
      console.error('Habit match AI error:', err);
    } finally {
      setLoadingAiMatch(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'habit_match' && !aiMatchResult && !loadingAiMatch && myContextHabits.length > 0 && friendHabits.length > 0) {
      handleRunAiMatch();
    }
  }, [viewMode, aiMatchResult, myContextHabits.length, friendHabits.length]);

  const handleAcceptHabit = async (habitTitle) => {
    if (acceptedHabits.has(habitTitle)) return;
    try {
      await addHabitDb(habitTitle, [0, 1, 2, 3, 4, 5, 6], 'morning');
      setAcceptedHabits(prev => new Set([...prev, habitTitle]));
      handleToggleShareHabit(habitTitle);
      await loadFriendHabits();
    } catch (err) {
      console.error('Error adding matched habit:', err);
    }
  };

  // Gamified metrics computation
  const myData = useMemo(() => {
    return computeGamifiedHabitMetrics(myContextHabits, compareMode, myScore);
  }, [myContextHabits, compareMode, myScore]);

  const theirData = useMemo(() => {
    return computeGamifiedHabitMetrics(friendHabits, compareMode, selectedFriend);
  }, [friendHabits, compareMode, selectedFriend]);

  // Weekly Showdown Matrix
  const weeklyClash = useMemo(() => {
    return computeWeeklyClashMatrix(myData.dailyCompletions, theirData.dailyCompletions);
  }, [myData.dailyCompletions, theirData.dailyCompletions]);

  const handleSendNudge = (type) => {
    const friendName = selectedFriend?.display_name || selectedFriend?.username || 'Friend';
    if (type === 'nudge') {
      setSocialToast({
        icon: '⚡',
        title: 'Nudge Sent',
        message: `Nudged @${selectedFriend?.username || friendName}!`,
      });
    } else {
      setSocialToast({
        icon: '🙌',
        title: 'High Five Sent',
        message: `High Five sent to @${selectedFriend?.username || friendName}!`,
      });
    }
    setTimeout(() => setSocialToast(null), 2500);
  };

  if (!friends || friends.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '36px 20px', borderRadius: '18px' }}>
        <Swords size={32} style={{ color: '#a855f7', marginBottom: '12px' }} />
        <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
          Head-to-Head Compare
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', margin: 0, lineHeight: 1.5 }}>
          Add friends to compare habit streaks and consistency head-to-head!
        </p>
      </div>
    );
  }

  const me = myProfile || {};
  const totalMatchScore = Math.max(1, myData.score + theirData.score);
  const myScoreShare = Math.round((myData.score / totalMatchScore) * 100);
  const theirScoreShare = 100 - myScoreShare;

  const friendDisplayName = selectedFriend?.display_name || selectedFriend?.full_name || selectedFriend?.username || 'Friend';
  const friendInitial = friendDisplayName[0]?.toUpperCase() || 'F';
  const myInitial = (me.display_name || me.username || 'You')[0]?.toUpperCase() || 'Y';

  const isYouLeading = myData.score > theirData.score;
  const isFriendLeading = theirData.score > myData.score;
  const scoreDiff = Math.abs(myData.score - theirData.score);

  // Battle Attributes list for 5-stat clash
  const battleAttributes = [
    {
      id: 'consistency',
      label: 'Consistency',
      icon: Target,
      color: '#10b981',
      myVal: `${myData.consistencyRate}%`,
      theirVal: `${theirData.consistencyRate}%`,
      myLead: myData.consistencyRate > theirData.consistencyRate,
      theirLead: theirData.consistencyRate > myData.consistencyRate,
      myNum: myData.consistencyRate,
      theirNum: theirData.consistencyRate,
    },
    {
      id: 'streak',
      label: 'Streak',
      icon: Flame,
      color: '#f59e0b',
      myVal: `${myData.bestStreak}d`,
      theirVal: `${theirData.bestStreak}d`,
      myLead: myData.bestStreak > theirData.bestStreak,
      theirLead: theirData.bestStreak > myData.bestStreak,
      myNum: myData.bestStreak,
      theirNum: theirData.bestStreak,
    },
    {
      id: 'velocity',
      label: '7-Day Check-ins',
      icon: Zap,
      color: '#a855f7',
      myVal: myData.sevenDayCompletions,
      theirVal: theirData.sevenDayCompletions,
      myLead: myData.sevenDayCompletions > theirData.sevenDayCompletions,
      theirLead: theirData.sevenDayCompletions > myData.sevenDayCompletions,
      myNum: myData.sevenDayCompletions,
      theirNum: theirData.sevenDayCompletions,
    },
    {
      id: 'arsenal',
      label: 'Active Habits',
      icon: Shield,
      color: '#3b82f6',
      myVal: myData.activeHabits,
      theirVal: theirData.activeHabits,
      myLead: myData.activeHabits > theirData.activeHabits,
      theirLead: theirData.activeHabits > myData.activeHabits,
      myNum: myData.activeHabits,
      theirNum: theirData.activeHabits,
    },
    {
      id: 'perfect',
      label: 'Perfect Days',
      icon: Star,
      color: '#ec4899',
      myVal: `${myData.perfectDays}d`,
      theirVal: `${theirData.perfectDays}d`,
      myLead: myData.perfectDays > theirData.perfectDays,
      theirLead: theirData.perfectDays > myData.perfectDays,
      myNum: myData.perfectDays,
      theirNum: theirData.perfectDays,
    },
  ];

  const myAttributeWins = battleAttributes.filter(a => a.myLead).length;
  const theirAttributeWins = battleAttributes.filter(a => a.theirLead).length;

  const mutualHabit = aiMatchResult?.mutualSynergyHabit || aiMatchResult?.mutualSynergyHabits?.[0];
  const isMutualAccepted = mutualHabit && (
    acceptedHabits.has(mutualHabit.title) || 
    myContextHabits.some(h => h.name.toLowerCase() === mutualHabit.title.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '90px' }}>
      
      {/* ── UNIFIED CONTROL BAR ── */}
      <div 
        className="glass-card" 
        style={{
          borderRadius: '14px',
          padding: '8px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        {/* Opponent Selector */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: 0, flex: 1, maxWidth: '170px' }}>
          <select
            value={selectedFriendId}
            onChange={(e) => setSelectedFriendId(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 24px 6px 10px',
              borderRadius: '9px',
              background: 'var(--surface-input)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: '700',
              appearance: 'none',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {friends.map(f => (
              <option key={f.friendship_id} value={f.friendship_id}>
                {f.display_name || f.full_name || `@${f.username}`}
              </option>
            ))}
          </select>
          <ChevronDown size={13} style={{ position: 'absolute', right: '8px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        </div>

        {/* View Mode & Timeframe Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {viewMode === 'arena' && (
            <button
              type="button"
              onClick={() => setCompareMode(m => m === 'all_time' ? 'this_week' : 'all_time')}
              style={{
                padding: '6px 9px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-input)',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              {compareMode === 'all_time' ? 'All Time' : 'This Week'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setViewMode(v => v === 'arena' ? 'habit_match' : 'arena')}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: 'none',
              background: viewMode === 'habit_match' 
                ? 'linear-gradient(135deg, #a855f7, #ec4899)' 
                : 'var(--surface-elevated)',
              color: viewMode === 'habit_match' ? '#fff' : 'var(--text-primary)',
              fontSize: '11px',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
          >
            {viewMode === 'arena' ? (
              <>
                <Sparkles size={12} style={{ color: '#ec4899' }} />
                <span>Synergy</span>
              </>
            ) : (
              <>
                <Swords size={12} style={{ color: '#a855f7' }} />
                <span>Compare</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── SUBVIEW 1: HEAD-TO-HEAD STATS ── */}
      {viewMode === 'arena' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* Main Hero Clash Card */}
          <div 
            className="glass-card" 
            style={{
              borderRadius: '18px',
              padding: '14px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: 'linear-gradient(180deg, var(--glass-card-bg) 0%, var(--surface-elevated) 100%)',
              border: '1px solid var(--glass-card-border)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Lead Status & Score Breakdown Button */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                borderRadius: '8px',
                background: isYouLeading ? 'rgba(34,197,94,0.1)' : isFriendLeading ? 'rgba(6,182,212,0.1)' : 'rgba(168,85,247,0.1)',
                color: isYouLeading ? '#22c55e' : isFriendLeading ? '#06b6d4' : '#a855f7',
                border: `1px solid ${isYouLeading ? 'rgba(34,197,94,0.2)' : isFriendLeading ? 'rgba(6,182,212,0.2)' : 'rgba(168,85,247,0.2)'}`,
                fontSize: '11px',
                fontWeight: '800',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {isYouLeading ? (
                  <>
                    <Crown size={13} /> You lead by {scoreDiff.toLocaleString()} XP
                  </>
                ) : isFriendLeading ? (
                  <>
                    <TrendingUp size={13} /> {friendDisplayName} leads by {scoreDiff.toLocaleString()} XP
                  </>
                ) : (
                  <>
                    <Swords size={13} /> Tied score!
                  </>
                )}
              </span>

              <button
                type="button"
                onClick={() => setShowXPInspector(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '10.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  opacity: 0.9,
                }}
              >
                <HelpCircle size={11} />
                <span>XP Details</span>
              </button>
            </div>

            {/* Fighter Avatars & Clean Scores */}
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {/* You */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div 
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: '800',
                    color: '#fff',
                    marginBottom: '4px',
                    boxShadow: '0 3px 12px rgba(168,85,247,0.35)',
                    position: 'relative',
                  }}
                >
                  {myInitial}
                  <span 
                    style={{
                      position: 'absolute',
                      bottom: '-3px',
                      right: '-3px',
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                    }}
                  >
                    {myData.rankIcon}
                  </span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>You</span>
                <span 
                  style={{ 
                    fontSize: '9.5px', 
                    fontWeight: '800', 
                    color: '#a855f7',
                    background: 'rgba(168,85,247,0.1)',
                    padding: '1px 5px',
                    borderRadius: '5px',
                    marginTop: '2px',
                  }}
                >
                  Lv.{myData.level}
                </span>
                <span style={{ fontSize: '15px', fontWeight: '900', color: '#a855f7', fontFamily: 'monospace', marginTop: '2px' }}>
                  {myData.score.toLocaleString()} XP
                </span>
              </div>

              {/* Center VS */}
              <div 
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--surface-input)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: '900',
                  fontStyle: 'italic',
                  color: 'var(--text-muted)',
                }}
              >
                VS
              </div>

              {/* Friend */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div 
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: '800',
                    color: '#fff',
                    marginBottom: '4px',
                    boxShadow: '0 3px 12px rgba(6,182,212,0.35)',
                    position: 'relative',
                  }}
                >
                  {friendInitial}
                  <span 
                    style={{
                      position: 'absolute',
                      bottom: '-3px',
                      right: '-3px',
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                    }}
                  >
                    {theirData.rankIcon}
                  </span>
                </div>
                <span 
                  style={{ 
                    fontSize: '13px', 
                    fontWeight: '800', 
                    color: 'var(--text-primary)', 
                    maxWidth: '100px', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap' 
                  }}
                >
                  {friendDisplayName}
                </span>
                <span 
                  style={{ 
                    fontSize: '9.5px', 
                    fontWeight: '800', 
                    color: '#06b6d4',
                    background: 'rgba(6,182,212,0.1)',
                    padding: '1px 5px',
                    borderRadius: '5px',
                    marginTop: '2px',
                  }}
                >
                  Lv.{theirData.level}
                </span>
                <span style={{ fontSize: '15px', fontWeight: '900', color: '#06b6d4', fontFamily: 'monospace', marginTop: '2px' }}>
                  {theirData.score.toLocaleString()} XP
                </span>
              </div>
            </div>

            {/* Momentum Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', fontWeight: '800' }}>
                <span style={{ color: '#a855f7' }}>{myScoreShare}%</span>
                <span style={{ color: '#06b6d4' }}>{theirScoreShare}%</span>
              </div>
              <div 
                style={{ 
                  height: '6px', 
                  borderRadius: '3px', 
                  background: 'var(--surface-input)', 
                  overflow: 'hidden',
                  display: 'flex',
                }}
              >
                <div
                  style={{
                    width: `${myScoreShare}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #a855f7 0%, #ec4899 100%)',
                    borderRadius: myScoreShare === 100 ? '3px' : '3px 0 0 3px',
                  }}
                />
                <div
                  style={{
                    width: `${theirScoreShare}%`,
                    height: '100%',
                    background: 'linear-gradient(270deg, #06b6d4 0%, #3b82f6 100%)',
                    borderRadius: theirScoreShare === 100 ? '3px' : '0 3px 3px 0',
                  }}
                />
              </div>
            </div>

            {/* Compact Cheer & Nudge Bar */}
            <div 
              style={{
                display: 'flex',
                gap: '8px',
                paddingTop: '6px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => handleSendNudge('nudge')}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  borderRadius: '9px',
                  border: '1px solid rgba(168,85,247,0.25)',
                  background: 'rgba(168,85,247,0.06)',
                  color: '#a855f7',
                  fontSize: '11px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <Zap size={12} />
                <span>Nudge ⚡</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendNudge('highfive')}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  borderRadius: '9px',
                  border: '1px solid rgba(6,182,212,0.25)',
                  background: 'rgba(6,182,212,0.06)',
                  color: '#06b6d4',
                  fontSize: '11px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <Smile size={12} />
                <span>High Five 🙌</span>
              </button>
            </div>
          </div>

          {/* Social Toast */}
          <AnimatePresence>
            {socialToast && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(168,85,247,0.3)',
                }}
              >
                <span style={{ fontSize: '15px' }}>{socialToast.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11.5px', fontWeight: '800' }}>{socialToast.title}</div>
                  <div style={{ fontSize: '10.5px', opacity: 0.95 }}>{socialToast.message}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── 5-ATTRIBUTE STAT CLASH ── */}
          <div 
            className="glass-card" 
            style={{
              borderRadius: '16px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--text-primary)' }}>
                Stats Comparison
              </span>
              <span 
                style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '2px 7px',
                  borderRadius: '6px',
                  background: myAttributeWins > theirAttributeWins ? 'rgba(34,197,94,0.12)' : 'rgba(168,85,247,0.12)',
                  color: myAttributeWins > theirAttributeWins ? '#22c55e' : '#a855f7',
                }}
              >
                {myAttributeWins > theirAttributeWins 
                  ? `You lead ${myAttributeWins}/5` 
                  : theirAttributeWins > myAttributeWins 
                  ? `${friendDisplayName} leads ${theirAttributeWins}/5` 
                  : 'Tied'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {battleAttributes.map((attr) => {
                const Icon = attr.icon;
                const total = Math.max(1, (attr.myNum || 0) + (attr.theirNum || 0));
                const myRatio = Math.round(((attr.myNum || 0) / total) * 100);
                const theirRatio = 100 - myRatio;

                return (
                  <div
                    key={attr.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      background: 'var(--surface-input)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Icon size={13} color={attr.color} />
                        <span style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {attr.label}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'monospace' }}>
                        <span 
                          style={{ 
                            fontSize: '12px', 
                            fontWeight: '900', 
                            color: attr.myLead ? '#22c55e' : '#a855f7',
                          }}
                        >
                          {attr.myVal}
                        </span>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>vs</span>
                        <span 
                          style={{ 
                            fontSize: '12px', 
                            fontWeight: '900', 
                            color: attr.theirLead ? '#22c55e' : '#06b6d4',
                          }}
                        >
                          {attr.theirVal}
                        </span>
                      </div>
                    </div>

                    {/* Comparison Mini-Bar */}
                    <div style={{ height: '3px', borderRadius: '2px', background: 'var(--surface-elevated)', overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: `${myRatio}%`, background: '#a855f7' }} />
                      <div style={{ width: `${theirRatio}%`, background: '#06b6d4' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 7-DAY SHOWDOWN MATRIX ── */}
          <div 
            className="glass-card" 
            style={{
              borderRadius: '16px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--text-primary)' }}>
                7-Day Activity
              </span>
              <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>
                {weeklyClash.myWins}W · {weeklyClash.theirWins}L · {weeklyClash.ties}T
              </span>
            </div>

            {/* 7-Day Day Columns */}
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '4px',
              }}
            >
              {weeklyClash.days.map((d, dIdx) => {
                const youWonDay = d.winner === 'you';
                const friendWonDay = d.winner === 'friend';

                return (
                  <div
                    key={dIdx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '3px',
                      padding: '6px 2px',
                      borderRadius: '8px',
                      background: d.isToday ? 'rgba(168,85,247,0.08)' : 'var(--surface-input)',
                      border: d.isToday 
                        ? '1px solid rgba(168,85,247,0.3)' 
                        : '1px solid var(--border-subtle)',
                    }}
                  >
                    <span 
                      style={{ 
                        fontSize: '9px', 
                        fontWeight: '800', 
                        color: d.isToday ? '#a855f7' : 'var(--text-muted)' 
                      }}
                    >
                      {d.dayLabel}
                    </span>

                    {/* Winner Badge */}
                    <div 
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: youWonDay 
                          ? 'rgba(168,85,247,0.2)' 
                          : friendWonDay 
                          ? 'rgba(6,182,212,0.2)' 
                          : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '9px',
                        fontWeight: '800',
                      }}
                    >
                      {youWonDay ? '👑' : friendWonDay ? '🏃' : '·'}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '8.5px', fontWeight: '800', fontFamily: 'monospace' }}>
                      <span style={{ color: '#a855f7' }}>{d.myVal}</span>
                      <span style={{ color: '#06b6d4' }}>{d.theirVal}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ── SUBVIEW 2: CO-OP SYNERGY & MUTUAL QUESTS ── */}
      {viewMode === 'habit_match' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* Header Bar */}
          <div 
            className="glass-card" 
            style={{
              borderRadius: '14px',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={15} style={{ color: '#ec4899' }} />
              <span style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--text-primary)' }}>
                Habit Synergy
              </span>
            </div>

            <button
              type="button"
              onClick={handleRunAiMatch}
              disabled={loadingAiMatch}
              style={{
                padding: '4px 8px',
                borderRadius: '7px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-input)',
                color: 'var(--text-primary)',
                fontSize: '10.5px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={11} className={loadingAiMatch ? 'spin' : ''} />
              <span>{loadingAiMatch ? 'Analyzing...' : 'Re-Scan'}</span>
            </button>
          </div>

          {loadingAiMatch ? (
            <AppLoader variant="section" size="small" message="Scanning habit synergy..." />
          ) : (
            <>
              {/* Mutual Quest Card */}
              {mutualHabit && (
                <div 
                  className="glass-card" 
                  style={{
                    borderRadius: '14px',
                    padding: '12px 14px',
                    background: 'linear-gradient(135deg, rgba(236,72,153,0.1) 0%, rgba(168,85,247,0.06) 100%)',
                    border: '1px solid rgba(236,72,153,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                      <Rocket size={14} style={{ color: '#ec4899' }} />
                      <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        {mutualHabit.title}
                      </span>
                      <span 
                        style={{ 
                          fontSize: '8.5px', 
                          fontWeight: '800', 
                          padding: '1px 5px', 
                          borderRadius: '4px', 
                          background: 'rgba(236,72,153,0.2)', 
                          color: '#ec4899' 
                        }}
                      >
                        Mutual
                      </span>
                    </div>
                    <p style={{ fontSize: '10.5px', color: 'var(--text-secondary)', margin: 0 }}>
                      Track together for co-op bonus XP
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAcceptHabit(mutualHabit.title)}
                    disabled={isMutualAccepted}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      border: 'none',
                      cursor: isMutualAccepted ? 'default' : 'pointer',
                      flexShrink: 0,
                      background: isMutualAccepted ? 'rgba(34,197,94,0.15)' : 'linear-gradient(135deg, #ec4899, #a855f7)',
                      color: isMutualAccepted ? '#22c55e' : '#fff',
                    }}
                  >
                    {isMutualAccepted ? (
                      <>
                        <Check size={12} strokeWidth={2.5} />
                        <span>Tracking</span>
                      </>
                    ) : (
                      <>
                        <Plus size={12} strokeWidth={2.5} />
                        <span>Accept</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Matched Habits List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {aiMatchResult?.matches && aiMatchResult.matches.length > 0 ? (
                  aiMatchResult.matches.map((match, idx) => {
                    const isBoth = match.status === 'both_tracking';
                    const isSharedByMe = sharedHabitPermissions.has(match.habitTitle);
                    const isAcceptedByMe = acceptedHabits.has(match.habitTitle) || myContextHabits.some(h => h.name.toLowerCase() === match.habitTitle.toLowerCase());

                    const myH = myContextHabits.find(h => (h.name && h.name.toLowerCase().includes(match.habitTitle.toLowerCase())));
                    const friendH = friendHabits.find(h => (h.name && h.name.toLowerCase().includes(match.habitTitle.toLowerCase())));
                    const myComps = myH?.history?.filter(e => (typeof e === 'string' ? 'completed' : e.status) === 'completed').length || 0;
                    const friendComps = friendH?.history?.filter(e => (typeof e === 'string' ? 'completed' : e.status) === 'completed').length || 0;

                    return (
                      <div
                        key={idx}
                        className="glass-card"
                        style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--text-primary)' }}>
                              {match.habitTitle}
                            </span>
                            <span 
                              style={{
                                fontSize: '8.5px',
                                fontWeight: '700',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: isBoth ? 'rgba(34,197,94,0.12)' : 'rgba(6,182,212,0.12)',
                                color: isBoth ? '#22c55e' : '#06b6d4',
                              }}
                            >
                              {isBoth ? 'Shared' : `By ${friendDisplayName}`}
                            </span>
                          </div>

                          {isBoth ? (
                            <button
                              type="button"
                              onClick={() => handleToggleShareHabit(match.habitTitle)}
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-subtle)',
                                background: isSharedByMe ? 'rgba(34,197,94,0.12)' : 'var(--surface-input)',
                                color: isSharedByMe ? '#22c55e' : 'var(--text-muted)',
                                fontSize: '9.5px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                cursor: 'pointer',
                              }}
                            >
                              {isSharedByMe ? <Unlock size={11} /> : <Lock size={11} />}
                              <span>{isSharedByMe ? 'Shared' : 'Private'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAcceptHabit(match.habitTitle)}
                              disabled={isAcceptedByMe}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '10.5px',
                                fontWeight: '800',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                border: 'none',
                                cursor: isAcceptedByMe ? 'default' : 'pointer',
                                background: isAcceptedByMe ? 'var(--surface-input)' : 'linear-gradient(135deg, #a855f7, #ec4899)',
                                color: isAcceptedByMe ? '#22c55e' : '#fff',
                              }}
                            >
                              {isAcceptedByMe ? <Check size={11} /> : <Plus size={11} />}
                              <span>{isAcceptedByMe ? 'Tracking' : 'Add'}</span>
                            </button>
                          )}
                        </div>

                        {/* Duel Bar if shared */}
                        {isBoth && isSharedByMe && (
                          <div 
                            style={{
                              background: 'var(--surface-input)',
                              padding: '5px 8px',
                              borderRadius: '8px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '3px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: '800' }}>
                              <span style={{ color: '#a855f7' }}>You: {myComps}</span>
                              <span style={{ color: '#06b6d4' }}>{friendDisplayName}: {friendComps}</span>
                            </div>
                            <div style={{ height: '3px', borderRadius: '2px', background: 'var(--surface-elevated)', overflow: 'hidden', display: 'flex' }}>
                              <div style={{ width: `${Math.round((myComps / (Math.max(1, myComps + friendComps))) * 100)}%`, background: '#a855f7' }} />
                              <div style={{ width: `${Math.round((friendComps / (Math.max(1, myComps + friendComps))) * 100)}%`, background: '#06b6d4' }} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="glass-card" style={{ padding: '16px', textAlign: 'center', borderRadius: '12px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Tap "Re-Scan" to match habits with {friendDisplayName}.</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── XP SCORE INSPECTOR MODAL ── */}
      <AnimatePresence>
        {showXPInspector && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '20px',
            }}
            onClick={() => setShowXPInspector(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '18px',
                padding: '16px',
                width: '100%',
                maxWidth: '400px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
                color: 'var(--text-primary)',
                position: 'relative',
                maxHeight: '85vh',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowXPInspector(false)}
                style={{
                  position: 'absolute',
                  top: '14px',
                  right: '14px',
                  background: 'var(--surface-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '50%',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={13} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <Award size={18} style={{ color: '#a855f7' }} />
                <h3 style={{ fontSize: '15px', fontWeight: '800', margin: 0 }}>
                  XP Breakdown
                </h3>
              </div>

              {/* Formula Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 9px', borderRadius: '8px', background: 'var(--surface-input)' }}>
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: '700' }}>🎯 Check-ins</div>
                    <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>+10 XP per completion</div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: '800', fontSize: '11.5px', color: '#a855f7' }}>
                    +{myData.breakdown.checkinXP} XP
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 9px', borderRadius: '8px', background: 'var(--surface-input)' }}>
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: '700' }}>🔥 Streak Multipliers</div>
                    <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>3+ and 7+ day streaks</div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: '800', fontSize: '11.5px', color: '#f59e0b' }}>
                    +{myData.breakdown.streakXP} XP
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 9px', borderRadius: '8px', background: 'var(--surface-input)' }}>
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: '700' }}>🛡️ Consistency</div>
                    <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>Schedule completion %</div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: '800', fontSize: '11.5px', color: '#10b981' }}>
                    +{myData.breakdown.consistencyXP} XP
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 9px', borderRadius: '8px', background: 'var(--surface-input)' }}>
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: '700' }}>⚡ Active Habits</div>
                    <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>+10 XP per habit</div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: '800', fontSize: '11.5px', color: '#3b82f6' }}>
                    +{myData.breakdown.arsenalXP} XP
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 9px', borderRadius: '8px', background: 'var(--surface-input)' }}>
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: '700' }}>🌟 Perfect Days</div>
                    <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>+20 XP per 100% day</div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: '800', fontSize: '11.5px', color: '#ec4899' }}>
                    +{myData.breakdown.perfectDaysXP} XP
                  </div>
                </div>
              </div>

              {/* Progress to Next Level */}
              <div 
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(236,72,153,0.06))',
                  border: '1px solid rgba(168,85,247,0.25)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: '800', marginBottom: '5px' }}>
                  <span>Lv.{myData.level} {myData.rankTitle}</span>
                  <span style={{ color: '#a855f7' }}>{myData.progressPercent}%</span>
                </div>
                <div style={{ height: '5px', borderRadius: '3px', background: 'var(--surface-input)', overflow: 'hidden' }}>
                  <div style={{ width: `${myData.progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #a855f7, #ec4899)' }} />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default CompareView;
