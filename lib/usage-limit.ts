
import { prisma } from "@/lib/prisma"
import { createHash } from "crypto"

// Users created BEFORE this date are "Legacy" and have UNLIMITED emails.
// Users created AFTER this date are "Free" and have 100 emails/month.
// Date: Dec 24, 2025 15:00 (Today)
const LIMIT_START_DATE = new Date('2025-12-24T15:00:00.000Z');

// The limit for new users
const MONTHLY_LIMIT = 100;

/**
 * Creates a deterministic SHA-256 hash of the input string + pepper.
 * Used for storing privacy-preserving IP and SMTP identifiers.
 * 
 * SECURITY: Uses a dedicated IDENTIFIER_HASH_PEPPER, not shared with auth/encryption secrets.
 */
export function hashIdentifier(input: string): string {
    const pepper = process.env.IDENTIFIER_HASH_PEPPER;

    if (!pepper) {
        if (process.env.NODE_ENV === "production") {
            throw new Error(
                "SECURITY: IDENTIFIER_HASH_PEPPER must be set in production. " +
                "Generate a random 32+ character string and add it to your environment variables."
            );
        }
        // Dev fallback only - warn about insecure usage
        console.warn("SECURITY WARNING: Using insecure dev pepper for hashIdentifier. Set IDENTIFIER_HASH_PEPPER.");
        return createHash('sha256').update(input + "dev-only-insecure-pepper").digest('hex');
    }

    return createHash('sha256').update(input + pepper).digest('hex');
}

export type UsageStatus = {
    isLimited: boolean; // True if user is new (subject to limit)
    usage: number;      // Emails sent this month
    limit: number;      // Max emails allowed (Infinity if not limited)
    remaining: number;
    plan: "FREE" | "UNLIMITED";
}

/**
 * Checks the current usage status for a user, including IP and SMTP cross-checks.
 */
export async function checkUsageStatus(
    userId: string,
    ipAddress?: string,
    smtpEmail?: string
): Promise<UsageStatus> {
    // 1. Check user plan from database
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            plan: true,
            createdAt: true
        }
    });

    if (!user) {
        throw new Error("User not found");
    }

    // Check plan from database (UNLIMITED for legacy users, FREE for new users)
    if (user.plan === "UNLIMITED") {
        return {
            isLimited: false,
            usage: 0, // We don't track usage for unlimited users
            limit: Infinity,
            remaining: Infinity,
            plan: "UNLIMITED"
        };
    }

    // 2. New User: Calculate Usage
    // We must count usage across THREE vectors:
    // A. User ID (this account)
    // B. IP Address (prevent multi-account from same IP)
    // C. SMTP Email (prevent multi-account with same IONOS login)

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const orConditions: any[] = [
        { campaign: { userId: userId } }
    ];

    if (ipAddress) {
        orConditions.push({ campaign: { senderIpHash: hashIdentifier(ipAddress) } });
    }

    if (smtpEmail) {
        orConditions.push({ campaign: { smtpUserHash: hashIdentifier(smtpEmail) } });
    }

    // Count distinct EmailJobs sent this month matching ANY of these conditions
    // Note: We count EmailJobs that have a 'sentAt' date
    const usage = await prisma.emailJob.count({
        where: {
            sentAt: { gte: startOfMonth },
            OR: orConditions
        }
    });

    return {
        isLimited: true,
        usage: usage,
        limit: MONTHLY_LIMIT,
        remaining: Math.max(0, MONTHLY_LIMIT - usage),
        plan: "FREE"
    };
}
