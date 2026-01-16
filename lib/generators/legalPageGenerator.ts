/**
 * Legal Page Generator
 * FSD: lib/generators/legalPageGenerator.ts
 * 
 * Uses Ifrit's AI capabilities to generate professional legal pages
 * for AdSense compliance.
 */

// ============================================================================
// Types
// ============================================================================

export type LegalPageType = 'privacy' | 'terms' | 'about' | 'contact' | 'disclaimer';

export interface SiteInfo {
    siteName: string;
    domain: string;
    niche: string;
    contactEmail: string;
    companyName?: string;
    address?: string;
}

export interface LegalPageResult {
    success: boolean;
    title: string;
    slug: string;
    content: string; // HTML content
    error?: string;
}

// ============================================================================
// Prompts
// ============================================================================

const PRIVACY_POLICY_PROMPT = (site: SiteInfo) => `
Generate a professional Privacy Policy page for a website with the following details:
- Site Name: ${site.siteName}
- Domain: ${site.domain}
- Niche/Topic: ${site.niche}
- Contact Email: ${site.contactEmail}
${site.companyName ? `- Company: ${site.companyName}` : ''}

Requirements:
1. Must be GDPR and CCPA compliant
2. Mention data collection practices for a content/blog website
3. Include sections for:
   - What data we collect
   - How we use cookies (Google AdSense, Analytics)
   - Third-party services (Google AdSense, Analytics, social media)
   - User rights (access, deletion, opt-out)
   - How to contact us
4. Professional but readable tone
5. Include last updated date placeholder: [DATE]

Output ONLY the HTML content for the page body (no <html>, <head>, <body> tags).
Use proper heading hierarchy (h2, h3) and paragraphs.
`;

const TERMS_OF_SERVICE_PROMPT = (site: SiteInfo) => `
Generate professional Terms of Service for a website with the following details:
- Site Name: ${site.siteName}
- Domain: ${site.domain}
- Niche/Topic: ${site.niche}
- Contact Email: ${site.contactEmail}

Requirements:
1. Cover website usage terms
2. Include intellectual property rights
3. Disclaimer for content accuracy (especially for AI-generated content)
4. Limitation of liability
5. Governing law section
6. Changes to terms notice
7. Professional but readable tone

Output ONLY the HTML content for the page body.
Use proper heading hierarchy (h2, h3) and paragraphs.
`;

const ABOUT_PAGE_PROMPT = (site: SiteInfo) => `
Generate an engaging About page for a website with the following details:
- Site Name: ${site.siteName}
- Domain: ${site.domain}
- Niche/Topic: ${site.niche}
- Contact Email: ${site.contactEmail}

Requirements:
1. Explain the site's purpose and mission related to ${site.niche}
2. Build credibility and trust with visitors
3. Mention the value provided to readers
4. Include a brief "why we exist" narrative
5. End with an invitation to explore content
6. Warm, professional, and authentic tone

Output ONLY the HTML content for the page body.
Use proper heading hierarchy (h2, h3) and paragraphs.
Make it engaging and SEO-friendly with natural keyword usage.
`;

const CONTACT_PAGE_PROMPT = (site: SiteInfo) => `
Generate a Contact page for a website with the following details:
- Site Name: ${site.siteName}
- Contact Email: ${site.contactEmail}
${site.address ? `- Address: ${site.address}` : ''}

Requirements:
1. Welcome message inviting people to reach out
2. Display contact email prominently
3. Mention typical response time (1-2 business days)
4. List what inquiries are welcome (feedback, partnerships, questions)
5. Professional and friendly tone

Output ONLY the HTML content for the page body.
Use proper heading hierarchy and include the email as a mailto link.
`;

const DISCLAIMER_PROMPT = (site: SiteInfo) => `
Generate a Disclaimer page for a website with the following details:
- Site Name: ${site.siteName}
- Domain: ${site.domain}
- Niche/Topic: ${site.niche}

Requirements:
1. General disclaimer about content accuracy
2. Affiliate disclosure if applicable
3. "Not professional advice" disclaimer appropriate for ${site.niche}
4. External links disclaimer
5. Professional tone

Output ONLY the HTML content for the page body.
`;

// ============================================================================
// Generator Function
// ============================================================================

/**
 * Generate a legal page using AI
 */
export async function generateLegalPage(
    pageType: LegalPageType,
    siteInfo: SiteInfo,
    apiKey: string,
    provider: 'gemini' | 'deepseek' | 'openrouter' = 'gemini'
): Promise<LegalPageResult> {
    // Select prompt based on page type
    let prompt: string;
    let title: string;
    let slug: string;

    switch (pageType) {
        case 'privacy':
            prompt = PRIVACY_POLICY_PROMPT(siteInfo);
            title = 'Privacy Policy';
            slug = 'privacy-policy';
            break;
        case 'terms':
            prompt = TERMS_OF_SERVICE_PROMPT(siteInfo);
            title = 'Terms of Service';
            slug = 'terms-of-service';
            break;
        case 'about':
            prompt = ABOUT_PAGE_PROMPT(siteInfo);
            title = 'About Us';
            slug = 'about';
            break;
        case 'contact':
            prompt = CONTACT_PAGE_PROMPT(siteInfo);
            title = 'Contact Us';
            slug = 'contact';
            break;
        case 'disclaimer':
            prompt = DISCLAIMER_PROMPT(siteInfo);
            title = 'Disclaimer';
            slug = 'disclaimer';
            break;
        default:
            return {
                success: false,
                title: '',
                slug: '',
                content: '',
                error: `Unknown page type: ${pageType}`,
            };
    }

    try {
        // Use provider adapter directly with provided API key
        const { PROVIDER_ADAPTERS } = await import('@/lib/ai/providers');
        const { PROVIDER_METADATA } = await import('@/lib/ai/providers/metadata');
        const adapter = PROVIDER_ADAPTERS[provider];
        const defaultModel = PROVIDER_METADATA[provider].defaultModel;

        const result = await adapter.chat(apiKey, {
            prompt,
            model: defaultModel,
            maxTokens: 2000,
            temperature: 0.7,
            systemPrompt: 'You are a legal content writer specializing in website compliance documents.',
        });

        if (!result.success || !result.content) {
            return {
                success: false,
                title,
                slug,
                content: '',
                error: result.error || 'Generation failed',
            };
        }

        // Clean up the generated content
        let content = result.content.trim();

        // Remove markdown code fences if present
        content = content.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '');

        // Replace date placeholder with current date
        const today = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        content = content.replace(/\[DATE\]/g, today);

        return {
            success: true,
            title,
            slug,
            content,
        };
    } catch (error) {
        return {
            success: false,
            title,
            slug,
            content: '',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Generate all legal pages at once
 */
export async function generateAllLegalPages(
    siteInfo: SiteInfo,
    apiKey: string,
    provider: 'gemini' | 'deepseek' | 'openrouter' = 'gemini'
): Promise<Record<LegalPageType, LegalPageResult>> {
    const pageTypes: LegalPageType[] = ['privacy', 'terms', 'about', 'contact', 'disclaimer'];
    const results: Record<string, LegalPageResult> = {};

    for (const pageType of pageTypes) {
        console.log(`[LegalPages] Generating ${pageType}...`);
        results[pageType] = await generateLegalPage(pageType, siteInfo, apiKey, provider);

        // Small delay between generations to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results as Record<LegalPageType, LegalPageResult>;
}
