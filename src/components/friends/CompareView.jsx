import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Swords, ChevronDown, Flame, Target, CheckCircle2, Award, Zap, ArrowRight, UserPlus } from 'lucide-react';

const CompareView = ({ friends, myScore, currentUserId, myProfile }) => {
  const [selectedFriendId, setSelectedFriendId] = useState(friends?.[0]?.friendship_id || '');

  useEffect(() => {
    if (friends?.length > 0 && !selectedFriendId) {
      setSelectedFriendId(friends[0].friendship_id);
    }
  }, [friends, selectedFriendId]);

  const selectedFriend = friends?.find(f => f.friendship_id === selectedFriendId);

  if (!friends || friends.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          textAlign: 'center',
          padding: '60px 24px',
          background: 'var(--glass-card-bg)',
          borderRadius: '24px',
          border: '1px solid var(--glass-card-border)',
          backdropFilter: 'blur(16px)',
          maxWidth: '480px',
          margin: '20px auto',
        }}
      >
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.15))',
          border: '1px solid rgba(168,85,247,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: '#a855f7',
        }}>
          <Swords size={32} />
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
          Head-to-Head Compare
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
          Add friends to compare habit scores, 30-day streaks, and completion rates in real time!
        </p>
      </motion.div>
    );
  }

  const me = myProfile || {};
  const myData = myScore || { score: 0, completions_30d: 0, active_habits: 0, completion_rate: 0 };
  const theirData = selectedFriend || { score: 0, completions_30d: 0, active_habits: 0, completion_rate: 0 };

  const stats = [
    {
      id: 'score',
      label: 'Total Score',
      icon: Trophy,
      myValue: myData.score || 0,
      theirValue: theirData.score || 0,
      color: '#a855f7',
      gradient: 'linear-gradient(135deg, #a855f7, #ec4899)',
      unit: 'pts',
    },
    {
      id: 'completions_30d',
      label: '30-Day Completions',
      icon: Flame,
      myValue: myData.completions_30d || 0,
      theirValue: theirData.completions_30d || 0,
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
      unit: 'done',
    },
    {
      id: 'completion_rate',
      label: 'Completion Rate',
      icon: Target,
      myValue: myData.completion_rate || 0,
      theirValue: theirData.completion_rate || 0,
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981, #06b6d4)',
      unit: '%',
      isPercent: true,
    },
    {
      id: 'active_habits',
      label: 'Active Habits',
      icon: CheckCircle2,
      myValue: myData.active_habits || 0,
      theirValue: theirData.active_habits || 0,
      color: '#6366f1',
      gradient: 'linear-gradient(135deg, #6366f1, #a855f7)',
      unit: 'habits',
    },
  ];

  let myWins = 0;
  let theirWins = 0;

  stats.forEach(s => {
    if (s.myValue > s.theirValue) myWins++;
    else if (s.theirValue > s.myValue) theirWins++;
  });

  const getStatusText = () => {
    if (myWins > theirWins) return { text: 'You are dominating the matchup! 👑', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)' };
    if (theirWins > myWins) return { text: 'Friend is currently in the lead! 🏃', color: '#ec4899', bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.3)' };
    return { text: "It's a dead heat tie! ⚔️", color: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.3)' };
  };

  const matchStatus = getStatusText();

  const friendDisplayName = selectedFriend?.display_name || selectedFriend?.full_name || selectedFriend?.username || 'Friend';
  const friendInitial = friendDisplayName[0]?.toUpperCase() || 'F';
  const myDisplayName = me.display_name || me.full_name || me.username || 'You';
  const myInitial = myDisplayName[0]?.toUpperCase() || 'Y';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      
      {/* ── Friend Select Header ── */}
      <div style={{
        position: 'relative',
        background: 'var(--glass-card-bg)',
        backdropFilter: 'blur(16px)',
        borderRadius: '20px',
        border: '1px solid var(--glass-card-border)',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Swords size={18} style={{ color: '#a855f7' }} />
          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Opponent
          </span>
        </div>

        <div style={{ position: 'relative', flex: 1, maxWidth: '240px' }}>
          <select
            value={selectedFriendId}
            onChange={(e) => setSelectedFriendId(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 36px 10px 14px',
              borderRadius: '14px',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: '700',
              appearance: 'none',
              outline: 'none',
              cursor: 'pointer',
              textOverflow: 'ellipsis',
            }}
          >
            {friends.map(f => (
              <option key={f.friendship_id} value={f.friendship_id}>
                {f.display_name || f.full_name || `@${f.username}`}
              </option>
            ))}
          </select>
          <ChevronDown size={18} style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }} />
        </div>
      </div>

      {/* ── Matchup Banner & VS Arena ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedFriendId}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          {/* Match Status Banner */}
          <div style={{
            padding: '12px 18px',
            borderRadius: '16px',
            background: matchStatus.bg,
            border: `1px solid ${matchStatus.border}`,
            color: matchStatus.color,
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: '700',
            letterSpacing: '0.02em',
            boxShadow: `0 4px 20px ${matchStatus.bg}`,
          }}>
            {matchStatus.text}
          </div>

          {/* Player Arena Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--glass-card-bg)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid var(--glass-card-border)',
            padding: '24px 20px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Background Ambient Glow */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              left: '-20%',
              width: '140%',
              height: '200%',
              background: 'radial-gradient(circle at 30% 50%, rgba(168,85,247,0.1) 0%, rgba(236,72,153,0.08) 50%, transparent 80%)',
              pointerEvents: 'none',
            }} />

            {/* Left Fighter: You */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', zIndex: 1 }}>
              <div style={{
                position: 'relative',
                marginBottom: '10px',
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: '800',
                  color: '#fff',
                  boxShadow: '0 8px 24px rgba(168,85,247,0.35)',
                  border: '3px solid var(--surface-elevated)',
                }}>
                  {myInitial}
                </div>
                {myWins > theirWins && (
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    background: '#f59e0b',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--surface-elevated)',
                    boxShadow: '0 2px 8px rgba(245,158,11,0.4)',
                  }}>
                    <Trophy size={13} style={{ color: '#fff' }} />
                  </div>
                )}
              </div>
              <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>
                You
              </span>
              <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '600', fontFamily: 'monospace' }}>
                @{me.username || 'you'}
              </span>
              <div style={{
                marginTop: '10px',
                padding: '4px 12px',
                borderRadius: '12px',
                background: 'rgba(168,85,247,0.15)',
                border: '1px solid rgba(168,85,247,0.3)',
                fontSize: '15px',
                fontWeight: '800',
                color: '#a855f7',
                fontFamily: 'monospace',
              }}>
                {myData.score} pts
              </div>
            </div>

            {/* Center VS Badge */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', zIndex: 1 }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              }}>
                <span style={{ fontSize: '14px', fontWeight: '900', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                  VS
                </span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Matchup
              </span>
            </div>

            {/* Right Fighter: Friend */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', zIndex: 1 }}>
              <div style={{
                position: 'relative',
                marginBottom: '10px',
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: '800',
                  color: '#fff',
                  boxShadow: '0 8px 24px rgba(6,182,212,0.35)',
                  border: '3px solid var(--surface-elevated)',
                }}>
                  {friendInitial}
                </div>
                {theirWins > myWins && (
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    background: '#f59e0b',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--surface-elevated)',
                    boxShadow: '0 2px 8px rgba(245,158,11,0.4)',
                  }}>
                    <Trophy size={13} style={{ color: '#fff' }} />
                  </div>
                )}
              </div>
              <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>
                {selectedFriend?.display_name || selectedFriend?.full_name || 'Friend'}
              </span>
              <span style={{ fontSize: '11px', color: '#06b6d4', fontWeight: '600', fontFamily: 'monospace' }}>
                @{selectedFriend?.username || 'friend'}
              </span>
              <div style={{
                marginTop: '10px',
                padding: '4px 12px',
                borderRadius: '12px',
                background: 'rgba(6,182,212,0.15)',
                border: '1px solid rgba(6,182,212,0.3)',
                fontSize: '15px',
                fontWeight: '800',
                color: '#06b6d4',
                fontFamily: 'monospace',
              }}>
                {theirData.score} pts
              </div>
            </div>
          </div>

          {/* ── Stat Category Comparison Breakdown ── */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}>
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              const myNum = stat.myValue;
              const theirNum = stat.theirValue;
              const max = Math.max(myNum, theirNum) || 1;
              const myWidth = (myNum / max) * 100;
              const theirWidth = (theirNum / max) * 100;

              const iWin = myNum > theirNum;
              const friendWins = theirNum > myNum;
              const isTie = myNum === theirNum;

              return (
                <motion.div
                  key={stat.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  style={{
                    background: 'var(--glass-card-bg)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '20px',
                    border: iWin 
                      ? '1px solid rgba(168,85,247,0.35)' 
                      : friendWins 
                        ? '1px solid rgba(6,182,212,0.35)' 
                        : '1px solid var(--glass-card-border)',
                    padding: '18px 20px',
                    boxShadow: iWin 
                      ? '0 4px 20px rgba(168,85,247,0.08)' 
                      : friendWins 
                        ? '0 4px 20px rgba(6,182,212,0.08)' 
                        : 'none',
                  }}
                >
                  {/* Category Title */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '10px',
                        background: `${stat.color}18`,
                        border: `1px solid ${stat.color}30`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: stat.color,
                      }}>
                        <Icon size={16} />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {stat.label}
                      </span>
                    </div>

                    {/* Winner Badge */}
                    <div style={{ fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {iWin && (
                        <span style={{ color: '#a855f7', background: 'rgba(168,85,247,0.12)', padding: '3px 8px', borderRadius: '8px', border: '1px solid rgba(168,85,247,0.25)' }}>
                          You Lead 👑
                        </span>
                      )}
                      {friendWins && (
                        <span style={{ color: '#06b6d4', background: 'rgba(6,182,212,0.12)', padding: '3px 8px', borderRadius: '8px', border: '1px solid rgba(6,182,212,0.25)' }}>
                          Friend Leads ⚡
                        </span>
                      )}
                      {isTie && (
                        <span style={{ color: 'var(--text-muted)', background: 'var(--surface-elevated)', padding: '3px 8px', borderRadius: '8px' }}>
                          Tied
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dual Bar Comparison */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    
                    {/* You Bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                        <span style={{ color: iWin ? '#a855f7' : 'var(--text-secondary)' }}>You</span>
                        <span style={{ color: iWin ? '#a855f7' : 'var(--text-primary)', fontWeight: '800', fontFamily: 'monospace' }}>
                          {stat.isPercent ? `${myNum}%` : myNum.toLocaleString()} {stat.unit}
                        </span>
                      </div>
                      <div style={{ height: '8px', borderRadius: '4px', background: 'var(--surface-elevated)', overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(myWidth, 4)}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          style={{
                            height: '100%',
                            background: iWin ? 'linear-gradient(90deg, #a855f7, #ec4899)' : 'rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                    </div>

                    {/* Friend Bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                        <span style={{ color: friendWins ? '#06b6d4' : 'var(--text-secondary)' }}>
                          {selectedFriend?.display_name || selectedFriend?.username || 'Friend'}
                        </span>
                        <span style={{ color: friendWins ? '#06b6d4' : 'var(--text-primary)', fontWeight: '800', fontFamily: 'monospace' }}>
                          {stat.isPercent ? `${theirNum}%` : theirNum.toLocaleString()} {stat.unit}
                        </span>
                      </div>
                      <div style={{ height: '8px', borderRadius: '4px', background: 'var(--surface-elevated)', overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(theirWidth, 4)}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          style={{
                            height: '100%',
                            background: friendWins ? 'linear-gradient(90deg, #06b6d4, #3b82f6)' : 'rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                    </div>

                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

    </div>
  );
};

export default CompareView;
