import * as cheerio from 'cheerio';
import { GENERIC_DOMAINS } from '@/lib/domains';

export async function extractCompanyFromEmail(email: string): Promise<string | null> {
    try {
        const domain = email.split('@')[1];
        if (!domain) return null;

        if (GENERIC_DOMAINS.has(domain.toLowerCase())) {
            return null; // Cannot determine company from generic provider
        }

        // Try to fetch the website
        // Try https first
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        try {
            const url = `https://${domain}`;
            const res = await fetch(url, {
                signal: controller.signal,
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IonosMailer/1.0)' }
            });
            clearTimeout(timeoutId);

            if (!res.ok) return null;

            const html = await res.text();
            const $ = cheerio.load(html);

            // 1. Try meta tags
            let name = $('meta[property="og:site_name"]').attr('content');
            if (name) return name.trim();

            name = $('meta[name="application-name"]').attr('content');
            if (name) return name.trim();

            // 2. Try title
            const title = $('title').text();
            if (title) {
                // Titles often are "Company Name - Slogan" or "Page - Company Name"
                // Heuristic: Take the part before or after a separator
                const separators = ['|', '-', '–', '—', '•', ':'];
                for (const sep of separators) {
                    if (title.includes(sep)) {
                        const parts = title.split(sep);
                        // Usually the shortest part is the name, or the first/last
                        // Let's assume the longest part is the slogan, shortest is name? 
                        // Or just take the first part? Often "Company - Home"
                        // Or "Welcome to Company"

                        // Heuristic: Valid length (not too long)
                        const candidates = parts.map(p => p.trim()).filter(p => p.length > 2 && p.length < 50);
                        if (candidates.length > 0) {
                            // Prefer the one that doesn't look like "Home" or "Startseite"
                            const best = candidates.find(c => !['Home', 'Startseite', 'Index', 'Welcome'].includes(c));
                            if (best) return best;
                        }
                    }
                }
                if (title.length < 60) return title.trim();
            }

            // 3. Fallback: Copyright footer?
            // Expensive to parse all text. 
            // Just return null if meta/title failed.

            return null;

        } catch (e) {
            clearTimeout(timeoutId);
            return null;
        }

    } catch (error) {
        console.error(`Failed to scrape company for ${email}:`, error);
        return null;
    }
}
