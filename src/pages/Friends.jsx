import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Trophy, Swords, Plus, UserPlus, Bell, Share2, Link, Check, RefreshCw, Search, X } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useFriends } from '../hooks/useFriends';
import { useLeaderboard } from '../hooks/useLeaderboard';
import UsernameOnboarding from '../components/friends/UsernameOnboarding';
import FriendCard from '../components/friends/FriendCard';
import FriendRequestCard from '../components/friends/FriendRequestCard';
import FriendSearchModal from '../components/friends/FriendSearchModal';
import RemoveFriendModal from '../components/friends/RemoveFriendModal';
import LeaderboardList from '../components/friends/LeaderboardList';
import CompareView from '../components/friends/CompareView';
import AppLoader from '../components/common/AppLoader';

const TABS = [
  { id: 'friends', label: 'Friends', icon: Users },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'compare', label: 'Compare', icon: Swords },
];

const Friends = () => {
  const { user } = useAuth();
  const { profile, refetch: refetchProfile } = useProfile();
  const {
    friends,
    pendingReceived,
    pendingSent,
    myScore,
    loading: friendsLoading,
    sendFriendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    searchUsers,
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

  const [activeTab, setActiveTab] = useState('friends');
  const [showSearch, setShowSearch] = useState(false);
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

          {/* Add Friend Search Modal Trigger */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowSearch(true)}
            style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              border: 'none',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Add Friend"
          >
            <UserPlus size={15} />
          </motion.button>
        </div>
      </motion.header>

      {/* Tab Switcher */}
      <motion.div
        style={{
          display: 'flex', gap: 4, marginBottom: 14,
          background: 'var(--surface-input)',
          borderRadius: 12, padding: 3,
          border: '1px solid var(--border-subtle)',
        }}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const hasBadge = tab.id === 'friends' && pendingReceived.length > 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 9,
                background: isActive ? 'linear-gradient(135deg, rgba(168,85,247,0.22), rgba(236,72,153,0.12))' : 'transparent',
                border: isActive ? '1px solid rgba(168,85,247,0.3)' : '1px solid transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: 12, fontWeight: isActive ? 800 : 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                position: 'relative',
              }}
            >
              <Icon size={14} />
              {tab.label}
              {hasBadge && (
                <span style={{
                  position: 'absolute', top: 4, right: 8,
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#ef4444',
                  border: '2px solid var(--glass-card-bg)',
                }} />
              )}
            </button>
          );
        })}
      </motion.div>

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
                  Add friends to compare habit streaks, track consistency, and climb the leaderboard!
                </p>
                <button
                  type="button"
                  onClick={() => setShowSearch(true)}
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
                  <UserPlus size={14} /> Add Friend
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

      {/* Floating Centered Add Friend Modal */}
      <FriendSearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSendRequest={sendFriendRequest}
        searchUsers={searchUsers}
      />

      {/* Remove Friend Confirmation Modal */}
      <RemoveFriendModal
        isOpen={!!friendToRemove}
        onClose={() => setFriendToRemove(null)}
        onConfirm={handleConfirmRemoveFriend}
        friend={friendToRemove}
        loading={removingFriend}
      />
    </div>
  );
};

export default Friends;
