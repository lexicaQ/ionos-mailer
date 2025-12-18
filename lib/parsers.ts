/**
 * File Parsing Utilities for Email Extraction
 * Handles PDF, DOCX, XLSX, CSV, JSON, and Image (OCR) parsing
 * Privacy-first: All parsing happens client-side where possible
 */

import { getFileTypeCategory } from './email-extractor';

// ============================================================================
// Types
// ============================================================================

export interface DetectedRecipient {
    email: string;
    name?: string;
    id?: string;
}

export interface ExtractionResult {
    success: boolean;
    detectedRecipients: DetectedRecipient[];
    // Deprecated but kept for type compatibility
    subjectSuggestion: string;
    bodySuggestion: string;
    rawText: string;
    structuredFields: Record<string, string[]>;
    warnings: string[];
    errors: string[];
    fileType: string;
    fileName: string;
}

export interface ParseOptions {
    ocrLanguages?: string[];  // Default: ['eng', 'deu']
    maxFileSizeMB?: number;   // Default: 25
    timeoutMs?: number;       // Default: 60000 (1 min) - Strict global timeout
    onProgress?: (progress: ParseProgress) => void;
    abortSignal?: AbortSignal;
}

export interface ParseProgress {
    stage: 'loading' | 'parsing' | 'ocr' | 'extracting' | 'done';
    percent: number;
    message: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_OPTIONS: Required<Omit<ParseOptions, 'onProgress' | 'abortSignal'>> = {
    ocrLanguages: ['eng', 'deu'],
    maxFileSizeMB: 100, // Increased from 25MB
    timeoutMs: 300000, // Increased from 60s to 5 mins
};

// Robust email regex - handles most real-world cases (local-part@domain)
// Now case-insensitive and permissive of dots/dashes
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

// Common email column names (case-insensitive)
const EMAIL_COLUMN_NAMES = ['email', 'e-mail', 'mail', 'emailaddress', 'email_address', 'e_mail'];
const NAME_COLUMN_NAMES = ['name', 'fullname', 'full_name', 'vorname', 'nachname', 'firstname', 'lastname'];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize extracted text (cleanup whitespace, OCR artifacts)
 */
export function normalizeText(text: string): string {
    if (!text) return '';

    return text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Extract all email addresses from text
 */
export function extractEmailsFromText(text: string): DetectedRecipient[] {
    const matches = text.match(EMAIL_REGEX) || [];
    const uniqueEmails = [...new Set(matches.map(e => e.toLowerCase()))];
    return uniqueEmails.map(email => ({ email, id: crypto.randomUUID() }));
}

/**
 * Find the email column index in a header row
 */
function findEmailColumnIndex(headers: string[]): number {
    const lowerHeaders = headers.map(h => (h || '').toString().toLowerCase().replace(/\s+/g, ''));
    return lowerHeaders.findIndex(h => EMAIL_COLUMN_NAMES.includes(h));
}

/**
 * Find name column index in a header row
 */
function findNameColumnIndex(headers: string[]): number {
    const lowerHeaders = headers.map(h => (h || '').toString().toLowerCase().replace(/\s+/g, ''));
    return lowerHeaders.findIndex(h => NAME_COLUMN_NAMES.includes(h));
}

/**
 * Create empty result with error
 */
function createErrorResult(fileName: string, fileType: string, error: string): ExtractionResult {
    return {
        success: false,
        detectedRecipients: [],
        subjectSuggestion: '',
        bodySuggestion: '',
        rawText: '',
        structuredFields: {},
        warnings: [],
        errors: [error],
        fileType,
        fileName,
    };
}

/**
 * Read file as ArrayBuffer
 */
async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Read file as text
 */
async function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

// ============================================================================
// PDF Parser
// ============================================================================

async function parsePDF(file: File, options: ParseOptions): Promise<ExtractionResult> {
    const fileName = file.name;
    const fileType = 'pdf';

    options.onProgress?.({ stage: 'loading', percent: 10, message: 'Loading PDF...' });

    try {
        const pdfjsLib = await import('pdfjs-dist');
        // Use local worker instead of CDN for reliability
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const arrayBuffer = await readFileAsArrayBuffer(file);
        options.onProgress?.({ stage: 'parsing', percent: 20, message: 'Analyzing document structure...' });

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        let fullText = '';

        // Prevent processing too many pages to avoid hanging
        const MAX_PAGES = 100; // Increased from 50
        const pagesToProcess = Math.min(numPages, MAX_PAGES);

        for (let i = 1; i <= pagesToProcess; i++) {
            if (options.abortSignal?.aborted) throw new Error('Aborted');

            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            // Improved text joining: ensure spaces between items if distinct
            const pageText = textContent.items.map((item: any) => item.str + (item.hasEOL ? '\n' : ' ')).join('');
            fullText += pageText + '\n';

            options.onProgress?.({
                stage: 'parsing',
                percent: 20 + Math.round((i / pagesToProcess) * 60),
                message: `Reading page ${i} of ${numPages}...`
            });
        }

        options.onProgress?.({ stage: 'extracting', percent: 85, message: 'Extracting emails...' });

        // normalize text before extraction
        const cleanText = normalizeText(fullText);

        // Smart Scan Detection: If text is extremely short relative to page count or empty
        if (cleanText.length < 50 && numPages > 0) {
            return createErrorResult(fileName, fileType, 'No readable text found. This PDF appears to be a scanned image. Please convert it to an image file (PNG/JPG) or use a searchable PDF.');
        }

        const detectedRecipients = extractEmailsFromText(cleanText);

        options.onProgress?.({ stage: 'done', percent: 100, message: 'Done' });

        return {
            success: true,
            detectedRecipients,
            subjectSuggestion: '',
            bodySuggestion: '',
            rawText: '',
            structuredFields: {},
            warnings: numPages > MAX_PAGES ? [`Only the first ${MAX_PAGES} pages were analyzed.`] : [],
            errors: detectedRecipients.length === 0 ? ['No email addresses found.'] : [],
            fileType,
            fileName,
        };

    } catch (error: any) {
        return createErrorResult(fileName, fileType, `PDF error: ${error.message || 'Unknown'}`);
    }
}

// ============================================================================
// JSON Parser (NEW)
// ============================================================================

async function parseJSON(file: File, options: ParseOptions): Promise<ExtractionResult> {
    const fileName = file.name;
    const fileType = 'json';

    options.onProgress?.({ stage: 'loading', percent: 20, message: 'Loading JSON...' });

    try {
        const text = await readFileAsText(file);
        options.onProgress?.({ stage: 'parsing', percent: 50, message: 'Analyzing data...' });

        const json = JSON.parse(text);
        const detectedRecipients: DetectedRecipient[] = [];

        // Recursive search for "email" keys or strings that look like emails
        function recursiveSearch(obj: any) {
            if (typeof obj === 'string') {
                if (EMAIL_REGEX.test(obj)) {
                    // Reset regex index
                    EMAIL_REGEX.lastIndex = 0;
                    if (obj.match(EMAIL_REGEX)) {
                        detectedRecipients.push({ email: obj.toLowerCase(), id: crypto.randomUUID() });
                    }
                }
            } else if (Array.isArray(obj)) {
                obj.forEach(item => recursiveSearch(item));
            } else if (typeof obj === 'object' && obj !== null) {
                // Prioritize explicit "email" keys
                for (const key of Object.keys(obj)) {
                    const lowerKey = key.toLowerCase();
                    if (EMAIL_COLUMN_NAMES.some(n => lowerKey.includes(n)) && typeof obj[key] === 'string') {
                        detectedRecipients.push({ email: obj[key].toLowerCase(), id: crypto.randomUUID() });
                    } else {
                        recursiveSearch(obj[key]);
                    }
                }
            }
        }

        recursiveSearch(json);

        // Deduplicate
        const uniqueRecipients = Array.from(new Map(detectedRecipients.map(item => [item.email, item])).values());

        options.onProgress?.({ stage: 'done', percent: 100, message: 'Done' });

        return {
            success: true,
            detectedRecipients: uniqueRecipients,
            subjectSuggestion: '',
            bodySuggestion: '',
            rawText: '',
            structuredFields: {},
            warnings: [],
            errors: uniqueRecipients.length === 0 ? ['No email addresses found in the JSON file.'] : [],
            fileType,
            fileName,
        };

    } catch (error: any) {
        return createErrorResult(fileName, fileType, `JSON error: ${error.message}`);
    }
}

// ============================================================================
// DOCX Parser
// ============================================================================

async function parseDOCX(file: File, options: ParseOptions): Promise<ExtractionResult> {
    const fileName = file.name;
    const fileType = 'word';

    options.onProgress?.({ stage: 'loading', percent: 10, message: 'Loading Word document...' });

    try {
        const mammoth = await import('mammoth');
        const arrayBuffer = await readFileAsArrayBuffer(file);
        options.onProgress?.({ stage: 'parsing', percent: 40, message: 'Analyzing...' });

        const result = await mammoth.extractRawText({ arrayBuffer });
        const detectedRecipients = extractEmailsFromText(result.value);

        options.onProgress?.({ stage: 'done', percent: 100, message: 'Done' });

        return {
            success: true,
            detectedRecipients,
            subjectSuggestion: '',
            bodySuggestion: '',
            rawText: '',
            structuredFields: {},
            warnings: [],
            errors: [],
            fileType,
            fileName,
        };

    } catch (error: any) {
        return createErrorResult(fileName, fileType, `Word error: ${error.message}`);
    }
}

// ============================================================================
// Excel/CSV Parser
// ============================================================================

async function parseSpreadsheet(file: File, options: ParseOptions): Promise<ExtractionResult> {
    const fileName = file.name;
    const isCSV = fileName.toLowerCase().endsWith('.csv');
    const fileType = isCSV ? 'csv' : 'excel';

    options.onProgress?.({ stage: 'loading', percent: 10, message: isCSV ? 'Loading CSV...' : 'Loading Excel...' });

    try {
        let rows: string[][] = [];

        if (isCSV) {
            const Papa = await import('papaparse');
            const text = await readFileAsText(file);
            options.onProgress?.({ stage: 'parsing', percent: 40, message: 'Analyzing CSV...' });

            // Limit CSV preview/text
            const result = Papa.default.parse<string[]>(text, {
                skipEmptyLines: true,
                preview: 5000 // Limit rows to prevent hang
            });
            rows = result.data;
        } else {
            const XLSX = await import('xlsx');
            const arrayBuffer = await readFileAsArrayBuffer(file);
            options.onProgress?.({ stage: 'parsing', percent: 40, message: 'Analyzing Excel...' });

            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            // Limit range if possible? strict sheet_to_json is safer
            rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
        }

        options.onProgress?.({ stage: 'extracting', percent: 70, message: 'Extracting emails...' });

        if (rows.length === 0) return createErrorResult(fileName, fileType, 'Empty file');

        const headers = rows[0] || [];
        const emailColIndex = findEmailColumnIndex(headers);
        const nameColIndex = findNameColumnIndex(headers);

        const detectedRecipients: DetectedRecipient[] = [];

        if (emailColIndex >= 0) {
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const email = (row[emailColIndex] || '').toString().trim().toLowerCase();
                if (email && EMAIL_REGEX.test(email)) {
                    EMAIL_REGEX.lastIndex = 0; // Reset regex state
                    const recipient: DetectedRecipient = {
                        email,
                        id: crypto.randomUUID(),
                    };
                    if (nameColIndex >= 0 && row[nameColIndex]) {
                        recipient.name = row[nameColIndex].toString().trim();
                    }
                    detectedRecipients.push(recipient);
                }
            }
        } else {
            // Fallback: Scan full content
            const allText = rows.slice(0, 1000).flat().join(' '); // Limit scan to first 1000 rows for speed
            detectedRecipients.push(...extractEmailsFromText(allText));
        }

        options.onProgress?.({ stage: 'done', percent: 100, message: 'Done' });

        return {
            success: true,
            detectedRecipients,
            subjectSuggestion: '',
            bodySuggestion: '',
            rawText: '',
            structuredFields: {},
            warnings: [],
            errors: [],
            fileType,
            fileName,
        };

    } catch (error: any) {
        return createErrorResult(fileName, fileType, `${isCSV ? 'CSV' : 'Excel'} error: ${error.message}`);
    }
}

// ============================================================================
// Plain Text Parser
// ============================================================================

async function parseText(file: File, options: ParseOptions): Promise<ExtractionResult> {
    const fileName = file.name;
    const fileType = 'text';

    options.onProgress?.({ stage: 'loading', percent: 20, message: 'Loading text...' });

    try {
        const text = await readFileAsText(file);
        options.onProgress?.({ stage: 'extracting', percent: 70, message: 'Analyzing...' });

        // Limit text length to prevent regex hang
        const safeText = text.substring(0, 500000);
        const detectedRecipients = extractEmailsFromText(safeText);

        options.onProgress?.({ stage: 'done', percent: 100, message: 'Done' });

        return {
            success: true,
            detectedRecipients,
            subjectSuggestion: '',
            bodySuggestion: '',
            rawText: '',
            structuredFields: {},
            warnings: text.length > 500000 ? ['Text too long, only the first 500kb were analyzed.'] : [],
            errors: [],
            fileType,
            fileName,
        };

    } catch (error: any) {
        return createErrorResult(fileName, fileType, `Text error: ${error.message}`);
    }
}

// ============================================================================
// Image OCR Parser
// ============================================================================

async function parseImage(file: File, options: ParseOptions): Promise<ExtractionResult> {
    const fileName = file.name;
    const fileType = 'image';

    options.onProgress?.({ stage: 'loading', percent: 5, message: 'Initialising OCR...' });

    try {
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker(options.ocrLanguages?.join('+') || 'eng+deu', 1, {
            logger: m => {
                if (m.status === 'recognizing text') {
                    options.onProgress?.({
                        stage: 'ocr',
                        percent: 10 + Math.round(m.progress * 80),
                        message: `OCR: ${Math.round(m.progress * 100)}%`
                    });
                }
            }
        });

        const result = await worker.recognize(file);
        const detectedRecipients = extractEmailsFromText(result.data.text);

        await worker.terminate();

        options.onProgress?.({ stage: 'done', percent: 100, message: 'Done' });

        return {
            success: true,
            detectedRecipients,
            subjectSuggestion: '',
            bodySuggestion: '',
            rawText: '',
            structuredFields: {},
            warnings: [],
            errors: [],
            fileType,
            fileName,
        };
    } catch (error: any) {
        return createErrorResult(fileName, fileType, `OCR error: ${error.message}`);
    }
}

// ============================================================================
// Main Orchestrator
// ============================================================================

export async function parseFile(file: File, options: Partial<ParseOptions> = {}): Promise<ExtractionResult> {
    const mergedOptions: ParseOptions = { ...DEFAULT_OPTIONS, ...options };
    const fileName = file.name;

    // Route Logic
    const category = getFileTypeCategory(fileName);
    let parserPromise: Promise<ExtractionResult>;

    // Handle JSON specifically
    if (fileName.toLowerCase().endsWith('.json')) {
        parserPromise = parseJSON(file, mergedOptions);
    } else {
        switch (category) {
            case 'pdf': parserPromise = parsePDF(file, mergedOptions); break;
            case 'word': parserPromise = parseDOCX(file, mergedOptions); break;
            case 'excel': parserPromise = parseSpreadsheet(file, mergedOptions); break;
            case 'image': parserPromise = parseImage(file, mergedOptions); break;
            case 'text':
                if (fileName.toLowerCase().endsWith('.csv')) {
                    parserPromise = parseSpreadsheet(file, mergedOptions);
                } else {
                    parserPromise = parseText(file, mergedOptions);
                }
                break;
            default:
                return createErrorResult(fileName, 'unknown', 'Unsupported format.');
        }
    }

    // Safety Timeout Wrapper
    const timeoutPromise = new Promise<ExtractionResult>((resolve) => {
        setTimeout(() => {
            resolve(createErrorResult(fileName, 'timeout', 'Timeout: The file is too large or complex.'));
        }, mergedOptions.timeoutMs);
    });

    return Promise.race([parserPromise, timeoutPromise]);
}
