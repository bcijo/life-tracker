import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const THEMES = [
    {
        id: 'light',
        label: 'Light',
        icon: '☀️',
        preview: '#ffecd2',
        previewAccent: '#667eea',
        statusBarColor: '#667eea',
    },
    {
        id: 'dark',
        label: 'Dark',
        icon: '🌙',
        preview: '#1a1a2e',
        previewAccent: '#7c3aed',
        statusBarColor: '#1a1a2e',
    },
    {
        id: 'ocean',
        label: 'Midnight Ocean',
        icon: '🌊',
        preview: '#0a192f',
        previewAccent: '#64ffda',
        statusBarColor: '#0a192f',
    },
];

const ThemeContext = createContext({});

export const ThemeProvider = ({ children }) => {
    const [theme, setThemeState] = useState(() => {
        // Read from localStorage synchronously before first paint
        try {
            return localStorage.getItem('lifetracker-theme') || 'light';
        } catch {
            return 'light';
        }
    });

    // Apply theme class to <html> immediately on mount and on every change
    useEffect(() => {
        const root = document.documentElement;

        // Remove all theme classes first
        THEMES.forEach(t => root.classList.remove(`theme-${t.id}`));

        // Apply new theme class
        root.classList.add(`theme-${theme}`);

        // Update PWA status bar color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        const currentTheme = THEMES.find(t => t.id === theme);
        if (metaThemeColor && currentTheme) {
            metaThemeColor.setAttribute('content', currentTheme.statusBarColor);
        }
    }, [theme]);

    const setTheme = async (newTheme) => {
        setThemeState(newTheme);

        // Persist to localStorage
        try {
            localStorage.setItem('lifetracker-theme', newTheme);
        } catch (e) {
            console.warn('Could not save theme to localStorage:', e);
        }

        // Optionally sync to Supabase profile (non-blocking)
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from('profiles')
                    .update({ theme_preference: newTheme })
                    .eq('id', user.id);
            }
        } catch {
            // Silently ignore — localStorage is the source of truth
        }
    };

    // On mount, try to sync from Supabase profile (in case of cross-device)
    useEffect(() => {
        const syncFromProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data } = await supabase
                    .from('profiles')
                    .select('theme_preference')
                    .eq('id', user.id)
                    .single();

                if (data?.theme_preference && THEMES.find(t => t.id === data.theme_preference)) {
                    const saved = localStorage.getItem('lifetracker-theme');
                    // Only override if no local preference set
                    if (!saved) {
                        setTheme(data.theme_preference);
                    }
                }
            } catch {
                // Silently ignore — column may not exist yet
            }
        };

        syncFromProfile();
    }, []);

    const currentTheme = THEMES.find(t => t.id === theme) || THEMES[0];

    return (
        <ThemeContext.Provider value={{ theme, setTheme, THEMES, currentTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
    return ctx;
};

export default ThemeContext;
