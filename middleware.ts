import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Known bot user agents to block or challenge
const BLOCKED_BOT_PATTERNS = [
    /GPTBot/i,
    /CCBot/i,
    /ChatGPT-User/i,
    /anthropic-ai/i,
    /ClaudeBot/i,
    /Bytespider/i,
    /PetalBot/i,
    /AhrefsBot/i,
    /SemrushBot/i,
    /MJ12bot/i,
    /DotBot/i,
    /DataForSeoBot/i,
];

export function middleware(request: NextRequest) {
    const userAgent = request.headers.get('user-agent') || '';

    // Block known malicious/scraper bots
    if (BLOCKED_BOT_PATTERNS.some(pattern => pattern.test(userAgent))) {
        return new NextResponse('Access Denied', { status: 403 });
    }

    const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

    // Comprehensive security headers
    const securityHeaders = {
        // Prevent DNS prefetching
        'X-DNS-Prefetch-Control': 'off',
        // HTTPS enforcement (2 years)
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
        // Prevent clickjacking
        'X-Frame-Options': 'DENY',
        // Prevent MIME type sniffing
        'X-Content-Type-Options': 'nosniff',
        // Control referrer information
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        // Block cross-domain policies
        'X-Permitted-Cross-Domain-Policies': 'none',
        // Disable dangerous browser features
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
        // Prevent XSS attacks
        'X-XSS-Protection': '1; mode=block',
        // Content Security Policy - Restrict resource loading
        'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Next.js
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https:",
            "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "upgrade-insecure-requests",
        ].join('; '),
    };

    const response = NextResponse.next();

    // Apply security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    // Additional security for API routes - prevent caching and indexing
    const pathname = request.nextUrl.pathname;
    if (pathname.startsWith('/api/')) {
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('X-Robots-Tag', 'noindex, nofollow');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - robots.txt (crawler rules)
         */
        {
            source: '/((?!_next/static|_next/image|favicon.ico|robots.txt).*)',
            missing: [
                { type: 'header', key: 'next-router-prefetch' },
                { type: 'header', key: 'purpose', value: 'prefetch' },
            ],
        },
    ],
};
