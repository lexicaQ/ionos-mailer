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
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Reset state when modal closes
    const handleOpenChange = useCallback((newOpen: boolean) => {
        if (!newOpen) {
            abortControllerRef.current?.abort();
            setStage('idle');
            setProgress(null);
            setResult(null);
            setSelectedFile(null);
        }
        onOpenChange(newOpen);
    }, [onOpenChange]);

    // Handle file drop/selection
    const handleFile = useCallback(async (file: File) => {
        setSelectedFile(file);
        setStage('parsing');
        setProgress({ stage: 'loading', percent: 0, message: 'Starting...' });

        abortControllerRef.current = new AbortController();

        try {
            const extractionResult = await parseFile(file, {
                onProgress: setProgress,
                abortSignal: abortControllerRef.current.signal,
            });

            if (extractionResult.success) {
                setResult(extractionResult);
                setStage('preview');
            } else {
                setResult(extractionResult);
                setStage('error');
            }
        } catch (error: any) {
            setResult({
                success: false,
                detectedRecipients: [],
                subjectSuggestion: '',
                bodySuggestion: '',
                rawText: '',
                structuredFields: {},
                warnings: [],
                errors: [error.message || 'Unknown error'],
                fileType: 'unknown',
                fileName: file.name,
            });
            setStage('error');
        }
    }, []);

    // Cancel parsing
    const handleCancel = useCallback(() => {
        abortControllerRef.current?.abort();
        setStage('idle');
        setProgress(null);
        setResult(null);
        setSelectedFile(null);
    }, []);

    // Apply import
    const handleApply = useCallback(() => {
        if (result) {
            onImport(result);
            handleOpenChange(false);
            toast.success(`${result.detectedRecipients.length} recipients imported.`);
        }
    }, [result, onImport, handleOpenChange]);

    // Dropzone configuration
    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop: (acceptedFiles) => {
            if (acceptedFiles.length > 0) {
                handleFile(acceptedFiles[0]);
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
            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'],
        },
        maxFiles: 1,
        disabled: stage === 'parsing',
    });

    // Preview content
    const previewContent = useMemo(() => {
        if (!result) return null;

        return (
            <div className="space-y-6">
                {/* File Info Card (Monochrome) */}
                <div className="flex items-center gap-4 p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-black">
                    <div className="p-2 bg-neutral-100 dark:bg-neutral-900 rounded-md">
                        {getFileIcon(result.fileType)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-neutral-900 dark:text-white truncate">{result.fileName}</p>
                        <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium">{result.fileType} • {(result.detectedRecipients.length || 0)} Found</p>
                    </div>
                </div>

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

                {/* Recipients List (Professional Table Look) */}
                {result.detectedRecipients.length > 0 ? (
                    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
                        <div className="bg-neutral-50 dark:bg-neutral-900 px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                Email Addresses
                            </span>
                            <Badge variant="outline" className="bg-white dark:bg-black text-neutral-900 dark:text-white border-neutral-200 dark:border-neutral-700">
                                {result.detectedRecipients.length}
                            </Badge>
                        </div>
                        <ScrollArea className="h-[250px] bg-white dark:bg-black">
                            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {result.detectedRecipients.map((r, i) => (
                                    <li key={i} className="px-4 py-3 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                                        <div className="h-2 w-2 rounded-full bg-neutral-300 dark:bg-neutral-700 shrink-0" />
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
                        </ScrollArea>
                    </div>
                ) : (
                    <div className="text-center py-8 text-neutral-500 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg">
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
            className="sm:max-w-[500px] max-h-[85vh] flex flex-col bg-white dark:bg-black border-neutral-200 dark:border-neutral-800"
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
                            {['JSON', 'PDF', 'EXCEL', 'CSV', 'WORD'].map((type) => (
                                <Badge key={type} variant="secondary" className="text-[10px] bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 border-none">
                                    {type}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Stage: Parsing - Progress (Monochrome) */}
                {stage === 'parsing' && progress && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-6">
                        <div className="relative">
                            <Loader2 className="h-10 w-10 animate-spin text-neutral-900 dark:text-white" />
                        </div>
                        <div className="text-center space-y-2 w-full px-8">
                            <p className="font-medium text-neutral-900 dark:text-white truncate">{selectedFile?.name}</p>
                            <p className="text-xs text-neutral-500 font-mono uppercase tracking-widest">{progress.message}</p>
                            <Progress value={progress.percent} className="h-1 w-full bg-neutral-100 dark:bg-neutral-900" indicatorClassName="bg-neutral-900 dark:bg-white" />
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleCancel} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
                            Cancel
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

