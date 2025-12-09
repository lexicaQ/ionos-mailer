import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { sendEmail } from '@/lib/mail';
import { textToHtmlWithTracking } from '@/lib/tracking';

export async function GET(req: NextRequest) {
    // 1. Security Check
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        if (process.env.NODE_ENV === 'production') {
            return new NextResponse('Unauthorized', { status: 401 });
        }
    }

    try {
        const secretKey = process.env.ENCRYPTION_KEY;
        if (!secretKey) throw new Error("No Encryption Key configured");

        // Get base URL for tracking
        const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}` 
            : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        // 2. Find Pending Jobs that are due
        const now = new Date();
        const pendingJobs = await prisma.emailJob.findMany({
            where: {
                status: 'PENDING',
                scheduledFor: { lte: now }
            },
            include: { campaign: true },
            take: 20
        });

        if (pendingJobs.length === 0) {
            return NextResponse.json({ message: "No pending jobs due." });
        }

        const results = [];

        // 3. Process Jobs
        for (const job of pendingJobs) {
            let pass = "";
            try {
                pass = decrypt(job.campaign.pass, secretKey);
            } catch (e) {
                console.error(`Failed to decrypt for job ${job.id}`, e);
                await prisma.emailJob.update({
                    where: { id: job.id },
                    data: { status: 'FAILED', error: "Decryption failed" }
                });
                continue;
            }

            // Create HTML with tracking
            const htmlWithTracking = textToHtmlWithTracking(job.body, job.trackingId, baseUrl);

            // Send with tracking
            const response = await sendEmail({
                to: job.recipient,
                subject: job.subject,
                text: job.body,
                html: htmlWithTracking,
                config: {
                    host: job.campaign.host,
                    port: job.campaign.port,
                    user: job.campaign.user,
                    pass: pass,
                    secure: job.campaign.secure,
                }
            });

            // Update DB
            await prisma.emailJob.update({
                where: { id: job.id },
                data: {
                    status: response.success ? 'SENT' : 'FAILED',
                    sentAt: new Date(),
                    error: response.error || null
                }
            });

            results.push({ id: job.id, success: response.success });
        }

        return NextResponse.json({ processed: results.length, results });

    } catch (error: any) {
        console.error("Cron Job Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
