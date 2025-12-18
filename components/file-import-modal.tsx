'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResponsiveModal } from '@/components/responsive-modal';
import {
    Upload,
    FileText,
    FileSpreadsheet,
    Image as ImageIcon,
    File,
    AlertTriangle,
    CheckCircle2,
    Users,
    Mail,
    X,
    Loader2,
    FileUp,
    FileCode // For JSON
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseFile, ExtractionResult, ParseProgress, DetectedRecipient } from '@/lib/parsers';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

interface FileImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImport: (result: ExtractionResult) => void;
}

type ImportStage = 'idle' | 'parsing' | 'preview' | 'error';

// ============================================================================
// File Type Icons (Monochrome)
// ============================================================================

function getFileIcon(fileType: string) {
    const className = "h-5 w-5 text-neutral-900 dark:text-neutral-100"; // Monochrome

    switch (fileType) {
        case 'pdf':
        case 'word':
        case 'text':
            return <FileText className={className} />;
        case 'excel':
        case 'csv':
            return <FileSpreadsheet className={className} />;
        case 'image':
            return <ImageIcon className={className} />;
        case 'json':
            return <FileCode className={className} />;
        default:
            return <File className={className} />;
    }
}

// ============================================================================
// Component
// ============================================================================

export function FileImportModal({ open, onOpenChange, onImport }: FileImportModalProps) {
    const [stage, setStage] = useState<ImportStage>('idle');
    const [progress, setProgress] = useState<ParseProgress | null>(null);
    const [result, setResult] = useState<ExtractionResult | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Reset state when modal closes
    const handleOpenChange = useCallback((newOpen: boolean) => {
        if (!newOpen) {
            abortControllerRef.current?.abort();
            setStage('idle');
            setProgress(null);
            setResult(null);
            setSelectedFiles([]);
            setCurrentFileIndex(0);
        }
        onOpenChange(newOpen);
    }, [onOpenChange]);

    // Handle multiple files - process sequentially and aggregate results
    const handleFiles = useCallback(async (files: File[]) => {
        if (files.length === 0) return;

        setSelectedFiles(files);
        setStage('parsing');
        setCurrentFileIndex(0);

        abortControllerRef.current = new AbortController();

        const aggregatedRecipients: DetectedRecipient[] = [];
        const allWarnings: string[] = [];
        const allErrors: string[] = [];
        let lastFileName = '';
        let lastFileType = '';

        for (let i = 0; i < files.length; i++) {
            if (abortControllerRef.current?.signal.aborted) break;

            const file = files[i];
            setCurrentFileIndex(i);
            setProgress({
                stage: 'loading',
                percent: Math.round((i / files.length) * 100),
                message: `Processing ${file.name} (${i + 1}/${files.length})...`
            });

            try {
                const extractionResult = await parseFile(file, {
                    onProgress: (p) => {
                        const basePercent = Math.round((i / files.length) * 100);
                        const filePercent = Math.round(p.percent / files.length);
                        setProgress({
                            ...p,
                            percent: basePercent + filePercent,
                            message: `${file.name}: ${p.message}`
                        });
                    },
                    abortSignal: abortControllerRef.current?.signal,
                });

                aggregatedRecipients.push(...extractionResult.detectedRecipients);
                allWarnings.push(...extractionResult.warnings);
                if (extractionResult.errors.length > 0) {
                    allErrors.push(`${file.name}: ${extractionResult.errors.join(', ')}`);
                }
                lastFileName = file.name;
                lastFileType = extractionResult.fileType;
            } catch (error: any) {
                allErrors.push(`${file.name}: ${error.message || 'Unknown error'}`);
            }
        }

        // Deduplicate by email
        const uniqueRecipients = Array.from(
            new Map(aggregatedRecipients.map(r => [r.email, r])).values()
        );

        const finalResult: ExtractionResult = {
            success: uniqueRecipients.length > 0 || allErrors.length === 0,
            detectedRecipients: uniqueRecipients,
            subjectSuggestion: '',
            bodySuggestion: '',
            rawText: '',
            structuredFields: {},
            warnings: allWarnings,
            errors: allErrors,
            fileType: files.length > 1 ? 'multiple' : lastFileType,
            fileName: files.length > 1 ? `${files.length} files` : lastFileName,
        };

        setResult(finalResult);
        setStage(finalResult.success ? 'preview' : 'error');
    }, []);

    // Cancel parsing
    const handleCancel = useCallback(() => {
        abortControllerRef.current?.abort();
        setStage('idle');
        setProgress(null);
        setResult(null);
        setSelectedFiles([]);
        setCurrentFileIndex(0);
    }, []);

    // Apply import
    const handleApply = useCallback(() => {
        if (result) {
            onImport(result);
            handleOpenChange(false);
            toast.success(`${result.detectedRecipients.length} recipients imported.`);
        }
    }, [result, onImport, handleOpenChange]);

    // Dropzone configuration - now supports multiple files
    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop: (acceptedFiles) => {
            if (acceptedFiles.length > 0) {
                handleFiles(acceptedFiles);
            }
        },
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'text/csv': ['.csv'],
            'text/plain': ['.txt'],
            'application/json': ['.json'],
            // Image files removed - OCR was unreliable and files should not be uploaded
        },
        maxFiles: 20,
        disabled: stage === 'parsing',
    });

    // Preview content - Grouped by File
    const previewContent = useMemo(() => {
        if (!result) return null;

        // Group recipients by source file
        const groupedMap = new Map<string, DetectedRecipient[]>();
        result.detectedRecipients.forEach(r => {
            const key = r.sourceFile || 'Unknown Source';
            if (!groupedMap.has(key)) groupedMap.set(key, []);
            groupedMap.get(key)!.push(r);
        });

        // Sort files largely by name, but put "Unknown" last if any
        const sortedFiles = Array.from(groupedMap.keys()).sort((a, b) => {
            if (a === 'Unknown Source') return 1;
            if (b === 'Unknown Source') return -1;
            return a.localeCompare(b);
        });

        return (
            <div className="space-y-6">
                {/* Warnings (Monochrome) */}
                {result.warnings.length > 0 && (
                    <div className="space-y-2">
                        {result.warnings.map((warning, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 rounded text-xs text-neutral-600 dark:text-neutral-400">
                                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>{warning}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Recipients List (Grouped by File) */}
                {result.detectedRecipients.length > 0 ? (
                    <div className="space-y-6">
                        {sortedFiles.map(fileName => {
                            const recipients = groupedMap.get(fileName) || [];
                            const extension = fileName.split('.').pop()?.toLowerCase() || '';

                            return (
                                <div key={fileName} className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
                                    {/* File Header */}
                                    <div className="bg-neutral-50 dark:bg-neutral-900 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-white dark:bg-black rounded border border-neutral-200 dark:border-neutral-800 text-neutral-500">
                                                {getFileIcon(extension)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-neutral-900 dark:text-white break-all line-clamp-1" title={fileName}>
                                                    {fileName}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="bg-white dark:bg-black text-neutral-900 dark:text-white border-neutral-200 dark:border-neutral-700">
                                            {recipients.length}
                                        </Badge>
                                    </div>

                                    {/* Emails in this file */}
                                    <div className="bg-white dark:bg-black">
                                        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                            {recipients.map((r, i) => (
                                                <li key={i} className="px-4 py-2.5 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700 shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                                                            {r.email}
                                                        </p>
                                                        {r.name && (
                                                            <p className="text-xs text-neutral-500 truncate">
                                                                {r.name}
                                                            </p>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12 text-neutral-500 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No email addresses found.</p>
                    </div>
                )}
            </div>
        );
    }, [result]);

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={handleOpenChange}
            title="Import Email Addresses"
            description="Import recipients from files. Only email addresses will be extracted."
            className="sm:max-w-4xl max-h-[85vh] flex flex-col bg-white dark:bg-black border-neutral-200 dark:border-neutral-800"
        >
            <div className="flex-1 overflow-hidden p-1">
                {/* Stage: Idle - Dropzone (Monochrome) */}
                {stage === 'idle' && (
                    <div
                        {...getRootProps()}
                        className={cn(
                            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
                            isDragActive && !isDragReject && 'border-black dark:border-white bg-neutral-50 dark:bg-neutral-900',
                            !isDragActive && 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 bg-white dark:bg-black'
                        )}
                    >
                        <input {...getInputProps()} />
                        <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
                            <Upload className="h-6 w-6 text-neutral-900 dark:text-white" />
                        </div>
                        <p className="font-semibold text-neutral-900 dark:text-white mb-2">
                            {isDragActive ? 'Release to analyze' : 'Upload File'}
                        </p>
                        <p className="text-sm text-neutral-500 mb-6">
                            Click or drag file here
                        </p>
                        <div className="flex flex-wrap justify-center gap-2 opacity-60">
                            {['JSON', 'PDF', 'EXCEL', 'CSV', 'WORD', 'IMAGE'].map((type) => (
                                <Badge key={type} variant="secondary" className="text-[10px] bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 border-none">
                                    {type}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Stage: Parsing - Progress (Monochrome) */}
                {/* Stage: Parsing - Modern Radar Scan Animation */}
                {stage === 'parsing' && progress && (
                    <div className="flex flex-col items-center justify-center py-20">
                        {/* Radar Animation */}
                        <div className="relative h-24 w-24 flex items-center justify-center mb-8">
                            <div className="absolute h-full w-full rounded-full bg-neutral-900/5 dark:bg-white/5 animate-ping duration-1000" />
                            <div className="absolute h-16 w-16 rounded-full bg-neutral-900/10 dark:bg-white/10 animate-ping delay-150 duration-1000" />
                            <div className="relative h-12 w-12 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center shadow-xl z-10">
                                <Loader2 className="h-6 w-6 text-white dark:text-black animate-spin" />
                            </div>
                        </div>

                        {/* Minimalist Text */}
                        <div className="text-center space-y-3 max-w-sm px-6">
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                                Analyzing Files...
                            </h3>

                            {/* Subtle Progress Bar */}
                            <div className="w-48 mx-auto h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-neutral-900 dark:bg-white transition-all duration-300 ease-out"
                                    style={{ width: `${progress.percent}%` }}
                                />
                            </div>

                            <p className="text-xs text-neutral-400 font-medium pt-2">
                                {selectedFiles.length > 1
                                    ? `Scanning ${currentFileIndex + 1} of ${selectedFiles.length}`
                                    : 'Extracting data...'}
                            </p>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancel}
                            className="mt-8 text-xs text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                        >
                            Cancel Operation
                        </Button>
                    </div>
                )}

                {/* Stage: Preview */}
                {stage === 'preview' && result && (
                    <div className="flex flex-col h-full">
                        <div className="flex-1 overflow-hidden">
                            <ScrollArea className="h-[400px] pr-4">
                                {previewContent}
                            </ScrollArea>
                        </div>
                        <div className="flex justify-end gap-3 pt-6 mt-2 border-t border-neutral-100 dark:border-neutral-900">
                            <Button variant="outline" onClick={handleCancel} className="border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                                Cancel
                            </Button>
                            <Button onClick={handleApply} className="bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-neutral-200">
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Import {result.detectedRecipients.length}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Stage: Error (Monochrome) */}
                {stage === 'error' && result && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <div className="p-4 bg-neutral-100 dark:bg-neutral-900 rounded-full">
                            <AlertTriangle className="h-8 w-8 text-neutral-900 dark:text-white" />
                        </div>
                        <div className="text-center space-y-2 px-6">
                            <p className="font-medium text-neutral-900 dark:text-white">
                                Analysis failed
                            </p>
                            {result.errors.map((error, i) => (
                                <p key={i} className="text-sm text-neutral-500">
                                    {error}
                                </p>
                            ))}
                        </div>
                        <Button variant="outline" onClick={handleCancel} className="mt-4 border-neutral-200 dark:border-neutral-800">
                            Try Again
                        </Button>
                    </div>
                )}
            </div>
        </ResponsiveModal>
    );
}

