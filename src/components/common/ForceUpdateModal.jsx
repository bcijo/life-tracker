import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, RefreshCw, Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAppUpdate } from '../../contexts/UpdateContext';

const ForceUpdateModal = () => {
  const { isUpdateAvailable, isUpdating, applyUpdate } = useAppUpdate();

  // Prevent background scrolling and trap Escape key when modal is open
  useEffect(() => {
    if (isUpdateAvailable) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e) => {
        // Block Escape key or any attempt to dismiss
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
        }
      };

      window.addEventListener('keydown', handleKeyDown, true);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown, true);
      };
    }
  }, [isUpdateAvailable]);

  if (import.meta.env.DEV || !isUpdateAvailable) return null;

  return (
    <AnimatePresence>
      <div
        id="force-update-modal-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 6, 15, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          pointerEvents: 'auto'
        }}
        onClick={(e) => {
          // Strictly prevent dismissing by clicking background
          e.stopPropagation();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '440px',
            borderRadius: '24px',
            background: 'linear-gradient(145deg, rgba(26, 32, 53, 0.95), rgba(13, 17, 30, 0.98))',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(239, 68, 68, 0.2)',
            padding: '32px 26px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            color: '#f8fafc',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle glowing ambient pulse */}
          <div
            style={{
              position: 'absolute',
              top: '-40px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '180px',
              height: '180px',
              background: 'radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, transparent 70%)',
              pointerEvents: 'none',
              filter: 'blur(20px)'
            }}
          />

          {/* Security Alert Icon */}
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1))',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              position: 'relative',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.25)'
            }}
          >
            <ShieldAlert size={34} color="#ef4444" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
              style={{
                position: 'absolute',
                inset: -3,
                borderRadius: '22px',
                border: '1px dashed rgba(239, 68, 68, 0.5)',
                pointerEvents: 'none'
              }}
            />
          </div>

          {/* Security Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '999px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              fontSize: '11px',
              fontWeight: '800',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '14px'
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 8px #ef4444'
              }}
            />
            Security Update Required
          </div>

          {/* Heading */}
          <h2
            style={{
              fontSize: '22px',
              fontWeight: '800',
              margin: '0 0 10px 0',
              color: '#ffffff',
              letterSpacing: '-0.02em',
              lineHeight: 1.25
            }}
          >
            New Version Available
          </h2>

          {/* Body description highlighting vulnerability patches */}
          <p
            style={{
              fontSize: '13.5px',
              lineHeight: '1.6',
              color: '#94a3b8',
              margin: '0 0 24px 0',
              padding: '0 8px'
            }}
          >
            A critical update has been deployed to patch security vulnerabilities, strengthen privacy, and improve application stability. To safeguard your account and encrypted data, you must update before continuing.
          </p>

          {/* Feature Pill Highlights */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '14px',
              padding: '12px 16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '26px',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={15} color="#10b981" />
              <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: '600' }}>
                Latest security and vulnerability patches
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Lock size={15} color="#38bdf8" />
              <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: '600' }}>
                Enhanced zero-knowledge data integrity
              </span>
            </div>
          </div>

          {/* Mandatory Action Button - No Skip Allowed */}
          <button
            id="force-update-action-btn"
            type="button"
            disabled={isUpdating}
            onClick={applyUpdate}
            style={{
              width: '100%',
              padding: '15px 24px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: '15px',
              fontWeight: '800',
              letterSpacing: '0.01em',
              cursor: isUpdating ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
              transition: 'all 0.2s ease',
              opacity: isUpdating ? 0.8 : 1
            }}
          >
            <RefreshCw
              size={18}
              className={isUpdating ? 'spin' : ''}
              style={{
                animation: isUpdating ? 'spin 1s linear infinite' : 'none'
              }}
            />
            <span>{isUpdating ? 'Applying Update & Restarting…' : 'Update & Restart Now'}</span>
          </button>

          {/* Non-dismissible notice */}
          <div
            style={{
              marginTop: '14px',
              fontSize: '11px',
              color: '#64748b',
              fontWeight: '500'
            }}
          >
            Update is required to access your account securely.
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ForceUpdateModal;
