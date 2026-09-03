/**
 * Client-Side Zero-Knowledge Encryption Engine
 * Powered by native browser Web Crypto API (SubtleCrypto)
 * Standard: AES-GCM-256 with random 96-bit IV and PBKDF2-SHA256 key derivation.
 */

// Helper: Uint8Array to Base64
export function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// Helper: Base64 to Uint8Array
export function base64ToBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

// Helper: Random hex string (e.g. for salt)
export function generateSaltHex(byteLength = 16) {
    const bytes = window.crypto.getRandomValues(new Uint8Array(byteLength));
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper: Hex string to Uint8Array
export function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

/**
 * Checks if a string is encrypted with our scheme
 */
export function isEncrypted(value) {
    return typeof value === 'string' && value.startsWith('enc:v1:');
}

/**
 * Generate a cryptographically random 256-bit AES-GCM Vault Key
 */
export async function generateVaultKey() {
    return await window.crypto.subtle.generateKey(
        {
            name: 'AES-GCM',
            length: 256,
        },
        true, // extractable
        ['encrypt', 'decrypt']
    );
}

/**
 * Export a CryptoKey to a portable Base64 string
 */
export async function exportKeyToBase64(cryptoKey) {
    const raw = await window.crypto.subtle.exportKey('raw', cryptoKey);
    return bufferToBase64(raw);
}

/**
 * Import a Base64 string into a CryptoKey
 */
export async function importKeyFromBase64(base64Key) {
    const raw = base64ToBuffer(base64Key);
    return await window.crypto.subtle.importKey(
        'raw',
        raw,
        { name: 'AES-GCM' },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * Derive an AES-GCM encryption key from a user PIN/Passphrase using PBKDF2
 */
export async function deriveKeyFromPin(pin, saltHex) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(pin),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    const salt = hexToBytes(saltHex);

    return await window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt arbitrary plaintext with an AES-GCM CryptoKey.
 * Returns format: "enc:v1:<iv_base64>:<ciphertext_base64>"
 */
export async function encryptText(plainText, cryptoKey) {
    if (plainText === null || plainText === undefined || typeof plainText !== 'string') {
        return plainText;
    }
    if (!cryptoKey) {
        return plainText;
    }

    try {
        const enc = new TextEncoder();
        const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

        const ciphertextBuffer = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv,
            },
            cryptoKey,
            enc.encode(plainText)
        );

        const ivB64 = bufferToBase64(iv);
        const dataB64 = bufferToBase64(ciphertextBuffer);

        return `enc:v1:${ivB64}:${dataB64}`;
    } catch (err) {
        console.error('[Crypto] Encryption error:', err);
        return plainText; // Fail-safe fallback so user data is not destroyed
    }
}

/**
 * Decrypt an "enc:v1:..." string with an AES-GCM CryptoKey.
 * If not encrypted or if decryption fails, gracefully returns the original input.
 */
export async function decryptText(encryptedText, cryptoKey) {
    if (!isEncrypted(encryptedText)) {
        return encryptedText; // Legacy plaintext or non-string
    }
    if (!cryptoKey) {
        return encryptedText;
    }

    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 4 || parts[0] !== 'enc' || parts[1] !== 'v1') {
            return encryptedText;
        }

        const iv = base64ToBuffer(parts[2]);
        const ciphertext = base64ToBuffer(parts[3]);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv,
            },
            cryptoKey,
            ciphertext
        );

        return new TextDecoder().decode(decryptedBuffer);
    } catch (err) {
        console.warn('[Crypto] Decryption failed (invalid key or altered data):', err);
        return encryptedText;
    }
}

/**
 * Encrypt the raw Vault Key with a user's Security PIN so it can be safely stored in profiles
 */
export async function encryptVaultKeyWithPin(vaultKey, pin, saltHex = null) {
    const salt = saltHex || generateSaltHex(16);
    const pinKey = await deriveKeyFromPin(pin, salt);
    const rawKeyB64 = await exportKeyToBase64(vaultKey);

    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedRawKeyBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        pinKey,
        enc.encode(rawKeyB64)
    );

    return {
        salt,
        iv: bufferToBase64(iv),
        encryptedKey: bufferToBase64(encryptedRawKeyBuffer)
    };
}

/**
 * Decrypt the raw Vault Key using a user's Security PIN
 */
export async function decryptVaultKeyWithPin(encryptedBundle, pin) {
    const { salt, iv, encryptedKey } = encryptedBundle;
    const pinKey = await deriveKeyFromPin(pin, salt);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64ToBuffer(iv) },
        pinKey,
        base64ToBuffer(encryptedKey)
    );

    const rawKeyB64 = new TextDecoder().decode(decryptedBuffer);
    return await importKeyFromBase64(rawKeyB64);
}
