import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

const ScoreBadge = ({ score, size = 'md', showLabel = true, animate = true }) => {
  const [displayScore, setDisplayScore] = useState(animate ? 0 : score);
  const controls = useAnimation();

  useEffect(() => {
    if (animate) {
      let startTime;
      const duration = 1000;
      
      const updateScore = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        
        // easeOutExpo
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        
        setDisplayScore(Math.floor(easeProgress * score));
        
        if (progress < 1) {
          requestAnimationFrame(updateScore);
        } else {
          setDisplayScore(score);
        }
      };
      
      requestAnimationFrame(updateScore);
      controls.start({ scale: [1, 1.2, 1], transition: { duration: 0.3 } });
    } else {
      setDisplayScore(score);
    }
  }, [score, animate, controls]);

  const sizes = {
    sm: { padding: '4px 10px', fontSize: '12px', labelSize: '10px' },
    md: { padding: '6px 14px', fontSize: '16px', labelSize: '12px' },
    lg: { padding: '10px 20px', fontSize: '24px', labelSize: '14px' }
  };

  const currentSize = sizes[size] || sizes.md;

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  };

  const badgeStyle = {
    background: 'var(--accent-gradient)',
    padding: currentSize.padding,
    borderRadius: '20px',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: currentSize.fontSize,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    border: '1px solid var(--glass-border)',
  };

  const labelStyle = {
    color: 'var(--text-secondary)',
    fontSize: currentSize.labelSize,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '600'
  };

  return (
    <div style={containerStyle}>
      <motion.div animate={controls} style={badgeStyle}>
        {displayScore.toLocaleString()}
      </motion.div>
      {showLabel && <div style={labelStyle}>Score</div>}
    </div>
  );
};

export default ScoreBadge;
