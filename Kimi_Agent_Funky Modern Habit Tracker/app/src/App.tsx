import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider, useApp } from '@/context/AppContext';
import { BottomNav } from '@/components/BottomNav';
import { Dashboard } from '@/pages/Dashboard';
import { Insights } from '@/pages/Insights';

function AppContent() {
  const { currentPage } = useApp();

  return (
    <div
      className="min-h-screen w-full flex justify-center"
      style={{ background: '#020408' }}
    >
      <div
        className="w-full max-w-[430px] min-h-screen relative overflow-hidden"
        style={{ background: '#060b14' }}
      >
        <AnimatePresence mode="wait">
          {currentPage === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.5, y: 15 }}
              transition={{ duration: 0.25 }}
            >
              <Dashboard />
            </motion.div>
          )}
          {currentPage === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0.5, y: 15 }}
              transition={{ duration: 0.3 }}
            >
              <Insights />
            </motion.div>
          )}
        </AnimatePresence>
        <BottomNav />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
