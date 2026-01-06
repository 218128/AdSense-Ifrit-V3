/**
 * E-E-A-T Content Scorer
 * FSD: lib/contentQuality/eeatScorer.ts
 * 
 * Main E-E-A-T scoring engine that combines all four dimensions:
 * Experience, Expertise, Authoritativeness, Trustworthiness.
 */

import type {
    EEATScore,
    ExperienceScore,
    ExpertiseScore,
    AuthoritativenessScore,
    TrustworthinessScore,
    EEATWeights,
    AuthoritySignals,
    TrustSignals,
    ExpertiseSignals,
    CitationAnalysis,
    DEFAULT_EEAT_WEIGHTS,
} from './types';
import { scoreExperience } from './experienceDetector';
import {
    extractCitations,
    analyzeCitations,
    getCitationRecommendations
} from './citationValidator';
import type { AuthorProfile } from '@/features/authors';

// ============================================================================
// Configuration
// ============================================================================

interface EEATScoringOptions {
    author?: AuthorProfile;              // Author for authority signals
    siteDAScore?: number;                // Domain authority from Hunt/external
    weights?: Partial<EEATWeights>;
    isYMYL?: boolean;                    // Your Money Your Life topic
}

// ============================================================================
// Expertise Scoring
// ============================================================================

/**
 * Technical terminology patterns by complexity
 */
const BASIC_INDICATORS = [
    /\b(simple|easy|basic|beginner|introduction|overview)\b/gi,
];

const ADVANCED_INDICATORS = [
    /\b(advanced|expert|professional|technical|comprehensive|in-depth)\b/gi,
    /\b(algorithm|optimization|implementation|architecture|methodology)\b/gi,
];

function detectComplexityLevel(text: string): ExpertiseSignals['complexityLevel'] {
    const basicMatches = BASIC_INDICATORS.reduce((sum, p) => {
        const matches = text.match(p);
        return sum + (matches?.length || 0);
    }, 0);

    const advancedMatches = ADVANCED_INDICATORS.reduce((sum, p) => {
        const matches = text.match(p);
        return sum + (matches?.length || 0);
    }, 0);

    if (advancedMatches > 5) return 'advanced';
    if (basicMatches > advancedMatches) return 'basic';
    return 'intermediate';
}

function detectTechnicalTerms(text: string): string[] {
    // Extract capitalized multi-word terms (likely technical)
    const techPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;
    const matches = text.match(techPattern) || [];

    // Also look for abbreviations
    const abbrPattern = /\b[A-Z]{2,5}\b/g;
    const abbrs = text.match(abbrPattern) || [];

    return [...new Set([...matches, ...abbrs])].slice(0, 20);
}

function detectCredentialMentions(text: string): string[] {
    const patterns = [
        /As a (certified|licensed|qualified|professional) ([^,.\n]+)/gi,
        /With my (degree|certification|license|training) in ([^,.\n]+)/gi,
        /Having (worked|practiced|studied) ([^,.\n]+) for (\d+|\w+) years/gi,
    ];

    const mentions: string[] = [];
    for (const pattern of patterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
            mentions.push(match[0]);
        }
    }

    return mentions;
}

function scoreExpertise(
    html: string,
    wordCount: number,
    citationAnalysis: CitationAnalysis
): ExpertiseScore {
    const text = html.replace(/<[^>]+>/g, ' ');
    const recommendations: string[] = [];

    const signals: ExpertiseSignals = {
        technicalTerms: detectTechnicalTerms(text),
        credentialMentions: detectCredentialMentions(text),
        accurateStatements: 0, // Would need fact-check API
        inaccurateStatements: 0,
        complexityLevel: detectComplexityLevel(text),
    };

    // Source quality score (from citation analysis)
    const sourceQuality = citationAnalysis.averageAuthority;

    // Citation density score
    const densityScore = Math.min(100, citationAnalysis.density * 25);

    // Credibility signals score
    let credibilitySignals = 0;
    credibilitySignals += signals.technicalTerms.length * 2;
    credibilitySignals += signals.credentialMentions.length * 15;
    credibilitySignals += signals.complexityLevel === 'advanced' ? 20 :
        signals.complexityLevel === 'intermediate' ? 10 : 0;
    credibilitySignals = Math.min(100, credibilitySignals);

    // Technical accuracy (placeholder - needs fact-check integration)
    const technicalAccuracy = 70; // Default assumption without fact-check

    // Overall expertise score
    const score = Math.round(
        (sourceQuality * 0.35) +
        (densityScore * 0.25) +
        (credibilitySignals * 0.25) +
        (technicalAccuracy * 0.15)
    );

    // Generate recommendations
    recommendations.push(...getCitationRecommendations(citationAnalysis));

    if (signals.credentialMentions.length === 0) {
        recommendations.push('Mention your relevant credentials or expertise');
    }
    if (signals.complexityLevel === 'basic') {
        recommendations.push('Add more in-depth technical detail to demonstrate expertise');
    }

    return {
        score,
        sourceQuality,
        citationDensity: citationAnalysis.density,
        credibilitySignals,
        technicalAccuracy,
        signals,
        recommendations,
    };
}

