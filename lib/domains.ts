export const GENERIC_DOMAINS = new Set([
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.de', 'ymail.com',
    'hotmail.com', 'hotmail.de', 'outlook.com', 'outlook.de', 'live.com', 'live.de',
    'icloud.com', 'me.com', 'mac.com',
    'aol.com', 'aol.de',
    'gmx.de', 'gmx.net', 'gmx.at', 'gmx.ch',
    'web.de',
    't-online.de',
    'freenet.de',
    'arcor.de',
    'protonmail.com', 'proton.me',
    'yandex.com', 'yandex.ru',
    'mail.com', 'mail.ru'
]);

export function isGenericDomain(email: string): boolean {
    const domain = email.split('@')[1];
    if (!domain) return false;
    return GENERIC_DOMAINS.has(domain.toLowerCase());
}
