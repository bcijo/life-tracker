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
  Handshake,
  ArrowRight,
  Clock,
  Compass
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

  const [activeTab, setActiveTab] = useState('arena'); // 'arena' | 'habits'
  const [selectedFriendId, setSelectedFriendId] = useState(
    initialSelectedFriendId || friends?.[0]?.friendship_id || ''
  );
  const [compareMode, setCompareMode] = useState('all_time'); // 'all_time' | 'this_week'
  const [showXPInspector, setShowXPInspector] = useState(false);

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

  // Automated Habit-by-Habit matching
  const habitClashData = useMemo(() => {
    const common = [];
    const friendUnique = [];

    const myHabitsMap = new Map(
      myContextHabits.map(h => [(h.name || '').toLowerCase().trim(), h])
    );

    (friendHabits || []).forEach(fh => {
      const fNameKey = (fh.name || '').toLowerCase().trim();
      const matchedMyHabit = myHabitsMap.get(fNameKey);

      if (matchedMyHabit) {
        const myComps = matchedMyHabit.history?.filter(e => 
          (typeof e === 'string' ? 'completed' : e.status) === 'completed'
        ).length || 0;
        const friendComps = fh.history?.filter(e => 
          (typeof e === 'string' ? 'completed' : e.status) === 'completed'
        ).length || 0;

        common.push({
          name: matchedMyHabit.name,
          myHabit: matchedMyHabit,
          friendHabit: fh,
          myCompletions: myComps,
          friendCompletions: friendComps,
          myLead: myComps > friendComps,
          friendLead: friendComps > myComps,
        });
      } else {
        friendUnique.push(fh);
      }
    });

    return { common, friendUnique };
  }, [myContextHabits, friendHabits]);

  if (!friends || friends.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px 24px', borderRadius: '22px' }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'rgba(168,85,247,0.12)', margin: '0 auto 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Swords size={26} style={{ color: '#a855f7' }} />
        </div>
        <h3 style={{ fontSize: '17px', fontWeight: '800', margin: '0 0 6px', color: 'var(--text-primary)' }}>
          Head-to-Head Compare
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, lineHeight: 1.5, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
          Add friends to compare streaks, explore common habits, and compete head-to-head!
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
  const myDisplayName = me.display_name || me.full_name || me.username || 'You';
  const myInitial = myDisplayName[0]?.toUpperCase() || 'Y';

  const isYouLeading = myData.score > theirData.score;
  const isFriendLeading = theirData.score > myData.score;
  const scoreDiff = Math.abs(myData.score - theirData.score);

  // 5 Battle Attributes
  const battleAttributes = [
    {
      id: 'consistency',
      label: 'Consistency Rate',
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
      label: 'Best Active Streak',
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
      myVal: `${myData.sevenDayCompletions}`,
      theirVal: `${theirData.sevenDayCompletions}`,
      myLead: myData.sevenDayCompletions > theirData.sevenDayCompletions,
      theirLead: theirData.sevenDayCompletions > myData.sevenDayCompletions,
      myNum: myData.sevenDayCompletions,
      theirNum: theirData.sevenDayCompletions,
    },
    {
      id: 'arsenal',
      label: 'Active Arsenal',
      icon: Shield,
      color: '#3b82f6',
      myVal: `${myData.activeHabits}`,
      theirVal: `${theirData.activeHabits}`,
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 60 }}>
      
      {/* ── COMMAND CONTROL BAR ── */}
      <div 
        className="glass-card" 
        style={{
          borderRadius: 18,
          padding: '10px 14px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          background: 'var(--surface-elevated, rgba(255,255,255,0.04))',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
        }}
      >
        {/* Opponent Selector */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: 180 }}>
          <div style={{
            position: 'absolute', left: 10, width: 22, height: 22, borderRadius: '50%',
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            color: '#fff', fontSize: 10, fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
          }}>
            {friendInitial}
          </div>
          <select
            value={selectedFriendId}
            onChange={(e) => setSelectedFriendId(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 30px 8px 38px',
              borderRadius: 11,
              background: 'var(--surface-input, rgba(255,255,255,0.05))',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
              color: 'var(--text-primary)',
              fontSize: 12.5,
              fontWeight: 700,
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
          <ChevronDown size={14} style={{ position: 'absolute', right: 10, color: 'var(--text-muted)', pointerEvents: 'none' }} />
        </div>

        {/* View Mode & Timeframe Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {/* Sub-Tab Switcher */}
          <div style={{
            display: 'flex', background: 'var(--surface-input, rgba(255,255,255,0.05))',
            borderRadius: 10, padding: 3, border: '1px solid var(--border-subtle)'
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('arena')}
              style={{
                padding: '5px 12px', borderRadius: 8,
                background: activeTab === 'arena' ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'transparent',
                border: 'none', color: activeTab === 'arena' ? '#fff' : 'var(--text-muted)',
                fontSize: 11.5, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <Swords size={12} />
              <span>Clash Arena</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('habits')}
              style={{
                padding: '5px 12px', borderRadius: 8,
                background: activeTab === 'habits' ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'transparent',
                border: 'none', color: activeTab === 'habits' ? '#fff' : 'var(--text-muted)',
                fontSize: 11.5, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <Sparkles size={12} />
              <span>Habit Duels ({habitClashData.common.length})</span>
            </button>
          </div>

          {/* Timeframe Toggle */}
          <button
            type="button"
            onClick={() => setCompareMode(m => m === 'all_time' ? 'this_week' : 'all_time')}
            style={{
              padding: '6px 12px', borderRadius: 10,
              background: 'var(--surface-input, rgba(255,255,255,0.05))',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
              color: 'var(--text-secondary)',
              fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {compareMode === 'all_time' ? '📅 All Time' : '⚡ This Week'}
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          VIEW 1: CLASH ARENA (HERO SHOWDOWN + BENTO + 7-DAY MATRIX)
         ────────────────────────────────────────────────────────── */}
      {activeTab === 'arena' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* ── HERO BATTLE CARD ── */}
          <div 
            className="glass-card" 
            style={{
              borderRadius: 24,
              padding: '20px',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
              background: 'var(--surface-elevated, rgba(255,255,255,0.04))',
            }}
          >
            {/* Dynamic Ambient Background Glow */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: isYouLeading
                ? 'radial-gradient(ellipse at 25% 40%, rgba(168,85,247,0.18) 0%, transparent 65%)'
                : isFriendLeading
                ? 'radial-gradient(ellipse at 75% 40%, rgba(6,182,212,0.18) 0%, transparent 65%)'
                : 'radial-gradient(ellipse at 50% 40%, rgba(234,179,8,0.15) 0%, transparent 65%)',
            }} />

            {/* Top Match Outcome Banner */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 16, position: 'relative', zIndex: 2
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', borderRadius: 9999,
                fontSize: 12, fontWeight: 800,
                background: isYouLeading ? 'rgba(34,197,94,0.14)' : isFriendLeading ? 'rgba(6,182,212,0.14)' : 'rgba(234,179,8,0.14)',
                color: isYouLeading ? '#22c55e' : isFriendLeading ? '#06b6d4' : '#eab308',
                border: `1px solid ${isYouLeading ? 'rgba(34,197,94,0.3)' : isFriendLeading ? 'rgba(6,182,212,0.3)' : 'rgba(234,179,8,0.3)'}`,
              }}>
                {isYouLeading ? (
                  <>
                    <Crown size={14} />
                    <span>You Lead by {scoreDiff.toLocaleString()} XP</span>
                  </>
                ) : isFriendLeading ? (
                  <>
                    <TrendingUp size={14} />
                    <span>{friendDisplayName} Leads by {scoreDiff.toLocaleString()} XP</span>
                  </>
                ) : (
                  <>
                    <Swords size={14} />
                    <span>Scores Tied! Dead Heat</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowXPInspector(true)}
                style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4
                }}
              >
                <HelpCircle size={12} />
                <span>XP Details</span>
              </button>
            </div>

            {/* Center Stage: Fighter Cards + VS Energy Nexus */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              gap: 16,
              marginBottom: 18,
              position: 'relative',
              zIndex: 2,
            }}>
              {/* YOU */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                padding: '12px 8px', borderRadius: 18,
                background: isYouLeading ? 'rgba(168,85,247,0.08)' : 'transparent',
                border: isYouLeading ? '1px solid rgba(168,85,247,0.25)' : '1px solid transparent',
              }}>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <div style={{
                    width: 62, height: 62, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, fontWeight: 900, color: '#fff',
                    boxShadow: '0 8px 24px rgba(168,85,247,0.4)',
                  }}>
                    {myInitial}
                  </div>
                  <div style={{
                    position: 'absolute', bottom: -4, right: -4,
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'var(--surface-elevated, #1a1a24)',
                    border: '1.5px solid #a855f7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12,
                  }}>
                    {myData.rankIcon}
                  </div>
                </div>

                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {myDisplayName}
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#a855f7', marginTop: 1 }}>
                  Lv.{myData.level} · {myData.rankTitle}
                </span>
                <div style={{
                  fontSize: 20, fontWeight: 900, color: '#a855f7',
                  fontFamily: 'monospace', marginTop: 4, letterSpacing: '-0.02em'
                }}>
                  {myData.score.toLocaleString()} <span style={{ fontSize: 11, fontWeight: 700 }}>XP</span>
                </div>
              </div>

              {/* CENTER VS SHIELD */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'var(--surface-input, rgba(255,255,255,0.06))',
                  border: '1.5px solid var(--border-subtle, rgba(255,255,255,0.15))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-muted)', fontWeight: 900, fontSize: 13,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                }}>
                  VS
                </div>
                <span style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Head to Head
                </span>
              </div>

              {/* FRIEND */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                padding: '12px 8px', borderRadius: 18,
                background: isFriendLeading ? 'rgba(6,182,212,0.08)' : 'transparent',
                border: isFriendLeading ? '1px solid rgba(6,182,212,0.25)' : '1px solid transparent',
              }}>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <div style={{
                    width: 62, height: 62, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, fontWeight: 900, color: '#fff',
                    boxShadow: '0 8px 24px rgba(6,182,212,0.4)',
                  }}>
                    {friendInitial}
                  </div>
                  <div style={{
                    position: 'absolute', bottom: -4, right: -4,
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'var(--surface-elevated, #1a1a24)',
                    border: '1.5px solid #06b6d4',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12,
                  }}>
                    {theirData.rankIcon}
                  </div>
                </div>

                <span style={{
                  fontSize: 15, fontWeight: 800, color: 'var(--text-primary)',
                  maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {friendDisplayName}
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#06b6d4', marginTop: 1 }}>
                  Lv.{theirData.level} · {theirData.rankTitle}
                </span>
                <div style={{
                  fontSize: 20, fontWeight: 900, color: '#06b6d4',
                  fontFamily: 'monospace', marginTop: 4, letterSpacing: '-0.02em'
                }}>
                  {theirData.score.toLocaleString()} <span style={{ fontSize: 11, fontWeight: 700 }}>XP</span>
                </div>
              </div>
            </div>

            {/* Momentum Tug-of-War Bar */}
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, marginBottom: 5 }}>
                <span style={{ color: '#a855f7' }}>You: {myScoreShare}%</span>
                <span style={{ color: '#06b6d4' }}>{friendDisplayName}: {theirScoreShare}%</span>
              </div>
              <div style={{
                height: 8, borderRadius: 9999,
                background: 'var(--surface-input, rgba(255,255,255,0.06))',
                overflow: 'hidden', display: 'flex',
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${myScoreShare}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  style={{
                    background: 'linear-gradient(90deg, #a855f7, #ec4899)',
                    height: '100%',
                  }}
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${theirScoreShare}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  style={{
                    background: 'linear-gradient(90deg, #06b6d4, #3b82f6)',
                    height: '100%',
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── BENTO STAT CLASH MATRIX (2-COLUMN GRID) ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                Attributes Breakdown
              </h3>
              <span style={{
                fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 9999,
                background: myAttributeWins > theirAttributeWins ? 'rgba(34,197,94,0.12)' : 'rgba(168,85,247,0.12)',
                color: myAttributeWins > theirAttributeWins ? '#22c55e' : '#a855f7',
                border: '1px solid currentColor',
              }}>
                {myAttributeWins > theirAttributeWins
                  ? `You hold ${myAttributeWins}/5 attributes`
                  : theirAttributeWins > myAttributeWins
                  ? `${friendDisplayName} holds ${theirAttributeWins}/5`
                  : 'Tied 50/50'}
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 10,
            }}>
              {battleAttributes.map(attr => {
                const Icon = attr.icon;
                const total = Math.max(1, (attr.myNum || 0) + (attr.theirNum || 0));
                const myRatio = Math.round(((attr.myNum || 0) / total) * 100);

                return (
                  <div
                    key={attr.id}
                    className="glass-card"
                    style={{
                      padding: '12px 14px',
                      borderRadius: 16,
                      background: 'var(--surface-elevated, rgba(255,255,255,0.03))',
                      border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: 7,
                          background: `${attr.color}20`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <Icon size={13} color={attr.color} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {attr.label}
                        </span>
                      </div>

                      {/* Lead Pill */}
                      <span style={{
                        fontSize: 9.5, fontWeight: 800,
                        color: attr.myLead ? '#22c55e' : attr.theirLead ? '#06b6d4' : 'var(--text-muted)'
                      }}>
                        {attr.myLead ? 'You Lead 👑' : attr.theirLead ? `${friendDisplayName} Leads` : 'Tied'}
                      </span>
                    </div>

                    {/* Stat Values */}
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontSize: 9.5, color: 'var(--text-muted)', display: 'block' }}>You</span>
                        <span style={{
                          fontSize: 16, fontWeight: 900,
                          color: attr.myLead ? '#22c55e' : '#a855f7',
                          fontFamily: 'monospace'
                        }}>
                          {attr.myVal}
                        </span>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 9.5, color: 'var(--text-muted)', display: 'block' }}>{friendDisplayName}</span>
                        <span style={{
                          fontSize: 16, fontWeight: 900,
                          color: attr.theirLead ? '#22c55e' : '#06b6d4',
                          fontFamily: 'monospace'
                        }}>
                          {attr.theirVal}
                        </span>
                      </div>
                    </div>

                    {/* Proportional Mini Bar */}
                    <div style={{
                      height: 4, borderRadius: 2,
                      background: 'var(--surface-input, rgba(255,255,255,0.06))',
                      overflow: 'hidden', display: 'flex',
                    }}>
                      <div style={{ width: `${myRatio}%`, background: '#a855f7' }} />
                      <div style={{ width: `${100 - myRatio}%`, background: '#06b6d4' }} />
                    </div>
                  </div>
                );
              })}

              {/* 6th Card: Domination Summary */}
              <div
                className="glass-card"
                style={{
                  padding: '12px 14px',
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, rgba(234,179,8,0.08), rgba(168,85,247,0.05))',
                  border: '1px solid rgba(234,179,8,0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 7, background: 'rgba(234,179,8,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Trophy size={13} color="#eab308" />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Arena Status
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#eab308' }}>
                    {myAttributeWins > theirAttributeWins ? 'Advantage You 🛡️' : theirAttributeWins > myAttributeWins ? `${friendDisplayName} in Control ⚔️` : 'Balanced Showdown 🤝'}
                  </div>
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                    Calculated from streak, consistency & daily rate
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── 7-DAY BATTLE MATRIX ── */}
          <div 
            className="glass-card" 
            style={{
              borderRadius: 20,
              padding: '16px',
              background: 'var(--surface-elevated, rgba(255,255,255,0.03))',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                  7-Day Battle History
                </h3>
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                  Daily completions comparison
                </span>
              </div>

              <span style={{
                fontSize: 11, fontWeight: 800, color: 'var(--text-primary)',
                padding: '3px 8px', borderRadius: 8,
                background: 'var(--surface-input, rgba(255,255,255,0.06))',
              }}>
                {weeklyClash.myWins}W · {weeklyClash.theirWins}L · {weeklyClash.ties}T
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, textAlign: 'center' }}>
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
                      gap: 4,
                      padding: '8px 4px',
                      borderRadius: 12,
                      background: d.isToday ? 'rgba(168,85,247,0.1)' : 'var(--surface-input, rgba(255,255,255,0.04))',
                      border: d.isToday 
                        ? '1px solid rgba(168,85,247,0.35)' 
                        : '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                    }}
                  >
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: d.isToday ? '#a855f7' : 'var(--text-muted)'
                    }}>
                      {d.dayLabel}
                    </span>

                    {/* Outcome Badge */}
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: youWonDay ? 'rgba(168,85,247,0.25)' : friendWonDay ? 'rgba(6,182,212,0.25)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11,
                    }}>
                      {youWonDay ? '👑' : friendWonDay ? '🏃' : '·'}
                    </div>

                    {/* Numbers: You vs Friend */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: 9.5, fontWeight: 800, fontFamily: 'monospace' }}>
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

      {/* ──────────────────────────────────────────────────────────
          VIEW 2: HABIT DUELS & CO-OP DISCOVERY
         ────────────────────────────────────────────────────────── */}
      {activeTab === 'habits' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Section 1: Direct Matching Habits */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Common Habits ({habitClashData.common.length})
                </h3>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Habits you both track actively
                </span>
              </div>

              <button
                type="button"
                onClick={handleRunAiMatch}
                disabled={loadingAiMatch}
                style={{
                  padding: '5px 10px', borderRadius: 8,
                  background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                  border: 'none', color: '#fff', fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <Sparkles size={12} />
                <span>{loadingAiMatch ? 'Analyzing...' : 'AI Synergy Scan'}</span>
              </button>
            </div>

            {habitClashData.common.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {habitClashData.common.map((item, idx) => (
                  <div
                    key={idx}
                    className="glass-card"
                    style={{
                      padding: '12px 14px', borderRadius: 16,
                      background: 'var(--surface-elevated, rgba(255,255,255,0.03))',
                      border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-primary)' }}>
                        {item.name}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 800,
                        color: item.myLead ? '#22c55e' : item.friendLead ? '#06b6d4' : 'var(--text-muted)',
                      }}>
                        {item.myLead ? 'You Lead 👑' : item.friendLead ? `${friendDisplayName} Leads` : 'Tied'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ color: '#a855f7', fontWeight: 700 }}>
                        You: {item.myCompletions} completions
                      </span>
                      <span style={{ color: '#06b6d4', fontWeight: 700 }}>
                        {friendDisplayName}: {item.friendCompletions} completions
                      </span>
                    </div>

                    <div style={{
                      height: 5, borderRadius: 3, marginTop: 6,
                      background: 'var(--surface-input, rgba(255,255,255,0.06))',
                      overflow: 'hidden', display: 'flex',
                    }}>
                      <div style={{
                        width: `${Math.round((item.myCompletions / Math.max(1, item.myCompletions + item.friendCompletions)) * 100)}%`,
                        background: '#a855f7'
                      }} />
                      <div style={{
                        width: `${Math.round((item.friendCompletions / Math.max(1, item.myCompletions + item.friendCompletions)) * 100)}%`,
                        background: '#06b6d4'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card" style={{ padding: '24px 16px', textAlign: 'center', borderRadius: 16 }}>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted)' }}>
                  No exact common habits found yet. Discover what {friendDisplayName} tracks below to start a shared pact!
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Discover Friend's Habits */}
          {habitClashData.friendUnique.length > 0 && (
            <div>
              <div style={{ marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Discover {friendDisplayName}'s Habits ({habitClashData.friendUnique.length})
                </h3>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Adopt these habits to track together with {friendDisplayName}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                {habitClashData.friendUnique.map((h) => {
                  const isAdopted = acceptedHabits.has(h.name) || myContextHabits.some(myH => myH.name.toLowerCase() === h.name.toLowerCase());

                  return (
                    <div
                      key={h.id}
                      className="glass-card"
                      style={{
                        padding: '12px', borderRadius: 14,
                        background: 'var(--surface-input, rgba(255,255,255,0.03))',
                        border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {h.name}
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          Tracked by {friendDisplayName}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAcceptHabit(h.name)}
                        disabled={isAdopted}
                        style={{
                          padding: '5px 10px', borderRadius: 8,
                          background: isAdopted ? 'rgba(34,197,94,0.15)' : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                          border: 'none', color: isAdopted ? '#22c55e' : '#fff',
                          fontSize: 11, fontWeight: 700, cursor: isAdopted ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0,
                        }}
                      >
                        {isAdopted ? <Check size={12} strokeWidth={3} /> : <Plus size={12} strokeWidth={3} />}
                        <span>{isAdopted ? 'Tracking' : 'Adopt'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: AI Co-Op Quests if scanned */}
          {aiMatchResult && (
            <div className="glass-card" style={{ padding: '16px', borderRadius: 18, border: '1px solid rgba(168,85,247,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Rocket size={15} color="#ec4899" />
                <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: 'var(--text-primary)' }}>
                  AI Synergy Recommendation
                </h4>
              </div>

              {aiMatchResult.mutualSynergyHabit && (
                <div style={{
                  padding: '10px 12px', borderRadius: 12,
                  background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
                      "{aiMatchResult.mutualSynergyHabit.title}"
                    </span>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                      Recommended mutual habit for you and {friendDisplayName}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAcceptHabit(aiMatchResult.mutualSynergyHabit.title)}
                    style={{
                      padding: '5px 12px', borderRadius: 8,
                      background: 'linear-gradient(135deg, #ec4899, #a855f7)',
                      border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    Start Habit
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ── XP SCORE INSPECTOR MODAL ── */}
      <AnimatePresence>
        {showXPInspector && (
          <div
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10000, padding: 20,
            }}
            onClick={() => setShowXPInspector(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              style={{
                background: 'var(--surface-elevated, #1a1a24)',
                border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                borderRadius: 20,
                padding: 18,
                width: '100%', maxWidth: 400,
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
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
                  position: 'absolute', top: 14, right: 14,
                  background: 'var(--surface-input)', border: '1px solid var(--border-subtle)',
                  borderRadius: '50%', width: 26, height: 26,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-muted)',
                }}
              >
                <X size={13} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <Award size={18} style={{ color: '#a855f7' }} />
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>
                  XP Breakdown Formula
                </h3>
              </div>

              {/* Formula Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: 'var(--surface-input)' }}>
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 700 }}>🎯 Check-ins</div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>+10 XP per completion</div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color: '#a855f7' }}>
                    +{myData.breakdown?.checkinXP || 0} XP
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: 'var(--surface-input)' }}>
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 700 }}>🔥 Streak Multipliers</div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>3+ and 7+ day streaks</div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color: '#f59e0b' }}>
                    +{myData.breakdown?.streakXP || 0} XP
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: 'var(--surface-input)' }}>
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 700 }}>🛡️ Consistency</div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>Schedule completion %</div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color: '#10b981' }}>
                    +{myData.breakdown?.consistencyXP || 0} XP
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: 'var(--surface-input)' }}>
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 700 }}>⚡ Active Habits</div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>+10 XP per habit</div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color: '#3b82f6' }}>
                    +{myData.breakdown?.arsenalXP || 0} XP
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: 'var(--surface-input)' }}>
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 700 }}>🌟 Perfect Days</div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>+20 XP per 100% day</div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color: '#ec4899' }}>
                    +{myData.breakdown?.perfectDaysXP || 0} XP
                  </div>
                </div>
              </div>

              {/* Progress to Next Level */}
              <div style={{
                padding: 12, borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(236,72,153,0.06))',
                border: '1px solid rgba(168,85,247,0.25)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
                  <span>Lv.{myData.level} {myData.rankTitle}</span>
                  <span style={{ color: '#a855f7' }}>{myData.progressPercent}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-input)', overflow: 'hidden' }}>
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
