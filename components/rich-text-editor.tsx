'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { FontFamily } from '@tiptap/extension-font-family'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    Link as LinkIcon, Image as ImageIcon, List, ListOrdered,
    Heading1, Heading2, Heading3, Undo, Redo, Unlink, Upload, Type, Paperclip, X, FileText
} from 'lucide-react'
import { useState, useCallback, useRef, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Attachment } from '@/lib/schemas'
import { cn } from "@/lib/utils"

// Extended type for UI tracking
interface UIAttachment extends Attachment {
    id: string;
    size: number;
}

interface RichTextEditorProps {
    value: string
    onChange: (html: string) => void
    onAttachmentsChange?: (attachments: Attachment[]) => void
    initialAttachments?: Attachment[] // NEW: For loading drafts
    placeholder?: string
}

const FONT_FAMILIES = [
    { value: 'default', label: 'Default', fontFamily: '' },
    { value: 'arial', label: 'Arial', fontFamily: 'Arial, sans-serif' },
    { value: 'helvetica', label: 'Helvetica', fontFamily: 'Helvetica, Arial, sans-serif' },
    { value: 'times', label: 'Times New Roman', fontFamily: '"Times New Roman", serif' },
    { value: 'georgia', label: 'Georgia', fontFamily: 'Georgia, serif' },
    { value: 'verdana', label: 'Verdana', fontFamily: 'Verdana, sans-serif' },
    { value: 'courier', label: 'Courier New', fontFamily: '"Courier New", monospace' },
]

