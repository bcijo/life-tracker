import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { generateUsername } from '../../lib/usernameGenerator';
import { useProfile } from '../../hooks/useProfile';
import { supabase } from '../../lib/supabase';

const UsernameOnboarding = ({ onComplete }) => {
  const { profile, updateProfile } = useProfile();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [error, setError] = useState('');

  const rollUsername = async () => {
    setIsRolling(true);
    setError('');
    
    let newUsername = '';
    let isAvailable = false;
    let attempts = 0;
    
    while (!isAvailable && attempts < 5) {
      newUsername = generateUsername();
      // Check collision
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', newUsername)
        .single();
        
      if (!data) {
        isAvailable = true;
      }
      attempts++;
    }
    
    if (isAvailable) {
      setUsername(newUsername);
    } else {
      setError('Could not generate a unique username. Try again.');
    }
    
    setTimeout(() => setIsRolling(false), 500);
  };

  useEffect(() => {
    if (!username) {
      rollUsername();
    }
  }, []);

  const handleSave = async () => {
    if (!username) return;
    setLoading(true);
    try {
      const { error: updateError } = await updateProfile({ username });
      if (updateError) throw updateError;
      onComplete?.();
    } catch (err) {
      setError(err.message || 'Failed to save username');
      setLoading(false);
    }
  };

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 20px',
    textAlign: 'center',
    height: '100%',
    minHeight: '400px'
  };

  const titleStyle = {
    fontSize: '28px',
    fontWeight: 'bold',
    color: 'var(--text-primary)',
    marginBottom: '8px'
  };

  const subtitleStyle = {
    color: 'var(--text-secondary)',
    marginBottom: '32px',
    fontSize: '16px'
  };

  const cardStyle = {
    background: 'var(--glass-card-bg)',
    backdropFilter: 'blur(10px)',
    border: '1px solid var(--accent-primary)',
    borderRadius: '24px',
    padding: '32px',
    width: '100%',
    maxWidth: '320px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
    boxShadow: '0 8px 32px rgba(var(--accent-primary-rgb, 100, 100, 255), 0.15)'
  };

  const usernameContainerStyle = {
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%'
  };

  const usernameStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    background: 'var(--accent-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0
  };

  const rerollBtnStyle = {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '50%',
    width: '56px',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  };

  const saveBtnStyle = {
    background: 'var(--accent-gradient)',
    color: '#fff',
    border: 'none',
    borderRadius: '16px',
    padding: '16px 32px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
    maxWidth: '320px',
    marginTop: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
  };

  return (
    <div style={containerStyle}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 style={titleStyle}>Join the Leaderboard!</h2>
        <p style={subtitleStyle}>You need a unique username to compete with friends.</p>
      </motion.div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={cardStyle}
      >
        <div style={usernameContainerStyle}>
          <AnimatePresence mode="wait">
            <motion.h3
              key={username}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={usernameStyle}
            >
              @{username}
            </motion.h3>
          </AnimatePresence>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={rerollBtnStyle}
          onClick={rollUsername}
          disabled={isRolling}
        >
          <motion.div animate={isRolling ? { rotate: 360 } : {}}>
            <Dices size={28} />
          </motion.div>
        </motion.button>
        <span style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '-12px' }}>
          Roll again
        </span>
      </motion.div>

      {error && (
        <p style={{ color: 'var(--danger)', marginTop: '16px', fontSize: '14px' }}>
          {error}
        </p>
      )}

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={saveBtnStyle}
        onClick={handleSave}
        disabled={loading || !username}
      >
        {loading ? (
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
            <Loader2 size={24} />
          </motion.div>
        ) : (
          <>
            Lock it in! <Lock size={20} />
          </>
        )}
      </motion.button>
    </div>
  );
};

export default UsernameOnboarding;
