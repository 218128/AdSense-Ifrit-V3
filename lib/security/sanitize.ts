/**
 * HTML Sanitization Utilities
 * 
 * Provides XSS protection for dangerouslySetInnerHTML usages.
 * Uses DOMPurify for secure HTML sanitization.
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content for safe rendering
 * @param html Raw HTML string
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
    if (!html) return '';

    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
            // Text formatting
            'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'mark', 'small', 'del', 'ins', 'sub', 'sup',
            // Headings
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            // Lists
            'ul', 'ol', 'li',
            // Links and media
            'a', 'img', 'figure', 'figcaption', 'picture', 'source',
            // Structure
            'div', 'span', 'section', 'article', 'aside', 'header', 'footer', 'nav', 'main',
            // Tables
            'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
            // Semantic
            'blockquote', 'pre', 'code', 'hr', 'address', 'cite', 'q', 'abbr', 'time',
            // Interactive
            'details', 'summary',
        ],
        ALLOWED_ATTR: [
            // Global
            'id', 'class', 'style', 'title', 'lang', 'dir',
            // Links
            'href', 'target', 'rel',
            // Images
            'src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading', 'decoding',
            // Media
            'type', 'media',
            // Tables
            'colspan', 'rowspan', 'scope',
            // Semantic
            'datetime', 'cite',
            // Accessibility
            'role', 'aria-label', 'aria-describedby', 'aria-hidden',
        ],
        ADD_ATTR: ['target'],
        ALLOW_DATA_ATTR: true,
    });
}

/**
 * Sanitize HTML with minimal allowed tags (text only)
 */
export function sanitizeTextOnly(html: string): string {
    if (!html) return '';

    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'br', 'p', 'span'],
        ALLOWED_ATTR: ['class'],
    });
}

/**
 * Strip all HTML, returning plain text
 */
export function stripHtml(html: string): string {
    if (!html) return '';

    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
    });
}

/**
 * Sanitize JSON-LD schema for safe embedding
 */
export function sanitizeSchema(schemaObj: object): string {
    try {
        const jsonString = JSON.stringify(schemaObj);
        return DOMPurify.sanitize(jsonString, {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: [],
        });
    } catch {
        return '{}';
    }
}

export default {
    sanitizeHtml,
    sanitizeTextOnly,
    stripHtml,
    sanitizeSchema,
};
