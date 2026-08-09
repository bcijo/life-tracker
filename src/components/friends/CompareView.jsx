import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Swords, ChevronDown } from 'lucide-react';

const CompareView = ({ friends, myScore, currentUserId, myProfile }) => {
  const [selectedFriendId, setSelectedFriendId] = useState(friends?.[0]?.friendship_id || '');

  // Auto-select first friend when friends list loads asynchronously
  useEffect(() => {
    if (friends?.length > 0 && !selectedFriendId) {
      setSelectedFriendId(friends[0].friendship_id);
    }
  }, [friends, selectedFriendId]);

  const selectedFriend = friends?.find(f => f.friendship_id === selectedFriendId);

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    padding: '0 0 24px 0'
  };

  const selectWrapperStyle = {
    position: 'relative',
    background: 'var(--glass-card-bg)',
    borderRadius: '16px',
    border: '1px solid var(--glass-card-border)',
    padding: '12px 16px',
  };

  const selectStyle = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '16px',
    fontWeight: '600',
    appearance: 'none',
    outline: 'none',
    cursor: 'pointer'
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: 'var(--surface-elevated)',
    borderRadius: '20px',
    marginBottom: '8px'
  };

  const avatarStyle = {
    width: '56px',
    height: '56px',
    borderRadius: '28px',
    background: 'var(--accent-gradient)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#fff',
    border: '3px solid var(--glass-card-bg)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
  };

  const userColumnStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    flex: 1
  };

  const vsStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    padding: '0 16px'
  };

  const StatRow = ({ label, myValue, theirValue, isPercentage = false }) => {
    const myNum = Number(myValue) || 0;
    const theirNum = Number(theirValue) || 0;
    const max = Math.max(myNum, theirNum) || 1; // Avoid div by 0
    
    const myPercent = (myNum / max) * 100;
    const theirPercent = (theirNum / max) * 100;
    
    const myWin = myNum > theirNum;
    const theirWin = theirNum > myNum;
    const tie = myNum === theirNum && myNum > 0;

    return (
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontWeight: '600', color: myWin ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
            {isPercentage ? `${myNum.toFixed(1)}%` : myNum.toLocaleString()}
            {myWin && <Trophy size={14} style={{ marginLeft: '4px', color: 'gold' }} />}
          </span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {label}
          </span>
          <span style={{ fontWeight: '600', color: theirWin ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
            {theirWin && <Trophy size={14} style={{ marginRight: '4px', color: 'gold' }} />}
            {isPercentage ? `${theirNum.toFixed(1)}%` : theirNum.toLocaleString()}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '4px', height: '12px' }}>
          <div style={{ flex: 1, background: 'var(--surface-elevated)', borderRadius: '6px 0 0 6px', display: 'flex', justifyContent: 'flex-end', overflow: 'hidden' }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${myPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ background: myWin ? 'var(--accent-gradient)' : 'var(--border-subtle)', height: '100%', borderRadius: '6px 0 0 6px' }}
            />
          </div>
          <div style={{ width: '2px', background: 'var(--glass-border)' }} />
          <div style={{ flex: 1, background: 'var(--surface-elevated)', borderRadius: '0 6px 6px 0', overflow: 'hidden' }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${theirPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ background: theirWin ? 'var(--accent-gradient)' : 'var(--border-subtle)', height: '100%', borderRadius: '0 6px 6px 0' }}
            />
          </div>
        </div>
      </div>
    );
  };

  if (!friends || friends.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
        <Swords size={48} opacity={0.2} style={{ marginBottom: '16px' }} />
        <p>Add friends to compare stats!</p>
      </div>
    );
  }

  const me = myProfile || {};
  const myData = myScore || { score: 0, completions_30d: 0, active_habits: 0, completion_rate: 0 };
  const theirData = selectedFriend || { score: 0, completions_30d: 0, active_habits: 0, completion_rate: 0 };

  const myWinCount = [
    myData.score > theirData.score,
    myData.completions_30d > theirData.completions_30d,
    myData.completion_rate > theirData.completion_rate,
    myData.active_habits > theirData.active_habits
  ].filter(Boolean).length;

  const theirWinCount = [
    theirData.score > myData.score,
    theirData.completions_30d > myData.completions_30d,
    theirData.completion_rate > myData.completion_rate,
    theirData.active_habits > myData.active_habits
  ].filter(Boolean).length;

  return (
    <div style={containerStyle}>
      <div style={selectWrapperStyle}>
        <select 
          style={selectStyle} 
          value={selectedFriendId} 
          onChange={(e) => setSelectedFriendId(e.target.value)}
        >
          {friends.map(f => (
            <option key={f.friendship_id} value={f.friendship_id}>
              Compare with {f.display_name || f.username}
            </option>
          ))}
        </select>
        <ChevronDown size={20} style={{ position: 'absolute', right: '16px', top: '14px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
      </div>

      {selectedFriend && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          
          <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
            {myWinCount > theirWinCount ? (
              <span style={{ color: 'var(--success)' }}>You are winning! 👑</span>
            ) : theirWinCount > myWinCount ? (
              <span style={{ color: 'var(--danger)' }}>They are pulling ahead! 🏃</span>
            ) : (
              <span style={{ color: 'var(--text-secondary)' }}>It's a dead heat! ⚔️</span>
            )}
          </div>

          <div style={headerStyle}>
            <div style={userColumnStyle}>
              <div style={{ ...avatarStyle, background: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '2px solid var(--accent-primary)' }}>
                {(me.display_name?.[0] || me.username?.[0] || 'Y').toUpperCase()}
              </div>
              <span style={{ fontWeight: '600', fontSize: '14px' }}>You</span>
            </div>
            
            <div style={vsStyle}>VS</div>
            
            <div style={userColumnStyle}>
              <div style={{ ...avatarStyle, background: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '2px solid var(--border-subtle)' }}>
                {(selectedFriend.display_name?.[0] || selectedFriend.username?.[0] || '?').toUpperCase()}
              </div>
              <span style={{ fontWeight: '600', fontSize: '14px' }}>
                {selectedFriend.display_name || selectedFriend.username}
              </span>
            </div>
          </div>

          <div style={{ background: 'var(--glass-card-bg)', borderRadius: '20px', padding: '24px', border: '1px solid var(--glass-card-border)' }}>
            <StatRow label="Total Score" myValue={myData.score} theirValue={theirData.score} />
            <StatRow label="30D Completions" myValue={myData.completions_30d} theirValue={theirData.completions_30d} />
            <StatRow label="Completion Rate" myValue={myData.completion_rate} theirValue={theirData.completion_rate} isPercentage={true} />
            <StatRow label="Active Habits" myValue={myData.active_habits} theirValue={theirData.active_habits} />
          </div>

        </motion.div>
      )}
    </div>
  );
};

export default CompareView;
