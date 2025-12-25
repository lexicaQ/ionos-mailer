import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Uses DOMPurify with strict configuration for email content
 */
export function sanitizeHtml(html: string): string {
    if (typeof window === 'undefined') {
        // Server-side: strip all HTML (no DOM available)
        return html.replace(/<[^>]*>/g, '');
    }

    return DOMPurify.sanitize(html, {
        // Allowed tags for email content
        ALLOWED_TAGS: [
            'a', 'b', 'i', 'u', 'strong', 'em', 'p', 'br', 'div', 'span',
            'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'img', 'hr', 'sub', 'sup', 'small', 'mark'
        ],
        // Allowed attributes
        ALLOWED_ATTR: [
            'href', 'src', 'alt', 'title', 'class', 'style',
            'target', 'rel', 'width', 'height', 'colspan', 'rowspan',
            'align', 'valign', 'border', 'cellpadding', 'cellspacing'
        ],
        // Force safe link attributes
        ADD_ATTR: ['target'],
        // URL schemes allowed in href/src
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        // Forbid dangerous tags
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select'],
        // Forbid dangerous attributes (event handlers)
        FORBID_ATTR: [
            'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover',
            'onmousemove', 'onmouseout', 'onkeydown', 'onkeypress', 'onkeyup',
            'onload', 'onerror', 'onabort', 'onfocus', 'onblur', 'onchange',
            'onsubmit', 'onreset', 'onselect', 'oninput', 'onscroll',
            'onanimationstart', 'onanimationend', 'ontransitionend'
        ],
    });
}

/**
 * Sanitize HTML for preview (more strict, strips most formatting)
 */
export function sanitizeHtmlPreview(html: string): string {
    if (typeof window === 'undefined') {
        return html.replace(/<[^>]*>/g, '');
    }

    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['b', 'i', 'strong', 'em', 'p', 'br', 'span'],
        ALLOWED_ATTR: [],
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'img', 'style', 'link'],
        FORBID_ATTR: ['onclick', 'onerror', 'onload', 'style'],
    });
}

/**
 * Add security attributes to links
 */
export function secureLinks(html: string): string {
    if (typeof window === 'undefined') {
        return html;
    }

    // Process with DOMPurify hook to add rel="noopener noreferrer" to all external links
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
        if (node.tagName === 'A') {
            const href = node.getAttribute('href') || '';
            if (href.startsWith('http://') || href.startsWith('https://')) {
                node.setAttribute('target', '_blank');
                node.setAttribute('rel', 'noopener noreferrer');
            }
        }
    });

    const result = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['a', 'b', 'i', 'u', 'strong', 'em', 'p', 'br', 'div', 'span',
            'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'img', 'table', 'tr', 'td', 'th', 'thead', 'tbody'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel', 'width', 'height'],
        ADD_ATTR: ['target', 'rel'],
    });

    // Remove hook after use
    DOMPurify.removeHook('afterSanitizeAttributes');

    return result;
}
