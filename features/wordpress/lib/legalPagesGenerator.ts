/**
 * Legal Pages Generator
 * FSD: features/wordpress/lib/legalPagesGenerator.ts
 * 
 * Auto-generates AdSense-required legal pages:
 * - Privacy Policy
 * - Terms of Service
 * - About Page
 * - Contact Page
 * - Cookie Policy (GDPR)
 * 
 * Uses AI capabilities with proper disclosure templates.
 */

import type { WPSite } from '../model/wpSiteTypes';

// ============================================================================
// Types
// ============================================================================

export interface LegalPageConfig {
    /** Site name for the pages */
    siteName: string;
    /** Site URL */
    siteUrl: string;
    /** Contact email */
    contactEmail: string;
    /** Business name (if different from site name) */
    businessName?: string;
    /** Business address */
    businessAddress?: string;
    /** Effective date for policies */
    effectiveDate?: string;
    /** Include GDPR compliance */
    gdprCompliant?: boolean;
    /** Include CCPA compliance */
    ccpaCompliant?: boolean;
    /** Analytics used */
    analyticsUsed?: ('google-analytics' | 'google-adsense' | 'facebook-pixel')[];
}

export interface GeneratedLegalPage {
    title: string;
    slug: string;
    content: string;
    pageType: 'privacy' | 'terms' | 'about' | 'contact' | 'cookies' | 'disclaimer';
}

export interface LegalPagesResult {
    success: boolean;
    pages: GeneratedLegalPage[];
    errors: string[];
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Partial<LegalPageConfig> = {
    effectiveDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }),
    gdprCompliant: true,
    ccpaCompliant: true,
    analyticsUsed: ['google-analytics', 'google-adsense'],
};

// ============================================================================
// Legal Page Templates
// ============================================================================

/**
 * Generate Privacy Policy HTML
 */
function generatePrivacyPolicy(config: LegalPageConfig): string {
    const { siteName, siteUrl, contactEmail, effectiveDate, gdprCompliant, ccpaCompliant, analyticsUsed } = config;

    const analyticsSection = analyticsUsed?.includes('google-analytics')
        ? `<h3>Google Analytics</h3>
           <p>We use Google Analytics to analyze traffic on our website. Google Analytics uses cookies to collect information about how visitors use our site. This information is used to compile reports and help us improve the site. The cookies collect information in anonymous form, including the number of visitors to the site, where visitors have come to the site from, and the pages they visited.</p>`
        : '';

    const adsenseSection = analyticsUsed?.includes('google-adsense')
        ? `<h3>Google AdSense</h3>
           <p>We use Google AdSense to display advertisements on our website. Google AdSense uses cookies to serve ads based on your prior visits to our website or other websites. You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads">Google Ads Settings</a>.</p>`
        : '';

    const gdprSection = gdprCompliant
        ? `<h2>Your Rights Under GDPR</h2>
           <p>If you are a resident of the European Economic Area (EEA), you have certain data protection rights:</p>
           <ul>
               <li>The right to access – You have the right to request copies of your personal data.</li>
               <li>The right to rectification – You have the right to request that we correct any information you believe is inaccurate.</li>
               <li>The right to erasure – You have the right to request that we erase your personal data, under certain conditions.</li>
               <li>The right to restrict processing – You have the right to request that we restrict the processing of your personal data.</li>
               <li>The right to object to processing – You have the right to object to our processing of your personal data.</li>
               <li>The right to data portability – You have the right to request that we transfer the data to another organization, or directly to you.</li>
           </ul>`
        : '';

    const ccpaSection = ccpaCompliant
        ? `<h2>California Privacy Rights (CCPA)</h2>
           <p>If you are a California resident, you have the right to:</p>
           <ul>
               <li>Request disclosure of personal information collected about you</li>
               <li>Request deletion of your personal information</li>
               <li>Opt-out of the sale of your personal information</li>
           </ul>
           <p>To exercise these rights, please contact us at ${contactEmail}.</p>`
        : '';

    return `
<article class="legal-page privacy-policy">
    <h1>Privacy Policy</h1>
    <p><strong>Effective Date:</strong> ${effectiveDate}</p>
    
    <p>${siteName} ("we", "us", or "our") operates the website ${siteUrl}. This page informs you of our policies regarding the collection, use, and disclosure of personal information when you use our website.</p>
    
    <h2>Information We Collect</h2>
    <p>We may collect the following types of information:</p>
    <ul>
        <li><strong>Log Data:</strong> When you visit our website, our servers automatically log information including your IP address, browser type, pages visited, time spent on pages, and other statistics.</li>
        <li><strong>Cookies:</strong> We use cookies and similar tracking technologies to track activity on our website and hold certain information.</li>
    </ul>
    
    <h2>How We Use Your Information</h2>
    <p>We use the collected information for various purposes:</p>
    <ul>
        <li>To provide and maintain our website</li>
        <li>To notify you about changes to our website</li>
        <li>To allow you to participate in interactive features</li>
        <li>To provide customer support</li>
        <li>To gather analysis or valuable information to improve our website</li>
        <li>To monitor the usage of our website</li>
        <li>To detect, prevent, and address technical issues</li>
    </ul>
    
    <h2>Third-Party Services</h2>
    ${analyticsSection}
    ${adsenseSection}
    
    <h2>Cookies</h2>
    <p>Cookies are files with small amounts of data that may include an anonymous unique identifier. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.</p>
    
    ${gdprSection}
    ${ccpaSection}
    
    <h2>Contact Us</h2>
    <p>If you have any questions about this Privacy Policy, please contact us:</p>
    <ul>
        <li>By email: ${contactEmail}</li>
        <li>By visiting: ${siteUrl}/contact</li>
    </ul>
</article>`;
}

