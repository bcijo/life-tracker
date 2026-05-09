import { motion } from 'framer-motion';

export function AmbientBlob() {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        width: 600,
        height: 600,
        borderRadius: '50%',
        backgroundColor: '#eff8f0',
        filter: 'blur(80px)',
        opacity: 0.6,
        top: -100,
        left: -100,
        zIndex: 0,
      }}
      animate={{
        x: [0, 50, -50, 0],
        y: [0, -50, 50, 0],
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}
