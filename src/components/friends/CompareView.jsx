import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
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
  Rocket
} from 'lucide-react';
import { 
  format, 
  parseISO, 
  subDays, 
  addDays, 
  startOfWeek, 
  differenceInDays 
} from 'date-fns';
import { fetchHabitsForUser } from '../../hooks/useFriends';
import useHabits from '../../hooks/useHabits';
import { analyzeHabitMatch } from '../../lib/groq';
import AppLoader from '../common/AppLoader';

const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const computeDetailedCompareMetrics = (habits, mode = 'all_time') => {
  const now = new Date();
  const todayStr = getLocalDateStr(now);
  const thirtyDaysAgoStr = getLocalDateStr(subDays(now, 30));

  if (!habits || !Array.isArray(habits) || habits.length === 0) {
    return {
      score: 0,
      completions: 0,
      thirtyDayCompletions: 0,
      consistencyRate: 0,
      activeHabits: 0
    };
  }

  let fromDateStr = thirtyDaysAgoStr;
  if (mode === 'this_week') {
    fromDateStr = getLocalDateStr(startOfWeek(now, { weekStartsOn: 1 }));
  } else if (mode === 'all_time') {
    fromDateStr = '2020-01-01';
  }

  const fromDate = parseISO(fromDateStr);

  let periodCompletions = 0;
  let thirtyDayCompletions = 0;
  let allTimeCompletions = 0;
  let activeHabitsCount = 0;
  let scheduledDaysTotal = 0;
  let completedDaysTotal = 0;

  habits.forEach(habit => {
    if (habit.is_paused === true) return;
    activeHabitsCount++;

    const history = habit.history || [];
    const activeDays = habit.active_days || [0, 1, 2, 3, 4, 5, 6];

    const completedDates = new Set();
    history.forEach(entry => {
      const date = typeof entry === 'string' ? entry.split('T')[0] : entry.date;
      const status = typeof entry === 'string' ? 'completed' : entry.status;
      if (status === 'completed') {
        allTimeCompletions++;
        completedDates.add(date);

        if (date >= thirtyDaysAgoStr && date <= todayStr) {
          thirtyDayCompletions++;
        }

        if (date >= fromDateStr && date <= todayStr) {
          periodCompletions++;
        }
      }
    });

    let cursor = new Date(fromDate);
    while (cursor <= now) {
      const dow = cursor.getDay();
      if (activeDays.includes(dow)) {
        scheduledDaysTotal++;
        const dStr = getLocalDateStr(cursor);
        if (completedDates.has(dStr)) {
          completedDaysTotal++;
        }
      }
      cursor = addDays(cursor, 1);
    }
  });

  const consistencyRate = scheduledDaysTotal > 0 
    ? Math.round((completedDaysTotal / scheduledDaysTotal) * 100) 
    : 0;

  let score = (thirtyDayCompletions * 10) + (allTimeCompletions * 2) + (activeHabitsCount * 5);
  if (mode === 'this_week') {
    score = (periodCompletions * 15) + (allTimeCompletions * 2) + (activeHabitsCount * 5) + (consistencyRate * 2);
  }

  return {
    score,
    completions: mode === 'all_time' ? (thirtyDayCompletions || periodCompletions) : periodCompletions,
    thirtyDayCompletions,
    consistencyRate,
    activeHabits: activeHabitsCount
  };
};

