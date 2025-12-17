/**
 * Essential Page Generator
 * 
 * Generates markdown content for essential pages: About, Contact, Privacy, Terms, Disclaimer.
 * These pages are required for E-E-A-T compliance and AdSense approval.
 */

import { Author } from '../components/websites/templates/shared/AuthorCard';

export interface SiteInfo {
    siteName: string;
    domain: string;
    niche: string;
    siteTagline?: string;
    email?: string;
    company?: string;
    address?: string;
    author: Author;
}

export interface EssentialPages {
    about: string;
    contact: string;
    privacy: string;
    terms: string;
    disclaimer?: string;
}

/**
 * Generate About page content
 */
export function generateAboutPage(site: SiteInfo): string {
    return `---
title: "About ${site.siteName}"
description: "Learn about ${site.siteName} - your trusted source for ${site.niche} reviews and guides."
layout: page
---

# About ${site.siteName}

Welcome to **${site.siteName}**! ${site.siteTagline || `Your trusted source for ${site.niche}.`}

## Our Mission

We're dedicated to helping you make informed decisions in the ${site.niche} space. Our team of experts researches, tests, and reviews products and services so you don't have to.

## What We Do

- **Expert Reviews**: In-depth, hands-on reviews from industry experts
- **Buying Guides**: Comprehensive guides to help you find exactly what you need
- **Comparisons**: Side-by-side comparisons to simplify your decision-making
- **Latest News**: Stay updated with the latest trends and developments

## Why Trust Us?

- ✅ **Expert Team**: Our writers have years of experience in ${site.niche}
- ✅ **Fact-Checked Content**: Every article is reviewed for accuracy
- ✅ **Independent Reviews**: We maintain editorial independence
- ✅ **Regular Updates**: Content is kept current and relevant

## Meet Our Team

### ${site.author.name}
**${site.author.role}**

${site.author.bio}

${site.author.experience ? `*${site.author.experience}*` : ''}

${site.author.credentials ? site.author.credentials.map(c => `- ✓ ${c}`).join('\n') : ''}

## Contact Us

Have questions or feedback? We'd love to hear from you!

- 📧 Email: ${site.email || `contact@${site.domain}`}
- 🌐 Website: [${site.domain}](https://${site.domain})

---

*${site.siteName} is committed to providing accurate, helpful information. For questions about our editorial process, please visit our [Contact](/contact) page.*
`;
}

/**
 * Generate Contact page content
 */
export function generateContactPage(site: SiteInfo): string {
    return `---
title: "Contact Us - ${site.siteName}"
description: "Get in touch with the ${site.siteName} team. We're here to help with your questions and feedback."
layout: page
---

# Contact Us

We love hearing from our readers! Whether you have a question, feedback, or collaboration opportunity, we're here to help.

## Get In Touch

**Email**: ${site.email || `contact@${site.domain}`}

We typically respond within 24-48 hours on business days.

## What We Can Help With

- **Questions about our content** - Need clarification on an article?
- **Product recommendations** - Looking for specific advice?
- **Corrections or updates** - Found something that needs updating?
- **Partnership inquiries** - Interested in working with us?
- **Media requests** - Press and interview inquiries

## Before You Contact Us

To help us respond more quickly, please include:

1. A clear subject line describing your inquiry
2. Any relevant article links or references
3. Your preferred contact method for our response

## Connect With Us

Stay updated with our latest content:

- Visit our [About](/about) page to learn more about our team
- Check our latest articles on the [homepage](/)

---

*We strive to respond to all inquiries promptly. Thank you for your patience and for being part of our community.*
`;
}

/**
 * Generate Privacy Policy page
 */
export function generatePrivacyPage(site: SiteInfo): string {
    const year = new Date().getFullYear();

    return `---
title: "Privacy Policy - ${site.siteName}"
description: "Privacy Policy for ${site.siteName}. Learn how we collect, use, and protect your personal information."
layout: page
---

# Privacy Policy

*Last updated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}*

At **${site.siteName}** ("we," "our," or "us"), we respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you visit our website.

## Information We Collect

### Information You Provide
- **Contact Information**: When you contact us or subscribe to our newsletter, we may collect your name and email address.
- **Comments and Feedback**: Information you provide when commenting on articles or providing feedback.

### Information Collected Automatically
- **Log Data**: IP address, browser type, pages visited, time spent on pages, and other diagnostic data.
- **Cookies**: We use cookies and similar technologies to enhance your experience.

## How We Use Your Information

We use collected information to:
- Provide and maintain our website
- Respond to your inquiries and requests
- Send newsletters (if you've subscribed)
- Analyze website usage to improve our content
- Display relevant advertisements

## Third-Party Services

### Advertising
We use Google AdSense to display advertisements. Google may use cookies to serve ads based on your prior visits to our website or other sites. You can opt out of personalized advertising at [Google Ads Settings](https://www.google.com/settings/ads).

### Analytics
We use analytics services to understand how visitors interact with our website. These services may collect information about your online activities over time.

## Your Rights

You have the right to:
- Access the personal information we hold about you
- Request correction of inaccurate information
- Request deletion of your personal information
- Opt out of marketing communications
- Withdraw consent where applicable

## Data Security

We implement appropriate security measures to protect your personal information. However, no internet transmission is 100% secure, and we cannot guarantee absolute security.

## Children's Privacy

Our website is not intended for children under 13. We do not knowingly collect personal information from children under 13.

## Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.

## Contact Us

If you have questions about this Privacy Policy, please contact us:

- **Email**: ${site.email || `privacy@${site.domain}`}
- **Website**: [${site.domain}](https://${site.domain})

---

*© ${year} ${site.siteName}. All rights reserved.*
`;
}

