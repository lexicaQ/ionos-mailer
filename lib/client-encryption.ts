/**
 * Client-side encryption utilities using Web Crypto API.
 * Used to encrypt draft content and attachments before storing in IndexedDB.
 */

const KEY_STORAGE_NAME = 'ionos-mailer-mk';

// Get or create the master key (stored in localStorage for persistence across reloads)
async function getMasterKey(): Promise<CryptoKey> {
    if (typeof window === 'undefined') {
        throw new Error("Client-side encryption only works in browser");
    }

    let jwkStr = localStorage.getItem(KEY_STORAGE_NAME);

    if (!jwkStr) {
        // Generate new key
        const key = await window.crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256
            },
            true,
            ["encrypt", "decrypt"]
        );

        // Export to JWK to store
        const jwk = await window.crypto.subtle.exportKey("jwk", key);
        localStorage.setItem(KEY_STORAGE_NAME, JSON.stringify(jwk));
        return key;
    }

    // Import existing key
    const jwk = JSON.parse(jwkStr);
    return window.crypto.subtle.importKey(
        "jwk",
        jwk,
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );
}

/**
 * Helper to convert ArrayBuffer or Uint8Array to Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

/**
 * Helper to convert Base64 to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
}

/**
 * Encrypts a string (JSON stringified object or plain text)
 * Returns object with { iv, data }
 */
export async function encryptData(data: any): Promise<{ iv: string, data: string }> {
    const key = await getMasterKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(data));

    const encrypted = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        encoded
    );

    return {
        iv: arrayBufferToBase64(iv),
        data: arrayBufferToBase64(encrypted)
    };
}

/**
 * Decrypts data
 */
export async function decryptData(encryptedData: { iv: string, data: string }): Promise<any> {
    try {
        const key = await getMasterKey();
        const iv = base64ToUint8Array(encryptedData.iv);
        const data = base64ToUint8Array(encryptedData.data);

        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            data
        );

        const decoded = new TextDecoder().decode(decrypted);
        return JSON.parse(decoded);
    } catch (e) {
        console.error("Decryption failed:", e);
        throw new Error("Failed to decrypt data");
    }
}
