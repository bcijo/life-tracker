import { motion } from 'framer-motion';

export function GradientOrbs() {
  return (
    <div className="habit-orbs-container">
      {/* Purple orb */}
      <motion.div
        style={{
          position: 'absolute',
          borderRadius: '50%',
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(168,85,247,0.35) 0%, rgba(168,85,247,0) 70%)',
          filter: 'blur(60px)',
          top: -150,
          left: -150,
        }}
        animate={{ x: [0, 80, 40, 0], y: [0, -60, 40, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Pink orb */}
      <motion.div
        style={{
          position: 'absolute',
          borderRadius: '50%',
          width: 450,
          height: 450,
          background: 'radial-gradient(circle, rgba(236,72,153,0.3) 0%, rgba(236,72,153,0) 70%)',
          filter: 'blur(70px)',
          top: 100,
          right: -200,
        }}
        animate={{ x: [0, -60, 30, 0], y: [0, 80, -40, 0], scale: [1, 0.9, 1.15, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Cyan orb */}
      <motion.div
        style={{
          position: 'absolute',
          borderRadius: '50%',
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(6,182,212,0.25) 0%, rgba(6,182,212,0) 70%)',
          filter: 'blur(55px)',
          bottom: 100,
          left: -100,
        }}
        animate={{ x: [0, 50, -30, 0], y: [0, -40, 60, 0], scale: [1, 1.05, 0.9, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Orange orb */}
      <motion.div
        style={{
          position: 'absolute',
          borderRadius: '50%',
          width: 350,
          height: 350,
          background: 'radial-gradient(circle, rgba(249,115,22,0.2) 0%, rgba(249,115,22,0) 70%)',
          filter: 'blur(50px)',
          bottom: -50,
          right: -50,
        }}
        animate={{ x: [0, -40, 20, 0], y: [0, 30, -50, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
