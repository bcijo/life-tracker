import React from 'react';
import { motion } from 'framer-motion';
import { UserMinus, TrendingUp, TrendingDown, Swords } from 'lucide-react';
import ScoreBadge from './ScoreBadge';
import { getLevelData } from '../../utils/habitGamification';

const FriendCard = ({ friend, myScore, onRemove, onCompare }) => {
  const friendScore = Math.round(friend.score || 0);
  const myTotalScore = Math.round(myScore?.score || 0);
  const diff = friendScore - myTotalScore;
  const youLead = diff < 0;
  const levelInfo = getLevelData(friendScore);

  const cardStyle = {
    background: 'var(--glass-card-bg)',
    backdropFilter: 'blur(10px)',
    border: '1px solid var(--glass-card-border)',
    borderRadius: '16px',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
  };

  const leftContentStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: 0,
    flex: 1,
  };

  const avatarStyle = {
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
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(6,182,212,0.25)',
  };

  const infoStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
    flex: 1,
  };

  const nameStyle = {
    color: 'var(--text-primary)',
    fontWeight: '700',
    fontSize: '15px',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const usernameStyle = {
    color: 'var(--text-muted)',
    fontSize: '12px',
    margin: 0,
  };

  const comparisonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: '700',
    color: youLead ? '#22c55e' : '#06b6d4',
    marginTop: '2px',
  };

  const rightContentStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexShrink: 0,
  };

  const removeBtnStyle = {
    background: 'var(--surface-input)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    transition: 'all 0.15s ease',
  };

  const initial = friend.display_name?.[0] || friend.username?.[0] || '?';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.01, borderColor: 'rgba(168,85,247,0.3)' }}
      whileTap={{ scale: 0.99 }}
      style={cardStyle}
      onClick={() => onCompare?.(friend)}
    >
      <div style={leftContentStyle}>
        <div style={avatarStyle}>{initial.toUpperCase()}</div>
        <div style={infoStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <p style={nameStyle}>{friend.display_name || friend.full_name || friend.username}</p>
            <span
              style={{
                fontSize: '10px',
                fontWeight: '800',
                padding: '1px 6px',
                borderRadius: '6px',
                background: 'rgba(168,85,247,0.12)',
                color: '#a855f7',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <span>{levelInfo.rankIcon}</span>
              <span>Lv.{levelInfo.level}</span>
            </span>
          </div>
          <p style={usernameStyle}>@{friend.username} · <span style={{ color: 'var(--text-secondary)' }}>{levelInfo.rankTitle}</span></p>
          {myScore && (
            <div style={comparisonStyle}>
              {youLead ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>
                {youLead ? `You lead +${Math.abs(diff)} XP` : `They lead +${diff} XP`}
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={rightContentStyle}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '2px',
          }}
        >
          <ScoreBadge score={friendScore} size="sm" showLabel={false} animate={false} />
          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>
            {friend.active_habits || 0} habits
          </span>
        </div>

        {onRemove && (
          <button
            type="button"
            title="Remove Friend"
            style={removeBtnStyle}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(friend);
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.background = 'var(--surface-input)';
            }}
          >
            <UserMinus size={15} />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default FriendCard;
