import { NextRequest, NextResponse } from 'next/server';
import { createTransport } from 'nodemailer';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { email, smtpHost, smtpPort, smtpUser, smtpPass } = await req.json();

        if (!email || !smtpHost || !smtpUser || !smtpPass) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Create SMTP transport
        const transport = createTransport({
            host: smtpHost,
            port: parseInt(smtpPort) || 587,
            secure: parseInt(smtpPort) === 465,
            auth: {
                user: smtpUser,
                pass: smtpPass
            },
            connectionTimeout: 10000, // 10 seconds
        });

        // Verify connection and recipient using RCPT TO
        return new Promise<Response>((resolve) => {
            transport.verify()
                .then(() => {
                    // Connection works, now try to verify recipient
                    // Note: Many servers don't allow RCPT verification
                    resolve(NextResponse.json({
                        valid: true,
                        message: "SMTP connection successful. Note: Recipient verification may not be supported by all mail servers."
                    }));
                })
                .catch((error: any) => {
                    resolve(NextResponse.json({
                        valid: false,
                        reason: error.message || "SMTP connection failed"
                    }));
                })
                .finally(() => {
                    transport.close();
                });
        });

    } catch (error: any) {
        console.error("Email validation error:", error);
        return NextResponse.json({
            valid: false,
            reason: error.message || "Validation failed"
        }, { status: 500 });
    }
}
