/**
 * Email Extractor Utilities
 * Shared constants and helper functions for file handling
 */

/**
 * Get file type category for UI display
 */
export function getFileTypeCategory(fileName: string): 'text' | 'pdf' | 'word' | 'excel' | 'image' | 'unknown' {
    const extension = fileName.toLowerCase().split('.').pop() || '';

    if (['txt', 'csv'].includes(extension)) return 'text';
    if (extension === 'pdf') return 'pdf';
    if (['docx'].includes(extension)) return 'word'; // .doc not supported by mammoth
    if (['xls', 'xlsx'].includes(extension)) return 'excel';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(extension)) return 'image';

    return 'unknown';
}

/**
 * Supported file extensions
 * Note: .doc is not supported by mammoth (only .docx)
 */
export const SUPPORTED_EXTENSIONS = [
    '.txt', '.csv',
    '.pdf',
    '.docx',
    '.xls', '.xlsx',
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'
];

export const ACCEPT_STRING = SUPPORTED_EXTENSIONS.join(',');
