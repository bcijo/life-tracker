import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UpdateContext = createContext(null);

// Embedded build ID from vite.config.js define
const CLIENT_BUILD_ID = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev';
const CHECK_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

export const UpdateProvider = ({ children }) => {
  const [versionMismatch, setVersionMismatch] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastChecked, setLastChecked] = useState(Date.now());
  const swRegistrationRef = useRef(null);

  // Setup vite-plugin-pwa register hook in prompt mode
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    immediate: !import.meta.env.DEV,
    onRegisteredSW(swUrl, r) {
      if (r && !import.meta.env.DEV) {
        swRegistrationRef.current = r;
      }
    },
    onRegisterError(error) {
      if (!import.meta.env.DEV) {
        console.warn('Service Worker registration error:', error);
      }
    }
  });

  // Check version.json for deployment build ID differences
  const checkVersionJson = useCallback(async () => {
    // Never trigger in local development mode
    if (import.meta.env.DEV || !CLIENT_BUILD_ID || CLIENT_BUILD_ID === 'dev') {
      return false;
    }

    try {
      const res = await fetch(`/version.json?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!res.ok) return false;

      const data = await res.json();
      setLastChecked(Date.now());

      // Only trigger if server has a valid buildId different from client's embedded buildId
      if (data && data.buildId && data.buildId !== 'dev' && data.buildId !== CLIENT_BUILD_ID) {
        setVersionMismatch(true);
        return true;
      }
    } catch (err) {
      // Ignore offline or fetch errors
    }
    return false;
  }, []);

  // Check for updates both via Service Worker and version.json
  const checkForUpdates = useCallback(async () => {
    if (import.meta.env.DEV) {
      return false;
    }

    setLastChecked(Date.now());
    let found = false;

    // 1. Service Worker update check
    if (swRegistrationRef.current) {
      try {
        await swRegistrationRef.current.update();
      } catch (e) {
        // ignore SW update error
      }
    }

    // 2. Direct version.json check
    const hasNewVersion = await checkVersionJson();
    if (hasNewVersion || needRefresh) {
      found = true;
    }

    return found;
  }, [checkVersionJson, needRefresh]);

  // Periodic and event-driven update checking (no aggressive 5s loop)
  useEffect(() => {
    if (import.meta.env.DEV) {
      return;
    }

    // Periodic interval (every 3 minutes)
    const intervalTimer = setInterval(() => {
      checkForUpdates();
    }, CHECK_INTERVAL_MS);

    // Tab visibility change (e.g. user returns to the app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };

    // Window focus
    const handleFocus = () => {
      checkForUpdates();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkForUpdates]);

  // Apply update: clear caches and activate new version
  const applyUpdate = useCallback(async () => {
    setIsUpdating(true);

    try {
      // 1. Delete all browser caches
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }

      // 2. If PWA service worker is waiting, activate it
      if (needRefresh && updateServiceWorker) {
        await updateServiceWorker(true);
        return;
      }
    } catch (err) {
      console.error('Error while applying software update:', err);
    }

    // 3. Force hard reload bypassing cache
    setTimeout(() => {
      window.location.href = window.location.origin + window.location.pathname + '?_v=' + Date.now();
    }, 200);
  }, [needRefresh, updateServiceWorker]);

  // In development, update is never enforced
  const isUpdateAvailable = import.meta.env.DEV ? false : Boolean(needRefresh || versionMismatch);

  return (
    <UpdateContext.Provider
      value={{
        isUpdateAvailable,
        isUpdating,
        needRefresh,
        versionMismatch,
        applyUpdate,
        checkForUpdates,
        lastChecked
      }}
    >
      {children}
    </UpdateContext.Provider>
  );
};

export const useAppUpdate = () => {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error('useAppUpdate must be used within an UpdateProvider');
  }
  return context;
};

export default UpdateContext;
