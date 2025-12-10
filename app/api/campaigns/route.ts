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

        // 2. Schedule Jobs - First email starts 1 minute from now to ensure reliable sending
        const totalDurationMs = (durationMinutes || 0) * 60 * 1000;
        const now = Date.now();
        const FIRST_EMAIL_DELAY = 60 * 1000; // 1 minute delay for first email

        const jobsData = recipients.map((r: any, index: number) => {
            let scheduleTime = now + FIRST_EMAIL_DELAY; // Start 1 minute from now

            if (totalDurationMs > 0 && recipients.length > 1) {
                const distinctSteps = recipients.length - 1;
                const stepSize = totalDurationMs / (distinctSteps || 1);
                scheduleTime = now + FIRST_EMAIL_DELAY + (index * stepSize);
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

        // 3. AUTO-TRIGGER: Process emails after 1 minute delay
        // Schedule the first trigger to run after the delay period
        try {
            const baseUrl = process.env.VERCEL_URL
                ? `https://${process.env.VERCEL_URL}`
                : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

            // Trigger after 65 seconds (1 min + 5s buffer)
            setTimeout(() => {
                fetch(`${baseUrl}/api/cron/process`, {
                    method: 'GET',
                    headers: { 'x-manual-trigger': 'true' }
                }).catch(e => console.error('Auto-trigger failed:', e));
            }, 65000);

        } catch (triggerError) {
            console.error('Failed to schedule auto-trigger:', triggerError);
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

