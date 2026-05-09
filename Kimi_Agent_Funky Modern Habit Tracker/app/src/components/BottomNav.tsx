import { motion } from 'framer-motion';
import { BarChart3, Home, Settings } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export function BottomNav() {
  const { currentPage, setCurrentPage } = useApp();

  const navItems = [
    { page: 'insights' as const, icon: BarChart3, label: 'Insights' },
    { page: 'dashboard' as const, icon: Home, label: 'Home' },
    { page: 'settings' as const, icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6 pt-2">
      <motion.div
        className="flex items-center gap-1 px-2 py-2 rounded-full"
        style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.5 }}
      >
        {navItems.map((item) => {
          const isActive = currentPage === item.page;
          const isDisabled = item.page === 'settings';
          return (
            <motion.button
              key={item.page}
              className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-colors ${
                isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
              }`}
              onClick={() => !isDisabled && setCurrentPage(item.page)}
              whileTap={!isDisabled ? { scale: 0.88 } : undefined}
            >
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  layoutId="activeNav"
                  style={{
                    background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.5}
                color={isActive ? '#ffffff' : 'rgba(255,255,255,0.4)'}
                className="relative z-10"
              />
            </motion.button>
          );
        })}
      </motion.div>
    </nav>
  );
}
