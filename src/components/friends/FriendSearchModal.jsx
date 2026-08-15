import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, UserPlus, Check, Clock, AlertCircle, Sparkles, Send } from 'lucide-react';

const FriendSearchModal = ({ isOpen, onClose, onSendRequest, searchUsers }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [localStatuses, setLocalStatuses] = useState({});
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setError(null);
      setLocalStatuses({});
      setToast(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const cleanQ = query.trim().replace(/^@/, '');
    if (!cleanQ) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const users = await searchUsers(cleanQ);
        setResults(users || []);
        setError(null);
      } catch (err) {
        setError('Failed to search users.');
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(searchTimeoutRef.current);
  }, [query, searchUsers]);

  const handleSendRequest = async (username) => {
    const cleanUsername = username.replace(/^@/, '');
    const res = await onSendRequest(cleanUsername);
    if (res?.error) {
      setToast({ type: 'error', message: res.error });
      if (res.error.toLowerCase().includes('already pending') || res.error.toLowerCase().includes('already sent')) {
        setLocalStatuses(prev => ({ ...prev, [cleanUsername]: 'pending' }));
      }
    } else {
      setLocalStatuses(prev => ({ ...prev, [cleanUsername]: 'pending' }));
      setToast({ type: 'success', message: `Friend request sent to @${cleanUsername}!` });
    }
    
    setTimeout(() => setToast(null), 4000);
  };

  const handleDirectSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    const clean = query.trim().replace(/^@/, '');
    handleSendRequest(clean);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(10px)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          {/* Backdrop click dismiss */}
          <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="glass-card"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '420px',
              borderRadius: '20px',
              padding: '18px',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--glass-border)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              maxHeight: '85vh'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.2))',
                  border: '1px solid rgba(168,85,247,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-primary)'
                }}>
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                    Add Friend
                  </h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Search by username to connect
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
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Clean Search & Add Input */}
            <form onSubmit={handleDirectSubmit} style={{ display: 'flex', gap: '6px' }}>
              <div style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                background: 'var(--surface-input)',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                padding: '0 12px'
              }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-primary)', marginRight: '2px' }}>
                  @
                </span>
                <input
                  autoFocus
                  type="text"
                  placeholder="username..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: '600',
                    padding: '10px 0'
                  }}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '2px'
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={!query.trim() || loading}
                className="btn-primary"
                style={{
                  padding: '0 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: 'none',
                  cursor: !query.trim() ? 'not-allowed' : 'pointer',
                  opacity: !query.trim() ? 0.5 : 1,
                  flexShrink: 0
                }}
              >
                <Send size={12} />
                <span>Send</span>
              </button>
            </form>

            {/* Results / Live Feedback List */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              maxHeight: '260px',
              overflowY: 'auto',
              paddingRight: '2px'
            }}>
              {loading ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Clock size={14} className="spin" />
                  <span>Searching username...</span>
                </div>
              ) : results.length > 0 ? (
                results.map((u) => {
                  const cleanName = u.username?.replace(/^@/, '');
                  const status = localStatuses[cleanName] || (u.isFriend ? 'friends' : u.isPending ? 'pending' : 'add');
                  const initial = (u.display_name || u.username || '?')[0]?.toUpperCase();

                  return (
                    <motion.div
                      key={u.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '12px',
                        background: 'var(--surface-input)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '14px',
                          fontWeight: '800',
                          flexShrink: 0
                        }}>
                          {initial}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {u.display_name || u.full_name || u.username}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '600', fontFamily: 'monospace' }}>
                            @{u.username}
                          </span>
                        </div>
                      </div>

                      {status === 'add' ? (
                        <button
                          type="button"
                          onClick={() => handleSendRequest(u.username)}
                          className="btn-primary"
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          <UserPlus size={12} />
                          <span>Add</span>
                        </button>
                      ) : status === 'pending' ? (
                        <div style={{
                          padding: '5px 10px',
                          borderRadius: '8px',
                          background: 'rgba(245,158,11,0.12)',
                          color: '#f59e0b',
                          fontSize: '11px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          flexShrink: 0
                        }}>
                          <Clock size={12} />
                          <span>Pending</span>
                        </div>
                      ) : (
                        <div style={{
                          padding: '5px 10px',
                          borderRadius: '8px',
                          background: 'rgba(16,185,129,0.12)',
                          color: '#10b981',
                          fontSize: '11px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          flexShrink: 0
                        }}>
                          <Check size={12} />
                          <span>Friends</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              ) : query ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No users found matching "@{query.replace(/^@/, '')}". You can still tap <strong>Send</strong> to dispatch an invite!
                </div>
              ) : (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Type a username above to search and connect.
                </div>
              )}
            </div>

            {/* Toast Notification */}
            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                    border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                    color: toast.type === 'error' ? '#ef4444' : '#10b981',
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {toast.type === 'error' ? <AlertCircle size={13} /> : <Check size={13} />}
                  <span>{toast.message}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FriendSearchModal;
