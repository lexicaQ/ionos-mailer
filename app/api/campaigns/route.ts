import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import { emailFormSchema } from '@/lib/schemas';
import { auth } from '@/auth';

export async function POST(req: Request) {
    try {
        // CRITICAL: Use authenticated session for userId
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
        }

        const userId = session.user.id;

        const json = await req.json();

        const { recipients, subject, body, smtpSettings, durationMinutes, name } = json;

        if (!smtpSettings || !recipients || !subject || !body) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const secretKey = process.env.ENCRYPTION_KEY;
        if (!secretKey) {
            return NextResponse.json({ error: "Server misconfiguration: No Encryption Key" }, { status: 500 });
        }

        // 1. Create Campaign with encrypted sensitive fields
        const { attachments } = json;

        const campaign = await prisma.campaign.create({
            data: {
                host: smtpSettings.host, // Keep unencrypted for debugging
                port: smtpSettings.port,
                user: encrypt(smtpSettings.user, secretKey), // Encrypt SMTP username
                pass: encrypt(smtpSettings.pass, secretKey), // Encrypt SMTP password
                secure: smtpSettings.secure,
                fromName: smtpSettings.fromName ? encrypt(smtpSettings.fromName, secretKey) : null, // Encrypt sender name
                name: json.name ? encrypt(json.name, secretKey) : null, // Encrypt campaign name
                userId: userId, // SECURE: Use authenticated user ID
                attachments: attachments && attachments.length > 0 ? {
                    create: attachments.map((att: any) => ({
                        filename: encrypt(att.filename, secretKey), // Encrypt filename
                        content: encrypt(att.content, secretKey), // Encrypt attachment content
                        contentType: att.contentType
                    }))
                } : undefined
            }
        });

        // 2. Schedule Jobs
        const totalDurationMs = (durationMinutes || 0) * 60 * 1000;
        // Start immediately - the cron job will process with delay between emails
        const startTime = Date.now();

        const jobsData = recipients.map((r: any, index: number) => {
            let scheduleTime = startTime;

            if (totalDurationMs > 0 && recipients.length > 1) {
                const distinctSteps = recipients.length - 1;
                const stepSize = totalDurationMs / (distinctSteps || 1);
                scheduleTime = startTime + (index * stepSize);
            }

            return {
                campaignId: campaign.id,
                recipient: encrypt(r.email, secretKey), // Encrypt recipient email
                subject: encrypt(subject, secretKey), // Encrypt subject
                body: encrypt(body, secretKey),       // Encrypt body
                scheduledFor: new Date(scheduleTime),
                status: 'PENDING'
            };
        });

        await prisma.emailJob.createMany({
            data: jobsData
        });

        // 3. AUTO-TRIGGER: Immediately process the first batch of emails
        // This ensures emails start sending even without external cron
        try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
                || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

            // Fire and wait slightly to ensure connection is established before function exit
            console.log(`Auto-triggering cron at: ${baseUrl}/api/cron/process`);

            // We AWAIT this to ensure the serverless function doesn't freeze before the request is sent.
            // But we catch errors so we don't block the UI success state if the trigger fails.
            await fetch(`${baseUrl}/api/cron/process`, {
                method: 'GET',
                headers: { 'x-manual-trigger': 'true' }
            }).then(async (res) => {
                if (!res.ok) {
                    const text = await res.text();
                    console.error('Auto-trigger response error:', res.status, text);
                } else {
                    console.log('Auto-trigger successful');
                }
            }).catch(e => console.error('Auto-trigger failed:', e));

        } catch (triggerError) {
            console.error('Failed to auto-trigger cron:', triggerError);
            // Don't fail the campaign creation if trigger fails
        }

        return NextResponse.json({
            success: true,
            campaignId: campaign.id,
            jobCount: jobsData.length,
            message: `Campaign started. Emails will be sent over ${durationMinutes} minutes.`
        });

    } catch (error: any) {
        console.error("Campaign Creation Error:", error instanceof Error ? error.message : String(error));
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const campaigns = await prisma.campaign.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
            take: 50, // Limit for performance
            include: {
                jobs: true, // Need jobs for stats
            }
        });

        return NextResponse.json(campaigns);
    } catch (error) {
        console.error("Failed to fetch campaigns:", error);
        return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
    }
}

