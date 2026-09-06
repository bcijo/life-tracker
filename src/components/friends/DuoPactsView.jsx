import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Handshake, 
  Flame, 
  Zap, 
  Plus, 
  Check, 
  X, 
  Clock, 
  Calendar, 
  Award,
  ChevronRight,
  Shield,
  Sparkles
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useHabits from '../../hooks/useHabits';
import { 
  computeDuoStreak, 
  computeSynergyScore, 
  getDuoBadge, 
  computeDuoWeeklyMatrix,
  getPartnerDailyStatus,
  DAY_LABELS,
  ALL_DAYS 
} from '../../utils/duoHabitGamification';

export default function DuoPactsView({
  friends = [],
  mutualHabitsState,
}) {
  const { user } = useAuth();
  const { habits, addHabit: addHabitDb } = useHabits();

  const {
    activePacts,
    pendingReceivedPacts,
    pendingSentPacts,
    partnerHabitsMap,
    partnerProfilesMap,
    sendPactInvite,
    acceptPactInvite,
    declinePactInvite,
    cancelPact,
    sendNudge,
  } = mutualHabitsState;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState('');
  const [pactName, setPactName] = useState('');
  const [selectedDays, setSelectedDays] = useState(ALL_DAYS);
  const [timeOfDay, setTimeOfDay] = useState('morning');
  const [linkExistingHabitId, setLinkExistingHabitId] = useState('');
  const [creatingPact, setCreatingPact] = useState(false);
  const [nudgedPactId, setNudgedPactId] = useState(null);

  // For accepting received pacts
  const [acceptingPactId, setAcceptingPactId] = useState(null);
  const [acceptHabitChoice, setAcceptHabitChoice] = useState('new'); // 'new' or habitId

  // Helper to get person's name (display_name or full_name) instead of username
  const getPartnerName = (userId) => {
    const profile = partnerProfilesMap[userId];
    if (profile?.display_name?.trim()) return profile.display_name.trim();
    if (profile?.full_name?.trim()) return profile.full_name.trim();

    const friend = friends?.find(f => f.id === userId);
    if (friend?.display_name?.trim()) return friend.display_name.trim();
    if (friend?.full_name?.trim()) return friend.full_name.trim();

    if (profile?.username) return profile.username.replace(/^@/, '');
    if (friend?.username) return friend.username.replace(/^@/, '');
    return 'Partner';
  };

  // Toggle active days
  const toggleDay = (day) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  // Handle Send Pact Invitation
  const handleCreatePactSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFriendId || (!pactName.trim() && !linkExistingHabitId)) return;
    if (selectedDays.length === 0) {
      alert('Pick at least one active day');
      return;
    }

    setCreatingPact(true);
    try {
      let habitId = linkExistingHabitId || null;
      let finalName = pactName.trim();

      if (linkExistingHabitId) {
        const found = habits.find(h => h.id === linkExistingHabitId);
        if (found) finalName = found.name;
      } else {
        // Create new habit on current user's profile
        const newHabit = await addHabitDb(finalName, selectedDays, timeOfDay);
        if (newHabit?.id) habitId = newHabit.id;
      }

      await sendPactInvite({
        partnerId: selectedFriendId,
        habitName: finalName,
        activeDays: selectedDays,
        timeOfDay,
        existingHabitId: habitId,
      });

      setShowCreateModal(false);
      setSelectedFriendId('');
      setPactName('');
      setLinkExistingHabitId('');
      setSelectedDays(ALL_DAYS);
    } catch (err) {
      console.error('Failed to create pact:', err);
      alert('Failed to send pact invite. Please try again.');
    } finally {
      setCreatingPact(false);
    }
  };

  // Handle Accept Pact
  const handleAcceptPact = async (pact) => {
    try {
      let habitId = null;
      if (acceptHabitChoice === 'new') {
        const created = await addHabitDb(pact.name, pact.active_days || ALL_DAYS, pact.time_of_day || 'morning');
        habitId = created?.id;
      } else {
        habitId = acceptHabitChoice;
      }

      await acceptPactInvite({
        pactId: pact.id,
        habitId,
      });
      setAcceptingPactId(null);
    } catch (err) {
      console.error('Failed to accept pact:', err);
    }
  };

  // Handle Send Nudge
  const handleSendNudge = (pact, partnerId, type, habitName) => {
    sendNudge({ pactId: pact.id, partnerId, type, habitName });
    setNudgedPactId(pact.id);
    setTimeout(() => setNudgedPactId(null), 2500);
  };

  // Top metrics computation
  const totalPacts = activePacts.length;
  let topStreak = 0;
  let totalSynergy = 0;

  activePacts.forEach(p => {
    const myHabitId = p.creator_id === user?.id ? p.creator_habit_id : p.partner_habit_id;
    const partnerHabitId = p.creator_id === user?.id ? p.partner_habit_id : p.creator_habit_id;
    const myHabit = habits.find(h => h.id === myHabitId);
    const partnerHabit = partnerHabitsMap[partnerHabitId];

    if (myHabit && partnerHabit) {
      const streak = computeDuoStreak(p, myHabit, partnerHabit);
      const synergy = computeSynergyScore(p, myHabit, partnerHabit);
      if (streak > topStreak) topStreak = streak;
      totalSynergy += synergy;
    }
  });

  const avgSynergy = totalPacts > 0 ? Math.round(totalSynergy / totalPacts) : 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── METRICS OVERVIEW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <div className="glass-card" style={{ padding: '12px 10px', textAlign: 'center', borderRadius: 16 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Active Duos
          </span>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
            {totalPacts}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '12px 10px', textAlign: 'center', borderRadius: 16 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Top Duo Flame
          </span>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#06b6d4', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <Flame size={18} fill="#06b6d4" /> {topStreak}d
          </div>
        </div>

        <div className="glass-card" style={{ padding: '12px 10px', textAlign: 'center', borderRadius: 16 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Avg Synergy
          </span>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#a855f7', marginTop: 2 }}>
            {avgSynergy}%
          </div>
        </div>
      </div>

      {/* ── ACTION BAR ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
            Duo Habits
          </h2>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Mutual habits with accountability partners
          </span>
        </div>

        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 9999,
            background: 'linear-gradient(135deg, #06b6d4, #a855f7)',
            border: 'none', color: '#fff', fontSize: 12, fontWeight: 800,
            cursor: 'pointer', boxShadow: '0 4px 12px rgba(6,182,212,0.3)',
          }}
        >
          <Plus size={14} strokeWidth={3} />
          <span>New Duo</span>
        </motion.button>
      </div>

      {/* ── PENDING INVITATIONS RECEIVED ── */}
      {pendingReceivedPacts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={13} />
            <span>Duo Invitations Received ({pendingReceivedPacts.length})</span>
          </div>

          {pendingReceivedPacts.map(pact => {
            const senderName = getPartnerName(pact.creator_id);
            const isAcceptingThis = acceptingPactId === pact.id;

            return (
              <div
                key={pact.id}
                className="glass-card"
                style={{
                  padding: '14px', borderRadius: 16,
                  border: '1px solid rgba(245,158,11,0.3)',
                  background: 'rgba(245,158,11,0.06)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                      "{pact.name}"
                    </span>
                    <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--text-muted)' }}>
                      Invited by <strong style={{ color: 'var(--text-primary)' }}>{senderName}</strong>
                    </p>
                  </div>

                  <div style={{
                    padding: '2px 8px', borderRadius: 9999,
                    background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                    fontSize: 10, fontWeight: 700
                  }}>
                    {pact.time_of_day === 'morning' ? '☀️ Morning' : '🌙 Evening'}
                  </div>
                </div>

                {isAcceptingThis ? (
                  <div style={{ marginTop: 12, padding: 10, background: 'var(--surface-input)', borderRadius: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                      How would you like to track this?
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, cursor: 'pointer', color: 'var(--text-primary)' }}>
                        <input
                          type="radio"
                          name={`accept-opt-${pact.id}`}
                          checked={acceptHabitChoice === 'new'}
                          onChange={() => setAcceptHabitChoice('new')}
                        />
                        <span>Create new habit: "{pact.name}"</span>
                      </label>

                      {habits.length > 0 && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, cursor: 'pointer', color: 'var(--text-primary)' }}>
                          <input
                            type="radio"
                            name={`accept-opt-${pact.id}`}
                            checked={acceptHabitChoice !== 'new'}
                            onChange={() => setAcceptHabitChoice(habits[0].id)}
                          />
                          <span>Link to one of my existing habits</span>
                        </label>
                      )}

                      {acceptHabitChoice !== 'new' && (
                        <select
                          value={acceptHabitChoice}
                          onChange={(e) => setAcceptHabitChoice(e.target.value)}
                          style={{
                            width: '100%', padding: '6px 8px', borderRadius: 8,
                            background: 'var(--surface-elevated, #1a1a24)',
                            border: '1px solid var(--border-subtle)',
                            color: '#fff', fontSize: 11, marginTop: 4,
                          }}
                        >
                          {habits.map(h => (
                            <option key={h.id} value={h.id}>{h.name}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setAcceptingPactId(null)}
                        style={{
                          padding: '5px 10px', borderRadius: 8, background: 'none',
                          border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer'
                        }}
                      >
                        Back
                      </button>
                      <button
                        onClick={() => handleAcceptPact(pact)}
                        style={{
                          padding: '5px 14px', borderRadius: 8, background: '#22c55e',
                          border: 'none', color: '#000', fontSize: 11, fontWeight: 800, cursor: 'pointer'
                        }}
                      >
                        Confirm & Join Duo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => declinePactInvite(pact.id)}
                      style={{
                        padding: '6px 12px', borderRadius: 8,
                        background: 'var(--surface-input)', border: '1px solid var(--border-subtle)',
                        color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => {
                        setAcceptHabitChoice('new');
                        setAcceptingPactId(pact.id);
                      }}
                      style={{
                        padding: '6px 14px', borderRadius: 8,
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                        border: 'none', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer'
                      }}
                    >
                      Accept & Link Habit
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── PENDING INVITATIONS SENT ── */}
      {pendingSentPacts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
            Invitations Sent ({pendingSentPacts.length})
          </span>
          {pendingSentPacts.map(pact => {
            const partnerName = getPartnerName(pact.partner_id);
            return (
              <div
                key={pact.id}
                className="glass-card"
                style={{
                  padding: '8px 12px', borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  border: '1px dashed var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={12} color="var(--text-muted)" />
                  <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                    "{pact.name}" sent to <strong>{partnerName}</strong>
                  </span>
                </div>
                <button
                  onClick={() => cancelPact(pact.id)}
                  style={{
                    background: 'none', border: 'none', color: '#ef4444',
                    fontSize: 10.5, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ACTIVE PACTS LIST ── */}
      {activePacts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activePacts.map(pact => {
            const isCreator = pact.creator_id === user?.id;
            const myHabitId = isCreator ? pact.creator_habit_id : pact.partner_habit_id;
            const partnerHabitId = isCreator ? pact.partner_habit_id : pact.creator_habit_id;
            const partnerId = isCreator ? pact.partner_id : pact.creator_id;

            const myHabit = habits.find(h => h.id === myHabitId);
            const partnerHabit = partnerHabitsMap[partnerHabitId];
            const partnerName = getPartnerName(partnerId);

            const duoStreak = computeDuoStreak(pact, myHabit, partnerHabit);
            const synergy = computeSynergyScore(pact, myHabit, partnerHabit);
            const badge = getDuoBadge(duoStreak);
            const partnerDaily = getPartnerDailyStatus(partnerHabit, pact.active_days);
            const weeklyMatrix = computeDuoWeeklyMatrix(pact, myHabit, partnerHabit);
            const isNudged = nudgedPactId === pact.id;

            return (
              <motion.div
                key={pact.id}
                className="glass-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '16px', borderRadius: 20,
                  border: '1px solid rgba(6,182,212,0.25)',
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.05), rgba(168,85,247,0.04))',
                }}
              >
                {/* Header: Title + Duo Flame Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10,
                      background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(168,85,247,0.2))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Handshake size={18} color="#06b6d4" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                        {pact.name}
                      </h3>
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                        with {partnerName} · {pact.time_of_day === 'morning' ? '☀️ Morning' : '🌙 Evening'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      fontSize: 11, fontWeight: 900, color: '#06b6d4',
                      background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)',
                      padding: '3px 8px', borderRadius: 9999,
                    }}>
                      <Flame size={13} fill="#06b6d4" />
                      {duoStreak}d Duo
                    </span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      fontSize: 10, fontWeight: 800, color: badge.color,
                      background: `${badge.color}15`, border: `1px solid ${badge.color}30`,
                      padding: '3px 7px', borderRadius: 9999,
                    }}>
                      {badge.icon} {badge.name}
                    </span>
                  </div>
                </div>

                {/* Partner Today Card */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 12,
                  background: 'var(--surface-input, rgba(255,255,255,0.04))',
                  border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                  marginBottom: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: partnerDaily.status === 'completed' ? '#22c55e' : '#f59e0b',
                      color: '#000', fontWeight: 900, fontSize: 11,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {partnerName[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {partnerName}
                      </div>
                      <div style={{ fontSize: 10, color: partnerDaily.color, fontWeight: 700 }}>
                        {partnerDaily.label} Today
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Button */}
                  {partnerDaily.status === 'pending' ? (
                    <button
                      onClick={() => handleSendNudge(pact, partnerId, 'nudge', pact.name)}
                      disabled={isNudged}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '5px 10px', borderRadius: 8,
                        background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                        color: '#f59e0b', fontSize: 11, fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      {isNudged ? <Check size={12} strokeWidth={3} /> : <Zap size={12} fill="#f59e0b" />}
                      <span>{isNudged ? 'Nudged!' : 'Nudge Partner'}</span>
                    </button>
                  ) : partnerDaily.status === 'completed' ? (
                    <button
                      onClick={() => handleSendNudge(pact, partnerId, 'high_five', pact.name)}
                      disabled={isNudged}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '5px 10px', borderRadius: 8,
                        background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                        color: '#22c55e', fontSize: 11, fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      <span>{isNudged ? '🎉' : '✋'}</span>
                      <span>{isNudged ? 'Sent!' : 'High-Five'}</span>
                    </button>
                  ) : null}
                </div>

                {/* 7-Day Mutual Synergy Matrix */}
                <div style={{
                  padding: '8px 10px', borderRadius: 10,
                  background: 'var(--surface-elevated, rgba(255,255,255,0.02))',
                  border: '1px solid var(--border-subtle, rgba(255,255,255,0.04))',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      7-Day Synergy
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#a855f7' }}>
                      {synergy}% Match
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
                    {weeklyMatrix.map((item, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <span style={{ fontSize: 8.5, color: item.isToday ? '#06b6d4' : 'var(--text-muted)' }}>
                          {item.dayLabel}
                        </span>
                        <div style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: item.myStatus === 'completed' ? '#22c55e' : 'rgba(255,255,255,0.1)'
                        }} />
                        <div style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: item.partnerStatus === 'completed' ? '#06b6d4' : 'rgba(255,255,255,0.1)'
                        }} />
                        <span style={{ fontSize: 8, height: 8 }}>{item.isSynced ? '⭐' : ' '}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Controls */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button
                    onClick={() => {
                      if (confirm(`Leave duo for "${pact.name}"? Your personal habit will remain intact.`)) {
                        cancelPact(pact.id);
                      }
                    }}
                    style={{
                      background: 'none', border: 'none', color: '#ef4444',
                      fontSize: 10, fontWeight: 600, cursor: 'pointer', opacity: 0.75
                    }}
                  >
                    Leave Duo
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="glass-card" style={{ padding: '36px 20px', textAlign: 'center', borderRadius: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'rgba(6,182,212,0.12)', margin: '0 auto 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Handshake size={24} color="#06b6d4" />
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
            No Active Duos
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
            Team up with a friend to share habit streaks, keep each other accountable with live updates, and earn duo milestones together.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '8px 18px', borderRadius: 12,
              background: 'linear-gradient(135deg, #06b6d4, #a855f7)',
              border: 'none', color: '#fff', fontSize: 12, fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Start Your First Duo ✨
          </button>
        </div>
      )}

      {/* ── CREATE DUO PACT MODAL ── */}
      <AnimatePresence>
        {showCreateModal && (
          <div
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10000, padding: 20,
            }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card"
              style={{
                width: '100%', maxWidth: 420,
                borderRadius: 22, padding: 20,
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                background: 'var(--surface-elevated, #16161f)',
                border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Handshake size={20} color="#06b6d4" />
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                    Create Duo Habit
                  </h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreatePactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* 1. Choose Friend */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                    Accountability Partner
                  </label>
                  {friends && friends.length > 0 ? (
                    <select
                      value={selectedFriendId}
                      onChange={(e) => setSelectedFriendId(e.target.value)}
                      required
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: 10,
                        background: 'var(--surface-input, rgba(255,255,255,0.05))',
                        border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
                        color: 'var(--text-primary, #fff)', fontSize: 12.5, outline: 'none',
                      }}
                    >
                      <option value="">-- Select a friend --</option>
                      {friends.map(f => {
                        const friendName = f.display_name?.trim() || f.full_name?.trim() || f.username || 'Friend';
                        return (
                          <option key={f.id} value={f.id}>
                            {friendName}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <div style={{ padding: 10, background: 'rgba(239,68,68,0.1)', borderRadius: 10, fontSize: 11.5, color: '#ef4444' }}>
                      You need to add friends first before you can start a duo!
                    </div>
                  )}
                </div>

                {/* 2. Habit Selection: Existing vs New */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                    Habit to Track Together
                  </label>
                  
                  {habits.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <button
                        type="button"
                        onClick={() => { setLinkExistingHabitId(''); }}
                        style={{
                          flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 11, fontWeight: 700,
                          background: !linkExistingHabitId ? 'rgba(6,182,212,0.15)' : 'var(--surface-input)',
                          border: !linkExistingHabitId ? '1px solid #06b6d4' : '1px solid var(--border-subtle)',
                          color: !linkExistingHabitId ? '#06b6d4' : 'var(--text-muted)', cursor: 'pointer'
                        }}
                      >
                        Create New
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (habits[0]) setLinkExistingHabitId(habits[0].id); }}
                        style={{
                          flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 11, fontWeight: 700,
                          background: linkExistingHabitId ? 'rgba(6,182,212,0.15)' : 'var(--surface-input)',
                          border: linkExistingHabitId ? '1px solid #06b6d4' : '1px solid var(--border-subtle)',
                          color: linkExistingHabitId ? '#06b6d4' : 'var(--text-muted)', cursor: 'pointer'
                        }}
                      >
                        Link Existing
                      </button>
                    </div>
                  )}

                  {linkExistingHabitId ? (
                    <select
                      value={linkExistingHabitId}
                      onChange={(e) => setLinkExistingHabitId(e.target.value)}
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: 10,
                        background: 'var(--surface-input, rgba(255,255,255,0.05))',
                        border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
                        color: 'var(--text-primary, #fff)', fontSize: 12.5, outline: 'none',
                      }}
                    >
                      {habits.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g., Morning Workout, Read 20 Mins..."
                      value={pactName}
                      onChange={(e) => setPactName(e.target.value)}
                      required={!linkExistingHabitId}
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: 10,
                        background: 'var(--surface-input, rgba(255,255,255,0.05))',
                        border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
                        color: 'var(--text-primary, #fff)', fontSize: 12.5, outline: 'none',
                      }}
                    />
                  )}
                </div>

                {/* 3. Time of Day */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                    Target Time of Day
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setTimeOfDay('morning')}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 12, fontWeight: 700,
                        background: timeOfDay === 'morning' ? 'rgba(245,158,11,0.15)' : 'var(--surface-input)',
                        border: timeOfDay === 'morning' ? '1.5px solid #f59e0b' : '1px solid var(--border-subtle)',
                        color: timeOfDay === 'morning' ? '#f59e0b' : 'var(--text-muted)', cursor: 'pointer',
                      }}
                    >
                      ☀️ Morning
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeOfDay('evening')}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 12, fontWeight: 700,
                        background: timeOfDay === 'evening' ? 'rgba(168,85,247,0.15)' : 'var(--surface-input)',
                        border: timeOfDay === 'evening' ? '1.5px solid #a855f7' : '1px solid var(--border-subtle)',
                        color: timeOfDay === 'evening' ? '#a855f7' : 'var(--text-muted)', cursor: 'pointer',
                      }}
                    >
                      🌙 Evening
                    </button>
                  </div>
                </div>

                {/* 4. Active Days */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                    Scheduled Days
                  </label>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                    {DAY_LABELS.map((lbl, idx) => {
                      const active = selectedDays.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleDay(idx)}
                          style={{
                            width: 36, height: 36, borderRadius: 8, fontSize: 11, fontWeight: 700,
                            background: active ? 'rgba(6,182,212,0.2)' : 'var(--surface-input)',
                            border: active ? '1.5px solid #06b6d4' : '1px solid var(--border-subtle)',
                            color: active ? '#06b6d4' : 'var(--text-muted)', cursor: 'pointer',
                          }}
                        >
                          {lbl.charAt(0)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={creatingPact || !selectedFriendId}
                  style={{
                    marginTop: 6, width: '100%', padding: '12px', borderRadius: 12,
                    background: 'linear-gradient(135deg, #06b6d4, #a855f7)',
                    border: 'none', color: '#fff', fontSize: 13, fontWeight: 800,
                    cursor: (creatingPact || !selectedFriendId) ? 'default' : 'pointer',
                    opacity: (creatingPact || !selectedFriendId) ? 0.6 : 1,
                  }}
                >
                  {creatingPact ? 'Sending Invitation...' : 'Send Duo Invitation 🤝'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
