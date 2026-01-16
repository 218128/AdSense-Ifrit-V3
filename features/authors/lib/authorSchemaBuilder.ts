/**
 * Author Schema Builder
 * FSD: features/authors/lib/authorSchemaBuilder.ts
 * 
 * Generates schema.org Person structured data for authors
 * with full E-E-A-T credentials and expertise.
 */

import type {
    AuthorProfile,
    AuthorSchemaData,
    AuthorCredential,
    SocialProfile
} from '../model/authorTypes';

// ============================================================================
// Schema Generation
// ============================================================================

/**
 * Generate schema.org Person for an author
 */
export function generateAuthorSchema(author: AuthorProfile): AuthorSchemaData {
    const sameAs: string[] = [];

    // Add social profiles
    for (const profile of author.socialProfiles) {
        if (profile.url) {
            sameAs.push(profile.url);
        }
    }

    // Add LinkedIn if available
    if (author.linkedInUrl) {
        sameAs.push(author.linkedInUrl);
    }

    // Add website
    if (author.websiteUrl) {
        sameAs.push(author.websiteUrl);
    }

    // Build expertise list
    const knowsAbout = author.expertise.flatMap(e => [
        e.niche,
        ...e.topics
    ]).filter((v, i, a) => a.indexOf(v) === i); // Unique values

    // Build credentials
    const hasCredential = author.credentials
        .filter(c => c.type === 'degree' || c.type === 'certification')
        .map(c => ({
            '@type': 'EducationalOccupationalCredential' as const,
            name: c.title,
            credentialCategory: c.type === 'degree' ? 'degree' : 'certificate',
        }));

    // Build alumni (from education credentials)
    const alumniOf = author.credentials
        .filter(c => c.type === 'degree' && c.issuer)
        .map(c => ({
            '@type': 'Organization' as const,
            name: c.issuer!,
        }));

    return {
        '@type': 'Person',
        name: author.name,
        url: author.websiteUrl,
        image: author.avatarUrl,
        jobTitle: author.headline,
        description: author.shortBio,
        sameAs: sameAs.length > 0 ? sameAs : undefined,
        knowsAbout: knowsAbout.length > 0 ? knowsAbout : undefined,
        alumniOf: alumniOf.length > 0 ? alumniOf : undefined,
        hasCredential: hasCredential.length > 0 ? hasCredential : undefined,
    };
}

/**
 * Generate full JSON-LD script for author
 */
export function generateAuthorSchemaScript(author: AuthorProfile): string {
    const schema = {
        '@context': 'https://schema.org',
        ...generateAuthorSchema(author)
    };

    return `<script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
</script>`;
}

// ============================================================================
// Article Author Attribution
// ============================================================================

interface ArticleAuthorOptions {
    articleTitle: string;
    articleUrl: string;
    publishedDate: string;
    modifiedDate?: string;
    publisher?: {
        name: string;
        url: string;
        logo?: string;
    };
}

/**
 * Generate Article schema with full author attribution
 */
export function generateArticleWithAuthorSchema(
    author: AuthorProfile,
    options: ArticleAuthorOptions
): object {
    const authorSchema = generateAuthorSchema(author);

    return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: options.articleTitle,
        datePublished: options.publishedDate,
        dateModified: options.modifiedDate || options.publishedDate,
        author: authorSchema,
        publisher: options.publisher ? {
            '@type': 'Organization',
            name: options.publisher.name,
            url: options.publisher.url,
            logo: options.publisher.logo ? {
                '@type': 'ImageObject',
                url: options.publisher.logo
            } : undefined
        } : undefined,
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': options.articleUrl
        }
    };
}

// ============================================================================
// Author Byline Components  
// ============================================================================

/**
 * Generate HTML byline for article
 * Includes inline CSS for WordPress theme compatibility
 */
export function generateAuthorByline(author: AuthorProfile): string {
    const credentialText = author.credentials
        .slice(0, 2)
        .map(c => c.title)
        .join(', ');

    const yearsExp = Math.max(
        ...author.expertise.map(e => e.yearsExperience),
        0
    );

    let byline = `<div class="author-byline" style="display:inline-block;padding:8px 16px;margin:16px 0;background:#edf2f7;border-radius:6px;font-size:14px;color:#4a5568;">`;
    byline += `By <span style="font-weight:600;color:#2d3748;">${author.name}</span>`;

    if (credentialText) {
        byline += `, <span style="color:#718096;">${credentialText}</span>`;
    }

    if (yearsExp > 0) {
        byline += ` <span style="color:#718096;">(${yearsExp}+ years experience)</span>`;
    }

    byline += `</div>`;

    return byline;
}

/**
 * Generate author bio box for end of article
 * Includes inline CSS for WordPress theme compatibility
 */