// ============================================================================
// Authoritativeness Scoring
// ============================================================================

function scoreAuthoritativeness(
    html: string,
    author?: AuthorProfile,
    siteDAScore?: number
): AuthoritativenessScore {
    const recommendations: string[] = [];

    const signals: AuthoritySignals = {
        authorCredentialsPresent: author ? author.credentials.length > 0 : false,
        authorBioPresent: author ? author.bio.length > 50 : false,
        authorSchemaPresent: false, // Would need to check for schema in HTML
        externalMentions: 0, // Requires external API
        backlinksQuality: 0, // Requires external API
    };

    // Check for author schema in HTML
    if (html.includes('"@type":"Person"') || html.includes('@type": "Person"')) {
        signals.authorSchemaPresent = true;
    }

    // Domain authority score
    const domainAuthority = siteDAScore || 30; // Default low if unknown

    // Topical authority (from author expertise depth)
    let topicalAuthority = 40; // Base
    if (author) {
        topicalAuthority += author.credentials.length * 10;
        topicalAuthority += author.expertise.length * 5;
        topicalAuthority = Math.min(100, topicalAuthority);
    }

    // Backlinks quality (placeholder)
    const backlinksQuality = 50; // Default neutral without external data

    // Overall score
    const score = Math.round(
        (domainAuthority * 0.35) +
        (topicalAuthority * 0.35) +
        (backlinksQuality * 0.20) +
        (signals.authorSchemaPresent ? 10 : 0)
    );

    // Recommendations
    if (!signals.authorCredentialsPresent) {
        recommendations.push('Add author credentials to build authority');
    }
    if (!signals.authorBioPresent) {
        recommendations.push('Include a detailed author bio');
    }
    if (!signals.authorSchemaPresent) {
        recommendations.push('Add Person schema markup for the author');
    }

    return {
        score,
        domainAuthority,
        topicalAuthority,
        backlinksQuality,
        signals,
        recommendations,
    };
}

// ============================================================================
// Trustworthiness Scoring
// ============================================================================

function detectTrustSignals(html: string): TrustSignals {
    const text = html.toLowerCase();

    return {
        hasDisclaimer: /\bdisclaimer\b/.test(text) ||
            /\bthis (article|content|post) is (for|provided)/i.test(text),
        hasAffiliateDisclosure: /affiliate (link|disclosure|commission)/i.test(text) ||
            /we (may )?earn (a )?commission/i.test(text),
        hasLastUpdatedDate: /last (updated|modified|reviewed):\s*\d/i.test(text) ||
            /<time[^>]*datetime=/i.test(html),
        hasAuthorAttribution: /\bby\s+[A-Z][a-z]+\s+[A-Z]/i.test(text) ||
            /<a[^>]*class="[^"]*author/i.test(html),
        hasContactInfo: /contact (us|me)|email:\s*\S+@/i.test(text),
        hasPrivacyPolicy: /privacy policy/i.test(text), // Usually in footer
        transparentAffiliate: /affiliate (disclosure|disclaimer)/i.test(text) &&
            /at no (extra|additional) cost/i.test(text),
        noMisleadingClaims: true, // Would need fact-check to verify
    };
}