/**
 * Generate Terms of Service page
 */
export function generateTermsPage(site: SiteInfo): string {
    const year = new Date().getFullYear();

    return `---
title: "Terms of Service - ${site.siteName}"
description: "Terms of Service for ${site.siteName}. Please read these terms carefully before using our website."
layout: page
---

# Terms of Service

*Last updated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}*

Welcome to **${site.siteName}**. By accessing or using our website, you agree to be bound by these Terms of Service.

## Acceptance of Terms

By accessing and using ${site.siteName}, you accept and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use our website.

## Use of Website

### Permitted Use
You may use our website for personal, non-commercial purposes. You may read, share, and reference our content with proper attribution.

### Prohibited Use
You may not:
- Copy, reproduce, or republish our content without permission
- Use our website for any illegal or unauthorized purpose
- Attempt to gain unauthorized access to our systems
- Interfere with or disrupt our website or servers
- Use automated tools to scrape or download content

## Intellectual Property

All content on ${site.siteName}, including text, graphics, logos, and images, is the property of ${site.siteName} or its content creators and is protected by copyright and other intellectual property laws.

## Disclaimer

### General Disclaimer
The information provided on ${site.siteName} is for general informational purposes only. We make no representations or warranties of any kind regarding the accuracy, completeness, or reliability of any information.

### Not Professional Advice
Our content should not be considered as professional advice. Always consult with qualified professionals before making decisions based on our content.

### Affiliate Links
Some links on our website may be affiliate links. We may earn a commission if you make a purchase through these links, at no additional cost to you.

## Limitation of Liability

To the fullest extent permitted by law, ${site.siteName} shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our website.

## Third-Party Links

Our website may contain links to third-party websites. We are not responsible for the content, privacy policies, or practices of these external sites.

## Changes to Terms

We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting. Your continued use of the website constitutes acceptance of the modified terms.

## Governing Law

These Terms of Service shall be governed by and construed in accordance with applicable laws, without regard to conflicts of law principles.

## Contact Us

If you have questions about these Terms of Service, please contact us:

- **Email**: ${site.email || `legal@${site.domain}`}
- **Website**: [${site.domain}](https://${site.domain})

---

*© ${year} ${site.siteName}. All rights reserved.*
`;
}

/**
 * Generate Disclaimer page (for high-risk niches)
 */
export function generateDisclaimerPage(site: SiteInfo): string {
    return `---
title: "Disclaimer - ${site.siteName}"
description: "Important disclaimers for ${site.siteName} content. Please read before relying on our information."
layout: page
---

# Disclaimer

*Last updated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}*

## General Disclaimer

The information provided on **${site.siteName}** is for general informational and educational purposes only. It should not be considered as professional advice.

## Not Professional Advice

Our content is NOT a substitute for professional advice. Before making any decisions, please consult with qualified professionals in the relevant field.

## Accuracy of Information

While we strive to provide accurate and up-to-date information, we make no representations or warranties about the completeness, accuracy, reliability, suitability, or availability of the information contained on this website.

## Affiliate Disclosure

**${site.siteName}** participates in affiliate programs and may earn commissions from qualifying purchases made through our links. This does not affect our editorial independence or the price you pay.

We only recommend products and services that we believe provide value to our readers.

## External Links

Our website may contain links to external websites that are not under our control. We are not responsible for the content or privacy practices of these sites.

## Limitation of Liability

In no event shall ${site.siteName}, its owners, employees, or affiliates be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of or reliance on any information provided on this website.

## Changes to This Disclaimer

We may update this Disclaimer from time to time. We encourage you to review this page periodically for any changes.

## Contact Us

If you have questions about this Disclaimer, please contact us at ${site.email || `contact@${site.domain}`}.

---

*By using ${site.siteName}, you acknowledge that you have read, understood, and agree to this Disclaimer.*
`;
}

/**
 * Generate all essential pages
 */
export function generateEssentialPages(site: SiteInfo, includeDisclaimer: boolean = false): EssentialPages {
    return {
        about: generateAboutPage(site),
        contact: generateContactPage(site),
        privacy: generatePrivacyPage(site),
        terms: generateTermsPage(site),
        ...(includeDisclaimer ? { disclaimer: generateDisclaimerPage(site) } : {})
    };
}

/**
 * Get list of essential page slugs
 */
export function getEssentialPageSlugs(includeDisclaimer: boolean = false): string[] {
    const slugs = ['about', 'contact', 'privacy', 'terms'];
    if (includeDisclaimer) slugs.push('disclaimer');
    return slugs;
}
