import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://ionos-mailer.vercel.app'

    return {
        rules: [
            // Allow legitimate crawlers with restrictions
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/api/',           // All API routes
                    '/debug/',         // Debug endpoints
                    '/_next/',         // Next.js internals
                    '/private/',       // Private assets if any
                    '/*.json$',        // JSON files (except manifest via allow)
                ],
            },
            // Explicitly allow Google and Bing
            {
                userAgent: 'Googlebot',
                allow: '/',
                disallow: ['/api/', '/debug/'],
            },
            {
                userAgent: 'Bingbot',
                allow: '/',
                disallow: ['/api/', '/debug/'],
            },
            // Block AI/LLM Training Bots
            {
                userAgent: 'GPTBot',
                disallow: '/',
            },
            {
                userAgent: 'ChatGPT-User',
                disallow: '/',
            },
            {
                userAgent: 'CCBot',
                disallow: '/',
            },
            {
                userAgent: 'anthropic-ai',
                disallow: '/',
            },
            {
                userAgent: 'ClaudeBot',
                disallow: '/',
            },
            {
                userAgent: 'Claude-Web',
                disallow: '/',
            },
            {
                userAgent: 'Google-Extended',
                disallow: '/',
            },
            {
                userAgent: 'Bytespider',
                disallow: '/',
            },
            {
                userAgent: 'Diffbot',
                disallow: '/',
            },
            {
                userAgent: 'FacebookBot',
                disallow: '/', // Block Meta AI training
            },
            {
                userAgent: 'Applebot-Extended',
                disallow: '/',
            },
            {
                userAgent: 'PerplexityBot',
                disallow: '/',
            },
            {
                userAgent: 'YouBot',
                disallow: '/',
            },
            // Block SEO/Scraper Bots
            {
                userAgent: 'AhrefsBot',
                disallow: '/',
            },
            {
                userAgent: 'SemrushBot',
                disallow: '/',
            },
            {
                userAgent: 'MJ12bot',
                disallow: '/',
            },
            {
                userAgent: 'DotBot',
                disallow: '/',
            },
            {
                userAgent: 'PetalBot',
                disallow: '/',
            },
            {
                userAgent: 'DataForSeoBot',
                disallow: '/',
            },
            {
                userAgent: 'BLEXBot',
                disallow: '/',
            },
            {
                userAgent: 'Rogerbot',
                disallow: '/',
            },
            {
                userAgent: 'MegaIndex',
                disallow: '/',
            },
            // Block Aggressive Scrapers
            {
                userAgent: 'Screaming Frog SEO Spider',
                disallow: '/',
            },
            {
                userAgent: 'Apache-HttpClient',
                disallow: '/',
            },
            {
                userAgent: 'python-requests',
                disallow: '/',
            },
            {
                userAgent: 'Go-http-client',
                disallow: '/',
            },
            {
                userAgent: 'curl',
                disallow: '/',
            },
            {
                userAgent: 'wget',
                disallow: '/',
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
