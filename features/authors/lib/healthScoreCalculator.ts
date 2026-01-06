/**
 * Author Health Calculator
 * FSD: features/authors/lib/healthScoreCalculator.ts
 * 
 * Calculates author health score based on profile completeness,
 * credentials, social presence, and content track record.
 */

import type {
    AuthorProfile,
    AuthorHealthScore,
    AuthorHealthCheckItem,
    AuthorHealthRecommendation,
    DEFAULT_HEALTH_CHECKLIST,
    HEALTH_SCORE_THRESHOLDS,
} from '../model/authorTypes';

// ============================================================================
// Checklist Evaluation
// ============================================================================

/**
 * Check if author has a valid profile photo
 */
function checkHasPhoto(author: AuthorProfile): boolean {
    return !!(author.avatarUrl && author.avatarUrl.length > 10);
}

/**
 * Check if bio has 100+ words
 */
function checkHasBio100(author: AuthorProfile): boolean {
    const wordCount = author.bio.split(/\s+/).filter(w => w.length > 0).length;
    return wordCount >= 100;
}

/**
 * Check if has about page URL
 */
function checkHasAboutUrl(author: AuthorProfile): boolean {
    return !!(author.websiteUrl && author.websiteUrl.includes('/about'));
}

/**
 * Check if has at least 1 credential
 */
function checkHasCredential(author: AuthorProfile): boolean {
    return author.credentials.length >= 1;
}

/**
 * Check if has a verified credential (with URL)
 */
function checkCredentialVerified(author: AuthorProfile): boolean {
    return author.credentials.some(c => c.url && c.url.length > 10);
}

/**
 * Check if has 3+ expertise areas
 */
function checkHasExpertise3(author: AuthorProfile): boolean {
    return author.expertise.length >= 3;
}

/**
 * Check if has LinkedIn profile
 */
function checkHasLinkedIn(author: AuthorProfile): boolean {
    return !!(
        author.linkedInUrl ||
        author.socialProfiles.some(s => s.platform === 'linkedin' && s.url)
    );
}

/**
 * Check if has Twitter profile
 */
function checkHasTwitter(author: AuthorProfile): boolean {
    return author.socialProfiles.some(s => s.platform === 'twitter' && s.url);
}

/**
 * Check if has personal website
 */
function checkHasWebsite(author: AuthorProfile): boolean {
    return !!(
        author.websiteUrl ||
        author.socialProfiles.some(s => s.platform === 'website' && s.url)
    );
}

/**
 * Check if has 5+ published articles
 */
function checkHasPublished5(author: AuthorProfile): boolean {
    return author.articlesPublished >= 5;
}

/**
 * Check if avg E-E-A-T score >= 70
 */
function checkAvgEEAT70(author: AuthorProfile): boolean {
    return (author.averageEEATScore || 0) >= 70;
}

/**
 * Map of check functions
 */
const CHECK_FUNCTIONS: Record<string, (author: AuthorProfile) => boolean> = {
    'has_photo': checkHasPhoto,
    'has_bio_100': checkHasBio100,
    'has_about_url': checkHasAboutUrl,
    'has_credential': checkHasCredential,
    'credential_verified': checkCredentialVerified,
    'has_expertise_3': checkHasExpertise3,
    'has_linkedin': checkHasLinkedIn,
    'has_twitter': checkHasTwitter,
    'has_website': checkHasWebsite,
    'has_published_5': checkHasPublished5,
    'avg_eeat_70': checkAvgEEAT70,
};

// ============================================================================
// Health Score Calculation
// ============================================================================

/**
 * Calculate complete author health score
 */
