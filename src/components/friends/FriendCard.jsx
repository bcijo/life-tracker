import React from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, TrendingDown, User } from 'lucide-react';
import ScoreBadge from './ScoreBadge';

const FriendCard = ({ friend, myScore, onRemove, onCompare }) => {
  const diff = friend.score - (myScore?.score || 0);
  const youLead = diff < 0;
  
  const cardStyle = {
    background: 'var(--glass-card-bg)',
    backdropFilter: 'blur(10px)',
    border: '1px solid var(--glass-card-border)',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer'
  };

  const leftContentStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  };

  const avatarStyle = {
    width: '48px',
    height: '48px',
    borderRadius: '24px',
    background: 'var(--surface-elevated)',
    border: '2px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
    color: 'var(--text-primary)'
  };

  const infoStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  };

  const nameStyle = {
    color: 'var(--text-primary)',
    fontWeight: '600',
    fontSize: '16px',
    margin: 0
  };

  const usernameStyle = {
    color: 'var(--text-muted)',
    fontSize: '13px',
    margin: 0
  };

  const comparisonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: youLead ? 'var(--success)' : 'var(--text-secondary)',
    marginTop: '4px'
  };

  const rightContentStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  };

  const removeBtnStyle = {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%'
  };

  const initial = friend.display_name?.[0] || friend.username?.[0] || '?';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={cardStyle}
      onClick={() => onCompare?.(friend)}
    >
      <div style={leftContentStyle}>
        <div style={avatarStyle}>
          {initial.toUpperCase()}
        </div>
        <div style={infoStyle}>
          <p style={nameStyle}>{friend.display_name || friend.full_name || friend.username}</p>
          <p style={usernameStyle}>@{friend.username}</p>
          {myScore && (
            <div style={comparisonStyle}>
              {youLead ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
              <span>
                {youLead ? `You lead +${Math.abs(diff)}` : `They lead +${diff}`}
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div style={rightContentStyle}>
        <ScoreBadge score={friend.score} size="sm" showLabel={false} animate={false} />
        {onRemove && (
          <button 
            style={removeBtnStyle} 
            onClick={(e) => {
              e.stopPropagation();
              onRemove(friend.friendship_id);
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default FriendCard;
