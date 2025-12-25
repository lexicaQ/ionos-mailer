/**
 * Bounce Processing Cron Endpoint
 * Processes bounce emails from the configured IMAP inbox
 * 
 * Runs alongside the main cron job (every 5 mins)
 * Can also be triggered manually
 */

import { NextResponse } from 'next/server';
import { processBounceEmails } from '@/lib/bounce-parser';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max

export async function GET(req: Request) {
    // Allow cron secret OR manual trigger header
    const authHeader = req.headers.get('Authorization');
    const isManualTrigger = req.headers.get('x-manual-trigger') === 'true';
    const cronSecret = process.env.CRON_SECRET;

    // Security: Verify authorization
    if (!isManualTrigger) {
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }
    }

    try {
        console.log('[ProcessBounces] Starting bounce processing...');

        const result = await processBounceEmails();

        console.log(`[ProcessBounces] Completed: ${result.processed} bounces processed, ${result.errors} errors`);

        return NextResponse.json({
            success: true,
            processed: result.processed,
            errors: result.errors,
            timestamp: new Date().toISOString(),
        });

    } catch (error: any) {
        console.error('[ProcessBounces] Error:', error);

        return NextResponse.json({
            success: false,
            error: error.message || 'Bounce processing failed',
            timestamp: new Date().toISOString(),
        }, { status: 500 });
    }
}
