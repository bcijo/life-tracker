import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { Users, Trophy, Swords, UserPlus, Bell, Share2, Check, RefreshCw, Search, X, Handshake } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useFriends } from '../hooks/useFriends';
import { useLeaderboard } from '../hooks/useLeaderboard';
import useMutualHabits from '../hooks/useMutualHabits';
import UsernameOnboarding from '../components/friends/UsernameOnboarding';
import FriendCard from '../components/friends/FriendCard';
import FriendRequestCard from '../components/friends/FriendRequestCard';
import InviteModal from '../components/friends/InviteModal';
import RemoveFriendModal from '../components/friends/RemoveFriendModal';
import LeaderboardList from '../components/friends/LeaderboardList';
import CompareView from '../components/friends/CompareView';
import DuoPactsView from '../components/friends/DuoPactsView';
import AppLoader from '../components/common/AppLoader';

const TABS = [
  { id: 'friends', label: 'Friends', icon: Users },
  { id: 'pacts', label: 'Duo', icon: Handshake },
  { id: 'leaderboard', label: 'Ranks', icon: Trophy },
  { id: 'compare', label: 'Compare', icon: Swords },
];

// Isolated 120fps Apple Liquid Glass Tab Bar for Friends
const FriendsLiquidBar = memo(({ currentActive, onSelectTab, hasFriendsBadge, hasPactsBadge }) => {
  const trackRef = useRef(null);
  const rectRef = useRef(null);

  const [hoveredIndex, setHoveredIndex] = useState(currentActive);
  const [isDragging, setIsDragging] = useState(false);

  const slotProgress = useMotionValue(currentActive);
  const bubbleX = useTransform(slotProgress, (v) => `${v * 100}%`);

  const pointerStateRef = useRef({
    isPressed: false,
    isDragging: false,
    startX: 0,
    startY: 0,
    startSlot: currentActive,
    startProgress: currentActive,
    grabbedBubble: false,
    hoveredSlot: currentActive,
  });

  useEffect(() => {
    if (!pointerStateRef.current.isDragging) {
      setHoveredIndex(currentActive);
      pointerStateRef.current.hoveredSlot = currentActive;
      const controls = animate(slotProgress, currentActive, {
        type: 'spring',
        stiffness: 450,
        damping: 32,
      });
      return () => controls.stop();
    }
  }, [currentActive, slotProgress]);

  const computeSlotFromX = (clientX) => {
    const rect = rectRef.current || trackRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return { slot: currentActive, raw: currentActive };
    const numItems = TABS.length;
    const slotWidth = rect.width / numItems;
    const relX = clientX - rect.left;
    const rawFloat = (relX - slotWidth / 2) / slotWidth;

    let clampedFloat = rawFloat;
    if (rawFloat < 0) {
      clampedFloat = rawFloat * 0.12;
    } else if (rawFloat > numItems - 1) {
      clampedFloat = (numItems - 1) + (rawFloat - (numItems - 1)) * 0.12;
    }

    const nearestSlot = Math.max(
      0,
      Math.min(numItems - 1, Math.floor(relX / slotWidth))
    );
    return { slot: nearestSlot, raw: clampedFloat, slotWidth };
  };

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (!trackRef.current) return;

    rectRef.current = trackRef.current.getBoundingClientRect();
    const { slot } = computeSlotFromX(e.clientX);
    const currentPos = slotProgress.get();

    pointerStateRef.current = {
      isPressed: true,
      isDragging: false,
      startX: e.clientX,
      startY: e.clientY,
      startSlot: slot,
      startProgress: currentPos,
      grabbedBubble: slot === currentActive,
      hoveredSlot: currentActive,
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handlePointerMove = (e) => {
    const state = pointerStateRef.current;
    if (!state.isPressed) return;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;

    if (!state.isDragging && Math.abs(dx) > 4 && Math.abs(dx) > Math.abs(dy)) {
      state.isDragging = true;
      setIsDragging(true);
      if (!state.grabbedBubble) {
        const { raw, slot } = computeSlotFromX(e.clientX);
        animate(slotProgress, raw, {
          type: 'spring',
          stiffness: 600,
          damping: 35,
        });
        if (slot !== state.hoveredSlot) {
          state.hoveredSlot = slot;
          setHoveredIndex(slot);
        }
        return;
      }
    }

    if (state.isDragging) {
      const rect = rectRef.current;
      if (!rect || !rect.width) return;
      const numItems = TABS.length;
      const slotWidth = rect.width / numItems;

      let raw;
      if (state.grabbedBubble) {
        raw = state.startProgress + dx / slotWidth;
        if (raw < 0) raw = raw * 0.12;
        else if (raw > numItems - 1) raw = (numItems - 1) + (raw - (numItems - 1)) * 0.12;
      } else {
        raw = computeSlotFromX(e.clientX).raw;
      }

      slotProgress.set(raw);

      const targetIdx = Math.max(0, Math.min(numItems - 1, Math.round(raw)));
      if (targetIdx !== state.hoveredSlot) {
        state.hoveredSlot = targetIdx;
        setHoveredIndex(targetIdx);
        if (navigator.vibrate) {
          try {
            navigator.vibrate(10);
          } catch (err) {}
        }
      }
    }
  };

  const handlePointerUpOrCancel = (e) => {
    const state = pointerStateRef.current;
    if (!state.isPressed) return;

    const wasDragging = state.isDragging;
    state.isPressed = false;
    state.isDragging = false;
    setIsDragging(false);

    const targetSlot = wasDragging ? state.hoveredSlot : state.startSlot;
    setHoveredIndex(targetSlot);

    animate(slotProgress, targetSlot, {
      type: 'spring',
      stiffness: 450,
      damping: 32,
    });

    if (targetSlot >= 0 && targetSlot < TABS.length && targetSlot !== currentActive) {
      if (!wasDragging && navigator.vibrate) {
        try {
          navigator.vibrate(6);
        } catch (err) {}
      }
      onSelectTab(TABS[targetSlot].id);
    }
  };

  const activeVisualSlot = isDragging ? hoveredIndex : currentActive;

  return (
    <div
      className="friends-liquid-dock"
      role="tablist"
      aria-label="Friends sections"
    >
      <div
        className="friends-dock-track"
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
      >
        {/* Hardware-Accelerated Liquid Glass Bubble */}
        <motion.div
          className={`friends-liquid-bubble ${isDragging ? 'dragging' : ''}`}
          style={{
            width: `${100 / TABS.length}%`,
            x: bubbleX,
          }}
        >
          <div className="friends-liquid-bubble-glass">
            <div className="friends-liquid-bubble-rim" />
          </div>
        </motion.div>

        {/* Section Tabs */}
        {TABS.map((tab, idx) => {
          const isSelected = idx === activeVisualSlot;
          const Icon = tab.icon;
          const hasBadge =
            (tab.id === 'friends' && hasFriendsBadge) ||
            (tab.id === 'pacts' && hasPactsBadge);

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={idx === currentActive}
              title={tab.label}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectTab(tab.id);
                }
              }}
              className={`friends-nav-tab ${isSelected ? 'active' : ''}`}
            >
              <motion.div
                className="friends-tab-inner"
                animate={{
                  scale: isSelected ? 1.05 : 0.95,
                  y: isSelected ? -0.5 : 0,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <span className="friends-tab-icon">
                  <Icon
                    size={16}
                    strokeWidth={isSelected ? 2.35 : 1.85}
                  />
                </span>
                <span className="friends-tab-text">{tab.label}</span>
                {hasBadge && <span className="friends-tab-badge" />}
              </motion.div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

const Friends = () => {
  const { user } = useAuth();
  const { profile, refetch: refetchProfile } = useProfile();
  const {
    friends,
    pendingReceived,
    pendingSent,
    myScore,
    loading: friendsLoading,
    acceptRequest,
    declineRequest,
    removeFriend,
    refresh: refreshFriends,
  } = useFriends();
  const {
    leaderboard,
    myRank,
    scope,
    setScope,
    loading: leaderboardLoading,
    refresh: refreshLeaderboard,
  } = useLeaderboard();

  const mutualHabitsState = useMutualHabits();

  const [activeTab, setActiveTab] = useState('friends');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPending, setShowPending] = useState(true);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState(null);
  const [removingFriend, setRemovingFriend] = useState(false);
  const [selectedCompareFriendId, setSelectedCompareFriendId] = useState(null);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');

  const filteredFriends = useMemo(() => {
    if (!friendSearchQuery.trim()) return friends;
    const q = friendSearchQuery.toLowerCase();
    return friends.filter(f => {
      const name = (f.display_name || f.full_name || '').toLowerCase();
      const username = (f.username || '').toLowerCase();
      return name.includes(q) || username.includes(q);
    });
  }, [friends, friendSearchQuery]);

  const handleConfirmRemoveFriend = async () => {
    if (!friendToRemove) return;
    setRemovingFriend(true);
    try {
      await removeFriend(friendToRemove.friendship_id);
      setFriendToRemove(null);
    } catch (err) {
      console.error('Failed to remove friend:', err);
    } finally {
      setRemovingFriend(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshFriends(), refreshLeaderboard()]);
    setTimeout(() => setRefreshing(false), 500);
  };

  const shareInviteLink = async () => {
    const inviteUrl = `${window.location.origin}/invite/${profile.username}`;
    const shareData = {
      title: 'Join me on Life Tracker!',
      text: `Track habits with me! Add me as a friend 🏆`,
      url: inviteUrl,
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        await navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  if (!profile?.username) {
    return (
      <div className="page-container" style={{ position: 'relative', zIndex: 1 }}>
        <UsernameOnboarding onComplete={() => refetchProfile()} />
      </div>
    );
  }

  const hasPending = pendingReceived.length > 0 || pendingSent.length > 0;
  const activeIndex = TABS.findIndex(t => t.id === activeTab);
  const currentActive = activeIndex !== -1 ? activeIndex : 0;

  return (
    <div className="page-container" style={{ position: 'relative', zIndex: 1 }}>
      {/* Header */}
      <motion.header
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16, position: 'relative', zIndex: 2,
        }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div>
          <h1 style={{
            margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
          }}>
            Friends
          </h1>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, display: 'block' }}>
            Compete & stay motivated
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* My Score Badge */}
          {myScore && (
            <div style={{
              padding: '4px 10px', borderRadius: 9999,
              background: 'rgba(168,85,247,0.12)',
              border: '1px solid rgba(168,85,247,0.25)',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Trophy size={12} style={{ color: '#a855f7' }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#a855f7', fontFamily: 'monospace' }}>
                {Math.round(myScore.score || 0).toLocaleString()}
              </span>
            </div>
          )}

          {/* Refresh Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: refreshing ? 'default' : 'pointer',
              opacity: refreshing ? 0.5 : 1,
            }}
            title="Refresh"
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          </motion.button>

          {/* Share Invite Link */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={shareInviteLink}
            style={{
              width: 32, height: 32, borderRadius: 10,
              background: copied ? 'rgba(34,197,94,0.15)' : 'var(--surface-elevated)',
              border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'var(--border-subtle)'}`,
              color: copied ? '#22c55e' : 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Share invite link"
          >
            {copied ? <Check size={14} /> : <Share2 size={14} />}
          </motion.button>

          {/* Invite Friends Modal Trigger */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowInviteModal(true)}
            style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              border: 'none',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Invite Friends"
          >
            <UserPlus size={15} />
          </motion.button>
        </div>
      </motion.header>

      {/* Isolated 120fps Apple Liquid Glass Segmented Tab Bar */}
      <FriendsLiquidBar
        currentActive={currentActive}
        onSelectTab={setActiveTab}
        hasFriendsBadge={pendingReceived.length > 0}
        hasPactsBadge={(mutualHabitsState?.pendingReceivedPacts?.length || 0) > 0}
      />

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'friends' && (
          <motion.div
            key="friends"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Pending Requests Section */}
            {hasPending && (
              <div style={{ marginBottom: 14 }}>
                <button
                  onClick={() => setShowPending(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 10px', borderRadius: '10px', marginBottom: 8,
                    background: pendingReceived.length > 0 ? 'rgba(239,68,68,0.08)' : 'var(--surface-input)',
                    border: `1px solid ${pendingReceived.length > 0 ? 'rgba(239,68,68,0.2)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer', width: '100%',
                    color: pendingReceived.length > 0 ? '#ef4444' : 'var(--text-muted)',
                    fontSize: 12, fontWeight: 700,
                  }}
                >
                  <Bell size={13} />
                  {pendingReceived.length > 0 && `${pendingReceived.length} incoming · `}
                  {pendingSent.length > 0 && `${pendingSent.length} sent`}
                  {!pendingReceived.length && !pendingSent.length && 'No pending'}
                  <motion.span
                    animate={{ rotate: showPending ? 180 : 0 }}
                    style={{ marginLeft: 'auto', fontSize: 11 }}
                  >▾</motion.span>
                </button>

                <AnimatePresence>
                  {showPending && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 6 }}
                    >
                      {pendingReceived.map(req => (
                        <FriendRequestCard
                          key={req.friendship_id}
                          request={req}
                          type="received"
                          onAccept={() => acceptRequest(req.friendship_id)}
                          onDecline={() => declineRequest(req.friendship_id)}
                        />
                      ))}
                      {pendingSent.map(req => (
                        <FriendRequestCard
                          key={req.friendship_id}
                          request={req}
                          type="sent"
                          onCancel={() => removeFriend(req.friendship_id)}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Friends Filter & Actions Header */}
            {friends.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '12px',
                flexWrap: 'wrap'
              }}>
                {/* Search input */}
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--surface-input)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  padding: '0 10px',
                  flex: 1,
                  minWidth: '160px',
                  height: '34px'
                }}>
                  <Search size={13} color="var(--text-muted)" style={{ marginRight: '6px', flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder="Search friends..."
                    value={friendSearchQuery}
                    onChange={(e) => setFriendSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '12.5px',
                      fontWeight: '500'
                    }}
                  />
                  {friendSearchQuery && (
                    <button
                      onClick={() => setFriendSearchQuery('')}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex' }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Friend Count Badge */}
                <div style={{
                  fontSize: '11.5px',
                  fontWeight: '700',
                  color: 'var(--text-muted)',
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  padding: '6px 10px',
                  borderRadius: '10px',
                  whiteSpace: 'nowrap'
                }}>
                  {friends.length} {friends.length === 1 ? 'Friend' : 'Friends'}
                </div>
              </div>
            )}

            {/* Friends List */}
            {friendsLoading ? (
              <AppLoader variant="section" size="small" message="Loading your friends..." />
            ) : friends.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  background: 'var(--glass-card-bg)',
                  border: '1px dashed var(--glass-card-border)',
                  borderRadius: '20px'
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 10 }}>👋</div>
                <h3 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                  No friends yet
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginBottom: 16, maxWidth: '280px', margin: '0 auto 16px' }}>
                  Invite friends to compare habit streaks, track consistency, and climb the leaderboard!
                </p>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(true)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <UserPlus size={14} /> Invite Friends
                </button>
              </motion.div>
            ) : filteredFriends.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '30px 20px',
                color: 'var(--text-muted)',
                fontSize: '13px'
              }}>
                No friends found matching "{friendSearchQuery}".
                <div style={{ marginTop: '8px' }}>
                  <button
                    onClick={() => setFriendSearchQuery('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-primary, #a855f7)',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Clear search
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredFriends.map((friend) => (
                  <FriendCard
                    key={friend.friendship_id}
                    friend={friend}
                    onRemove={(f) => setFriendToRemove(f)}
                    onCompare={(f) => {
                      setSelectedCompareFriendId(f.friendship_id);
                      setActiveTab('compare');
                    }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'leaderboard' && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            <LeaderboardList
              leaderboard={leaderboard}
              currentUserId={user?.id}
              scope={scope}
              onScopeChange={setScope}
              loading={leaderboardLoading}
            />
          </motion.div>
        )}

        {activeTab === 'pacts' && (
          <motion.div
            key="pacts"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            <DuoPactsView
              friends={friends}
              mutualHabitsState={mutualHabitsState}
            />
          </motion.div>
        )}

        {activeTab === 'compare' && (
          <motion.div
            key="compare"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            <CompareView
              friends={friends}
              myScore={myScore}
              currentUserId={user?.id}
              myProfile={profile}
              initialSelectedFriendId={selectedCompareFriendId}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Centered Invite Friends Modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        username={profile?.username}
        displayName={profile?.display_name || profile?.full_name}
      />

      {/* Remove Friend Confirmation Modal */}
      <RemoveFriendModal
        isOpen={!!friendToRemove}
        onClose={() => setFriendToRemove(null)}
        onConfirm={handleConfirmRemoveFriend}
        friend={friendToRemove}
        loading={removingFriend}
      />

      <style>{`
        .friends-liquid-dock {
          position: sticky;
          top: 70px;
          z-index: 85;
          height: 48px;
          padding: 4px;
          margin-bottom: 18px;
          border-radius: 9999px;
          background: var(--apple-dock-bg, rgba(22, 22, 34, 0.52));
          backdrop-filter: blur(28px) saturate(190%);
          -webkit-backdrop-filter: blur(28px) saturate(190%);
          box-shadow: var(--apple-dock-shadow,
            inset 0 1px 0 0 rgba(255, 255, 255, 0.22),
            0 12px 28px -6px rgba(0, 0, 0, 0.45),
            0 4px 12px -2px rgba(0, 0, 0, 0.25)
          );
          user-select: none;
          -webkit-user-select: none;
          touch-action: pan-y;
          transform: translateZ(0);
        }

        /* 1px Fresnel Specular Rim Border */
        .friends-liquid-dock::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: var(--apple-dock-rim, linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.32) 0%,
            rgba(255, 255, 255, 0.08) 50%,
            rgba(255, 255, 255, 0.22) 100%
          ));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          z-index: 3;
        }

        .friends-dock-track {
          position: relative;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          align-items: center;
          width: 100%;
          height: 100%;
          border-radius: 9999px;
          cursor: grab;
          touch-action: none;
        }

        .friends-dock-track:active {
          cursor: grabbing;
        }

        .friends-liquid-bubble {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          height: 100%;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1px 2px;
          pointer-events: none;
          box-sizing: border-box;
          will-change: transform;
        }

        .friends-liquid-bubble-glass {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 9999px;
          background: var(--apple-lens-bg, rgba(255, 255, 255, 0.12));
          box-shadow: var(--apple-lens-shadow,
            inset 0 1px 0 0 rgba(255, 255, 255, 0.35),
            0 4px 16px -2px rgba(0, 0, 0, 0.38)
          );
          transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
        }

        .friends-liquid-bubble.dragging .friends-liquid-bubble-glass {
          transform: scale(1.05);
          background: rgba(255, 255, 255, 0.18);
        }

        .theme-light .friends-liquid-bubble.dragging .friends-liquid-bubble-glass {
          background: rgba(255, 255, 255, 0.9);
        }

        .friends-liquid-bubble-rim {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: var(--apple-lens-rim, linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.48) 0%,
            rgba(255, 255, 255, 0.12) 50%,
            rgba(255, 255, 255, 0.32) 100%
          ));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        .friends-nav-tab {
          position: relative;
          flex: 1;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: var(--apple-tab-inactive, rgba(226, 232, 240, 0.56));
          font-size: 12.5px;
          font-weight: 600;
          padding: 0 8px;
          cursor: pointer;
          white-space: nowrap;
          z-index: 2;
          pointer-events: none;
          -webkit-tap-highlight-color: transparent;
          transition: color 0.2s ease;
        }

        .friends-nav-tab:active {
          transform: none !important;
        }

        .friends-nav-tab.active {
          color: var(--apple-tab-active, #ffffff);
          font-weight: 700;
        }

        .friends-tab-inner {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          pointer-events: none;
        }

        .friends-tab-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease, filter 0.25s ease;
        }

        .friends-nav-tab.active .friends-tab-icon {
          color: var(--apple-tab-icon-active, #ffffff);
          filter: drop-shadow(0 2px 8px var(--apple-tab-glow, rgba(168, 85, 247, 0.45)));
        }

        .friends-tab-badge {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 6px rgba(239, 68, 68, 0.6);
          flex-shrink: 0;
        }

        @media (max-width: 420px) {
          .friends-nav-tab {
            font-size: 11.5px;
            padding: 0 4px;
          }
          .friends-tab-inner {
            gap: 4px;
          }
        }
      `}</style>
    </div>
  );
};

export default Friends;
