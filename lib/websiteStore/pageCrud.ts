/**
 * Structural Pages CRUD Operations
 * 
 * Management of About, Contact, Privacy, Terms pages
 */

import * as fs from 'fs';
import * as path from 'path';

import type { Article, StructuralPageType } from './types';
import {
    getPagesDir,
    getPagePath,
    ensureWebsiteDir
} from './paths';

// Forward declaration for circular dependency resolution
let _incrementPendingChanges: (domain: string) => void;

/**
 * Initialize dependencies from main websiteStore
 */
export function _initPageCrudDeps(deps: {
    incrementPendingChanges: typeof _incrementPendingChanges;
}) {
    _incrementPendingChanges = deps.incrementPendingChanges;
}

// ============================================
// STRUCTURAL PAGES CRUD
// ============================================

/**
 * List all structural pages for a website
 */
export function listPages(domain: string): Article[] {
    const pagesDir = getPagesDir(domain);

    if (!fs.existsSync(pagesDir)) {
        return [];
    }

    const pages: Article[] = [];
    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
        try {
            const data = fs.readFileSync(path.join(pagesDir, file), 'utf-8');
            pages.push(JSON.parse(data));
        } catch {
            // Skip invalid files
        }
    }

    return pages;
}

/**
 * Get a structural page by type
 */
export function getPage(domain: string, pageType: StructuralPageType): Article | null {
    const pagePath = getPagePath(domain, pageType);

    if (!fs.existsSync(pagePath)) {
        return null;
    }

    try {
        const data = fs.readFileSync(pagePath, 'utf-8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}

/**
 * Save a structural page
 */
export function savePage(domain: string, page: Article): void {
    ensureWebsiteDir(domain);

    if (!page.structuralType) {
        throw new Error('Page must have a structuralType');
    }

    const pagePath = getPagePath(domain, page.structuralType);
    fs.writeFileSync(pagePath, JSON.stringify(page, null, 2));
    _incrementPendingChanges(domain);
}

/**
 * Update a structural page
 */
export function updatePage(domain: string, pageType: StructuralPageType, updates: Partial<Article>): Article | null {
    const page = getPage(domain, pageType);
    if (!page) return null;

    const updated = {
        ...page,
        ...updates,
        lastModifiedAt: Date.now()
    };
    savePage(domain, updated);

    return updated;
}

/**
 * Delete a structural page
 */
export function deletePage(domain: string, pageType: StructuralPageType): boolean {
    const pagePath = getPagePath(domain, pageType);

    if (fs.existsSync(pagePath)) {
        fs.unlinkSync(pagePath);
        _incrementPendingChanges(domain);
        return true;
    }

    return false;
}

/**
 * Create default structural pages for a website
 */
export function createDefaultPages(domain: string, siteName: string, author: { name: string; role: string; bio?: string }): void {
    const now = Date.now();

    const defaultPages: Partial<Article>[] = [
        {
            id: `page_about_${now}`,
            slug: 'about',
            title: `About ${siteName}`,
            description: `Learn more about ${siteName} and our team.`,
            pageType: 'structural',
            structuralType: 'about',
            content: `# About ${siteName}\n\n${siteName} is your trusted source for expert insights and guides.\n\n## Our Mission\n\nWe're dedicated to providing accurate, helpful information to our readers.\n\n## Meet Our Team\n\n### ${author.name}\n**${author.role}**\n\n${author.bio || 'Passionate about creating valuable content.'}`,
        },
        {
            id: `page_contact_${now}`,
            slug: 'contact',
            title: `Contact Us - ${siteName}`,
            description: `Get in touch with the ${siteName} team.`,
            pageType: 'structural',
            structuralType: 'contact',
            content: `# Contact Us\n\nWe'd love to hear from you!\n\n## Get In Touch\n\n**Email**: contact@${domain}\n\n## What We Can Help With\n\n- General questions\n- Feedback on our content\n- Partnership opportunities`,
        },
        {
            id: `page_privacy_${now}`,
            slug: 'privacy',
            title: `Privacy Policy - ${siteName}`,
            description: `Privacy Policy for ${siteName}.`,
            pageType: 'structural',
            structuralType: 'privacy',
            content: `# Privacy Policy\n\n*Last updated: ${new Date().toLocaleDateString()}*\n\nThis Privacy Policy describes how ${siteName} collects, uses, and protects your information.\n\n## Information We Collect\n\nWe collect information you provide directly and through cookies/analytics.\n\n## How We Use Your Information\n\n- To improve our content\n- To communicate with you\n- To comply with legal obligations`,
        },
        {
            id: `page_terms_${now}`,
            slug: 'terms',
            title: `Terms of Service - ${siteName}`,
            description: `Terms of Service for ${siteName}.`,
            pageType: 'structural',
            structuralType: 'terms',
            content: `# Terms of Service\n\n*Last updated: ${new Date().toLocaleDateString()}*\n\nBy using ${siteName}, you agree to these Terms of Service.\n\n## Use of Content\n\nAll content is provided for informational purposes only.\n\n## Intellectual Property\n\nAll content is owned by ${siteName} unless otherwise noted.`,
        },
    ];

    for (const pageData of defaultPages) {
        const page: Article = {
            ...pageData as Article,
            category: 'Pages',
            tags: [],
            contentType: 'structural',
            wordCount: (pageData.content || '').split(/\s+/).length,
            readingTime: Math.ceil((pageData.content || '').split(/\s+/).length / 200),
            eeatSignals: [],
            aiOverviewBlocks: [],
            isExternal: false,
            source: 'manual',
            status: 'published',
            lastModifiedAt: now,
            publishedAt: now,
        };
        savePage(domain, page);
    }
}
