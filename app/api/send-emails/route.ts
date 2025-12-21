import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mail';
import { emailFormSchema, SendResult } from '@/lib/schemas';
import { extractCompanyFromEmail } from '@/lib/company-scraper';
import { processBodyWithTracking } from '@/lib/tracking';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';

import { auth } from "@/auth";

export async function POST(req: Request) {
    try {
        const session = await auth();
        // Allow anonymous if no session? History won't work though. 
        // User asked to fix history. History requires userID.
        // Let's enforce auth or fallback nicely but prefer session.
        const effectiveUserId = session?.user?.id || "anonymous";

        const json = await req.json();
        const result = emailFormSchema.safeParse(json);

        if (!result.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: result.error.flatten() },
                { status: 400 }
            );
        }

        const { subject, body, recipients, smtpSettings, attachments } = result.data as any;

        const encryptionKey = process.env.ENCRYPTION_KEY;
        if (!encryptionKey) {
            console.error("No ENCRYPTION_KEY configured");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        // 1. Create Campaign for Direct Send (Async Mode)
        // Store REAL SMTP settings for Cron. Mark name="DIRECT" for History Sync.
        const campaign = await prisma.campaign.create({
            data: {
                userId: effectiveUserId,
                host: smtpSettings.host,
                port: smtpSettings.port,
                user: encrypt(smtpSettings.user, encryptionKey),
                pass: encrypt(smtpSettings.pass, encryptionKey),
                secure: smtpSettings.secure,
                fromName: smtpSettings.fromName ? encrypt(smtpSettings.fromName, encryptionKey) : null,
                name: "DIRECT",
                attachments: attachments && attachments.length > 0 ? {
                    create: attachments.map((att: any) => ({
                        filename: encrypt(att.filename, encryptionKey),
                        content: encrypt(att.content, encryptionKey),
                        contentType: att.contentType
                    }))
                } : undefined
            }
        });

        // 2. Create Email Jobs (Pending)
        const jobsData = recipients.map((r: any) => ({
            campaignId: campaign.id,
            recipient: encrypt(r.email, encryptionKey),
            subject: encrypt(subject, encryptionKey),
            body: encrypt(body, encryptionKey),
            status: 'PENDING',
            scheduledFor: new Date(),
            trackingId: randomUUID()
        }));

        await prisma.emailJob.createMany({
            data: jobsData
        });

        // 3. Return Success immediately
        const mockResults: SendResult[] = recipients.map((r: any) => ({
            email: r.email,
            success: true,
            timestamp: new Date().toISOString(),
            status: 'queued'
        }));

        return NextResponse.json({ results: mockResults, campaignId: campaign.id });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
