import React from 'react';
import { motion } from 'framer-motion';
import { Users, Globe, Trophy } from 'lucide-react';
import ScoreBadge from './ScoreBadge';
import AppLoader from '../common/AppLoader';

const LeaderboardList = ({ leaderboard, currentUserId, scope, onScopeChange, loading }) => {
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '0 0 24px 0'
  };

  const toggleContainerStyle = {
    display: 'flex',
    background: 'var(--surface-elevated)',
    borderRadius: '24px',
    padding: '4px',
    margin: '0 auto 16px auto',
    width: 'fit-content'
  };

  const getToggleStyle = (isActive) => ({
    padding: '8px 24px',
    borderRadius: '20px',
    border: 'none',
    background: isActive ? 'var(--accent-gradient)' : 'transparent',
    color: isActive ? '#fff' : 'var(--text-secondary)',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all var(--transition-fast)'
  });

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return <span style={{ fontSize: '24px' }}>🥇</span>;
      case 2: return <span style={{ fontSize: '24px' }}>🥈</span>;
      case 3: return <span style={{ fontSize: '24px' }}>🥉</span>;
      default: return <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-muted)' }}>#{rank}</span>;
    }
  };

  const getCardStyle = (rank, isCurrentUser) => {
    let background = 'var(--glass-card-bg)';
    let border = '1px solid var(--glass-card-border)';
    
    if (rank === 1) {
      background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(218, 165, 32, 0.05) 100%)';
      border = '1px solid rgba(255, 215, 0, 0.3)';
    } else if (rank === 2) {
      background = 'linear-gradient(135deg, rgba(192, 192, 192, 0.15) 0%, rgba(169, 169, 169, 0.05) 100%)';
      border = '1px solid rgba(192, 192, 192, 0.3)';
    } else if (rank === 3) {
      background = 'linear-gradient(135deg, rgba(205, 127, 50, 0.15) 0%, rgba(139, 69, 19, 0.05) 100%)';
      border = '1px solid rgba(205, 127, 50, 0.3)';
    }

    if (isCurrentUser) {
      border = '1px solid var(--accent-primary)';
    }

    return {
      background,
      backdropFilter: 'blur(10px)',
      border,
      borderRadius: '16px',
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      boxShadow: isCurrentUser ? '0 0 12px rgba(var(--accent-primary-rgb, 100, 100, 255), 0.2)' : 'none'
    };
  };

  const listVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={toggleContainerStyle}>
          <button style={getToggleStyle(scope === 'friends')} onClick={() => onScopeChange('friends')}>
            <Users size={16} /> Friends
          </button>
          <button style={getToggleStyle(scope === 'global')} onClick={() => onScopeChange('global')}>
            <Globe size={16} /> Global
          </button>
        </div>
        <AppLoader
          variant="section"
          size="normal"
          message={`Loading ${scope === 'friends' ? 'friends' : 'global'} leaderboard...`}
        />
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={toggleContainerStyle}>
        <button style={getToggleStyle(scope === 'friends')} onClick={() => onScopeChange('friends')}>
          <Users size={16} /> Friends
        </button>
        <button style={getToggleStyle(scope === 'global')} onClick={() => onScopeChange('global')}>
          <Globe size={16} /> Global
        </button>
      </div>

      {leaderboard.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <Trophy size={48} opacity={0.2} style={{ marginBottom: '16px' }} />
          <p>No data available yet.</p>
          {scope === 'friends' && <p>Add some friends to start competing!</p>}
        </div>
      ) : (
        <motion.div variants={listVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {leaderboard.map((user, index) => {
            const isCurrentUser = user.user_id === currentUserId;
            // Force anonymous in global scope unless it's current user
            const displayName = scope === 'global' && !isCurrentUser
              ? `@${user.username}` 
              : (user.display_name || user.full_name || `@${user.username}`);
            
            return (
              <motion.div key={user.user_id} variants={itemVariants} style={getCardStyle(user.rank, isCurrentUser)}>
                <div style={{ width: '32px', textAlign: 'center' }}>
                  {getRankIcon(user.rank)}
                </div>
                
                <div style={{
                  width: '40px', height: '40px', borderRadius: '20px',
                  background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold', color: 'var(--text-primary)'
                }}>
                  {(user.display_name?.[0] || user.username?.[0] || '?').toUpperCase()}
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {displayName} {isCurrentUser && <span style={{ color: 'var(--accent-primary)', fontSize: '12px' }}>(You)</span>}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--surface-elevated)', padding: '2px 8px', borderRadius: '10px' }}>
                      {user.completions_30d || 0} completions
                    </span>
                  </div>
                </div>

                <div>
                  <ScoreBadge score={user.score} size="sm" showLabel={false} animate={false} />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

export default LeaderboardList;
