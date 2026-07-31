import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Check, X, Loader2, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuth from '../hooks/useAuth';

const InviteLanding = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState('loading'); // loading | found | sending | sent | already_friends | self | not_found | error
  const [inviter, setInviter] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!username) {
      setStatus('not_found');
      return;
    }

    // Store invite in localStorage in case user needs to log in first
    localStorage.setItem('pending_invite', username);

    if (!user) {
      setStatus('needs_login');
      return;
    }

    lookupAndSend();
  }, [username, user]);

  const lookupAndSend = async () => {
    try {
      setStatus('loading');

      // Look up the inviter by username (case-insensitive)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, full_name')
        .ilike('username', username)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        setStatus('not_found');
        return;
      }

      setInviter(profile);

      // Check if it's yourself
      if (profile.id === user.id) {
        setStatus('self');
        return;
      }

      // Check if already friends or pending
      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'accepted') {
          setStatus('already_friends');
        } else {
          setStatus('already_pending');
        }
        return;
      }

      setStatus('found');
    } catch (err) {
      console.error('Invite lookup error:', err);
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const handleSendRequest = async () => {
    try {
      setStatus('sending');

      const { error } = await supabase
        .from('friendships')
        .insert({ requester_id: user.id, addressee_id: inviter.id });

      if (error) throw error;

      localStorage.removeItem('pending_invite');
      setStatus('sent');
    } catch (err) {
      console.error('Send request error:', err);
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const goToFriends = () => {
    localStorage.removeItem('pending_invite');
    navigate('/friends');
  };

  const goToLogin = () => {
    navigate('/login');
  };

  const displayName = inviter?.full_name || inviter?.display_name || inviter?.username || username;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary, #0a0a0f)',
      padding: 24,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          maxWidth: 400, width: '100%',
          padding: 32, borderRadius: 24,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          textAlign: 'center',
        }}
      >
        {/* Loading */}
        {status === 'loading' && (
          <>
            <Loader2 size={48} style={{ color: '#a855f7', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
            <p style={{ color: 'var(--text-muted, #888)', fontSize: 15 }}>Looking up invite...</p>
          </>
        )}

        {/* Needs Login */}
        {status === 'needs_login' && (
          <>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔐</div>
            <h2 style={{ color: '#fff', fontWeight: 700, marginBottom: 8 }}>Sign in to connect!</h2>
            <p style={{ color: 'var(--text-muted, #888)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
              <strong style={{ color: '#a855f7' }}>@{username}</strong> wants to be your habit buddy. Sign in to accept!
            </p>
            <button
              onClick={goToLogin}
              style={{
                padding: '14px 32px', borderRadius: 14,
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              <LogIn size={18} /> Sign In
            </button>
          </>
        )}

        {/* Found — confirm */}
        {status === 'found' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              style={{
                width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36, fontWeight: 800, color: '#fff',
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </motion.div>
            <h2 style={{ color: '#fff', fontWeight: 700, marginBottom: 4 }}>{displayName}</h2>
            <p style={{ color: '#a855f7', fontSize: 13, fontFamily: 'monospace', fontWeight: 600, marginBottom: 20 }}>
              @{inviter.username}
            </p>
            <p style={{ color: 'var(--text-muted, #888)', fontSize: 14, marginBottom: 24 }}>
              wants to track habits with you!
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={handleSendRequest}
                style={{
                  padding: '12px 28px', borderRadius: 14,
                  background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                  border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <UserPlus size={18} /> Add Friend
              </button>
              <button
                onClick={goToFriends}
                style={{
                  padding: '12px 20px', borderRadius: 14,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-secondary, #aaa)', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Skip
              </button>
            </div>
          </>
        )}

        {/* Sending */}
        {status === 'sending' && (
          <>
            <Loader2 size={48} style={{ color: '#a855f7', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
            <p style={{ color: 'var(--text-muted, #888)', fontSize: 15 }}>Sending friend request...</p>
          </>
        )}

        {/* Sent! */}
        {status === 'sent' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12 }}
              style={{
                width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
                background: 'linear-gradient(135deg, #22c55e, #10b981)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Check size={40} style={{ color: '#fff' }} />
            </motion.div>
            <h2 style={{ color: '#fff', fontWeight: 700, marginBottom: 8 }}>Request Sent! 🎉</h2>
            <p style={{ color: 'var(--text-muted, #888)', fontSize: 14, marginBottom: 24 }}>
              You'll be connected once <strong style={{ color: '#a855f7' }}>@{inviter.username}</strong> accepts.
            </p>
            <button
              onClick={goToFriends}
              style={{
                padding: '12px 28px', borderRadius: 14,
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Go to Friends
            </button>
          </>
        )}

        {/* Already friends */}
        {status === 'already_friends' && (
          <>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🤝</div>
            <h2 style={{ color: '#fff', fontWeight: 700, marginBottom: 8 }}>Already friends!</h2>
            <p style={{ color: 'var(--text-muted, #888)', fontSize: 14, marginBottom: 24 }}>
              You and <strong style={{ color: '#a855f7' }}>@{inviter?.username}</strong> are already connected.
            </p>
            <button onClick={goToFriends} style={{
              padding: '12px 28px', borderRadius: 14,
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
              Go to Friends
            </button>
          </>
        )}

        {/* Already pending */}
        {status === 'already_pending' && (
          <>
            <div style={{ fontSize: 56, marginBottom: 16 }}>⏳</div>
            <h2 style={{ color: '#fff', fontWeight: 700, marginBottom: 8 }}>Request pending</h2>
            <p style={{ color: 'var(--text-muted, #888)', fontSize: 14, marginBottom: 24 }}>
              There's already a pending request with <strong style={{ color: '#a855f7' }}>@{inviter?.username}</strong>.
            </p>
            <button onClick={goToFriends} style={{
              padding: '12px 28px', borderRadius: 14,
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
              Check Friends
            </button>
          </>
        )}

        {/* Self */}
        {status === 'self' && (
          <>
            <div style={{ fontSize: 56, marginBottom: 16 }}>😅</div>
            <h2 style={{ color: '#fff', fontWeight: 700, marginBottom: 8 }}>That's you!</h2>
            <p style={{ color: 'var(--text-muted, #888)', fontSize: 14, marginBottom: 24 }}>
              You can't add yourself as a friend, but we appreciate the self-love! 💜
            </p>
            <button onClick={goToFriends} style={{
              padding: '12px 28px', borderRadius: 14,
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
              Go to Friends
            </button>
          </>
        )}

        {/* Not found */}
        {status === 'not_found' && (
          <>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
            <h2 style={{ color: '#fff', fontWeight: 700, marginBottom: 8 }}>User not found</h2>
            <p style={{ color: 'var(--text-muted, #888)', fontSize: 14, marginBottom: 24 }}>
              No user with username <strong style={{ color: '#a855f7' }}>@{username}</strong> exists.
            </p>
            <button onClick={goToFriends} style={{
              padding: '12px 28px', borderRadius: 14,
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
              Go to Friends
            </button>
          </>
        )}

        {/* Error */}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 56, marginBottom: 16 }}>❌</div>
            <h2 style={{ color: '#fff', fontWeight: 700, marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ color: 'var(--text-muted, #888)', fontSize: 14, marginBottom: 24 }}>
              {errorMsg || 'Please try again later.'}
            </p>
            <button onClick={goToFriends} style={{
              padding: '12px 28px', borderRadius: 14,
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
              Go to Friends
            </button>
          </>
        )}
      </motion.div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default InviteLanding;
