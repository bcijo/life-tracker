import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UpdateContext = createContext(null);

// Embedded build time from vite.config.js define
const CLIENT_BUILD_TIME = typeof __APP_BUILD_TIME__ !== 'undefined' ? Number(__APP_BUILD_TIME__) : 0;
const CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

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
    onRegisteredSW(swUrl, r) {
      if (r) {
        swRegistrationRef.current = r;
        // Check for updates periodically
        setInterval(() => {
          r.update().catch(() => {});
        }, CHECK_INTERVAL_MS);
      }
    },
    onRegisterError(error) {
      console.warn('Service Worker registration error:', error);
    }
  });

  // Check version.json for build timestamp differences
  const checkVersionJson = useCallback(async () => {
    // Only check against build time if we have a valid client build timestamp (production builds)
    if (import.meta.env.DEV || !CLIENT_BUILD_TIME) {
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

      if (data && typeof data.buildTime === 'number' && data.buildTime > CLIENT_BUILD_TIME) {
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

  // Periodic and event-driven update checking
  useEffect(() => {
    // Initial check after 5 seconds of mounting
    const initialTimer = setTimeout(() => {
      checkForUpdates();
    }, 5000);

    // Periodic interval
    const intervalTimer = setInterval(() => {
      checkForUpdates();
    }, CHECK_INTERVAL_MS);

    // Tab visibility change (e.g. user switches back to tab or unlocks phone)
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
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkForUpdates]);

  // Apply update: clear caches, activate worker, and hard reload
  const applyUpdate = useCallback(async () => {
    setIsUpdating(true);

    try {
      // 1. Delete all browser caches
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }

      // 2. Tell service worker to skip waiting
      if (updateServiceWorker) {
        await updateServiceWorker(true);
      }

      // 3. Unregister existing service workers to ensure fresh start
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }
    } catch (err) {
      console.error('Error while applying software update:', err);
    } finally {
      // 4. Force hard reload bypassing cache
      setTimeout(() => {
        window.location.href = window.location.origin + window.location.pathname + '?_v=' + Date.now();
      }, 300);
    }
  }, [updateServiceWorker]);

  const isUpdateAvailable = Boolean(needRefresh || versionMismatch);

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
