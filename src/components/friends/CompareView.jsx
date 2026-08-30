import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Swords, 
  ChevronDown, 
  Flame, 
  Target, 
  Layers, 
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
  Info,
  X,
  TrendingUp,
  Smile
} from 'lucide-react';
import { 
  format, 
  parseISO, 
  subDays, 
  addDays, 
  startOfWeek 
} from 'date-fns';
import { fetchHabitsForUser } from '../../hooks/useFriends';
import useHabits from '../../hooks/useHabits';
import { analyzeHabitMatch } from '../../lib/groq';
import AppLoader from '../common/AppLoader';
import { 
  computeGamifiedHabitMetrics, 
  computeWeeklyClashMatrix, 
  getLevelData,
  getLocalDateStr 
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
        title: 'Nudge Sent!',
        message: `You nudged @${selectedFriend?.username || friendName} to keep their streak alive!`,
      });
    } else {
      setSocialToast({
        icon: '🙌',
        title: 'High Five Sent!',
        message: `You sent a High Five to @${selectedFriend?.username || friendName} for great discipline!`,
      });
    }
    setTimeout(() => setSocialToast(null), 3000);
  };

  if (!friends || friends.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '36px 20px', borderRadius: '18px' }}>
        <Swords size={32} style={{ color: '#a855f7', marginBottom: '12px' }} />
        <h3 style={{ fontSize: '17px', fontWeight: '800', margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
          Head-to-Head Arena
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
          Add friends on the Friends tab to unlock real-time habit battles, XP levels, and synergy quests!
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
      label: 'Consistency Rate',
      icon: Target,
      color: '#10b981',
      myVal: myData.consistencyRate,
      theirVal: theirData.consistencyRate,
      unit: '%',
      myLead: myData.consistencyRate > theirData.consistencyRate,
      theirLead: theirData.consistencyRate > myData.consistencyRate,
    },
    {
      id: 'streak',
      label: 'Active Streak',
      icon: Flame,
      color: '#f59e0b',
      myVal: myData.bestStreak,
      theirVal: theirData.bestStreak,
      unit: 'd',
      myLead: myData.bestStreak > theirData.bestStreak,
      theirLead: theirData.bestStreak > myData.bestStreak,
    },
    {
      id: 'velocity',
      label: '7-Day Velocity',
      icon: Zap,
      color: '#a855f7',
      myVal: myData.sevenDayCompletions,
      theirVal: theirData.sevenDayCompletions,
      unit: ' done',
      myLead: myData.sevenDayCompletions > theirData.sevenDayCompletions,
      theirLead: theirData.sevenDayCompletions > myData.sevenDayCompletions,
    },
    {
      id: 'arsenal',
      label: 'Habit Arsenal',
      icon: Shield,
      color: '#3b82f6',
      myVal: myData.activeHabits,
      theirVal: theirData.activeHabits,
      unit: ' habits',
      myLead: myData.activeHabits > theirData.activeHabits,
      theirLead: theirData.activeHabits > myData.activeHabits,
    },
    {
      id: 'perfect',
      label: 'Perfect Days',
      icon: Star,
      color: '#ec4899',
      myVal: myData.perfectDays,
      theirVal: theirData.perfectDays,
      unit: ' days',
      myLead: myData.perfectDays > theirData.perfectDays,
      theirLead: theirData.perfectDays > myData.perfectDays,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '90px' }}>
      
      {/* ── UNIFIED CONTROL BAR ── */}
      <div 
        className="glass-card" 
        style={{
          borderRadius: '16px',
          padding: '8px 12px',
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
              padding: '7px 26px 7px 10px',
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
          <ChevronDown size={14} style={{ position: 'absolute', right: '8px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        </div>

        {/* View Mode & Timeframe Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {/* Timeframe Toggle */}
          {viewMode === 'arena' && (
            <button
              type="button"
              onClick={() => setCompareMode(m => m === 'all_time' ? 'this_week' : 'all_time')}
              style={{
                padding: '6px 10px',
                borderRadius: '9px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-input)',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              {compareMode === 'all_time' ? 'Overall XP' : 'This Week'}
            </button>
          )}

          {/* Mode Switcher */}
          <button
            type="button"
            onClick={() => setViewMode(v => v === 'arena' ? 'habit_match' : 'arena')}
            style={{
              padding: '6px 12px',
              borderRadius: '9px',
              border: 'none',
              background: viewMode === 'habit_match' 
                ? 'linear-gradient(135deg, #a855f7, #ec4899)' 
                : 'var(--surface-elevated)',
              color: viewMode === 'habit_match' ? '#fff' : 'var(--text-primary)',
              fontSize: '11px',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              boxShadow: viewMode === 'habit_match' ? '0 2px 8px rgba(236,72,153,0.3)' : 'none',
            }}
          >
            {viewMode === 'arena' ? (
              <>
                <Sparkles size={13} style={{ color: '#ec4899' }} />
                <span>Co-op Synergy</span>
              </>
            ) : (
              <>
                <Swords size={13} style={{ color: '#a855f7' }} />
                <span>Battle Arena</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── SUBVIEW 1: GAMIFIED BATTLE ARENA ── */}
      {viewMode === 'arena' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Main RPG Showdown Hero Card */}
          <div 
            className="glass-card" 
            style={{
              borderRadius: '20px',
              padding: '18px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              background: 'linear-gradient(180deg, var(--glass-card-bg) 0%, var(--surface-elevated) 100%)',
              border: '1px solid var(--glass-card-border)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top Matchup Verdict Banner */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 10px',
                borderRadius: '10px',
                background: isYouLeading ? 'rgba(34,197,94,0.12)' : isFriendLeading ? 'rgba(6,182,212,0.12)' : 'rgba(168,85,247,0.12)',
                color: isYouLeading ? '#22c55e' : isFriendLeading ? '#06b6d4' : '#a855f7',
                border: `1px solid ${isYouLeading ? 'rgba(34,197,94,0.25)' : isFriendLeading ? 'rgba(6,182,212,0.25)' : 'rgba(168,85,247,0.25)'}`,
                fontSize: '11px',
                fontWeight: '800',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {isYouLeading ? (
                  <>
                    <Crown size={14} /> You hold a +{scoreDiff} XP lead!
                  </>
                ) : isFriendLeading ? (
                  <>
                    <TrendingUp size={14} /> {friendDisplayName} leads by +{scoreDiff} XP
                  </>
                ) : (
                  <>
                    <Swords size={14} /> Level Dead Heat Matchup!
                  </>
                )}
              </span>

              {/* XP Formula Info Trigger */}
              <button
                type="button"
                onClick={() => setShowXPInspector(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  textDecoration: 'underline',
                }}
              >
                <HelpCircle size={12} />
                <span>Score Breakdown</span>
              </button>
            </div>

            {/* RPG Fighter Avatars & Tiers */}
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              {/* Fighter 1 (You) */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div 
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: '800',
                    color: '#fff',
                    marginBottom: '6px',
                    boxShadow: '0 4px 18px rgba(168,85,247,0.4)',
                    position: 'relative',
                  }}
                >
                  {myInitial}
                  <span 
                    style={{
                      position: 'absolute',
                      bottom: '-4px',
                      right: '-4px',
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                    }}
                  >
                    {myData.rankIcon}
                  </span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>You</span>
                <span 
                  style={{ 
                    fontSize: '10px', 
                    fontWeight: '800', 
                    color: '#a855f7',
                    background: 'rgba(168,85,247,0.12)',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    marginTop: '2px',
                  }}
                >
                  Lv.{myData.level} · {myData.rankTitle}
                </span>
                <span style={{ fontSize: '16px', fontWeight: '900', color: '#a855f7', fontFamily: 'monospace', marginTop: '4px' }}>
                  {myData.score.toLocaleString()} XP
                </span>
              </div>

              {/* Center VS Clash Orb */}
              <div 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <div 
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--surface-input)',
                    border: '2px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '900',
                    fontStyle: 'italic',
                    color: 'var(--text-muted)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                >
                  VS
                </div>
                <span style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)' }}>
                  {compareMode === 'all_time' ? 'Overall' : 'This Week'}
                </span>
              </div>

              {/* Fighter 2 (Friend) */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div 
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: '800',
                    color: '#fff',
                    marginBottom: '6px',
                    boxShadow: '0 4px 18px rgba(6,182,212,0.4)',
                    position: 'relative',
                  }}
                >
                  {friendInitial}
                  <span 
                    style={{
                      position: 'absolute',
                      bottom: '-4px',
                      right: '-4px',
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
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
                    fontSize: '10px', 
                    fontWeight: '800', 
                    color: '#06b6d4',
                    background: 'rgba(6,182,212,0.12)',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    marginTop: '2px',
                    maxWidth: '110px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Lv.{theirData.level} · {theirData.rankTitle}
                </span>
                <span style={{ fontSize: '16px', fontWeight: '900', color: '#06b6d4', fontFamily: 'monospace', marginTop: '4px' }}>
                  {theirData.score.toLocaleString()} XP
                </span>
              </div>
            </div>

            {/* Dynamic Tug-of-War Momentum Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '800' }}>
                <span style={{ color: '#a855f7' }}>{myScoreShare}% You</span>
                <span style={{ color: '#06b6d4' }}>{theirScoreShare}% {friendDisplayName}</span>
              </div>
              <div 
                style={{ 
                  position: 'relative', 
                  height: '8px', 
                  borderRadius: '4px', 
                  background: 'var(--surface-input)', 
                  overflow: 'hidden',
                  display: 'flex',
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${myScoreShare}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #a855f7 0%, #ec4899 100%)',
                    borderRadius: myScoreShare === 100 ? '4px' : '4px 0 0 4px',
                    boxShadow: myScoreShare > 0 ? '0 0 10px rgba(168,85,247,0.4)' : 'none',
                  }}
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${theirScoreShare}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(270deg, #06b6d4 0%, #3b82f6 100%)',
                    borderRadius: theirScoreShare === 100 ? '4px' : '0 4px 4px 0',
                    boxShadow: theirScoreShare > 0 ? '0 0 10px rgba(6,182,212,0.4)' : 'none',
                  }}
                />
              </div>
            </div>

            {/* Quick Interactive Cheer & Nudge Bar */}
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
                  padding: '7px 0',
                  borderRadius: '10px',
                  border: '1px solid rgba(168,85,247,0.3)',
                  background: 'rgba(168,85,247,0.08)',
                  color: '#a855f7',
                  fontSize: '11px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                }}
              >
                <Zap size={13} />
                <span>Nudge Streak ⚡</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendNudge('highfive')}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: '10px',
                  border: '1px solid rgba(6,182,212,0.3)',
                  background: 'rgba(6,182,212,0.08)',
                  color: '#06b6d4',
                  fontSize: '11px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                }}
              >
                <Smile size={13} />
                <span>High Five 🙌</span>
              </button>
            </div>
          </div>

          {/* Social Toast Notification */}
          <AnimatePresence>
            {socialToast && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 8px 24px rgba(168,85,247,0.4)',
                }}
              >
                <span style={{ fontSize: '18px' }}>{socialToast.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: '800' }}>{socialToast.title}</div>
                  <div style={{ fontSize: '11px', opacity: 0.95 }}>{socialToast.message}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── 5-DIMENSIONAL BATTLE STAT CLASH ── */}
          <div 
            className="glass-card" 
            style={{
              borderRadius: '18px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Swords size={15} style={{ color: '#a855f7' }} />
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  5-Attribute Battle Clash
                </span>
              </div>
              <span 
                style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '8px',
                  background: myAttributeWins > theirAttributeWins ? 'rgba(34,197,94,0.12)' : 'rgba(168,85,247,0.12)',
                  color: myAttributeWins > theirAttributeWins ? '#22c55e' : '#a855f7',
                }}
              >
                {myAttributeWins > theirAttributeWins 
                  ? `🏆 You win ${myAttributeWins}/5 Attributes` 
                  : theirAttributeWins > myAttributeWins 
                  ? `🏃 ${friendDisplayName} wins ${theirAttributeWins}/5` 
                  : '⚔️ Tied 5-Stat Battle'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {battleAttributes.map((attr) => {
                const Icon = attr.icon;
                const total = Math.max(1, attr.myVal + attr.theirVal);
                const myRatio = Math.round((attr.myVal / total) * 100);
                const theirRatio = 100 - myRatio;

                return (
                  <div
                    key={attr.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      background: 'var(--surface-input)',
                      border: `1px solid ${attr.myLead ? 'rgba(168,85,247,0.25)' : attr.theirLead ? 'rgba(6,182,212,0.25)' : 'var(--border-subtle)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Icon size={14} color={attr.color} />
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {attr.label}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace' }}>
                        <span 
                          style={{ 
                            fontSize: '13px', 
                            fontWeight: '900', 
                            color: attr.myLead ? '#22c55e' : '#a855f7',
                          }}
                        >
                          {attr.myVal}{attr.unit}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>vs</span>
                        <span 
                          style={{ 
                            fontSize: '13px', 
                            fontWeight: '900', 
                            color: attr.theirLead ? '#22c55e' : '#06b6d4',
                          }}
                        >
                          {attr.theirVal}{attr.unit}
                        </span>
                      </div>
                    </div>

                    {/* Comparison Mini-Bar */}
                    <div style={{ height: '4px', borderRadius: '2px', background: 'var(--surface-elevated)', overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: `${myRatio}%`, background: '#a855f7' }} />
                      <div style={{ width: `${theirRatio}%`, background: '#06b6d4' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 7-DAY HEAD-TO-HEAD SHOWDOWN MATRIX ── */}
          <div 
            className="glass-card" 
            style={{
              borderRadius: '18px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Crown size={15} style={{ color: '#f59e0b' }} />
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  7-Day Showdown Matrix
                </span>
              </div>
              <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>
                {weeklyClash.myWins}W · {weeklyClash.theirWins}L · {weeklyClash.ties}T
              </span>
            </div>

            {/* 7-Day Day Columns */}
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '6px',
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
                      gap: '4px',
                      padding: '8px 4px',
                      borderRadius: '10px',
                      background: d.isToday ? 'rgba(168,85,247,0.1)' : 'var(--surface-input)',
                      border: d.isToday 
                        ? '1px solid rgba(168,85,247,0.35)' 
                        : '1px solid var(--border-subtle)',
                    }}
                  >
                    <span 
                      style={{ 
                        fontSize: '10px', 
                        fontWeight: '800', 
                        color: d.isToday ? '#a855f7' : 'var(--text-muted)' 
                      }}
                    >
                      {d.dayLabel}
                    </span>

                    {/* Winner Badge / Crown */}
                    <div 
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: youWonDay 
                          ? 'rgba(168,85,247,0.2)' 
                          : friendWonDay 
                          ? 'rgba(6,182,212,0.2)' 
                          : 'var(--surface-elevated)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: '800',
                        color: youWonDay ? '#a855f7' : friendWonDay ? '#06b6d4' : 'var(--text-muted)',
                      }}
                    >
                      {youWonDay ? '👑' : friendWonDay ? '🏃' : '—'}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '9px', fontWeight: '800', fontFamily: 'monospace' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Header Bar */}
          <div 
            className="glass-card" 
            style={{
              borderRadius: '16px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} style={{ color: '#ec4899' }} />
              <div>
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', display: 'block' }}>
                  AI Habit Synergy & Quests
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Discover shared routines & build synergy together
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRunAiMatch}
              disabled={loadingAiMatch}
              style={{
                padding: '5px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-input)',
                color: 'var(--text-primary)',
                fontSize: '11px',
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
                    borderRadius: '16px',
                    padding: '14px 16px',
                    background: 'linear-gradient(135deg, rgba(236,72,153,0.12) 0%, rgba(168,85,247,0.08) 100%)',
                    border: '1px solid rgba(236,72,153,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <Rocket size={15} style={{ color: '#ec4899' }} />
                      <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        {mutualHabit.title}
                      </span>
                      <span 
                        style={{ 
                          fontSize: '9px', 
                          fontWeight: '800', 
                          padding: '1px 6px', 
                          borderRadius: '4px', 
                          background: 'rgba(236,72,153,0.2)', 
                          color: '#ec4899' 
                        }}
                      >
                        Mutual Quest
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                      Both of you can track this habit to unlock weekly co-op bonus XP!
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAcceptHabit(mutualHabit.title)}
                    disabled={isMutualAccepted}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '10px',
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
                        <Check size={13} strokeWidth={2.5} />
                        <span>Tracking</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} strokeWidth={2.5} />
                        <span>Accept Quest</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Matched Habits List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                          padding: '12px 14px',
                          borderRadius: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                              {match.habitTitle}
                            </span>
                            <span 
                              style={{
                                fontSize: '9px',
                                fontWeight: '700',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: isBoth ? 'rgba(34,197,94,0.15)' : 'rgba(6,182,212,0.15)',
                                color: isBoth ? '#22c55e' : '#06b6d4',
                              }}
                            >
                              {isBoth ? 'Shared Duel' : `Tracked by ${friendDisplayName}`}
                            </span>
                          </div>

                          {isBoth ? (
                            <button
                              type="button"
                              onClick={() => handleToggleShareHabit(match.habitTitle)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-subtle)',
                                background: isSharedByMe ? 'rgba(34,197,94,0.12)' : 'var(--surface-input)',
                                color: isSharedByMe ? '#22c55e' : 'var(--text-muted)',
                                fontSize: '10px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              {isSharedByMe ? <Unlock size={12} /> : <Lock size={12} />}
                              <span>{isSharedByMe ? 'Shared Duel' : 'Private'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAcceptHabit(match.habitTitle)}
                              disabled={isAcceptedByMe}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: '800',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                border: 'none',
                                cursor: isAcceptedByMe ? 'default' : 'pointer',
                                background: isAcceptedByMe ? 'var(--surface-input)' : 'linear-gradient(135deg, #a855f7, #ec4899)',
                                color: isAcceptedByMe ? '#22c55e' : '#fff',
                              }}
                            >
                              {isAcceptedByMe ? <Check size={12} /> : <Plus size={12} />}
                              <span>{isAcceptedByMe ? 'Tracking' : 'Add Habit'}</span>
                            </button>
                          )}
                        </div>

                        {/* Duel Bar if shared */}
                        {isBoth && isSharedByMe && (
                          <div 
                            style={{
                              background: 'var(--surface-input)',
                              padding: '6px 10px',
                              borderRadius: '10px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '800' }}>
                              <span style={{ color: '#a855f7' }}>You: {myComps} done</span>
                              <span style={{ color: '#06b6d4' }}>{friendDisplayName}: {friendComps} done</span>
                            </div>
                            <div style={{ height: '4px', borderRadius: '2px', background: 'var(--surface-elevated)', overflow: 'hidden', display: 'flex' }}>
                              <div style={{ width: `${Math.round((myComps / (Math.max(1, myComps + friendComps))) * 100)}%`, background: '#a855f7' }} />
                              <div style={{ width: `${Math.round((friendComps / (Math.max(1, myComps + friendComps))) * 100)}%`, background: '#06b6d4' }} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="glass-card" style={{ padding: '20px', textAlign: 'center', borderRadius: '14px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tap "Re-Scan" to match habits with {friendDisplayName}.</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TRANSPARENT XP SCORE INSPECTOR MODAL ── */}
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
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '20px',
                padding: '20px',
                width: '100%',
                maxWidth: '420px',
                boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
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
                  top: '16px',
                  right: '16px',
                  background: 'var(--surface-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={14} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Award size={20} style={{ color: '#a855f7' }} />
                <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0 }}>
                  Habit XP & Level Formula
                </h3>
              </div>

              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45, margin: '0 0 16px 0' }}>
                Your Habit Score is calculated with clear, gamified RPG metrics. Complete habits, keep streaks alive, and achieve 100% daily discipline to earn XP!
              </p>

              {/* Formula Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '10px', background: 'var(--surface-input)' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700' }}>🎯 Check-in Completions</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>+10 XP per completion</div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: '800', fontSize: '12px', color: '#a855f7' }}>
                    +{myData.breakdown.checkinXP} XP
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '10px', background: 'var(--surface-input)' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700' }}>🔥 Streak Multiplier</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Bonus for 3+ and 7+ day streaks</div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: '800', fontSize: '12px', color: '#f59e0b' }}>
                    +{myData.breakdown.streakXP} XP
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '10px', background: 'var(--surface-input)' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700' }}>🛡️ Consistency Surge</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Based on % scheduled days completed</div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: '800', fontSize: '12px', color: '#10b981' }}>
                    +{myData.breakdown.consistencyXP} XP
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '10px', background: 'var(--surface-input)' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700' }}>⚡ Habit Arsenal</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>+10 XP per active daily habit</div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: '800', fontSize: '12px', color: '#3b82f6' }}>
                    +{myData.breakdown.arsenalXP} XP
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '10px', background: 'var(--surface-input)' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700' }}>🌟 Perfect Days</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>+20 XP per 100% completed day</div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: '800', fontSize: '12px', color: '#ec4899' }}>
                    +{myData.breakdown.perfectDaysXP} XP
                  </div>
                </div>
              </div>

              {/* Progress to Next Level */}
              <div 
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(236,72,153,0.06))',
                  border: '1px solid rgba(168,85,247,0.25)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '800', marginBottom: '6px' }}>
                  <span>Lv.{myData.level} {myData.rankTitle}</span>
                  <span style={{ color: '#a855f7' }}>{myData.xpInCurrentLevel} / {myData.xpNeededForNext} XP ({myData.progressPercent}%)</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', background: 'var(--surface-input)', overflow: 'hidden' }}>
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
