import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import { emailFormSchema } from '@/lib/schemas';
import { auth } from '@/auth';
import { checkUsageStatus, hashIdentifier } from '@/lib/usage-limit';

export async function POST(req: Request) {
    try {
        // CRITICAL: Use authenticated session for userId
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
        }

        const userId = session.user.id;

        const json = await req.json();

        const { recipients, subject, body, smtpSettings, durationMinutes, name, startTime: startTimeIso } = json;

        if (!smtpSettings || !recipients || !subject || !body) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const secretKey = process.env.ENCRYPTION_KEY;
        if (!secretKey) {
            return NextResponse.json({ error: "Server misconfiguration: No Encryption Key" }, { status: 500 });
        }

        // Usage Limit Check
        // --------------------------------------------------------------------------------

        const ip = req.headers.get("x-forwarded-for")?.split(',')[0] || "unknown";
        const smtpUser = smtpSettings.user;

        const usageStatus = await checkUsageStatus(userId, ip, smtpUser);

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

                // Track Usage Vectors
                senderIpHash: ipHash,
                smtpUserHash: smtpHash,

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

        // Determine start time: User provided or Now
        const startTimestamp = startTimeIso ? new Date(startTimeIso).getTime() : Date.now();

        const jobsData = recipients.map((r: any, index: number) => {
            let scheduleTime = startTimestamp;

            if (totalDurationMs > 0 && recipients.length > 1) {
                const distinctSteps = recipients.length - 1;
                const stepSize = totalDurationMs / (distinctSteps || 1);
                scheduleTime = startTimestamp + (index * stepSize);
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

        // 3. AUTO-TRIGGER REMOVED: Moved to client-side for "Instant" UI response.
        // The client will trigger the cron job in the background after receiving the success response.

        // Construct optimistic campaign object for immediate UI display
        const optimisticCampaign = {
            id: campaign.id,
            name: json.name || "Untitled Campaign", // Return original unencrypted name
            createdAt: campaign.createdAt,
            isDirect: false, // Mark as campaign (not direct send)
            stats: {
                total: jobsData.length,
                pending: jobsData.length,
                sent: 0,
                failed: 0,
                opened: 0
            },
            // Don't need to return all encrypted jobs, UI can infer or fetch later if needed
            jobs: []
        };

        return NextResponse.json({
            success: true,
            campaign: optimisticCampaign, // Pass full object to client
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

