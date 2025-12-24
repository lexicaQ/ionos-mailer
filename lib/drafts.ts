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

    // Load from Local DB ONLY
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
 * Sync drafts from cloud to local DB
 * IMPORTANT: This also DELETES local drafts that no longer exist in cloud
 */
export async function syncDrafts(): Promise<void> {
    console.log('[syncDrafts] Starting sync...');
    try {
        const res = await fetch('/api/sync/drafts', {
            cache: 'no-store', // Force fresh data
            headers: { 'Cache-Control': 'no-cache' }
        });
        if (res.ok) {
            const { drafts: cloudDrafts } = await res.json();
            console.log(`[syncDrafts] Got ${cloudDrafts?.length || 0} drafts from cloud`);

            if (Array.isArray(cloudDrafts)) {
                // Get all local drafts
                const localDrafts = await getAllDraftsDB();
                console.log(`[syncDrafts] Got ${localDrafts.length} local drafts`);

                const cloudIds = new Set(cloudDrafts.map((d: any) => d.id));
                console.log(`[syncDrafts] Cloud IDs:`, Array.from(cloudIds));
                console.log(`[syncDrafts] Local IDs:`, localDrafts.map(d => d.id));

                // DELETE local drafts that don't exist in cloud anymore
                let deletedCount = 0;
                for (const local of localDrafts) {
                    if (!cloudIds.has(local.id)) {
                        console.log(`[syncDrafts] ⚠️ Deleting local draft "${local.name}" (${local.id}) - not in cloud`);
                        await deleteDraftDB(local.id);
                        deletedCount++;
                    }
                }
                console.log(`[syncDrafts] Deleted ${deletedCount} orphaned local drafts`);

                // UPSERT cloud drafts to local
                let upsertedCount = 0;
                for (const d of cloudDrafts) {
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
                    upsertedCount++;
                }
                console.log(`[syncDrafts] Upserted ${upsertedCount} cloud drafts to local`);
            }
        } else {
            console.error('[syncDrafts] API returned error:', res.status, res.statusText);
        }
    } catch (e) {
        console.error("[syncDrafts] Cloud sync failed:", e);
    }
    console.log('[syncDrafts] Sync complete');
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
 * Throws error if cloud delete fails to ensure UI is aware
 */
export async function deleteDraft(id: string): Promise<void> {
    // Delete locally FIRST (optimistic)
    await deleteDraftDB(id);

    // Then sync to cloud
    try {
        const res = await fetch('/api/sync/drafts', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Unknown error' }));
            // Throw error to let caller know cloud sync failed
            throw new Error(`Cloud delete failed: ${error.error || res.statusText}`);
        }
    } catch (e) {
        // Re-throw to propagate to UI
        console.error("Cloud delete failed:", e);
        throw e;
    }
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
