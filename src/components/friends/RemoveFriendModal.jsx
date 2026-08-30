import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserMinus, X } from 'lucide-react';

const RemoveFriendModal = ({ isOpen, onClose, onConfirm, friend, loading = false }) => {
  if (!isOpen || !friend) return null;

  const displayName = friend.display_name || friend.full_name || friend.username || 'Friend';
  const initial = displayName[0]?.toUpperCase() || '?';

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '20px',
            padding: '24px',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
            color: 'var(--text-primary)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'var(--surface-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            <X size={15} />
          </button>

          {/* Warning Icon Badge */}
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '28px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              color: '#ef4444',
            }}
          >
            <UserMinus size={28} />
          </div>

          <h3
            style={{
              fontSize: '18px',
              fontWeight: '800',
              margin: '0 0 6px 0',
              color: 'var(--text-primary)',
            }}
          >
            Remove Friend?
          </h3>

          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              margin: '0 0 16px 0',
              lineHeight: 1.45,
            }}
          >
            Are you sure you want to remove <strong style={{ color: 'var(--text-primary)' }}>{displayName}</strong> (@{friend.username}) from your friends list?
          </p>

          {/* Friend Preview Pill */}
          <div
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'var(--surface-input)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '800',
                color: '#fff',
              }}
            >
              {initial}
            </div>
            <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayName}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                @{friend.username}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              width: '100%',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-input)',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: '800',
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
              }}
            >
              {loading ? 'Removing...' : 'Remove'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default RemoveFriendModal;