function scoreTrustworthiness(html: string): TrustworthinessScore {
    const signals = detectTrustSignals(html);
    const recommendations: string[] = [];

    // Fact check score (placeholder)
    const factCheckScore = 75; // Default without fact-check API

    // Disclaimers
    const disclaimerPresence = signals.hasDisclaimer || signals.hasAffiliateDisclosure;

    // Date relevance (check for dates in content)
    const hasRecentDate = /202[4-6]/.test(html);
    const dateRelevance = hasRecentDate ? 85 : (signals.hasLastUpdatedDate ? 70 : 50);

    // Transparent authorship
    const transparentAuthorship = signals.hasAuthorAttribution;

    // Calculate overall score
    let score = 0;
    score += factCheckScore * 0.30;
    score += disclaimerPresence ? 15 : 0;
    score += dateRelevance * 0.20;
    score += transparentAuthorship ? 15 : 0;
    score += signals.hasContactInfo ? 10 : 0;
    score += signals.transparentAffiliate ? 10 : 0;
    score = Math.round(Math.min(100, score));

    // Recommendations
    if (!signals.hasLastUpdatedDate) {
        recommendations.push('Add a "Last Updated" date to show content freshness');
    }
    if (!signals.hasAuthorAttribution) {
        recommendations.push('Include clear author attribution with byline');
    }
    if (!signals.hasAffiliateDisclosure) {
        recommendations.push('Add affiliate disclosure if applicable');
    }
    if (!signals.hasDisclaimer) {
        recommendations.push('Consider adding appropriate disclaimers for your content type');
    }

    return {
        score,
        factCheckScore,
        disclaimerPresence,
        dateRelevance,
        transparentAuthorship,
        signals,
        recommendations,
    };
}

// ============================================================================
// Main E-E-A-T Scoring Function
// ============================================================================

/**
 * Calculate complete E-E-A-T score for content
 */
export function calculateEEATScore(
    html: string,
    options: EEATScoringOptions = {}
): EEATScore {
    const { author, siteDAScore, weights, isYMYL } = options;

    // Get word count
    const text = html.replace(/<[^>]+>/g, ' ');
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

    // Extract and analyze citations
    const citations = extractCitations(html);
    const citationAnalysis = analyzeCitations(citations, wordCount);

    // Score each dimension
    const experience = scoreExperience(html, wordCount);
    const expertise = scoreExpertise(html, wordCount, citationAnalysis);
    const authoritativeness = scoreAuthoritativeness(html, author, siteDAScore);
    const trustworthiness = scoreTrustworthiness(html);

    // Apply weights
    const w: EEATWeights = {
        experience: 0.25,
        expertise: 0.30,
        authoritativeness: 0.20,
        trustworthiness: 0.25,
        ...weights,
    };

    // Calculate overall score
    let overall = Math.round(
        (experience.score * w.experience) +
        (expertise.score * w.expertise) +
        (authoritativeness.score * w.authoritativeness) +
        (trustworthiness.score * w.trustworthiness)
    );

    // Apply YMYL penalty if score is below threshold
    if (isYMYL && overall < 80) {
        overall = Math.round(overall * 0.9); // 10% penalty for YMYL
    }

    // Determine grade
    const grade: EEATScore['grade'] =
        overall >= 90 ? 'A' :
            overall >= 80 ? 'B' :
                overall >= 70 ? 'C' :
                    overall >= 60 ? 'D' : 'F';

    // Collect strengths, weaknesses, and critical issues
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const criticalIssues: string[] = [];

    if (experience.score >= 70) strengths.push('Strong first-hand experience signals');
    else if (experience.score < 40) weaknesses.push('Lacks personal experience indicators');

    if (expertise.score >= 70) strengths.push('Good source quality and expertise signals');
    else if (expertise.score < 40) weaknesses.push('Weak expertise demonstration');

    if (authoritativeness.score >= 70) strengths.push('Good author authority signals');
    else if (authoritativeness.score < 40) weaknesses.push('Lacking author authority');

    if (trustworthiness.score >= 70) strengths.push('Strong trust signals present');
    else if (trustworthiness.score < 40) weaknesses.push('Missing trust indicators');

    if (citationAnalysis.total < 2) {
        criticalIssues.push('Too few citations - add authoritative sources');
    }
    if (isYMYL && overall < 70) {
        criticalIssues.push('YMYL content with low E-E-A-T score - high risk');
    }

    // Collect all recommendations
    const recommendations = [
        ...experience.recommendations,
        ...expertise.recommendations,
        ...authoritativeness.recommendations,
        ...trustworthiness.recommendations,
    ].slice(0, 10); // Max 10 recommendations

    return {
        overall,
        grade,
        experience,
        expertise,
        authoritativeness,
        trustworthiness,
        strengths,
        weaknesses,
        criticalIssues,
        recommendations,
        analyzedAt: Date.now(),
        wordCount,
        citationAnalysis,
    };
}

/**
 * Quick E-E-A-T check (returns just the overall score)
 */
export function quickEEATCheck(html: string): {
    score: number;
    grade: EEATScore['grade'];
    pass: boolean
} {
    const result = calculateEEATScore(html);
    return {
        score: result.overall,
        grade: result.grade,
        pass: result.overall >= 60,
    };
}
