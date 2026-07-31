import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, UserPlus, Check, Clock, AlertCircle } from 'lucide-react';

const FriendSearchModal = ({ isOpen, onClose, onSendRequest, searchUsers }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [localStatuses, setLocalStatuses] = useState({}); // To track status changes locally before refresh
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setError(null);
      setLocalStatuses({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const users = await searchUsers(query);
        setResults(users);
        setError(null);
      } catch (err) {
        setError('Failed to search users.');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeoutRef.current);
  }, [query, searchUsers]);

  const handleSendRequest = async (username) => {
    const res = await onSendRequest(username);
    if (res?.error) {
      setToast({ type: 'error', message: res.error });
    } else {
      setLocalStatuses(prev => ({ ...prev, [username]: 'pending' }));
      setToast({ type: 'success', message: 'Friend request sent!' });
    }
    
    setTimeout(() => setToast(null), 3000);
  };

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    zIndex: 1100,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  };

  const containerStyle = {
    width: '100%',
    maxWidth: '440px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--header-bg)',
  };

  const headerStyle = {
    padding: '20px',
    paddingTop: 'calc(env(safe-area-inset-top, 0px) + 60px)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid var(--border-subtle)'
  };

  const searchContainerStyle = {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  };

  const inputStyle = {
    width: '100%',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px',
    padding: '12px 12px 12px 40px',
    color: 'var(--text-primary)',
    fontSize: '16px',
    outline: 'none'
  };

  const searchIconStyle = {
    position: 'absolute',
    left: '12px',
    color: 'var(--text-muted)'
  };

  const closeBtnStyle = {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const contentStyle = {
    flex: 1,
    padding: '20px',
    overflowY: 'auto'
  };

  const resultItemStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: 'var(--glass-card-bg)',
    borderRadius: '12px',
    border: '1px solid var(--glass-card-border)',
    marginBottom: '12px'
  };

  const userInfoStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  };

  const avatarStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '20px',
    background: 'var(--accent-gradient)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '16px'
  };

  const actionBtnStyle = (status) => ({
    padding: '8px 16px',
    borderRadius: '20px',
    border: 'none',
    fontSize: '13px',
    fontWeight: '600',
    cursor: status === 'add' ? 'pointer' : 'default',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: status === 'add' ? 'var(--accent-primary)' : 'var(--surface-elevated)',
    color: status === 'add' ? '#fff' : 'var(--text-secondary)',
    opacity: status === 'add' ? 1 : 0.7
  });

  const emptyStateStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--text-muted)',
    textAlign: 'center',
    gap: '12px'
  };

  const toastStyle = {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: toast?.type === 'error' ? 'var(--danger-bg)' : 'var(--surface-elevated)',
    color: toast?.type === 'error' ? 'var(--danger)' : 'var(--success)',
    padding: '12px 24px',
    borderRadius: '24px',
    border: `1px solid ${toast?.type === 'error' ? 'var(--danger)' : 'var(--success)'}`,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
    zIndex: 10
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={overlayStyle}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={containerStyle}
          >
            <div style={headerStyle}>
              <div style={searchContainerStyle}>
                <Search size={18} style={searchIconStyle} />
                <input
                  autoFocus
                  style={inputStyle}
                  placeholder="Search by username..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <button style={closeBtnStyle} onClick={onClose}>
                <X size={24} />
              </button>
            </div>

            <div style={contentStyle}>
              {loading ? (
                <div style={emptyStateStyle}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <Clock size={24} color="var(--accent-primary)" />
                  </motion.div>
                  <p>Searching...</p>
                </div>
              ) : error ? (
                <div style={emptyStateStyle}>
                  <AlertCircle size={32} color="var(--danger)" />
                  <p style={{ color: 'var(--danger)' }}>{error}</p>
                </div>
              ) : results.length > 0 ? (
                results.map((user) => {
                  const status = localStatuses[user.username] || 
                                (user.isFriend ? 'friends' : 
                                 user.isPending ? 'pending' : 'add');
                  
                  return (
                    <motion.div 
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={resultItemStyle}
                    >
                      <div style={userInfoStyle}>
                        <div style={avatarStyle}>
                          {(user.display_name?.[0] || user.username?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: '600', color: 'var(--text-primary)' }}>
                            {user.display_name || user.full_name || user.username}
                          </p>
                          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                            @{user.username}
                          </p>
                        </div>
                      </div>
                      
                      {status === 'add' ? (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          style={actionBtnStyle('add')}
                          onClick={() => handleSendRequest(user.username)}
                        >
                          <UserPlus size={14} /> Add
                        </motion.button>
                      ) : status === 'pending' ? (
                        <div style={actionBtnStyle('pending')}>
                          <Clock size={14} /> Pending
                        </div>
                      ) : (
                        <div style={actionBtnStyle('friends')}>
                          <Check size={14} /> Friends
                        </div>
                      )}
                    </motion.div>
                  );
                })
              ) : query ? (
                <div style={emptyStateStyle}>
                  <p>No users found matching "{query}"</p>
                </div>
              ) : (
                <div style={emptyStateStyle}>
                  <Search size={48} opacity={0.2} />
                  <p>Search by username to find friends</p>
                </div>
              )}
            </div>

            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  style={toastStyle}
                >
                  {toast.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
                  {toast.message}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FriendSearchModal;