/**
 * Generate Terms of Service HTML
 */
function generateTermsOfService(config: LegalPageConfig): string {
    const { siteName, siteUrl, contactEmail, effectiveDate } = config;

    return `
<article class="legal-page terms-of-service">
    <h1>Terms of Service</h1>
    <p><strong>Effective Date:</strong> ${effectiveDate}</p>
    
    <p>Please read these Terms of Service ("Terms") carefully before using ${siteUrl} (the "Service") operated by ${siteName} ("us", "we", or "our").</p>
    
    <h2>1. Acceptance of Terms</h2>
    <p>By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the Service.</p>
    
    <h2>2. Use of Content</h2>
    <p>The content on this website is for general information purposes only. While we strive to keep the information up to date and correct, we make no representations or warranties of any kind about the completeness, accuracy, reliability, suitability, or availability of the information, products, services, or related graphics contained on the website.</p>
    
    <h2>3. Intellectual Property</h2>
    <p>The Service and its original content, features, and functionality are and will remain the exclusive property of ${siteName}. The Service is protected by copyright, trademark, and other laws. Our trademarks may not be used in connection with any product or service without the prior written consent of ${siteName}.</p>
    
    <h2>4. User Conduct</h2>
    <p>You agree not to:</p>
    <ul>
        <li>Use the Service for any unlawful purpose</li>
        <li>Attempt to gain unauthorized access to any portion of the Service</li>
        <li>Interfere with or disrupt the Service or servers</li>
        <li>Use automated systems to access the Service without permission</li>
    </ul>
    
    <h2>5. Disclaimer</h2>
    <p>Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied.</p>
    
    <h2>6. Limitation of Liability</h2>
    <p>In no event shall ${siteName}, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.</p>
    
    <h2>7. Changes to Terms</h2>
    <p>We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect.</p>
    
    <h2>8. Contact Us</h2>
    <p>If you have any questions about these Terms, please contact us at ${contactEmail}.</p>
</article>`;
}

/**
 * Generate Cookie Policy HTML (GDPR)
 */
function generateCookiePolicy(config: LegalPageConfig): string {
    const { siteName, siteUrl, contactEmail, effectiveDate } = config;

    return `
<article class="legal-page cookie-policy">
    <h1>Cookie Policy</h1>
    <p><strong>Effective Date:</strong> ${effectiveDate}</p>
    
    <p>This Cookie Policy explains how ${siteName} uses cookies and similar technologies on ${siteUrl}.</p>
    
    <h2>What Are Cookies?</h2>
    <p>Cookies are small text files that are placed on your device when you visit a website. They are widely used to make websites work more efficiently and to provide information to website owners.</p>
    
    <h2>How We Use Cookies</h2>
    <p>We use cookies for the following purposes:</p>
    <ul>
        <li><strong>Essential Cookies:</strong> Required for the website to function properly</li>
        <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our website</li>
        <li><strong>Advertising Cookies:</strong> Used to deliver relevant advertisements and track ad campaign performance</li>
    </ul>
    
    <h2>Third-Party Cookies</h2>
    <p>We use third-party services that may set cookies on your device:</p>
    <ul>
        <li><strong>Google Analytics:</strong> Tracks website traffic and usage patterns</li>
        <li><strong>Google AdSense:</strong> Displays personalized advertisements</li>
    </ul>
    
    <h2>Managing Cookies</h2>
    <p>Most web browsers allow you to control cookies through their settings. You can:</p>
    <ul>
        <li>Delete existing cookies</li>
        <li>Block all cookies</li>
        <li>Allow all cookies</li>
        <li>Block third-party cookies</li>
    </ul>
    
    <p>Note that blocking cookies may affect website functionality.</p>
    
    <h2>Contact Us</h2>
    <p>For questions about our cookie policy, contact us at ${contactEmail}.</p>
</article>`;
}

/**
 * Generate Disclaimer Page HTML
 */
