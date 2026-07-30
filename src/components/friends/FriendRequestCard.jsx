import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Clock } from 'lucide-react';

const FriendRequestCard = ({ request, type, onAccept, onDecline, onCancel }) => {
  const isReceived = type === 'received';
  const user = isReceived ? request.requester : request.addressee;
  
  if (!user) return null;

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
  };

  const leftContentStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  };

  const avatarStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '20px',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'var(--text-primary)'
  };

  const infoStyle = {
    display: 'flex',
    flexDirection: 'column',
  };

  const nameStyle = {
    color: 'var(--text-primary)',
    fontWeight: '600',
    fontSize: '15px',
    margin: 0
  };

  const usernameStyle = {
    color: 'var(--text-muted)',
    fontSize: '12px',
    margin: 0
  };

  const timeStyle = {
    color: 'var(--text-muted)',
    fontSize: '11px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '2px'
  };

  const actionStyle = {
    display: 'flex',
    gap: '8px'
  };

  const btnBaseStyle = {
    border: 'none',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#fff',
  };

  const acceptBtnStyle = {
    ...btnBaseStyle,
    background: 'var(--success)',
  };

  const declineBtnStyle = {
    ...btnBaseStyle,
    background: 'var(--danger-bg)',
    color: 'var(--danger)',
  };

  const cancelBtnStyle = {
    ...btnBaseStyle,
    background: 'var(--surface-elevated)',
    color: 'var(--text-secondary)',
    borderRadius: '8px',
    width: 'auto',
    padding: '0 12px',
    fontSize: '12px',
    fontWeight: '500'
  };

  const initial = user.display_name?.[0] || user.username?.[0] || '?';

  // Simplified time ago
  const getTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, height: 0, marginBottom: 0, padding: 0 }}
      transition={{ duration: 0.2 }}
      style={cardStyle}
    >
      <div style={leftContentStyle}>
        <div style={avatarStyle}>
          {initial.toUpperCase()}
        </div>
        <div style={infoStyle}>
          <p style={nameStyle}>{user.display_name || user.full_name || user.username}</p>
          <p style={usernameStyle}>@{user.username}</p>
          <div style={timeStyle}>
            <Clock size={10} />
            <span>{getTimeAgo(request.created_at)}</span>
          </div>
        </div>
      </div>
      
      <div style={actionStyle}>
        {isReceived ? (
          <>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              style={acceptBtnStyle}
              onClick={() => onAccept(request.friendship_id)}
            >
              <Check size={18} />
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              style={declineBtnStyle}
              onClick={() => onDecline(request.friendship_id)}
            >
              <X size={18} />
            </motion.button>
          </>
        ) : (
          <motion.button 
            whileTap={{ scale: 0.95 }}
            style={cancelBtnStyle}
            onClick={() => onCancel(request.friendship_id)}
          >
            Cancel
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default FriendRequestCard;
