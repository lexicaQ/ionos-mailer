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
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout for speed

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
                // Titles often are "Company Name - Slogan" or "Company | Description"
                // Take ONLY the first part before any separator to avoid SEO descriptions
                const separators = ['|', '-', '–', '—', '•', ':'];
                let cleanedTitle = title.trim();

                for (const sep of separators) {
                    if (cleanedTitle.includes(sep)) {
                        // Take the FIRST part only (usually the company name)
                        const firstPart = cleanedTitle.split(sep)[0].trim();

                        // Make sure it's valid (not too short, not generic)
                        const genericParts = ['Home', 'Startseite', 'Index', 'Welcome', 'Start', 'Willkommen'];
                        if (firstPart.length > 2 && firstPart.length < 60 && !genericParts.includes(firstPart)) {
                            return firstPart;
                        }

                        // If first part is generic, try second part
                        const secondPart = cleanedTitle.split(sep)[1]?.trim();
                        if (secondPart && secondPart.length > 2 && secondPart.length < 60 && !genericParts.includes(secondPart)) {
                            return secondPart;
                        }
                        break; // Stop after finding first separator
                    }
                }

                // If no separator and title is short enough, use it
                if (cleanedTitle.length < 40) return cleanedTitle;
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