export function generateAuthorBioBox(author: AuthorProfile): string {
    const socialLinks = author.socialProfiles
        .map(p => `<a href="${p.url}" style="color:#3182ce;text-decoration:none;margin-right:12px;" 
                     target="_blank" rel="noopener">${p.platform}</a>`)
        .join(' ');

    return `
<div class="author-bio-box" itemscope itemtype="https://schema.org/Person" 
     style="display:flex;gap:20px;padding:24px;margin:32px 0;background:#f8f9fa;border-radius:12px;border:1px solid #e2e8f0;">
    <div class="author-avatar" style="flex-shrink:0;">
        ${author.avatarUrl
            ? `<img src="${author.avatarUrl}" alt="${author.name}" itemprop="image" 
                    style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #e2e8f0;" />`
            : `<div style="width:80px;height:80px;border-radius:50%;background:#4299e1;color:white;
                          display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:bold;">
                ${author.name.charAt(0)}</div>`
        }
    </div>
    <div class="author-info" style="flex:1;">
        <h4 class="author-name" itemprop="name" 
            style="margin:0 0 4px 0;font-size:18px;font-weight:600;color:#1a202c;">About ${author.name}</h4>
        <p class="author-headline" itemprop="jobTitle" 
           style="margin:0 0 8px 0;font-size:14px;color:#4a5568;font-weight:500;">${author.headline}</p>
        <p class="author-bio" itemprop="description" 
           style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#4a5568;">${author.shortBio}</p>
        ${socialLinks ? `<div style="font-size:14px;">${socialLinks}</div>` : ''}
    </div>
</div>`;
}

// ============================================================================
// E-E-A-T Signal Injection
// ============================================================================

/**
 * Get expertise statement for niche
 */
export function getExpertiseStatement(author: AuthorProfile, niche: string): string {
    const expertise = author.expertise.find(e =>
        e.niche.toLowerCase().includes(niche.toLowerCase())
    );

    if (!expertise) {
        return '';
    }

    const levelPhrases: Record<string, string> = {
        beginner: 'recently started working in',
        intermediate: 'have been working in',
        advanced: 'have extensive experience in',
        expert: 'am a recognized expert in'
    };

    return `I ${levelPhrases[expertise.level]} ${expertise.niche} for over ${expertise.yearsExperience} years.`;
}

/**
 * Get credential mention for article intro
 */
export function getCredentialMention(author: AuthorProfile): string {
    const topCredential = author.credentials[0];
    if (!topCredential) {
        return '';
    }

    switch (topCredential.type) {
        case 'degree':
            return `As someone with a ${topCredential.title}${topCredential.issuer ? ` from ${topCredential.issuer}` : ''},`;
        case 'certification':
            return `As a ${topCredential.title}-certified professional,`;
        case 'experience':
            return `With ${topCredential.description || 'extensive professional experience'},`;
        default:
            return '';
    }
}

/**
 * Get first-hand experience phrase for topic
 */
export function getFirstHandPhrase(author: AuthorProfile, topic: string): string {
    const randomPhrase = author.eeatSignals.firstHandPhrases[
        Math.floor(Math.random() * author.eeatSignals.firstHandPhrases.length)
    ];

    return randomPhrase || 'In my experience,';
}

/**
 * Generate complete E-E-A-T intro paragraph
 */
export function generateEEATIntro(
    author: AuthorProfile,
    niche: string,
    topic: string
): string {
    const credential = getCredentialMention(author);
    const expertise = getExpertiseStatement(author, niche);
    const firstHand = getFirstHandPhrase(author, topic);

    if (!credential && !expertise) {
        return '';
    }

    let intro = '';

    if (credential) {
        intro += credential + ' ';
    }

    if (expertise) {
        intro += expertise + ' ';
    }

    intro += firstHand;

    return intro.trim();
}

// ============================================================================
// Disclosure Generation
// ============================================================================

/**
 * Generate appropriate disclosures for content type
 */
export function generateDisclosures(
    author: AuthorProfile,
    contentType: 'affiliate' | 'review' | 'sponsored' | 'general'
): string {
    const disclosures: string[] = [];

    // Always add update commitment
    if (author.eeatSignals.updateCommitment) {
        disclosures.push(author.eeatSignals.updateCommitment);
    }

    // Add type-specific disclosures
    switch (contentType) {
        case 'affiliate':
            disclosures.unshift(
                author.eeatSignals.disclosures[0] ||
                'This article may contain affiliate links. We may earn a commission at no extra cost to you.'
            );
            break;
        case 'review':
            disclosures.unshift(
                'I personally tested and evaluated this product before writing this review.'
            );
            break;
        case 'sponsored':
            disclosures.unshift(
                'This content was sponsored, but all opinions are my own and based on genuine experience.'
            );
            break;
    }

    return disclosures.map(d => `<p class="disclosure">${d}</p>`).join('\n');
}
