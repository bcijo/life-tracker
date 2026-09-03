import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import useAuth from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import {
    generateVaultKey,
    exportKeyToBase64,
    importKeyFromBase64,
    encryptText,
    decryptText,
    encryptVaultKeyWithPin,
    decryptVaultKeyWithPin
} from '../lib/crypto';

export const EncryptionContext = createContext({
    vaultKey: null,
    isEncryptionReady: false,
    needsPin: false,
    hasPinSet: false,
    encrypt: async (text) => text,
    decrypt: async (text) => text,
    setupPin: async () => ({ success: false }),
    unlockWithPin: async () => ({ success: false }),
    exportRecoveryKey: async () => null,
    importRecoveryKey: async () => ({ success: false }),
});

export const EncryptionProvider = ({ children }) => {
    const { user } = useAuth();
    const [vaultKey, setVaultKey] = useState(null);
    const [isEncryptionReady, setIsEncryptionReady] = useState(false);
    const [needsPin, setNeedsPin] = useState(false);
    const [hasPinSet, setHasPinSet] = useState(false);
    const [remoteBundle, setRemoteBundle] = useState(null);

    // Initialize or load vault key whenever user changes
    useEffect(() => {
        let isMounted = true;

        const initVault = async () => {
            if (!user) {
                setVaultKey(null);
                setIsEncryptionReady(false);
                setNeedsPin(false);
                setHasPinSet(false);
                return;
            }

            try {
                const localKeyB64 = localStorage.getItem(`vault_key_${user.id}`);

                // Check profile for any existing remote encrypted bundle
                let bundle = null;
                try {
                    const { data } = await supabase
                        .from('profiles')
                        .select('encrypted_vault_bundle')
                        .eq('id', user.id)
                        .maybeSingle();

                    if (data?.encrypted_vault_bundle) {
                        bundle = data.encrypted_vault_bundle;
                    }
                } catch (e) {
                    console.warn('[Encryption] Could not read remote vault bundle:', e);
                }

                if (!bundle) {
                    try {
                        const localBundleStr = localStorage.getItem(`vault_bundle_${user.id}`);
                        if (localBundleStr) bundle = JSON.parse(localBundleStr);
                    } catch {}
                }

                if (isMounted) {
                    setRemoteBundle(bundle);
                    setHasPinSet(Boolean(bundle));
                }

                if (localKeyB64) {
                    // Local key exists: import and activate
                    const importedKey = await importKeyFromBase64(localKeyB64);
                    if (isMounted) {
                        setVaultKey(importedKey);
                        setIsEncryptionReady(true);
                        setNeedsPin(false);
                    }
                } else if (bundle) {
                    // Remote encrypted bundle exists but not locally unlocked
                    if (isMounted) {
                        setVaultKey(null);
                        setIsEncryptionReady(false);
                        setNeedsPin(true);
                    }
                } else {
                    // Brand new user / device without existing key:
                    // Auto-generate fresh vault key for frictionless zero-knowledge protection!
                    const newKey = await generateVaultKey();
                    const exportedB64 = await exportKeyToBase64(newKey);
                    localStorage.setItem(`vault_key_${user.id}`, exportedB64);

                    if (isMounted) {
                        setVaultKey(newKey);
                        setIsEncryptionReady(true);
                        setNeedsPin(false);
                    }
                }
            } catch (err) {
                console.error('[Encryption] Initialization error:', err);
            }
        };

        initVault();

        return () => {
            isMounted = false;
        };
    }, [user]);

    // Encrypt helper
    const encrypt = useCallback(async (text) => {
        if (!vaultKey || !text) return text;
        return await encryptText(text, vaultKey);
    }, [vaultKey]);

    // Decrypt helper
    const decrypt = useCallback(async (text) => {
        if (!text) return text;
        if (!vaultKey) return text;
        return await decryptText(text, vaultKey);
    }, [vaultKey]);

    // Set or update user's Security PIN for cross-device synchronization
    const setupPin = useCallback(async (pin) => {
        if (!vaultKey || !user) {
            return { success: false, error: 'Vault is not currently unlocked on this device.' };
        }
        if (!pin || pin.length < 4) {
            return { success: false, error: 'PIN must be at least 4 digits.' };
        }

        try {
            const bundle = await encryptVaultKeyWithPin(vaultKey, pin);

            // Save to localStorage
            localStorage.setItem(`vault_bundle_${user.id}`, JSON.stringify(bundle));

            // Save to Supabase profiles table
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ encrypted_vault_bundle: bundle })
                .eq('id', user.id);

            if (profileError) {
                console.warn('[Encryption] Note: Could not save bundle to profiles (column might need migration):', profileError.message);
            }

            setRemoteBundle(bundle);
            setHasPinSet(true);
            return { success: true };
        } catch (err) {
            console.error('[Encryption] Error setting PIN:', err);
            return { success: false, error: err.message };
        }
    }, [vaultKey, user]);

    // Unlock vault using Security PIN on a new device
    const unlockWithPin = useCallback(async (pin) => {
        if (!user) return { success: false, error: 'Not authenticated' };

        let bundle = remoteBundle;
        if (!bundle) {
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('encrypted_vault_bundle')
                    .eq('id', user.id)
                    .maybeSingle();
                if (data?.encrypted_vault_bundle) {
                    bundle = data.encrypted_vault_bundle;
                }
            } catch {}
        }

        if (!bundle) {
            return { success: false, error: 'No encrypted vault found for this account.' };
        }

        try {
            const unlockedKey = await decryptVaultKeyWithPin(bundle, pin);
            const b64 = await exportKeyToBase64(unlockedKey);

            localStorage.setItem(`vault_key_${user.id}`, b64);
            setVaultKey(unlockedKey);
            setIsEncryptionReady(true);
            setNeedsPin(false);

            return { success: true };
        } catch (err) {
            console.warn('[Encryption] Failed PIN unlock:', err);
            return { success: false, error: 'Incorrect PIN. Please verify and try again.' };
        }
    }, [user, remoteBundle]);

    // Export raw key as recovery string
    const exportRecoveryKey = useCallback(async () => {
        if (!vaultKey) return null;
        return await exportKeyToBase64(vaultKey);
    }, [vaultKey]);

    // Import a recovery string
    const importRecoveryKey = useCallback(async (base64Key) => {
        if (!user || !base64Key) return { success: false, error: 'Invalid key' };
        try {
            const importedKey = await importKeyFromBase64(base64Key.trim());
            localStorage.setItem(`vault_key_${user.id}`, base64Key.trim());
            setVaultKey(importedKey);
            setIsEncryptionReady(true);
            setNeedsPin(false);
            return { success: true };
        } catch (err) {
            return { success: false, error: 'Invalid recovery key format.' };
        }
    }, [user]);

    const value = {
        vaultKey,
        isEncryptionReady,
        needsPin,
        hasPinSet,
        encrypt,
        decrypt,
        setupPin,
        unlockWithPin,
        exportRecoveryKey,
        importRecoveryKey,
    };

    return (
        <EncryptionContext.Provider value={value}>
            {children}
        </EncryptionContext.Provider>
    );
};

export const useEncryption = () => {
    const context = useContext(EncryptionContext);
    if (!context) {
        throw new Error('useEncryption must be used within an EncryptionProvider');
    }
    return context;
};

export default EncryptionContext;
