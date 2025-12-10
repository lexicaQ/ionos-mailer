import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import { emailFormSchema } from '@/lib/schemas';

export async function POST(req: Request) {
    try {
        const json = await req.json();

        const { recipients, subject, body, smtpSettings, durationMinutes } = json;

        if (!smtpSettings || !recipients || !subject || !body) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const secretKey = process.env.ENCRYPTION_KEY;
        if (!secretKey) {
            return NextResponse.json({ error: "Server misconfiguration: No Encryption Key" }, { status: 500 });
        }

        // 1. Create Campaign
        const campaign = await prisma.campaign.create({
            data: {
                host: smtpSettings.host,
                port: smtpSettings.port,
                user: smtpSettings.user,
                pass: encrypt(smtpSettings.pass, secretKey),
                secure: smtpSettings.secure,
                userId: json.userId || "anonymous",
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
                recipient: r.email,
                subject,
                body,
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
            const baseUrl = process.env.VERCEL_URL
                ? `https://${process.env.VERCEL_URL}`
                : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

            // Fire and forget - don't wait for response
            fetch(`${baseUrl}/api/cron/process`, {
                method: 'GET',
                headers: { 'x-manual-trigger': 'true' }
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
        console.error("Campaign Creation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