export function RichTextEditor({ value, onChange, onAttachmentsChange, initialAttachments, placeholder }: RichTextEditorProps) {
    const [linkUrl, setLinkUrl] = useState('')
    const [imageUrl, setImageUrl] = useState('')
    const [linkDialogOpen, setLinkDialogOpen] = useState(false)
    const [imageDialogOpen, setImageDialogOpen] = useState(false)
    const [attachments, setAttachments] = useState<UIAttachment[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const attachmentInputRef = useRef<HTMLInputElement>(null)
    const editorRef = useRef<any>(null);
    // Notify parent of attachment changes
    useEffect(() => {
        onAttachmentsChange?.(attachments)
    }, [attachments, onAttachmentsChange])

    // Sync attachments from parent (for draft loading)
    useEffect(() => {
        // Allow passing empty array to clear attachments
        if (initialAttachments !== undefined) {
            // Strict check: Only update if IDs differ OR if array length differs
            // To prevent loops, we must ensure we don't treat the same array with new object references as different.
            // We use a set of IDs for comparison.
            const currentIds = new Set(attachments.map(a => a.id));
            const newIds = new Set(initialAttachments.map((a: any) => a.id));

            // Check if sets are identical
            let isDifferent = false;
            if (currentIds.size !== newIds.size) {
                isDifferent = true;
            } else {
                for (const id of newIds) {
                    if (!currentIds.has(id)) {
                        isDifferent = true;
                        break;
                    }
                }
            }

            // Also handling initialization (no current attachments)
            if (attachments.length === 0 && initialAttachments.length > 0) isDifferent = true;

            // If 'currentIds' are empty but we have 'initialAttachments' without IDs? 
            // That happens if draft is old. 
            // If initialAttachments has items without IDs, we MUST assume they are new.
            if (initialAttachments.some((a: any) => !a.id)) isDifferent = true;


            if (isDifferent) {
                const uiAttachments: UIAttachment[] = initialAttachments.map((att: any) => ({
                    ...att,
                    id: att.id || crypto.randomUUID(),
                    size: att.size || 0
                }));
                // Only update internal state if truly different
                setAttachments(uiAttachments);
            }
        }
    }, [initialAttachments]); // REMOVED 'attachments' from dependency to avoid loop ping-pong. Only react to Prop change.

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                    HTMLAttributes: {
                        class: 'rte-heading',
                    }
                },
                bulletList: {
                    keepMarks: true,
                    keepAttributes: false,
                    HTMLAttributes: {
                        class: 'rte-bullet-list',
                    }
                },
                orderedList: {
                    keepMarks: true,
                    keepAttributes: false,
                    HTMLAttributes: {
                        class: 'rte-ordered-list',
                    }
                },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    style: 'color: #2563eb; text-decoration: underline;',
                },
            }),
            Image.configure({
                HTMLAttributes: {
                    style: 'max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0;',
                },
            }),
            Underline,
            TextStyle,
            FontFamily.configure({
                types: ['textStyle'],
            }),
        ],
        content: value || '<p></p>',
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm dark:prose-invert max-w-none min-h-[200px] p-4 focus:outline-none',
                style: 'min-height: 200px;',
            },
        },
    })

    // Sync editor content when value prop changes (e.g. loading draft)
    useEffect(() => {
        if (editor && value) {
            const currentContent = editor.getHTML();
            // Compare content to avoid loops. Tiptap might add <p> wrapper to empty strings.
            // A simplified check is: if value exists and doesn't match current, update.
            // But be careful of cursor position resets if we update while typing.
            // Since this is mainly for loading drafts (external updates), we check if they differ significantly.
            if (currentContent !== value) {
                // Check if value is just empty/default
                const isEmptyValue = !value || value === '<p></p>';
                const isEmptyEditor = editor.isEmpty;

                if (isEmptyValue && isEmptyEditor) return;

                editor.commands.setContent(value);
            }
        }
    }, [editor, value]);

    // Pre-populate link dialog with existing link when opening
    const handleOpenLinkDialog = useCallback((open: boolean) => {
        if (open && editor) {
            const attrs = editor.getAttributes('link')
            if (attrs.href) {
                setLinkUrl(attrs.href)
            }
        }
        setLinkDialogOpen(open)
    }, [editor])

    const setLink = useCallback(() => {
        if (!editor) return
        if (linkUrl === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
        } else {
            editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run()
        }
        setLinkDialogOpen(false)
        setLinkUrl('')
    }, [editor, linkUrl])

    const addImage = useCallback(() => {
        if (!editor) return
        if (imageUrl) {
            editor.chain().focus().setImage({ src: imageUrl }).run()
        }
        setImageDialogOpen(false)
        setImageUrl('')
    }, [editor, imageUrl])

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file && editor) {
            const reader = new FileReader()
            reader.onload = (event) => {
                if (typeof event.target?.result === 'string') {
                    editor.chain().focus().setImage({ src: event.target.result }).run()
                }
            }
            reader.readAsDataURL(file)
        }
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])

        const newAttachments: UIAttachment[] = []

        for (const file of files) {
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader()
                reader.onloadend = () => {
                    const result = reader.result as string
                    // Remove data URL prefix
                    const base64Content = result.split(',')[1]
                    resolve(base64Content)
                }
                reader.readAsDataURL(file)
            })

            newAttachments.push({
                id: crypto.randomUUID(),
                filename: file.name,
                content: base64,
                contentType: file.type,
                size: file.size
            })
        }

        setAttachments(prev => [...prev, ...newAttachments])

        // Reset input
        if (attachmentInputRef.current) attachmentInputRef.current.value = ''
    }

    const removeAttachment = (id: string) => {
        setAttachments(prev => prev.filter(att => att.id !== id))
    }

    if (!editor) {
        return null
    }

    return (
        <div className="border rounded-md bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 flex flex-col min-h-[300px]">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 sticky top-0 z-10">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={editor.isActive('bold') ? 'bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white font-semibold' : ''}
                    title="Bold"
                >
                    <Bold className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={editor.isActive('italic') ? 'bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white font-semibold' : ''}
                    title="Italic"
                >
                    <Italic className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={editor.isActive('underline') ? 'bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white font-semibold' : ''}
                    title="Underline"
                >
                    <UnderlineIcon className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={editor.isActive('strike') ? 'bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white font-semibold' : ''}
                    title="Strikethrough"
                >
                    <Strikethrough className="h-4 w-4" />
                </Button>

                <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800 mx-1" />

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={editor.isActive('heading', { level: 1 }) ? 'bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white font-semibold' : ''}
                    title="Heading 1"
                >
                    <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={editor.isActive('heading', { level: 2 }) ? 'bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white font-semibold' : ''}
                    title="Heading 2"
                >
                    <Heading2 className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={editor.isActive('heading', { level: 3 }) ? 'bg-neutral-200 dark:bg-neutral-800' : ''}
                    title="Heading 3"
                >
                    <Heading3 className="h-4 w-4" />
                </Button>

                <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800 mx-1" />

                <Select
                    value={editor.getAttributes('textStyle').fontFamily || 'default'}
                    onValueChange={(value) => {
                        const font = FONT_FAMILIES.find(f => f.value === value)
                        if (font) {
                            if (font.value === 'default') {
                                editor.chain().focus().unsetFontFamily().run()
                            } else {
                                editor.chain().focus().setFontFamily(font.fontFamily).run()
                            }
                        }
                    }}
                >
                    <SelectTrigger className="w-[130px] h-8 text-xs border-0 bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:ring-0">
                        <SelectValue placeholder="Font" />
                    </SelectTrigger>
                    <SelectContent>
                        {FONT_FAMILIES.map((font) => (
                            <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.fontFamily || 'inherit' }}>
                                {font.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700 mx-1" />

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={editor.isActive('bulletList') ? 'bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white' : ''}
                    title="Bullet List"
                >
                    <List className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={editor.isActive('orderedList') ? 'bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white' : ''}
                    title="Ordered List"
                >
                    <ListOrdered className="h-4 w-4" />
                </Button>

                <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700 mx-1" />

                <Dialog open={linkDialogOpen} onOpenChange={handleOpenLinkDialog}>
                    <DialogTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={editor.isActive('link') ? 'bg-neutral-200 dark:bg-neutral-800' : ''}
                            title="Insert Link"
                        >
                            <LinkIcon className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Insert Link</DialogTitle>
                        </DialogHeader>
                        <div className="flex gap-2">
                            <Input
                                placeholder="https://..."
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && setLink()}
                            />
                            <Button onClick={setLink}>Insert</Button>
                        </div>
                        {editor.isActive('link') && (
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    editor.chain().focus().unsetLink().run()
                                    setLinkDialogOpen(false)
                                    setLinkUrl('')
                                }}
                            >
                                <Unlink className="h-4 w-4 mr-2" />
                                Remove Link
                            </Button>
                        )}
                    </DialogContent>
                </Dialog>

                <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={editor.isActive('image') ? 'bg-neutral-200 dark:bg-neutral-800' : ''}
                            title="Insert Image"
                        >
                            <ImageIcon className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Insert Image</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Image URL</label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="https://..."
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addImage()}
                                    />
                                    <Button onClick={addImage}>Insert</Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Or upload</label>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full"
                                    >
                                        <Upload className="h-4 w-4 mr-2" />
                                        Choose Image
                                    </Button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file && editor) {
                                                const reader = new FileReader()
                                                reader.onload = (event) => {
                                                    if (typeof event.target?.result === 'string') {
                                                        editor.chain().focus().setImage({ src: event.target.result }).run()
                                                        setImageDialogOpen(false) // Fix: Close dialog automatically
                                                    }
                                                }
                                                reader.readAsDataURL(file)
                                            }
                                            // Reset input
                                            if (fileInputRef.current) fileInputRef.current.value = ''
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700 mx-1" />

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-2 text-neutral-600 dark:text-neutral-400"
                    onClick={() => attachmentInputRef.current?.click()}
                >
                    <Paperclip className="h-4 w-4" />
                    <span className="hidden sm:inline text-xs">Attachment</span>
                </Button>
                <input
                    type="file"
                    multiple
                    className="hidden"
                    ref={attachmentInputRef}
                    onChange={handleAttachmentUpload}
                />

                <div className="flex-1" />

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    title="Undo"
                >
                    <Undo className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    title="Redo"
                >
                    <Redo className="h-4 w-4" />
                </Button>

            </div>

            {/* Editor Content */}
            <EditorContent editor={editor} className={cn(
                "min-h-[300px] max-h-[600px] overflow-y-auto outline-none p-4 prose dark:prose-invert max-w-none",
                // Input background adjustment
                "bg-neutral-50/30 dark:bg-[#1a1a1a]"
            )} />

            {/* Attachments List */}
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/10">
                    {attachments.map((att) => (
                        <div
                            key={att.id || att.filename}
                            className="flex items-center gap-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 rounded-md text-sm group"
                        >
                            <FileText className="h-4 w-4 text-neutral-500" />
                            <span className="max-w-[150px] truncate" title={att.filename}>{att.filename}</span>
                            <span className="text-xs text-neutral-400">
                                ({((att.size || 0) / 1024).toFixed(1)} KB)
                            </span>
                            <button
                                onClick={() => removeAttachment(att.id)}
                                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-red-500"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}