export function calculateAuthorHealthScore(author: AuthorProfile): AuthorHealthScore {
    // Build checklist with completion status
    const checklist: AuthorHealthCheckItem[] = [
        // Identity (25 points)
        {
            id: 'has_photo',
            label: 'Profile Photo',
            description: 'Professional headshot or avatar',
            category: 'identity',
            required: true,
            weight: 10,
            completed: checkHasPhoto(author),
            actionRequired: 'Upload a professional photo URL',
        },
        {
            id: 'has_bio_100',
            label: 'Bio (100+ words)',
            description: 'Detailed biography establishing expertise',
            category: 'identity',
            required: true,
            weight: 10,
            completed: checkHasBio100(author),
            actionRequired: 'Write a bio with at least 100 words',
        },
        {
            id: 'has_about_url',
            label: 'About Page URL',
            description: 'Link to author page on website',
            category: 'identity',
            required: false,
            weight: 5,
            completed: checkHasAboutUrl(author),
            actionRequired: 'Create an About page and add the URL',
        },

        // Credentials (30 points)
        {
            id: 'has_credential',
            label: 'At Least 1 Credential',
            description: 'Degree, certification, or professional credential',
            category: 'credentials',
            required: true,
            weight: 15,
            completed: checkHasCredential(author),
            actionRequired: 'Add your most relevant credential',
        },
        {
            id: 'credential_verified',
            label: 'Verified Credential',
            description: 'At least one credential with verification URL',
            category: 'credentials',
            required: false,
            weight: 10,
            completed: checkCredentialVerified(author),
            actionRequired: 'Add a URL to verify your credential',
        },
        {
            id: 'has_expertise_3',
            label: '3+ Expertise Areas',
            description: 'Define at least 3 areas of expertise',
            category: 'credentials',
            required: false,
            weight: 5,
            completed: checkHasExpertise3(author),
            actionRequired: 'Add expertise areas relevant to your niche',
        },

        // Social (25 points)
        {
            id: 'has_linkedin',
            label: 'LinkedIn Profile',
            description: 'Professional LinkedIn profile linked',
            category: 'social',
            required: true,
            weight: 10,
            completed: checkHasLinkedIn(author),
            actionRequired: 'Add your LinkedIn profile URL',
        },
        {
            id: 'has_twitter',
            label: 'Twitter/X Profile',
            description: 'Twitter profile for content amplification',
            category: 'social',
            required: false,
            weight: 8,
            completed: checkHasTwitter(author),
            actionRequired: 'Add your Twitter profile URL',
        },
        {
            id: 'has_website',
            label: 'Personal Website',
            description: 'Personal or professional website URL',
            category: 'social',
            required: false,
            weight: 7,
            completed: checkHasWebsite(author),
            actionRequired: 'Add your personal website URL',
        },

        // Content (20 points)
        {
            id: 'has_published_5',
            label: '5+ Published Articles',
            description: 'Track record of content creation',
            category: 'content',
            required: false,
            weight: 10,
            completed: checkHasPublished5(author),
            actionRequired: 'Publish more articles with this author',
        },
        {
            id: 'avg_eeat_70',
            label: 'Avg E-E-A-T Score ≥70',
            description: 'Consistent quality across articles',
            category: 'content',
            required: false,
            weight: 10,
            completed: checkAvgEEAT70(author),
            actionRequired: 'Improve article quality to raise avg E-E-A-T',
        },
    ];

    // Calculate scores by category
    const calcCategoryScore = (category: AuthorHealthCheckItem['category']) => {
        const items = checklist.filter(c => c.category === category);
        const maxScore = items.reduce((s, c) => s + c.weight, 0);
        const earnedScore = items.filter(c => c.completed).reduce((s, c) => s + c.weight, 0);
        return maxScore > 0 ? Math.round((earnedScore / maxScore) * 100) : 0;
    };

    const identityScore = calcCategoryScore('identity');
    const credentialScore = calcCategoryScore('credentials');
    const socialScore = calcCategoryScore('social');
    const contentScore = calcCategoryScore('content');

    // Overall score
    const totalWeight = checklist.reduce((s, c) => s + c.weight, 0);
    const earnedWeight = checklist.filter(c => c.completed).reduce((s, c) => s + c.weight, 0);
    const score = Math.round((earnedWeight / totalWeight) * 100);

    // Grade
    let grade: AuthorHealthScore['grade'] = 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 75) grade = 'B';
    else if (score >= 60) grade = 'C';
    else if (score >= 40) grade = 'D';

    // Flags
    const requiredItems = checklist.filter(c => c.required);
    const isMinimumViable = requiredItems.every(c => c.completed);
    const isEEATReady = score >= 70;
    const isRepublishReady = socialScore >= 60;

    // Generate recommendations
    const recommendations = generateRecommendations(checklist, score);

    return {
        score,
        grade,
        identityScore,
        credentialScore,
        socialScore,
        contentScore,
        checklist,
        completedCount: checklist.filter(c => c.completed).length,
        totalCount: checklist.length,
        recommendations,
        isMinimumViable,
        isEEATReady,
        isRepublishReady,
    };
}

// ============================================================================
// Recommendations
// ============================================================================

/**
 * Generate prioritized recommendations
 */
function generateRecommendations(
    checklist: AuthorHealthCheckItem[],
    currentScore: number
): AuthorHealthRecommendation[] {
    const recommendations: AuthorHealthRecommendation[] = [];

    // Get incomplete items sorted by weight (highest impact first)
    const incomplete = checklist
        .filter(c => !c.completed)
        .sort((a, b) => b.weight - a.weight);

    for (const item of incomplete) {
        // Determine priority
        let priority: AuthorHealthRecommendation['priority'];
        if (item.required && currentScore < 40) {
            priority = 'critical';
        } else if (item.required) {
            priority = 'high';
        } else if (item.weight >= 10) {
            priority = 'medium';
        } else {
            priority = 'low';
        }

        // Estimate time
        const timeEstimates: Record<string, string> = {
            'has_photo': '5 minutes',
            'has_bio_100': '15 minutes',
            'has_about_url': '30 minutes',
            'has_credential': '5 minutes',
            'credential_verified': '10 minutes',
            'has_expertise_3': '5 minutes',
            'has_linkedin': '2 minutes',
            'has_twitter': '2 minutes',
            'has_website': '2 minutes',
            'has_published_5': 'Ongoing',
            'avg_eeat_70': 'Ongoing',
        };

        recommendations.push({
            priority,
            category: item.category,
            title: item.label,
            description: item.description,
            action: item.actionRequired || 'Complete this item',
            impact: `+${item.weight} to health score`,
            estimatedTime: timeEstimates[item.id] || '5 minutes',
        });
    }

    return recommendations;
}

/**
 * Get quick health summary for UI display
 */
export function getHealthSummary(author: AuthorProfile): {
    score: number;
    grade: string;
    status: 'ready' | 'needs-work' | 'incomplete';
    nextAction: string | null;
} {
    const health = calculateAuthorHealthScore(author);

    let status: 'ready' | 'needs-work' | 'incomplete';
    if (health.isEEATReady) {
        status = 'ready';
    } else if (health.isMinimumViable) {
        status = 'needs-work';
    } else {
        status = 'incomplete';
    }

    const nextAction = health.recommendations.length > 0
        ? health.recommendations[0].action
        : null;

    return {
        score: health.score,
        grade: health.grade,
        status,
        nextAction,
    };
}

/**
 * Check if author can be used for publishing
 */
export function canPublishWithAuthor(author: AuthorProfile): {
    allowed: boolean;
    reason?: string;
} {
    const health = calculateAuthorHealthScore(author);

    if (!health.isMinimumViable) {
        const missing = health.checklist
            .filter(c => c.required && !c.completed)
            .map(c => c.label);

        return {
            allowed: false,
            reason: `Missing required items: ${missing.join(', ')}`,
        };
    }

    return { allowed: true };
}
