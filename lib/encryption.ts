import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

// Minimum length for valid encrypted data: salt + iv + tag + at least 1 byte
const MIN_ENCRYPTED_LENGTH = SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1;

function getKey(secret: string, salt: Buffer) {
    return crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha512');
}

export function encrypt(text: string, secret: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = getKey(secret, salt);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    // Format: salt:iv:tag:encrypted
    return Buffer.concat([
        salt,
        iv,
        tag,
        encrypted
    ]).toString('base64');
}

/**
 * Checks if a string looks like it could be encrypted data.
 * Returns true if it appears to be base64-encoded with sufficient length.
 */
function looksEncrypted(text: string): boolean {
    // Check if it's valid base64 and long enough to contain our encrypted format
    if (!text || text.length < 100) return false; // Too short to be encrypted
    
    // Check if it's valid base64
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    if (!base64Regex.test(text)) return false;
    
    try {
        const buffer = Buffer.from(text, 'base64');
        // Check if decoded length is at least our minimum
        return buffer.length >= MIN_ENCRYPTED_LENGTH;
    } catch {
        return false;
    }
}

/**
 * Strict decryption - ALWAYS throws on failure.
 * Use this for secrets like SMTP passwords where returning garbage is dangerous.
 */
export function decryptStrict(encryptedText: string, secret: string): string {
    try {
        const buffer = Buffer.from(encryptedText, 'base64');

        // Extract parts
        const salt = buffer.subarray(0, SALT_LENGTH);
        const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
        const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
        const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

        // Strict validation
        if (iv.length !== IV_LENGTH || salt.length !== SALT_LENGTH) {
            throw new Error("Invalid encrypted format");
        }

        if (buffer.length < MIN_ENCRYPTED_LENGTH) {
            throw new Error("Data too short to be encrypted");
        }

        const key = getKey(secret, salt);

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);

        return decipher.update(encrypted) + decipher.final('utf8');
    } catch (e) {
        // Log minimal error code only - no details that could help attackers
        console.error("DECRYPT_ERR_001");
        throw new Error("Decryption failed");
    }
}

/**
 * Legacy-tolerant decryption - returns raw text ONLY if it doesn't look encrypted.
 * Use this for migrating data that may contain plain text from before encryption was added.
 * 
 * Behavior:
 * - If text doesn't look encrypted (short, non-base64) → returns as-is (legacy plain text)
 * - If text looks encrypted but fails to decrypt → THROWS (corruption or wrong key)
 */
export function decryptMaybeLegacy(encryptedText: string, secret: string): string {
    // If it doesn't look like encrypted data, assume it's legacy plain text
    if (!looksEncrypted(encryptedText)) {
        return encryptedText;
    }
    
    // It looks encrypted, so we must successfully decrypt it or fail
    return decryptStrict(encryptedText, secret);
}

/**
 * @deprecated Use decryptStrict() for secrets or decryptMaybeLegacy() for migration scenarios.
 * This function is kept for backward compatibility but will be removed.
 */
export function decrypt(encryptedText: string, secret: string): string {
    // Redirect to legacy-tolerant version for backward compatibility
    // But log a warning so we can track usage
    if (process.env.NODE_ENV === 'development') {
        console.warn("DEPRECATED: decrypt() called - use decryptStrict() or decryptMaybeLegacy()");
    }
    return decryptMaybeLegacy(encryptedText, secret);
}
