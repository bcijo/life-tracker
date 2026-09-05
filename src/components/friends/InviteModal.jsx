import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Share2, Shield, Users, Sparkles, Flame, Trophy, ExternalLink } from 'lucide-react';

const InviteModal = ({ isOpen, onClose, username, displayName }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const cleanUsername = (username || '').replace(/^@/, '');
  const inviteUrl = cleanUsername
    ? `${window.location.origin}/invite/${cleanUsername}`
    : `${window.location.origin}/friends`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy invite link:', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on LifeTracker!',
          text: `Connect with ${displayName || (cleanUsername ? `@${cleanUsername}` : 'me')} on LifeTracker to compare habit streaks and compete on leaderboards!`,
          url: inviteUrl
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="glass-card"
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '440px',
            borderRadius: '24px',
            padding: '24px 20px',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--glass-border)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(236,72,153,0.25))',
                  border: '1px solid rgba(168,85,247,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-primary)'
                }}
              >
                <Users size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                  Invite Friends
                </h3>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Connect privately & compare streaks
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'var(--surface-input)',
                border: 'none',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Privacy & Security Advisory Notice */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '14px',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start'
            }}
          >
            <Shield size={18} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Invite-Only Privacy
              </span>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.45' }}>
                To preserve your privacy and eliminate unsolicited requests, connecting on LifeTracker is invite-only. Share your unique personal link to connect.
              </span>
            </div>
          </div>

          {/* Link Container */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>
              Your Personal Invite Link
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--surface-input)',
                borderRadius: '14px',
                border: '1px solid var(--border-subtle)',
                padding: '4px 6px 4px 14px',
                gap: '8px'
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: '12.5px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: 'monospace'
                }}
              >
                {inviteUrl}
              </span>

              <button
                type="button"
                onClick={handleCopy}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  background: copied ? 'rgba(16,185,129,0.18)' : 'var(--accent-gradient, linear-gradient(135deg, #a855f7, #ec4899))',
                  border: copied ? '1px solid rgba(16,185,129,0.4)' : 'none',
                  color: copied ? '#10b981' : '#ffffff',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                  transition: 'all 0.2s ease'
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Share Action Button */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={handleNativeShare}
              style={{
                flex: 1,
                padding: '12px 18px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: '13.5px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 20px -4px rgba(168, 85, 247, 0.4)'
              }}
            >
              <Share2 size={16} />
              <span>Share Invite Link</span>
            </button>
          </div>

          {/* Benefits Carousel / Feature Pills */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              paddingTop: '6px'
            }}
          >
            <div
              style={{
                padding: '10px 8px',
                borderRadius: '12px',
                background: 'var(--surface-input)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '4px'
              }}
            >
              <Flame size={16} color="#f97316" />
              <span style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Streak Clash
              </span>
              <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                Compare daily habits
              </span>
            </div>

            <div
              style={{
                padding: '10px 8px',
                borderRadius: '12px',
                background: 'var(--surface-input)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '4px'
              }}
            >
              <Trophy size={16} color="#eab308" />
              <span style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Leaderboards
              </span>
              <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                Climb ranks by XP
              </span>
            </div>

            <div
              style={{
                padding: '10px 8px',
                borderRadius: '12px',
                background: 'var(--surface-input)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '4px'
              }}
            >
              <Sparkles size={16} color="#a855f7" />
              <span style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Co-Op Quests
              </span>
              <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                Mutual XP boost
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default InviteModal;
