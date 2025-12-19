import { Attachment } from './schemas';
import { saveDraftDB, getAllDraftsDB, deleteDraftDB, getDraftDB, clearAllDraftsDB } from './db';
import { encryptData, decryptData } from '@/lib/client-encryption';

const DRAFTS_STORAGE_KEY = 'ionos-mailer-drafts';

export interface EmailDraft {
    id: string;
    name: string;
    recipients: { email: string; id?: string }[];
    subject: string;
    body: string;
    attachments: Attachment[];
    createdAt: string;
    updatedAt: string;
    encryptedData?: { iv: string, data: string }; // Optional storage for encrypted content
}

/**
 * Generate unique ID for drafts
 */
function generateId(): string {
    return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Migrate legacy localStorage drafts to IndexedDB
 */
export async function migrateFromLocalStorage(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
        const stored = localStorage.getItem(DRAFTS_STORAGE_KEY);
        if (stored) {
            const legacyDrafts: EmailDraft[] = JSON.parse(stored);
            // console.log(`[Drafts] Migrating ${legacyDrafts.length} drafts from localStorage to IDB...`);

            for (const draft of legacyDrafts) {
                // Ensure IDs match or are assigned
                if (!draft.id) draft.id = generateId();
                await saveDraftDB(draft);
            }

            // Clear legacy storage after successful migration
            localStorage.removeItem(DRAFTS_STORAGE_KEY);
            // console.log('[Drafts] Migration complete.');
        }
    } catch (e) {
        console.error("Migration failed:", e);
    }
}

/**
 * Get all saved drafts (Async)
 * Decrypts data if necessary
 */
export async function loadDrafts(): Promise<EmailDraft[]> {
    if (typeof window === 'undefined') return [];

    // Auto-migrate if needed
    if (localStorage.getItem(DRAFTS_STORAGE_KEY)) {
        await migrateFromLocalStorage();
    }

    // 1. Sync Down from Cloud (if logged in)
    try {
        const res = await fetch('/api/sync/drafts');
        if (res.ok) {
            const { drafts } = await res.json();
            if (Array.isArray(drafts)) {
                // console.log(`[Drafts] Cloud sync: found ${drafts.length} drafts`);
                for (const d of drafts) {
                    // Encrypt Cloud Data for Local Storage
                    const payload = {
                        subject: d.subject || "",
                        body: d.body || "",
                        recipients: d.recipients || [],
                        attachments: d.attachments || []
                    };
                    const encrypted = await encryptData(payload);

                    // Upsert to Local DB
                    await saveDraftDB({
                        id: d.id,
                        name: d.name,
                        createdAt: d.createdAt,
                        updatedAt: d.updatedAt,
                        encryptedData: encrypted,
                        // Clear plaintext fields from DB object
                        subject: undefined,
                        body: undefined,
                        recipients: undefined,
                        attachments: undefined
                    } as any);
                }
            }
        }
    } catch (e) {
        // console.log("Cloud sync skipped (offline or not logged in)");
    }

    // 2. Load from Local DB
    const drafts = await getAllDraftsDB();
    const decryptedDrafts: EmailDraft[] = [];

    for (const draft of drafts) {
        if (draft.encryptedData) {
            try {
                const decrypted = await decryptData(draft.encryptedData);
                decryptedDrafts.push({
                    ...draft,
                    ...decrypted, // Restore subject, body, recipients, attachments
                    encryptedData: undefined // Remove encrypted blob from memory object
                });
            } catch (e) {
                console.error(`Failed to decrypt draft ${draft.id}`, e);
                decryptedDrafts.push({
                    ...draft,
                    subject: '(Decryption Failed)',
                    body: 'Failed to decrypt content.',
                    recipients: [],
                    attachments: []
                });
            }
        } else {
            // Legacy / Plain text
            decryptedDrafts.push(draft);
        }
    }

    return decryptedDrafts;
}

/**
 * Get a single draft by ID (Async)
 */
export async function loadDraft(id: string): Promise<EmailDraft | undefined> {
    const draft = await getDraftDB(id);
    if (!draft) return undefined;

    if (draft.encryptedData) {
        try {
            const decrypted = await decryptData(draft.encryptedData);
            return {
                ...draft,
                ...decrypted,
                encryptedData: undefined
            };
        } catch (e) {
            console.error(`Failed to decrypt draft ${id}`, e);
            return undefined;
        }
    }

    return draft;
}

/**
 * Save a new draft or update existing (Async)
 * Encrypts sensitive data
 */
export async function saveDraft(draft: Omit<EmailDraft, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<EmailDraft> {
    const now = new Date().toISOString();
    let baseDraft: Partial<EmailDraft>;

    if (draft.id) {
        const existing = await getDraftDB(draft.id);
        if (existing) {
            baseDraft = {
                ...existing,
                id: draft.id,
                name: draft.name,
                updatedAt: now
            };
        } else {
            baseDraft = {
                id: draft.id,
                name: draft.name,
                createdAt: now,
                updatedAt: now
            };
        }
    } else {
        baseDraft = {
            id: generateId(),
            name: draft.name,
            createdAt: now,
            updatedAt: now
        };
    }

    // Encrypt sensitive fields
    const payload = {
        subject: draft.subject,
        body: draft.body,
        recipients: draft.recipients,
        attachments: draft.attachments
    };

    const encrypted = await encryptData(payload);

    // Create final object to store
    // We intentionally OMIT the plain text fields (subject, body, etc) from the stored object
    // effectively "deleting" them from the object we pass to DB, keeping only the encrypted blob.
    const finalDraftForDB = {
        id: baseDraft.id!,
        name: baseDraft.name!,
        createdAt: baseDraft.createdAt!,
        updatedAt: baseDraft.updatedAt!,
        encryptedData: encrypted,
        // Ensure legacy fields are cleared if this was an update
        subject: undefined,
        body: undefined,
        recipients: undefined,
        attachments: undefined
    };

    await saveDraftDB(finalDraftForDB as any);

    // Sync to Cloud (Await for reliability across devices)
    const cloudPayload = {
        id: baseDraft.id,
        name: baseDraft.name,
        ...payload // Decrypted content
    };

    try {
        await fetch('/api/sync/drafts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cloudPayload)
        });
    } catch (e) {
        console.error("Cloud upload failed", e);
    }

    // Return the full decrypted version for UI usage immediately
    return {
        ...baseDraft as EmailDraft,
        ...payload
    };
}

/**
 * Delete a draft by ID (Async)
 */
export async function deleteDraft(id: string): Promise<void> {
    await deleteDraftDB(id);
    // Cloud Delete
    fetch('/api/sync/drafts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    }).catch(e => console.error("Cloud delete failed", e));
}

/**
 * Clear all drafts (Async)
 */
export async function clearAllDrafts(): Promise<void> {
    await clearAllDraftsDB();
    // Also clear localStorage just in case
    if (typeof window !== 'undefined') localStorage.removeItem(DRAFTS_STORAGE_KEY);
}

/**
 * Get draft count (Async)
 */
export async function getDraftCount(): Promise<number> {
    const drafts = await getAllDraftsDB();
    return drafts.length;
}
