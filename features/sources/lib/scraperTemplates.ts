/**
 * Scraper Templates
 * FSD: features/sources/lib/scraperTemplates.ts
 * 
 * Pre-built extraction templates for common CMS platforms.
 */

// ============================================================================
// Types
// ============================================================================

export interface TemplateField {
    name: string;
    selector: string;
    type: 'text' | 'html' | 'attribute' | 'list';
    attribute?: string; // For type: 'attribute'
}

export interface ScraperTemplate {
    id: string;
    name: string;
    description: string;
    /** Domains this template works for (patterns) */
    domains?: string[];
    /** CSS selectors */
    selectors: {
        content: string;
        title: string;
        images?: string;
        author?: string;
        date?: string;
        categories?: string;
    };
    /** Elements to remove */
    removeSelectors: string[];
    /** Custom fields */
    customFields?: TemplateField[];
    /** Is user-created */
    isCustom: boolean;
}

// ============================================================================
// Built-in Templates
// ============================================================================

const BUILTIN_TEMPLATES: ScraperTemplate[] = [
    {
        id: 'wordpress',
        name: 'WordPress (Default)',
        description: 'Works with most WordPress themes',
        selectors: {
            content: '.entry-content, .post-content, article .content',
            title: '.entry-title, .post-title, h1.title',
            images: '.entry-content img, .post-content img',
            author: '.author-name, .byline a, .post-author',
            date: '.entry-date, .post-date, time.published',
            categories: '.cat-links a, .post-categories a',
        },
        removeSelectors: [
            '.sharedaddy', '.jp-relatedposts', '.entry-footer',
            '.post-navigation', '.comments-area', '.widget',
            '.sidebar', '.ad-container', '.newsletter-signup',
        ],
        isCustom: false,
    },
    {
        id: 'mediavine',
        name: 'Mediavine Publisher',
        description: 'Optimized for Mediavine ad-supported sites',
        selectors: {
            content: '.entry-content, .post-content, article',
            title: 'h1.entry-title, h1.post-title',
            images: '.entry-content img:not(.mv-ad)',
            author: '.author-name, .post-author a',
            date: '.entry-date, time.published',
            categories: '.category-list a, .cat-links a',
        },
        removeSelectors: [
            '.mv-ad-box', '[id^="mv-"]', '.adthrive',
            '.comments', '.related-posts', '.sidebar',
            '.newsletter', '.social-share', '.author-box',
        ],
        isCustom: false,
    },
    {
        id: 'blogger',
        name: 'Blogger/Blogspot',
        description: 'Google Blogger platform',
        selectors: {
            content: '.post-body, .entry-content',
            title: '.post-title, h1.entry-title',
            images: '.post-body img',
            author: '.post-author a',
            date: '.date-header, .published',
        },
        removeSelectors: [
            '.post-footer', '.blog-pager', '.sidebar',
            '.feed-links', '#comments', '.post-share-buttons',
        ],
        isCustom: false,
    },
    {
        id: 'medium',
        name: 'Medium',
        description: 'Medium.com articles',
        domains: ['medium.com', '*.medium.com'],
        selectors: {
            content: 'article section',
            title: 'h1',
            images: 'article img',
            author: '[data-testid="authorName"]',
            date: 'time',
        },
        removeSelectors: [
            '.metabar', '[data-testid="headerNav"]',
            '.postActions', '.postFooter',
        ],
        isCustom: false,
    },
    {
        id: 'generic',
        name: 'Generic Article',
        description: 'Best-effort extraction for unknown sites',
        selectors: {
            content: 'article, main, .content, #content, .post',
            title: 'h1',
            images: 'article img, main img, .content img',
            author: '[rel="author"], .author',
            date: 'time, .date, .published',
        },
        removeSelectors: [
            'nav', 'header', 'footer', '.nav', '.header', '.footer',
            '.sidebar', '.widget', '.ad', '.advertisement',
            '.comments', 'script', 'style', 'noscript',
        ],
        isCustom: false,
    },
];

// ============================================================================
// Template Storage Key
// ============================================================================

const CUSTOM_TEMPLATES_KEY = 'ifrit_scraper_templates';

// ============================================================================
// Template Functions
// ============================================================================

/**
 * Get template by ID
 */
export function getTemplate(id: string): ScraperTemplate | undefined {
    // Check built-in first
    const builtin = BUILTIN_TEMPLATES.find(t => t.id === id);
    if (builtin) return builtin;

    // Check custom templates
    const custom = getCustomTemplates();
    return custom.find(t => t.id === id);
}

/**
 * List all available templates
 */
export function listTemplates(): ScraperTemplate[] {
    return [...BUILTIN_TEMPLATES, ...getCustomTemplates()];
}

/**
 * Find best template for a domain
 */
export function findTemplateForDomain(domain: string): ScraperTemplate {
    const allTemplates = listTemplates();

    for (const template of allTemplates) {
        if (template.domains) {
            for (const pattern of template.domains) {
                if (matchDomain(domain, pattern)) {
                    return template;
                }
            }
        }
    }

    // Default to WordPress (most common)
    return BUILTIN_TEMPLATES.find(t => t.id === 'wordpress') || BUILTIN_TEMPLATES[0];
}

/**
 * Create custom template
 */
export function createCustomTemplate(
    template: Omit<ScraperTemplate, 'id' | 'isCustom'>
): ScraperTemplate {
    const custom = getCustomTemplates();
    const newTemplate: ScraperTemplate = {
        ...template,
        id: `custom_${Date.now()}`,
        isCustom: true,
    };

    custom.push(newTemplate);
    saveCustomTemplates(custom);

    return newTemplate;
}

/**
 * Update custom template
 */
export function updateCustomTemplate(
    id: string,
    updates: Partial<ScraperTemplate>
): boolean {
    const custom = getCustomTemplates();
    const index = custom.findIndex(t => t.id === id);

    if (index === -1) return false;

    custom[index] = { ...custom[index], ...updates };
    saveCustomTemplates(custom);

    return true;
}

/**
 * Delete custom template
 */
export function deleteCustomTemplate(id: string): boolean {
    const custom = getCustomTemplates();
    const filtered = custom.filter(t => t.id !== id);

    if (filtered.length === custom.length) return false;

    saveCustomTemplates(filtered);
    return true;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getCustomTemplates(): ScraperTemplate[] {
    if (typeof window === 'undefined') return [];

    try {
        const stored = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function saveCustomTemplates(templates: ScraperTemplate[]): void {
    if (typeof window === 'undefined') return;

    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
}

function matchDomain(domain: string, pattern: string): boolean {
    if (pattern.startsWith('*.')) {
        const suffix = pattern.slice(2);
        return domain.endsWith(suffix) || domain === suffix;
    }
    return domain === pattern;
}
