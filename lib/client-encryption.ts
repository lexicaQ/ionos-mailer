/**
 * Client-side encryption utilities using Web Crypto API.
 * Used to encrypt draft content and attachments before storing in IndexedDB.
 * 
 * SECURITY: Keys are stored in IndexedDB as non-extractable CryptoKeys.
 * This prevents XSS attacks from exfiltrating the key material.
 */

const IDB_NAME = 'ionos-mailer-secure';
const IDB_STORE = 'keys';
const IDB_KEY_ID = 'master-key';
const LEGACY_LS_KEY = 'ionos-mailer-mk';
const IDB_VERSION = 1;

/**
 * Opens or creates the secure IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error("IndexedDB not available"));
            return;
        }

        const request = indexedDB.open(IDB_NAME, IDB_VERSION);

        request.onerror = () => reject(new Error("Failed to open secure storage"));

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
                db.createObjectStore(IDB_STORE, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };
    });
}

/**
 * Retrieves a CryptoKey from IndexedDB by ID
 */
function getKeyFromIDB(db: IDBDatabase): Promise<CryptoKey | null> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([IDB_STORE], 'readonly');
        const store = transaction.objectStore(IDB_STORE);
        const request = store.get(IDB_KEY_ID);

        request.onerror = () => reject(new Error("Failed to read key"));
        request.onsuccess = () => {
            const result = request.result;
            resolve(result ? result.key : null);
        };
    });
}

/**
 * Stores a CryptoKey in IndexedDB
 */
function storeKeyInIDB(db: IDBDatabase, key: CryptoKey): Promise<void> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([IDB_STORE], 'readwrite');
        const store = transaction.objectStore(IDB_STORE);
        const request = store.put({ id: IDB_KEY_ID, key });

        request.onerror = () => reject(new Error("Failed to store key"));
        request.onsuccess = () => resolve();
    });
}

/**
 * Imports a legacy JWK key and returns a non-extractable CryptoKey
 */
async function importLegacyKey(jwk: JsonWebKey): Promise<CryptoKey> {
    // Import as extractable first (from legacy), then we'll store non-extractable
    // Note: The imported key becomes our working key
    return window.crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "AES-GCM", length: 256 },
        false, // Make it non-extractable when we store it
        ["encrypt", "decrypt"]
    );
}

/**
 * Gets or creates the master encryption key.
 * 
 * Priority:
 * 1. Existing key in IndexedDB (non-extractable, secure)
 * 2. Migrate from localStorage (legacy, one-time migration)
 * 3. Generate new non-extractable key
 * 
 * After migration, localStorage key is deleted for security.
 */
async function getMasterKey(): Promise<CryptoKey> {
    if (typeof window === 'undefined') {
        throw new Error("Client-side encryption only works in browser");
    }

    const db = await openDatabase();

    // Check for existing key in IndexedDB
    let key = await getKeyFromIDB(db);
    if (key) {
        return key;
    }

    // Migration: check localStorage for legacy key
    const legacyJwkStr = localStorage.getItem(LEGACY_LS_KEY);
    if (legacyJwkStr) {
        try {
            const jwk = JSON.parse(legacyJwkStr);
            // Import as non-extractable
            key = await importLegacyKey(jwk);
            await storeKeyInIDB(db, key);
            // Remove from localStorage for security
            localStorage.removeItem(LEGACY_LS_KEY);
            console.info("Migrated encryption key to secure storage");
            return key;
        } catch (e) {
            console.error("Failed to migrate legacy key, generating new one");
            localStorage.removeItem(LEGACY_LS_KEY);
        }
    }

    // Generate new non-extractable key
    key = await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        false, // NON-EXTRACTABLE - cannot be exported, XSS cannot steal it
        ["encrypt", "decrypt"]
    );

    await storeKeyInIDB(db, key);
    return key;
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
            iv: iv as BufferSource
        },
        key,
        encoded as BufferSource
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
                iv: iv as BufferSource
            },
            key,
            data as BufferSource
        );

        const decoded = new TextDecoder().decode(decrypted);
        return JSON.parse(decoded);
    } catch (e) {
        console.error("DECRYPT_ERR_CLIENT");
        throw new Error("Failed to decrypt data");
    }
}
