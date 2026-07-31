import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Trophy, Swords, Plus, UserPlus, Bell, Share2, Link, Check } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useFriends } from '../hooks/useFriends';
import { useLeaderboard } from '../hooks/useLeaderboard';
import UsernameOnboarding from '../components/friends/UsernameOnboarding';
import FriendCard from '../components/friends/FriendCard';
import FriendRequestCard from '../components/friends/FriendRequestCard';
import FriendSearchModal from '../components/friends/FriendSearchModal';
import LeaderboardList from '../components/friends/LeaderboardList';
import CompareView from '../components/friends/CompareView';

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
        // Fallback to clipboard
        await navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  // If no username, show onboarding
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
          marginBottom: 20, position: 'relative', zIndex: 2,
        }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div>
          <h1 style={{
            margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
          }}>
            Friends
          </h1>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
            Compete & stay motivated
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* My Score Badge */}
          {myScore && (
            <div style={{
              padding: '6px 12px', borderRadius: 9999,
              background: 'rgba(168,85,247,0.12)',
              border: '1px solid rgba(168,85,247,0.25)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Trophy size={13} style={{ color: '#a855f7' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#a855f7', fontFamily: 'monospace' }}>
                {Math.round(myScore.score || 0)}
              </span>
            </div>
          )}

          {/* Share Invite Link */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={shareInviteLink}
            style={{
              width: 36, height: 36, borderRadius: 12,
              background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
              color: copied ? '#22c55e' : 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            title="Share invite link"
          >
            {copied ? <Check size={16} /> : <Share2 size={16} />}
          </motion.button>

          {/* Add Friend Button */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setShowSearch(true)}
            style={{
              width: 36, height: 36, borderRadius: 12,
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              border: 'none',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Add Friend"
          >
            <UserPlus size={18} />
          </motion.button>
        </div>
      </motion.header>

      {/* Tab Switcher */}
      <motion.div
        style={{
          display: 'flex', gap: 4, marginBottom: 20,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 14, padding: 4,
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
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
                flex: 1, padding: '10px 0', borderRadius: 10,
                background: isActive ? 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(236,72,153,0.15))' : 'transparent',
                border: isActive ? '1px solid rgba(168,85,247,0.3)' : '1px solid transparent',
                color: isActive ? '#fff' : 'var(--text-muted)',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
            >
              <Icon size={15} />
              {tab.label}
              {hasBadge && (
                <span style={{
                  position: 'absolute', top: 4, right: 8,
                  width: 8, height: 8, borderRadius: '50%',
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
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
          >
            {/* Pending Requests Section */}
            {hasPending && (
              <div style={{ marginBottom: 20 }}>
                <button
                  onClick={() => setShowPending(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 12, marginBottom: 10,
                    background: pendingReceived.length > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${pendingReceived.length > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    cursor: 'pointer', width: '100%',
                    color: pendingReceived.length > 0 ? '#ef4444' : 'var(--text-muted)',
                    fontSize: 13, fontWeight: 700,
                  }}
                >
                  <Bell size={14} />
                  {pendingReceived.length > 0 && `${pendingReceived.length} incoming · `}
                  {pendingSent.length > 0 && `${pendingSent.length} sent`}
                  {!pendingReceived.length && !pendingSent.length && 'No pending'}
                  <motion.span
                    animate={{ rotate: showPending ? 180 : 0 }}
                    style={{ marginLeft: 'auto', fontSize: 12 }}
                  >▾</motion.span>
                </button>

                <AnimatePresence>
                  {showPending && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 8 }}
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

            {/* Friends List */}
            {friendsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{
                    height: 72, borderRadius: 16,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    animation: 'pulse 1.5s ease infinite',
                  }} />
                ))}
              </div>
            ) : friends.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: 'center', padding: '60px 24px' }}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
                <h3 style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8 }}>
                  No friends yet
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
                  Add friends to compete on habit scores!
                </p>
                <button
                  onClick={() => setShowSearch(true)}
                  style={{
                    padding: '12px 24px', borderRadius: 12,
                    background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                    border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <UserPlus size={18} />
                  Add Friends
                </button>
              </motion.div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {friends.map((friend, i) => (
                  <FriendCard
                    key={friend.friendship_id}
                    friend={friend}
                    myScore={myScore}
                    onRemove={() => removeFriend(friend.friendship_id)}
                    onCompare={() => setActiveTab('compare')}
                    index={i}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'leaderboard' && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
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
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
          >
            <CompareView
              friends={friends}
              myScore={myScore}
              currentUserId={user?.id}
              myProfile={profile}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friend Search Modal */}
      <FriendSearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSendRequest={sendFriendRequest}
        searchUsers={searchUsers}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default Friends;
