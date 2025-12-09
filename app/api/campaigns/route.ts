import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import { emailFormSchema } from '@/lib/schemas';

export async function POST(req: Request) {
    try {
        const json = await req.json();

        // Manual validation since schema might change, but reusing parts
        // Ideally we update schema, but let's parse manual structure for now
        // Expecting: { recipients, subject, body, smtpSettings, durationMinutes }

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
                // Encrypt password
                pass: encrypt(smtpSettings.pass, secretKey),
                secure: smtpSettings.secure,
            }
        });

        // 2. Schedule Jobs
        // Distribute emails evenly over durationMinutes
        // e.g. 100 emails over 720 minutes (12h) = 1 email every 7.2 minutes.
        // OR: Randomize slightly? For now, linear distribution.

        const totalDurationMs = (durationMinutes || 0) * 60 * 1000;
        const now = Date.now();
        const jobsData = recipients.map((r: any, index: number) => {
            let scheduleTime = now;

            if (totalDurationMs > 0 && recipients.length > 1) {
                // Determine offset for this email
                // index 0 = now
                // index last = now + duration
                const distinctSteps = recipients.length - 1; // intervals
                const stepSize = totalDurationMs / (distinctSteps || 1);
                scheduleTime = now + (index * stepSize);
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
