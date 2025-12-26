'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DEFAULT_SURVEY_TEMPLATE } from '@/lib/survey-templates'
import { Code2, BarChart3 } from 'lucide-react'

interface SurveyInsertDialogProps {
    onInsert: (html: string) => void
}

export function SurveyInsertDialog({ onInsert }: SurveyInsertDialogProps) {
    const [open, setOpen] = useState(false)
    const [customCode, setCustomCode] = useState('')
    const [activeTab, setActiveTab] = useState('template')

    const handleInsertTemplate = () => {
        onInsert(DEFAULT_SURVEY_TEMPLATE)
        setOpen(false)
    }

    const handleInsertCustom = () => {
        if (customCode.trim()) {
            onInsert(customCode)
            setCustomCode('')
            setOpen(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-neutral-600 dark:text-neutral-400"
                    title="Insert Survey or Custom Code"
                >
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline text-xs">Survey</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Insert Survey or Custom Code
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="template" className="gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Survey Template
                        </TabsTrigger>
                        <TabsTrigger value="custom" className="gap-2">
                            <Code2 className="h-4 w-4" />
                            Custom Code
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="template" className="mt-4 space-y-4">
                        <div className="border rounded-lg p-4 bg-neutral-50 dark:bg-neutral-900">
                            <h4 className="font-semibold text-sm mb-2">Interest Survey (3 Buttons)</h4>
                            <p className="text-xs text-muted-foreground mb-4">
                                Adds 3 trackable buttons: "Yes, I'm in!", "Let me think", "Not interested"
                            </p>

                            {/* Preview */}
                            <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border">
                                <div style={{ background: '#ffffff', padding: '24px', textAlign: 'center', borderRadius: '16px', border: '2px solid #e5e7eb' }}>
                                    <p style={{ fontSize: '16px', fontWeight: 800, color: '#111827', marginBottom: '20px' }}>Are you interested?</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <span style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 700 }}>✓   Yes, I'm interested!</span>
                                        <span style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 700 }}>?   Let me think about it</span>
                                        <span style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 700 }}>✕   Not interested</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button onClick={handleInsertTemplate} className="w-full">
                            Insert Survey Template
                        </Button>

                        <p className="text-xs text-muted-foreground text-center">
                            Tip: Survey responses are tracked in Live Campaign Tracking
                        </p>
                    </TabsContent>

                    <TabsContent value="custom" className="mt-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="custom-code" className="text-sm font-medium">
                                HTML / CSS / JavaScript Code
                            </Label>
                            <Textarea
                                id="custom-code"
                                value={customCode}
                                onChange={(e) => setCustomCode(e.target.value)}
                                placeholder={`<div style="background: #f0f0f0; padding: 20px; text-align: center;">
  <h2>Your Custom Content</h2>
  <p>Add any HTML, CSS, or inline styles here...</p>
</div>`}
                                className="font-mono text-xs min-h-[200px]"
                            />
                            <p className="text-xs text-muted-foreground">
                                Use tracking placeholders: <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{"{{TRACKING_URL_YES}}"}</code>, <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{"{{TRACKING_URL_MAYBE}}"}</code>, <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{"{{TRACKING_URL_NO}}"}</code>
                            </p>
                        </div>

                        <Button
                            onClick={handleInsertCustom}
                            className="w-full"
                            disabled={!customCode.trim()}
                        >
                            Insert Custom Code
                        </Button>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