const CompareView = ({ friends, myScore, currentUserId, myProfile }) => {
  const { habits: myContextHabits, addHabit: addHabitDb } = useHabits();

  const [viewMode, setViewMode] = useState('arena'); // 'arena' | 'habit_match'
  const [selectedFriendId, setSelectedFriendId] = useState(friends?.[0]?.friendship_id || '');
  const [compareMode, setCompareMode] = useState('all_time'); // 'all_time' | 'this_week'

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
    if (friends?.length > 0 && !selectedFriendId) {
      setSelectedFriendId(friends[0].friendship_id);
    }
  }, [friends, selectedFriendId]);

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

  const myData = useMemo(() => {
    if (myContextHabits && myContextHabits.length > 0) {
      return computeDetailedCompareMetrics(myContextHabits, compareMode);
    }
    const score = myScore?.score || 0;
    const comps = myScore?.completions_30d || 0;
    const active = myScore?.active_habits || (myContextHabits?.length || 0);
    const rate = myScore?.completion_rate || 0;
    return {
      score,
      completions: comps,
      consistencyRate: rate,
      activeHabits: active
    };
  }, [myContextHabits, compareMode, myScore]);

  const theirData = useMemo(() => {
    if (friendHabits && friendHabits.length > 0) {
      return computeDetailedCompareMetrics(friendHabits, compareMode);
    }
    const score = selectedFriend?.score || 0;
    const comps = selectedFriend?.completions_30d || 0;
    const active = selectedFriend?.active_habits || 0;
    const rate = selectedFriend?.completion_rate || 0;
    return {
      score,
      completions: comps,
      consistencyRate: rate,
      activeHabits: active
    };
  }, [friendHabits, compareMode, selectedFriend]);

  if (!friends || friends.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '36px 20px', borderRadius: '18px' }}>
        <Swords size={28} style={{ color: '#a855f7', marginBottom: '10px' }} />
        <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 4px 0' }}>Head-to-Head Arena</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>Add friends to compare habits and progress.</p>
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

  const mutualHabit = aiMatchResult?.mutualSynergyHabit || aiMatchResult?.mutualSynergyHabits?.[0];
  const isMutualAccepted = mutualHabit && (acceptedHabits.has(mutualHabit.title) || myContextHabits.some(h => h.name.toLowerCase() === mutualHabit.title.toLowerCase()));

  const isYouLeading = myData.score > theirData.score;
  const isFriendLeading = theirData.score > myData.score;
  const scoreDiff = Math.abs(myData.score - theirData.score);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '90px' }}>
      
      {/* ── UNIFIED MINIMAL CONTROL BAR ── */}
      <div className="glass-card" style={{
        borderRadius: '16px',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px'
      }}>
        {/* Opponent Selector */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: 0, flex: 1, maxWidth: '160px' }}>
          <select
            value={selectedFriendId}
            onChange={(e) => setSelectedFriendId(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 24px 6px 8px',
              borderRadius: '8px',
              background: 'var(--surface-input)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: '700',
              appearance: 'none',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {friends.map(f => (
              <option key={f.friendship_id} value={f.friendship_id}>
                {f.display_name || f.full_name || `@${f.username}`}
              </option>
            ))}
          </select>
          <ChevronDown size={13} style={{ position: 'absolute', right: '7px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        </div>

        {/* View Mode & Timeframe Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Timeframe Toggle */}
          {viewMode === 'arena' && (
            <button
              type="button"
              onClick={() => setCompareMode(m => m === 'all_time' ? 'this_week' : 'all_time')}
              style={{
                padding: '5px 8px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-input)',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {compareMode === 'all_time' ? 'Overall' : 'This Week'}
            </button>
          )}

          {/* Mode Switcher */}
          <button
            type="button"
            onClick={() => setViewMode(v => v === 'arena' ? 'habit_match' : 'arena')}
            style={{
              padding: '5px 10px',
              borderRadius: '8px',
              border: 'none',
              background: viewMode === 'habit_match' ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'var(--surface-elevated)',
              color: viewMode === 'habit_match' ? '#fff' : 'var(--text-primary)',
              fontSize: '11px',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              boxShadow: viewMode === 'habit_match' ? '0 2px 8px rgba(236,72,153,0.3)' : 'none'
            }}
          >
            {viewMode === 'arena' ? (
              <>
                <Sparkles size={12} style={{ color: '#ec4899' }} />
                <span>Habit Match</span>
              </>
            ) : (
              <>
                <Trophy size={12} />
                <span>Battle Stats</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── SUBVIEW 1: BATTLE ARENA (MINIMAL, AIRY & ELEGANT) ── */}
      {viewMode === 'arena' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* Main Showdown Hero Card */}
          <div className="glass-card" style={{
            borderRadius: '18px',
            padding: '16px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {/* Top Leader Pill */}
            <div style={{
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: '800',
              padding: '3px 8px',
              borderRadius: '8px',
              background: isYouLeading ? 'rgba(34,197,94,0.1)' : isFriendLeading ? 'rgba(6,182,212,0.1)' : 'rgba(168,85,247,0.1)',
              color: isYouLeading ? '#22c55e' : isFriendLeading ? '#06b6d4' : '#a855f7',
              border: `1px solid ${isYouLeading ? 'rgba(34,197,94,0.2)' : isFriendLeading ? 'rgba(6,182,212,0.2)' : 'rgba(168,85,247,0.2)'}`
            }}>
              {isYouLeading ? `👑 You are leading by +${scoreDiff} pts` : isFriendLeading ? `🏃 ${friendDisplayName} is in the lead (+${scoreDiff} pts)` : '⚔️ Dead heat tie matchup'}
            </div>

            {/* Fighter Avatars */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              gap: '10px'
            }}>
              {/* You */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{
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
                  marginBottom: '3px',
                  boxShadow: '0 4px 16px rgba(168,85,247,0.35)'
                }}>
                  {myInitial}
                </div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>You</span>
                <span style={{ fontSize: '15px', fontWeight: '900', color: '#a855f7', fontFamily: 'monospace' }}>
                  {myData.score} pts
                </span>
              </div>

              {/* VS */}
              <div style={{
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
                color: 'var(--text-muted)'
              }}>
                VS
              </div>

              {/* Friend */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{
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
                  marginBottom: '3px',
                  boxShadow: '0 4px 16px rgba(6,182,212,0.35)'
                }}>
                  {friendInitial}
                </div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {friendDisplayName}
                </span>
                <span style={{ fontSize: '15px', fontWeight: '900', color: '#06b6d4', fontFamily: 'monospace' }}>
                  {theirData.score} pts
                </span>
              </div>
            </div>

            {/* Dynamic Dual-End Filling Score Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: '700' }}>
                <span style={{ color: '#a855f7' }}>{myScoreShare}% You</span>
                <span style={{ color: '#06b6d4' }}>{theirScoreShare}% {friendDisplayName}</span>
              </div>
              <div style={{ position: 'relative', height: '6px', borderRadius: '3px', background: 'var(--surface-input)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${myScoreShare}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    background: 'linear-gradient(90deg, #a855f7 0%, #ec4899 100%)',
                    borderRadius: myScoreShare === 100 ? '3px' : '3px 0 0 3px',
                    boxShadow: myScoreShare > 0 ? '0 0 10px rgba(168,85,247,0.45)' : 'none'
                  }}
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${theirScoreShare}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    background: 'linear-gradient(270deg, #06b6d4 0%, #3b82f6 100%)',
                    borderRadius: theirScoreShare === 100 ? '3px' : '0 3px 3px 0',
                    boxShadow: theirScoreShare > 0 ? '0 0 10px rgba(6,182,212,0.45)' : 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── CONSOLIDATED BREAKDOWN ROW ── */}
          <div className="glass-card" style={{
            borderRadius: '16px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {[
              { label: 'Check-ins', icon: Flame, color: '#f59e0b', myVal: myData.completions, theirVal: theirData.completions },
              { label: 'Consistency', icon: Target, color: '#10b981', myVal: `${myData.consistencyRate}%`, theirVal: `${theirData.consistencyRate}%` },
              { label: 'Active Habits', icon: Layers, color: '#6366f1', myVal: myData.activeHabits, theirVal: theirData.activeHabits }
            ].map((stat, sIdx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={sIdx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: 'var(--surface-input)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon size={14} color={stat.color} />
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {stat.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace' }}>
                    <span style={{ fontSize: '13px', fontWeight: '900', color: '#a855f7' }}>
                      {stat.myVal}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>vs</span>
                    <span style={{ fontSize: '13px', fontWeight: '900', color: '#06b6d4' }}>
                      {stat.theirVal}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ── SUBVIEW 2: HABIT MATCH (CLEAN & MINIMAL) ── */}
      {viewMode === 'habit_match' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* Header Bar */}
          <div className="glass-card" style={{
            borderRadius: '14px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={15} style={{ color: '#ec4899' }} />
              <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                Habit Match
              </span>
              {aiMatchResult?.compatibilityScore && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: 'rgba(236,72,153,0.15)',
                  color: '#ec4899'
                }}>
                  {aiMatchResult.compatibilityScore}% Synergy
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleRunAiMatch}
              disabled={loadingAiMatch}
              style={{
                padding: '4px 8px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-input)',
                color: 'var(--text-primary)',
                fontSize: '10px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={10} className={loadingAiMatch ? 'spin' : ''} />
              <span>{loadingAiMatch ? 'Scanning...' : 'Re-Scan'}</span>
            </button>
          </div>

          {loadingAiMatch ? (
            <AppLoader variant="section" size="small" message="Scanning habit synergy..." />
          ) : (
            <>
              {/* Mutual Quest Card */}
              {mutualHabit && (
                <div className="glass-card" style={{
                  borderRadius: '14px',
                  padding: '12px 14px',
                  background: 'linear-gradient(135deg, rgba(236,72,153,0.1) 0%, rgba(168,85,247,0.06) 100%)',
                  border: '1px solid rgba(236,72,153,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Rocket size={13} style={{ color: '#ec4899' }} />
                      <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        {mutualHabit.title}
                      </span>
                      <span style={{ fontSize: '9px', fontWeight: '700', padding: '1px 5px', borderRadius: '4px', background: 'rgba(236,72,153,0.18)', color: '#ec4899' }}>
                        Mutual Quest
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAcceptHabit(mutualHabit.title)}
                    disabled={isMutualAccepted}
                    className={isMutualAccepted ? 'surface-input' : 'btn-primary'}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      border: 'none',
                      cursor: isMutualAccepted ? 'default' : 'pointer',
                      flexShrink: 0,
                      color: isMutualAccepted ? '#10b981' : '#fff'
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
                        <span>Track</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Matched Habits */}
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
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                              {match.habitTitle}
                            </span>
                            <span style={{
                              fontSize: '9px',
                              fontWeight: '700',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: isBoth ? 'rgba(34,197,94,0.15)' : 'rgba(6,182,212,0.15)',
                              color: isBoth ? '#22c55e' : '#06b6d4'
                            }}>
                              {isBoth ? 'Shared' : `Tracked by ${friendDisplayName}`}
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
                                fontSize: '10px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer'
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
                              className={isAcceptedByMe ? 'surface-input' : 'btn-primary'}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '10px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                border: 'none',
                                cursor: isAcceptedByMe ? 'default' : 'pointer',
                                color: isAcceptedByMe ? '#10b981' : '#fff'
                              }}
                            >
                              {isAcceptedByMe ? <Check size={11} /> : <Plus size={11} />}
                              <span>{isAcceptedByMe ? 'Tracking' : 'Add'}</span>
                            </button>
                          )}
                        </div>

                        {/* Duel Bar if shared */}
                        {isBoth && isSharedByMe && (
                          <div style={{
                            background: 'var(--surface-input)',
                            padding: '5px 8px',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: '700' }}>
                              <span style={{ color: '#a855f7' }}>You: {myComps}</span>
                              <span style={{ color: '#06b6d4' }}>{friendDisplayName}: {friendComps}</span>
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
                  <div className="glass-card" style={{ padding: '16px', textAlign: 'center', borderRadius: '12px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tap "Re-Scan" to match habits.</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
};

export default CompareView;