function generateDisclaimer(config: LegalPageConfig): string {
    const { siteName, contactEmail, effectiveDate } = config;

    return `
<article class="legal-page disclaimer">
    <h1>Disclaimer</h1>
    <p><strong>Last Updated:</strong> ${effectiveDate}</p>
    
    <h2>General Information</h2>
    <p>The information provided on ${siteName} is for general informational purposes only. All information on the site is provided in good faith, however, we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information on the site.</p>
    
    <h2>Not Professional Advice</h2>
    <p>The information on this website does not constitute professional advice. Before taking any actions based on information found on this website, you should consult with a qualified professional.</p>
    
    <h2>Affiliate Disclosure</h2>
    <p>This site may contain affiliate links. This means we may earn a commission if you click on a link and make a purchase. This comes at no additional cost to you.</p>
    
    <h2>Advertising Disclosure</h2>
    <p>This website displays advertisements through Google AdSense and may receive compensation from advertisers. The presence of ads does not constitute an endorsement of the advertised products or services.</p>
    
    <h2>External Links</h2>
    <p>This website may contain links to external websites. We have no control over the content and nature of these sites and are not responsible for their content or privacy practices.</p>
    
    <h2>Contact</h2>
    <p>For questions about this disclaimer, contact us at ${contactEmail}.</p>
</article>`;
}

// ============================================================================
// Main Generator Function
// ============================================================================

/**
 * Generate all required legal pages for AdSense compliance
 */
export async function generateLegalPages(
    site: WPSite,
    configOverrides?: Partial<LegalPageConfig>
): Promise<LegalPagesResult> {
    const result: LegalPagesResult = {
        success: false,
        pages: [],
        errors: [],
    };

    // Build config from site and overrides
    const config: LegalPageConfig = {
        siteName: site.name || site.url.replace(/https?:\/\//, '').replace(/\/$/, ''),
        siteUrl: site.url,
        contactEmail: configOverrides?.contactEmail || `contact@${new URL(site.url).hostname}`,
        ...DEFAULT_CONFIG,
        ...configOverrides,
    };

    try {
        // Generate Privacy Policy
        result.pages.push({
            title: 'Privacy Policy',
            slug: 'privacy-policy',
            content: generatePrivacyPolicy(config),
            pageType: 'privacy',
        });

        // Generate Terms of Service
        result.pages.push({
            title: 'Terms of Service',
            slug: 'terms-of-service',
            content: generateTermsOfService(config),
            pageType: 'terms',
        });

        // Generate Cookie Policy (GDPR)
        if (config.gdprCompliant) {
            result.pages.push({
                title: 'Cookie Policy',
                slug: 'cookie-policy',
                content: generateCookiePolicy(config),
                pageType: 'cookies',
            });
        }

        // Generate Disclaimer
        result.pages.push({
            title: 'Disclaimer',
            slug: 'disclaimer',
            content: generateDisclaimer(config),
            pageType: 'disclaimer',
        });

        result.success = true;

    } catch (error) {
        result.errors.push(error instanceof Error ? error.message : 'Generation failed');
    }

    return result;
}

/**
 * Publish legal pages to WordPress
 */
export async function publishLegalPages(
    site: WPSite,
    pages: GeneratedLegalPage[]
): Promise<{ success: boolean; publishedPages: { slug: string; postId: number }[]; errors: string[] }> {
    const result = {
        success: false,
        publishedPages: [] as { slug: string; postId: number }[],
        errors: [] as string[],
    };

    const auth = Buffer.from(`${site.username}:${site.appPassword}`).toString('base64');

    for (const page of pages) {
        try {
            const response = await fetch(`${site.url}/wp-json/wp/v2/pages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${auth}`,
                },
                body: JSON.stringify({
                    title: page.title,
                    slug: page.slug,
                    content: page.content,
                    status: 'publish',
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                result.errors.push(`Failed to publish ${page.title}: ${error}`);
                continue;
            }

            const data = await response.json();
            result.publishedPages.push({
                slug: page.slug,
                postId: data.id,
            });

        } catch (error) {
            result.errors.push(`${page.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    result.success = result.publishedPages.length === pages.length;
    return result;
}

/**
 * Check if site has required legal pages
 */
export async function checkLegalPagesExist(site: WPSite): Promise<{
    hasPrivacy: boolean;
    hasTerms: boolean;
    hasCookies: boolean;
    hasDisclaimer: boolean;
    missingPages: string[];
}> {
    const requiredSlugs = ['privacy-policy', 'terms-of-service'];
    const optionalSlugs = ['cookie-policy', 'disclaimer'];

    const result = {
        hasPrivacy: false,
        hasTerms: false,
        hasCookies: false,
        hasDisclaimer: false,
        missingPages: [] as string[],
    };

    try {
        const response = await fetch(`${site.url}/wp-json/wp/v2/pages?per_page=100`);
        if (!response.ok) return result;

        const pages = await response.json() as Array<{ slug: string }>;
        const slugs = pages.map(p => p.slug);

        result.hasPrivacy = slugs.some(s => s.includes('privacy'));
        result.hasTerms = slugs.some(s => s.includes('terms'));
        result.hasCookies = slugs.some(s => s.includes('cookie'));
        result.hasDisclaimer = slugs.some(s => s.includes('disclaimer'));

        if (!result.hasPrivacy) result.missingPages.push('Privacy Policy');
        if (!result.hasTerms) result.missingPages.push('Terms of Service');

    } catch {
        result.missingPages = ['Privacy Policy', 'Terms of Service'];
    }

    return result;
}
