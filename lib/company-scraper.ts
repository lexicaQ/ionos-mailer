import * as cheerio from 'cheerio';
import { GENERIC_DOMAINS } from '@/lib/domains';
import dns from 'dns/promises';

// ============================================================
// SSRF PROTECTION: Private IP Range Blocklist
// ============================================================
const PRIVATE_IP_RANGES = [
    /^127\./, // Localhost
    /^10\./, // Private Class A
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B
    /^192\.168\./, // Private Class C
    /^169\.254\./, // Link-local
    /^0\./, // Invalid
    /^::1$/, // IPv6 Localhost
    /^fe80:/i, // IPv6 Link-local
    /^fc00:/i, // IPv6 ULA
    /^fd00:/i, // IPv6 ULA
];

const BLOCKED_DOMAINS = [
    'localhost',
    'localhost.localdomain',
    '.local',
    '.internal',
    '.corp',
    '.home',
    '.lan',
    'metadata.google.internal', // GCP metadata
    '169.254.169.254', // AWS/GCP/Azure metadata
];

/**
 * Check if an IP address is private/internal
 */
function isPrivateIP(ip: string): boolean {
    return PRIVATE_IP_RANGES.some(regex => regex.test(ip));
}

/**
 * Check if a domain is blocked (internal/metadata)
 */
function isBlockedDomain(domain: string): boolean {
    const lowerDomain = domain.toLowerCase();
    
    // Block IP literals
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain)) {
        return isPrivateIP(domain);
    }
    
    // Block IPv6 literals
    if (domain.startsWith('[') || domain.includes(':')) {
        return true; // Block all IPv6 literals for simplicity
    }
    
    // Check against blocklist
    return BLOCKED_DOMAINS.some(blocked => 
        lowerDomain === blocked || lowerDomain.endsWith(blocked)
    );
}

/**
 * Validate domain via DNS and check all resolved IPs
 */
async function validateDomainSSRF(domain: string): Promise<boolean> {
    // Block known dangerous domains
    if (isBlockedDomain(domain)) {
        console.warn(`[SSRF] Blocked domain: ${domain}`);
        return false;
    }
    
    try {
        // Resolve DNS and check ALL IPs
        const addresses = await dns.lookup(domain, { all: true });
        
        for (const addr of addresses) {
            if (isPrivateIP(addr.address)) {
                console.warn(`[SSRF] Domain ${domain} resolves to private IP: ${addr.address}`);
                return false;
            }
        }
        
        return true;
    } catch (e) {
        // DNS resolution failed - could be rebinding attempt or non-existent domain
        console.warn(`[SSRF] DNS resolution failed for ${domain}:`, e);
        return false;
    }
}

export async function extractCompanyFromEmail(email: string): Promise<string | null> {
    try {
        const domain = email.split('@')[1];
        if (!domain) return null;

        if (GENERIC_DOMAINS.has(domain.toLowerCase())) {
            return null; // Cannot determine company from generic provider
        }

        // SSRF Protection: Validate domain before fetching
        const isSafe = await validateDomainSSRF(domain);
        if (!isSafe) {
            console.warn(`[SSRF] Blocked fetch attempt to: ${domain}`);
            return null;
        }

        // Try to fetch the website with security constraints
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

        try {
            const url = `https://${domain}`;
            const res = await fetch(url, {
                signal: controller.signal,
                redirect: 'manual', // Disable auto-redirects for SSRF safety
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; IonosMailer/1.0)',
                    'Accept': 'text/html',
                }
            });
            clearTimeout(timeoutId);

            // Handle redirects manually (validate each hop)
            if (res.status >= 300 && res.status < 400) {
                const location = res.headers.get('Location');
                if (location) {
                    try {
                        const redirectUrl = new URL(location, url);
                        // Only allow redirect to same domain or www subdomain
                        const redirectHost = redirectUrl.hostname.replace(/^www\./, '');
                        const originalHost = domain.replace(/^www\./, '');
                        if (redirectHost !== originalHost) {
                            console.warn(`[SSRF] Blocked cross-domain redirect: ${domain} -> ${redirectHost}`);
                            return null;
                        }
                        // Validate redirect target
                        if (!await validateDomainSSRF(redirectUrl.hostname)) {
                            return null;
                        }
                    } catch {
                        return null;
                    }
                }
                // Don't follow redirects, just return null
                return null;
            }

            if (!res.ok) return null;

            // Limit response size (512KB max)
            const contentLength = res.headers.get('Content-Length');
            if (contentLength && parseInt(contentLength) > 512 * 1024) {
                console.warn(`[SSRF] Response too large from ${domain}: ${contentLength} bytes`);
                return null;
            }

            // Verify content-type
            const contentType = res.headers.get('Content-Type') || '';
            if (!contentType.includes('text/html')) {
                return null;
            }

            const html = await res.text();
            
            // Double-check size after reading
            if (html.length > 512 * 1024) {
                return null;
            }

            const $ = cheerio.load(html);

            // 1. Try meta tags
            let name = $('meta[property="og:site_name"]').attr('content');
            if (name) return name.trim();

            name = $('meta[name="application-name"]').attr('content');
            if (name) return name.trim();

            // 2. Try title
            const title = $('title').text();
            if (title) {
                const separators = ['|', '-', '–', '—', '•', ':'];
                let cleanedTitle = title.trim();

                for (const sep of separators) {
                    if (cleanedTitle.includes(sep)) {
                        const firstPart = cleanedTitle.split(sep)[0].trim();
                        const genericParts = ['Home', 'Startseite', 'Index', 'Welcome', 'Start', 'Willkommen'];
                        if (firstPart.length > 2 && firstPart.length < 60 && !genericParts.includes(firstPart)) {
                            return firstPart;
                        }
                        const secondPart = cleanedTitle.split(sep)[1]?.trim();
                        if (secondPart && secondPart.length > 2 && secondPart.length < 60 && !genericParts.includes(secondPart)) {
                            return secondPart;
                        }
                        break;
                    }
                }

                if (cleanedTitle.length < 40) return cleanedTitle;
            }

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
