import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Swords, 
  ChevronDown, 
  Flame, 
  Target, 
  Zap, 
  Crown, 
  Award, 
  HelpCircle, 
  Shield, 
  Star, 
  X, 
  TrendingUp 
} from 'lucide-react';
import { fetchHabitsForUser } from '../../hooks/useFriends';
import useHabits from '../../hooks/useHabits';
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
  const { habits: myContextHabits } = useHabits();

  const [selectedFriendId, setSelectedFriendId] = useState(
    initialSelectedFriendId || friends?.[0]?.friendship_id || ''
  );
  const [compareMode, setCompareMode] = useState('all_time'); // 'all_time' | 'this_week'
  const [showXPInspector, setShowXPInspector] = useState(false);

  const [friendHabitStats, setFriendHabitStats] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (initialSelectedFriendId) {
      setSelectedFriendId(initialSelectedFriendId);
    } else if (friends?.length > 0 && !selectedFriendId) {
      setSelectedFriendId(friends[0].friendship_id);
    }
  }, [friends, initialSelectedFriendId, selectedFriendId]);

  const selectedFriend = friends?.find(f => f.friendship_id === selectedFriendId);

  // Load friend's anonymous habit metrics (only completion history/active days, NO habit names)
  const loadFriendStats = useCallback(async () => {
    if (!selectedFriend?.id) return;
    setLoadingStats(true);
    try {
      const stats = await fetchHabitsForUser(selectedFriend.id);
      setFriendHabitStats(stats || []);
    } catch (err) {
      console.error('Error fetching friend stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [selectedFriend?.id]);

  useEffect(() => {
    loadFriendStats();
  }, [loadFriendStats]);

  // Gamified metrics computation (aggregate only: XP, streaks, consistency, etc.)
  const myData = useMemo(() => {
    return computeGamifiedHabitMetrics(myContextHabits, compareMode, myScore);
  }, [myContextHabits, compareMode, myScore]);

  const theirData = useMemo(() => {
    return computeGamifiedHabitMetrics(friendHabitStats, compareMode, selectedFriend);
  }, [friendHabitStats, compareMode, selectedFriend]);

  // Weekly Showdown Matrix (daily check-in counts only)
  const weeklyClash = useMemo(() => {
    return computeWeeklyClashMatrix(myData.dailyCompletions, theirData.dailyCompletions);
  }, [myData.dailyCompletions, theirData.dailyCompletions]);

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
          Add friends to compare streaks, consistency rates, and compete head-to-head in the Clash Arena!
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

  // 4 Battle Attributes (aggregates only)
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
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: 200, flex: '1 1 200px', maxWidth: 320 }}>
          <div style={{
            position: 'absolute', left: 10, width: 24, height: 24, borderRadius: '50%',
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            color: '#fff', fontSize: 11, fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
          }}>
            {friendInitial}
          </div>
          <select
            value={selectedFriendId}
            onChange={(e) => setSelectedFriendId(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 32px 9px 42px',
              borderRadius: 12,
              background: 'var(--surface-input, rgba(255,255,255,0.05))',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
              color: 'var(--text-primary)',
              fontSize: 13,
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
          <ChevronDown size={15} style={{ position: 'absolute', right: 12, color: 'var(--text-muted)', pointerEvents: 'none' }} />
        </div>

        {/* Timeframe Toggle */}
        <button
          type="button"
          onClick={() => setCompareMode(m => m === 'all_time' ? 'this_week' : 'all_time')}
          style={{
            padding: '8px 16px', borderRadius: 12,
            background: 'var(--surface-input, rgba(255,255,255,0.05))',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
            color: 'var(--text-primary)',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          {compareMode === 'all_time' ? '📅 All Time' : '⚡ This Week'}
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────
          CLASH ARENA (HERO SHOWDOWN + BENTO + 7-DAY MATRIX)
         ────────────────────────────────────────────────────────── */}
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

        {/* ── 2×2 SQUARE ATTRIBUTE CLASH GRID (DYNAMIC GRADIENT SPILL) ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                Attributes Breakdown
              </h3>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                Head-to-head 2×2 territory clash
              </span>
            </div>

            <span style={{
              fontSize: 10.5, fontWeight: 800, padding: '3px 10px', borderRadius: 9999,
              background: myAttributeWins > theirAttributeWins 
                ? 'rgba(34,197,94,0.12)' 
                : theirAttributeWins > myAttributeWins 
                ? 'rgba(6,182,212,0.12)' 
                : 'rgba(234,179,8,0.12)',
              color: myAttributeWins > theirAttributeWins 
                ? '#22c55e' 
                : theirAttributeWins > myAttributeWins 
                ? '#06b6d4' 
                : '#eab308',
              border: '1px solid currentColor',
            }}>
              {myAttributeWins > theirAttributeWins
                ? `You hold ${myAttributeWins}/4 attributes`
                : theirAttributeWins > myAttributeWins
                ? `${friendDisplayName} holds ${theirAttributeWins}/4`
                : 'Tied 2-2'}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}>
            {battleAttributes.map(attr => {
              const Icon = attr.icon;
              const myNum = attr.myNum || 0;
              const theirNum = attr.theirNum || 0;
              const total = myNum + theirNum;
              const myRatio = total > 0 ? Math.round((myNum / total) * 100) : 50;
              const theirRatio = 100 - myRatio;

              // Dynamic angled territory clash gradient (Left Purple vs Right Cyan)
              const blendZone = 12;
              const blendStart = Math.max(0, myRatio - blendZone);
              const blendEnd = Math.min(100, myRatio + blendZone);

              const dynamicGradientSpill = `linear-gradient(115deg, 
                rgba(168, 85, 247, ${0.18 + (myRatio / 100) * 0.22}) 0%, 
                rgba(168, 85, 247, ${0.10 + (myRatio / 100) * 0.16}) ${blendStart}%, 
                rgba(6, 182, 212, ${0.10 + (theirRatio / 100) * 0.16}) ${blendEnd}%, 
                rgba(6, 182, 212, ${0.18 + (theirRatio / 100) * 0.22}) 100%)`;

              const ambientGlow = attr.myLead
                ? 'radial-gradient(ellipse at 15% 15%, rgba(168, 85, 247, 0.36) 0%, transparent 65%)'
                : attr.theirLead
                ? 'radial-gradient(ellipse at 85% 15%, rgba(6, 182, 212, 0.36) 0%, transparent 65%)'
                : 'radial-gradient(ellipse at 50% 15%, rgba(234, 179, 8, 0.2) 0%, transparent 65%)';

              return (
                <div
                  key={attr.id}
                  className="glass-card"
                  style={{
                    aspectRatio: '1 / 1',
                    minHeight: 180,
                    borderRadius: 22,
                    padding: '14px 14px',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: `${ambientGlow}, ${dynamicGradientSpill}, var(--surface-elevated, rgba(18, 19, 30, 0.9))`,
                    border: attr.myLead
                      ? '1.5px solid rgba(168, 85, 247, 0.4)'
                      : attr.theirLead
                      ? '1.5px solid rgba(6, 182, 212, 0.4)'
                      : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                    boxShadow: attr.myLead
                      ? '0 10px 28px -6px rgba(168, 85, 247, 0.22)'
                      : attr.theirLead
                      ? '0 10px 28px -6px rgba(6, 182, 212, 0.22)'
                      : '0 4px 20px rgba(0,0,0,0.25)',
                  }}
                >
                  {/* Top Header: Icon container & Lead Pill */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                    zIndex: 2,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: `${attr.color}22`,
                        border: `1px solid ${attr.color}35`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon size={14} color={attr.color} />
                      </div>
                      <span style={{
                        fontSize: 12.5,
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {attr.label}
                      </span>
                    </div>

                    <span style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 9999,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      background: attr.myLead
                        ? 'rgba(168,85,247,0.2)'
                        : attr.theirLead
                        ? 'rgba(6,182,212,0.2)'
                        : 'rgba(234,179,8,0.16)',
                      color: attr.myLead
                        ? '#c084fc'
                        : attr.theirLead
                        ? '#38bdf8'
                        : '#eab308',
                      border: attr.myLead
                        ? '1px solid rgba(168,85,247,0.35)'
                        : attr.theirLead
                        ? '1px solid rgba(6,182,212,0.35)'
                        : '1px solid rgba(234,179,8,0.35)',
                    }}>
                      {attr.myLead ? '👑 Lead' : attr.theirLead ? 'Deficit' : 'Tied'}
                    </span>
                  </div>

                  {/* Center Zone: Head-to-Head Clash Pods */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    padding: '6px 0',
                    position: 'relative',
                    zIndex: 2,
                    margin: 'auto 0',
                  }}>
                    {/* You Pod */}
                    <div style={{
                      flex: '1 1 0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '10px 6px',
                      borderRadius: 14,
                      background: attr.myLead ? 'rgba(168, 85, 247, 0.14)' : 'rgba(255, 255, 255, 0.03)',
                      border: attr.myLead ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid rgba(255, 255, 255, 0.06)',
                    }}>
                      <span style={{ fontSize: 9.5, color: '#c084fc', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        You
                      </span>
                      <span style={{
                        fontSize: 'clamp(19px, 3.2vw, 25px)',
                        fontWeight: 900,
                        color: attr.myLead ? '#c084fc' : 'var(--text-primary)',
                        fontFamily: 'monospace',
                        letterSpacing: '-0.02em',
                        textShadow: attr.myLead ? '0 0 16px rgba(168,85,247,0.5)' : 'none',
                      }}>
                        {attr.myVal}
                      </span>
                    </div>

                    {/* VS Shield */}
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9.5, fontWeight: 900, color: 'var(--text-muted)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      flexShrink: 0,
                    }}>
                      VS
                    </div>

                    {/* Opponent Pod */}
                    <div style={{
                      flex: '1 1 0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '10px 6px',
                      borderRadius: 14,
                      background: attr.theirLead ? 'rgba(6, 182, 212, 0.14)' : 'rgba(255, 255, 255, 0.03)',
                      border: attr.theirLead ? '1px solid rgba(6, 182, 212, 0.35)' : '1px solid rgba(255, 255, 255, 0.06)',
                    }}>
                      <span style={{
                        fontSize: 9.5,
                        color: '#38bdf8',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        maxWidth: 85,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {friendDisplayName}
                      </span>
                      <span style={{
                        fontSize: 'clamp(19px, 3.2vw, 25px)',
                        fontWeight: 900,
                        color: attr.theirLead ? '#38bdf8' : 'var(--text-primary)',
                        fontFamily: 'monospace',
                        letterSpacing: '-0.02em',
                        textShadow: attr.theirLead ? '0 0 16px rgba(6,182,212,0.5)' : 'none',
                      }}>
                        {attr.theirVal}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Zone: Duotone Duel Horizon Bar & Ratio Split */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, position: 'relative', zIndex: 2 }}>
                    <div style={{
                      height: 6,
                      borderRadius: 9999,
                      background: 'rgba(255,255,255,0.06)',
                      overflow: 'hidden',
                      display: 'flex',
                      position: 'relative',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                      <div style={{
                        width: `${myRatio}%`,
                        background: 'linear-gradient(90deg, #a855f7, #ec4899)',
                        boxShadow: attr.myLead ? '0 0 8px rgba(168,85,247,0.7)' : 'none',
                        transition: 'width 0.6s ease',
                      }} />
                      <div style={{
                        width: `${theirRatio}%`,
                        background: 'linear-gradient(90deg, #06b6d4, #3b82f6)',
                        boxShadow: attr.theirLead ? '0 0 8px rgba(6,182,212,0.7)' : 'none',
                        transition: 'width 0.6s ease',
                      }} />
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 9.5,
                      fontWeight: 800,
                      fontFamily: 'monospace',
                    }}>
                      <span style={{ color: '#c084fc' }}>{myRatio}%</span>
                      <span style={{
                        color: 'var(--text-muted)',
                        fontSize: 8.5,
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}>
                        {attr.myLead ? 'Territory Lead' : attr.theirLead ? `${friendDisplayName} Leads` : 'Even'}
                      </span>
                      <span style={{ color: '#38bdf8' }}>{theirRatio}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 7-DAY BATTLE MOMENTUM (C3 VERTICAL CAPSULE BARS) ── */}
        <div 
          className="glass-card" 
          style={{
            borderRadius: 22,
            padding: '18px 16px',
            background: 'var(--surface-elevated, rgba(255,255,255,0.03))',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                7-Day Momentum
              </h3>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                Daily completion duel capsules
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 10.5, fontWeight: 800, color: '#c084fc',
                padding: '3px 8px', borderRadius: 8,
                background: 'rgba(168,85,247,0.12)',
              }}>
                {weeklyClash.myWins}W
              </span>
              <span style={{
                fontSize: 10.5, fontWeight: 800, color: '#38bdf8',
                padding: '3px 8px', borderRadius: 8,
                background: 'rgba(6,182,212,0.12)',
              }}>
                {weeklyClash.theirWins}L
              </span>
              {weeklyClash.ties > 0 && (
                <span style={{
                  fontSize: 10.5, fontWeight: 800, color: '#eab308',
                  padding: '3px 8px', borderRadius: 8,
                  background: 'rgba(234,179,8,0.12)',
                }}>
                  {weeklyClash.ties}T
                </span>
              )}
            </div>
          </div>

          {/* 7-Day Vertical Capsule Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 8,
            alignItems: 'end',
            textAlign: 'center'
          }}>
            {weeklyClash.days.map((d, dIdx) => {
              const youWonDay = d.winner === 'you';
              const friendWonDay = d.winner === 'friend';
              const totalDayActivity = (d.myVal || 0) + (d.theirVal || 0);

              const maxValInWeek = Math.max(1, ...weeklyClash.days.map(x => Math.max(x.myVal || 0, x.theirVal || 0)));
              const dayPeak = Math.max(d.myVal || 0, d.theirVal || 0);
              const fillPercent = dayPeak === 0 ? 15 : Math.max(25, Math.round((dayPeak / maxValInWeek) * 100));

              return (
                <div
                  key={dIdx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 2px',
                    borderRadius: 16,
                    position: 'relative',
                    background: d.isToday ? 'rgba(168,85,247,0.08)' : 'transparent',
                    border: d.isToday ? '1.5px solid rgba(168,85,247,0.45)' : '1.5px solid transparent',
                    boxShadow: d.isToday ? '0 0 16px rgba(168,85,247,0.18)' : 'none',
                  }}
                >
                  {/* Day Victor Marker / Outcome */}
                  <span style={{
                    fontSize: 11,
                    lineHeight: 1,
                    height: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {youWonDay ? '👑' : friendWonDay ? '⚡' : totalDayActivity > 0 ? '🤝' : '·'}
                  </span>

                  {/* Vertical Duel Capsule */}
                  <div style={{
                    width: 24,
                    height: 72,
                    borderRadius: 9999,
                    background: 'var(--surface-input, rgba(255,255,255,0.05))',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    overflow: 'hidden',
                    position: 'relative',
                    padding: 2,
                  }}>
                    {/* Animated Fill Capsule */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${fillPercent}%` }}
                      transition={{ duration: 0.5, delay: dIdx * 0.05, ease: 'easeOut' }}
                      style={{
                        width: '100%',
                        borderRadius: 9999,
                        background: youWonDay
                          ? 'linear-gradient(180deg, #c084fc 0%, #a855f7 100%)'
                          : friendWonDay
                          ? 'linear-gradient(180deg, #38bdf8 0%, #06b6d4 100%)'
                          : totalDayActivity > 0
                          ? 'linear-gradient(180deg, #fde047 0%, #eab308 100%)'
                          : 'rgba(255,255,255,0.12)',
                        boxShadow: youWonDay
                          ? '0 0 10px rgba(168,85,247,0.5)'
                          : friendWonDay
                          ? '0 0 10px rgba(6,182,212,0.5)'
                          : 'none',
                      }}
                    />
                  </div>

                  {/* Check-in Count / Stat */}
                  <div style={{
                    fontSize: 9.5,
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    lineHeight: 1.1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: youWonDay ? '#22c55e' : '#c084fc' }}>{d.myVal}</span>
                    <span style={{ color: friendWonDay ? '#22c55e' : '#38bdf8', opacity: 0.85 }}>{d.theirVal}</span>
                  </div>

                  {/* Day Label (e.g. Mon, Tue) */}
                  <span style={{
                    fontSize: 10,
                    fontWeight: d.isToday ? 900 : 700,
                    color: d.isToday ? '#c084fc' : 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>
                    {d.dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

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
