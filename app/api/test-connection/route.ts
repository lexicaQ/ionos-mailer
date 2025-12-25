import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { auth } from '@/auth';

// ============================================================
// SECURITY: Port and Host Restrictions
// ============================================================
const ALLOWED_PORTS = new Set([25, 465, 587, 2525]);

// Whitelist of known SMTP hosts (optional extra security)
const KNOWN_SMTP_HOSTS = [
    'smtp.ionos.de',
    'smtp.ionos.com',
    'smtp.1und1.de',
    'smtp.gmail.com',
    'smtp.office365.com',
    'smtp-mail.outlook.com',
];

/**
 * Validate that a host is a valid FQDN (not an IP literal)
 */
function isValidFQDN(host: string): boolean {
    // Block IP literals
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
        return false;
    }
    // Block IPv6 literals
    if (host.startsWith('[') || host.includes(':')) {
        return false;
    }
    // Block localhost and internal domains
    const lower = host.toLowerCase();
    if (lower === 'localhost' || lower.endsWith('.local') || lower.endsWith('.internal')) {
        return false;
    }
    // Must contain at least one dot
    if (!host.includes('.')) {
        return false;
    }
    return true;
}

// Rate limiting (simple in-memory, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // Max 5 tests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(userId);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW });
        return true;
    }

    if (entry.count >= RATE_LIMIT) {
        return false;
    }

    entry.count++;
    return true;
}

export async function POST(req: Request) {
    try {
        // SECURITY: Authentication is optional (users need to test before sign-in)
        // But we still rate-limit by session or IP
        const session = await auth();
        const userId = session?.user?.id || req.headers.get('x-forwarded-for')?.split(',')[0] || 'anonymous';

        // SECURITY: Rate limiting
        if (!checkRateLimit(userId)) {
            return NextResponse.json(
                { success: false, error: "Rate limit exceeded. Please wait 1 minute." },
                { status: 429 }
            );
        }

        const { host, port, user, pass, secure } = await req.json();

        if (!host || !user || !pass) {
            return NextResponse.json(
                { success: false, error: "Host, user and password are required." },
                { status: 400 }
            );
        }

        // SECURITY: Validate host
        if (!isValidFQDN(host)) {
            return NextResponse.json(
                { success: false, error: "Invalid host. IP addresses and internal domains are not allowed." },
                { status: 400 }
            );
        }

        // SECURITY: Restrict ports
        const portNum = parseInt(port);
        if (!ALLOWED_PORTS.has(portNum)) {
            return NextResponse.json(
                { success: false, error: `Port ${port} is not allowed. Use one of: ${[...ALLOWED_PORTS].join(', ')}` },
                { status: 400 }
            );
        }

        const transporter = nodemailer.createTransport({
            host,
            port: portNum,
            secure: secure,
            auth: {
                user,
                pass,
            },
            connectionTimeout: 5000,
        });

        // Verify connection
        try {
            await transporter.verify();
            return NextResponse.json({ success: true, message: "Connection successfully established!" });
        } catch (verifyError: any) {
            // SECURITY: Sanitize error messages (don't leak internal details)
            console.error("SMTP Verify Error:", verifyError);

            let errorMessage = "Connection test failed.";

            if (verifyError.responseCode === 535) {
                errorMessage = "Login failed. Incorrect password or username.";
            } else if (verifyError.code === 'ECONNREFUSED') {
                errorMessage = "Connection refused. Check host and port settings.";
            } else if (verifyError.code === 'ETIMEDOUT') {
                errorMessage = "Connection timeout. Check firewall or network settings.";
            } else if (verifyError.code === 'ENOTFOUND') {
                errorMessage = "Host not found. Check the SMTP server address.";
            }

            // Don't include raw verifyError in response (security)
            return NextResponse.json(
                { success: false, error: errorMessage },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error("Test connection error:", error);
        return NextResponse.json(
            { success: false, error: "An unexpected error occurred." },
            { status: 500 }
        );
    }
}
