// @ts-ignore
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { EmailDraft } from './drafts';

// --- DB Schema ---
interface IonosMailerDB extends DBSchema {
    drafts: {
        key: string; // Draft ID
        value: EmailDraft;
        indexes: { 'by-updated': string };
    };
}

const DB_NAME = 'ionos-mailer-db';
const DB_VERSION = 1;

// --- DB Singleton ---
let dbPromise: Promise<IDBPDatabase<IonosMailerDB>>;

export const getDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<IonosMailerDB>(DB_NAME, DB_VERSION, {
            upgrade(db: IDBPDatabase<IonosMailerDB>) {
                // Create Drafts store if not exists
                if (!db.objectStoreNames.contains('drafts')) {
                    const store = db.createObjectStore('drafts', { keyPath: 'id' });
                    store.createIndex('by-updated', 'updatedAt');
                }
            },
        });
    }
    return dbPromise;
};

// --- Repository Functions ---

export async function saveDraftDB(draft: EmailDraft): Promise<string> {
    const db = await getDB();
    await db.put('drafts', draft);
    return draft.id;
}

export async function getAllDraftsDB(): Promise<EmailDraft[]> {
    const db = await getDB();
    // Sort by updated descending (manual sort after fetch or using index cursor)
    // Using index is faster for large datasets
    const drafts = await db.getAllFromIndex('drafts', 'by-updated');
    return drafts.reverse(); // Newest first
}

export async function getDraftDB(id: string): Promise<EmailDraft | undefined> {
    const db = await getDB();
    return db.get('drafts', id);
}

export async function deleteDraftDB(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('drafts', id);
}

export async function clearAllDraftsDB(): Promise<void> {
    const db = await getDB();
    await db.clear('drafts');
}
