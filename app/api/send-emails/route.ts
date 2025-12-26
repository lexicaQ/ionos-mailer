import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mail';
import { emailFormSchema, SendResult } from '@/lib/schemas';
import { extractCompanyFromEmail } from '@/lib/company-scraper';
import { processBodyWithTracking } from '@/lib/tracking';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';

import { auth } from "@/auth";
import { checkUsageStatus, hashIdentifier, incrementUserUsage } from '@/lib/usage-limit';

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

        // ============================================================
        // SECURITY: Attachment Validation (DoS Prevention)
        // ============================================================
        const MAX_ATTACHMENTS = 5;
        const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB per file (decoded)
        const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB total (decoded)

        if (attachments && attachments.length > 0) {
            // Check count
            if (attachments.length > MAX_ATTACHMENTS) {
                return NextResponse.json(
                    { error: `Too many attachments. Maximum ${MAX_ATTACHMENTS} allowed.` },
                    { status: 400 }
                );
            }

            let totalSize = 0;
            for (const att of attachments) {
                // Decode base64 to get actual size
                try {
                    const decodedSize = Buffer.from(att.content, 'base64').length;

                    if (decodedSize > MAX_ATTACHMENT_SIZE) {
                        return NextResponse.json(
                            { error: `Attachment "${att.filename}" exceeds ${MAX_ATTACHMENT_SIZE / 1024 / 1024}MB limit.` },
                            { status: 413 }
                        );
                    }

                    totalSize += decodedSize;
                } catch {
                    return NextResponse.json(
                        { error: `Invalid attachment data for "${att.filename}".` },
                        { status: 400 }
                    );
                }
            }

            if (totalSize > MAX_TOTAL_SIZE) {
                return NextResponse.json(
                    { error: `Total attachment size exceeds ${MAX_TOTAL_SIZE / 1024 / 1024}MB limit.` },
                    { status: 413 }
                );
            }
        }
        // ============================================================

        const encryptionKey = process.env.ENCRYPTION_KEY;
        if (!encryptionKey) {
            console.error("No ENCRYPTION_KEY configured");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        // Usage Limit Check
        // --------------------------------------------------------------------------------

        // 1. Get Identifiers
        const ip = req.headers.get("x-forwarded-for")?.split(',')[0] || "unknown";
        const smtpUser = smtpSettings.user;

        // 2. Check Status
        // Only enforce limits if session/user exists (anonymous might be blocked or strict)
        // Since we enforced auth for user creation, effectiveUserId should be valid for registered users.
        const usageStatus = await checkUsageStatus(effectiveUserId, ip, smtpUser);

        // 3. Block if Limit Exceeded

        if (usageStatus.plan === "FREE") {
            const requestedCount = recipients.length;
            if (usageStatus.usage + requestedCount > usageStatus.limit) {
                return NextResponse.json(
                    {
                        error: 'Monthly usage limit exceeded',
                        details: {
                            message: `You have reached your Free Tier limit of ${usageStatus.limit} emails/month.`,
                            usage: usageStatus.usage,
                            limit: usageStatus.limit,
                            plan: "FREE",
                            upgrade: true
                        }
                    },
                    { status: 403 }
                );
            }
        }

        const ipHash = hashIdentifier(ip);
        const smtpHash = hashIdentifier(smtpUser);
        // --------------------------------------------------------------------------------

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

                // Track Usage Vectors
                senderIpHash: ipHash,
                smtpUserHash: smtpHash,

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

        // 3. PERSIST USAGE (for backend table visibility)
        // Fire and forget - don't block response
        incrementUserUsage(effectiveUserId, recipients.length).catch(e => console.error("Usage update failed:", e));

        // 3. Return Success immediately
        const mockResults: SendResult[] = recipients.map((r: any) => ({
            email: r.email,
            success: true,
            timestamp: new Date().toISOString(),
            status: 'waiting' // Schema compatible waiting state
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
