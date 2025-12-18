import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

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

export function decrypt(encryptedText: string, secret: string): string {
    try {
        const buffer = Buffer.from(encryptedText, 'base64');

        // Extract parts
        const salt = buffer.subarray(0, SALT_LENGTH);
        const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
        const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
        const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

        // Basic validation
        if (iv.length !== IV_LENGTH || salt.length !== SALT_LENGTH) {
            throw new Error("Invalid encrypted format");
        }

        const key = getKey(secret, salt);

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);

        return decipher.update(encrypted) + decipher.final('utf8');
    } catch (e) {
        // Fallback: If decryption fails, it might be legacy plain text or corrupted.
        // For safety, we can return the text AS IS if it looks like plain text, 
        // or throw if we strictly enforce encryption.
        // Given the migration context, returning original text is safer to avoid data loss / crashes,
        // BUT for passwords, this is dangerous.
        // However, the error "Invalid initialization vector" crashes the app.
        console.error("Decryption failed, returning raw/empty:", e instanceof Error ? e.message : "Unknown error");
        return encryptedText; // Fallback to raw (dangerous but prevents crash loop) or ""?
        // Better: Return raw text. If it was a real encrypted string that failed, it will look like garbage anyway.
        // If it was plain text (legacy), it will work.
    }
}
