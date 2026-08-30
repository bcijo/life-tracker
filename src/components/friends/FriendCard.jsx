import React from 'react';
import { motion } from 'framer-motion';
import { UserMinus, Swords } from 'lucide-react';
import ScoreBadge from './ScoreBadge';
import { getLevelData } from '../../utils/habitGamification';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #06b6d4, #3b82f6)',
  'linear-gradient(135deg, #8b5cf6, #ec4899)',
  'linear-gradient(135deg, #10b981, #06b6d4)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #6366f1, #a855f7)',
];

const getAvatarGradient = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
};

const FriendCard = ({ friend, onRemove, onCompare }) => {
  const friendScore = Math.round(friend.score || 0);
  const levelInfo = getLevelData(friendScore);
  const displayName = friend.display_name || friend.full_name || friend.username;
  const initial = (displayName?.[0] || friend.username?.[0] || '?').toUpperCase();
  const avatarBg = getAvatarGradient(friend.username || displayName);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -2, borderColor: 'rgba(168,85,247,0.35)', backgroundColor: 'var(--surface-elevated, #172033)' }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15 }}
      style={{
        background: 'var(--glass-card-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--glass-card-border)',
        borderRadius: '16px',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
      onClick={() => onCompare?.(friend)}
    >
      {/* Left: Avatar & Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
        {/* Avatar */}
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          background: avatarBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: '800',
          color: '#ffffff',
          flexShrink: 0,
          boxShadow: '0 3px 10px rgba(0, 0, 0, 0.15)',
        }}>
          {initial}
        </div>

        {/* Info Block */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <p style={{
              color: 'var(--text-primary)',
              fontWeight: '700',
              fontSize: '14.5px',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.2px',
            }}>
              {displayName}
            </p>
            <span
              style={{
                fontSize: '10px',
                fontWeight: '800',
                padding: '1.5px 6px',
                borderRadius: '6px',
                background: 'rgba(168,85,247,0.12)',
                color: '#a855f7',
                border: '1px solid rgba(168,85,247,0.22)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                flexShrink: 0,
              }}
            >
              <span>{levelInfo.rankIcon}</span>
              <span>Lv.{levelInfo.level}</span>
            </span>
          </div>

          <p style={{
            color: 'var(--text-muted)',
            fontSize: '12px',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: '500',
          }}>
            @{friend.username}
          </p>
        </div>
      </div>

      {/* Right: Score & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {/* Clean XP Badge */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ScoreBadge score={friendScore} size="sm" showLabel={false} animate={false} />
        </div>

        {/* Compare Action Button */}
        {onCompare && (
          <button
            type="button"
            title="Compare Habits & Streaks"
            aria-label="Compare Habits"
            onClick={(e) => {
              e.stopPropagation();
              onCompare(friend);
            }}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9px',
              background: 'rgba(168,85,247,0.1)',
              border: '1px solid rgba(168,85,247,0.25)',
              color: '#a855f7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #a855f7, #ec4899)';
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.borderColor = 'transparent';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(168,85,247,0.1)';
              e.currentTarget.style.color = '#a855f7';
              e.currentTarget.style.borderColor = 'rgba(168,85,247,0.25)';
            }}
          >
            <Swords size={14} />
          </button>
        )}

        {/* Remove Friend Button */}
        {onRemove && (
          <button
            type="button"
            title="Remove Friend"
            aria-label="Remove Friend"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(friend);
            }}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9px',
              background: 'var(--surface-input)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.background = 'rgba(239,68,68,0.12)';
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.background = 'var(--surface-input)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
          >
            <UserMinus size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default FriendCard;
