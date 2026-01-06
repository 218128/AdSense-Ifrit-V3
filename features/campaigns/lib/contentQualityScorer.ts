/**
 * Content Quality Scorer
 * FSD: features/campaigns/lib/contentQualityScorer.ts
 * 
 * Phase 2 Enhancement: Evaluate content quality before publishing
 * Provides actionable scoring across multiple dimensions
 */

// ============================================================================
// Types
// ============================================================================

export interface QualityScore {
    overall: number;          // 0-100 composite score
    readability: ReadabilityScore;
    seo: SEOScore;
    uniqueness: UniquenessScore;
    structure: StructureScore;
    issues: QualityIssue[];
    recommendations: string[];
}

export interface ReadabilityScore {
    score: number;            // 0-100
    gradeLevel: number;       // Flesch-Kincaid grade level
    sentenceComplexity: 'simple' | 'moderate' | 'complex';
    avgWordsPerSentence: number;
    avgSyllablesPerWord: number;
}

export interface SEOScore {
    score: number;
    keywordDensity: number;   // Percentage
    hasMetaDescription: boolean;
    headingStructure: 'good' | 'needs-work' | 'poor';
    internalLinks: number;
    externalLinks: number;
    imageAltTags: number;
    missingAlts: number;
}

export interface UniquenessScore {
    score: number;
    estimatedOriginalityPct: number;
    commonPhraseCount: number;
    aiPatternScore: number;   // 0-100, higher = more AI-like
}

export interface StructureScore {
    score: number;
    hasIntro: boolean;
    hasConclusion: boolean;
    headingCount: number;
    paragraphCount: number;
    listCount: number;
    hasFAQ: boolean;
    hasTableOfContents: boolean;
}

export interface QualityIssue {
    severity: 'critical' | 'warning' | 'info';
    category: 'readability' | 'seo' | 'uniqueness' | 'structure';
    message: string;
    suggestion?: string;
}

// ============================================================================
// Readability Analysis
// ============================================================================

/**
 * Count syllables in a word (approximation)
 */
function countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;

    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
}

/**
 * Calculate Flesch-Kincaid readability metrics
 */
export function analyzeReadability(text: string): ReadabilityScore {
    // Strip HTML
    const plainText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // Count sentences (split on . ! ?)
    const sentences = plainText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = Math.max(1, sentences.length);

    // Count words
    const words = plainText.split(/\s+/).filter(w => w.length > 0);
    const wordCount = Math.max(1, words.length);

    // Count syllables
    const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);

    // Calculate metrics
    const avgWordsPerSentence = wordCount / sentenceCount;
    const avgSyllablesPerWord = totalSyllables / wordCount;

    // Flesch-Kincaid Grade Level
    const gradeLevel = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

    // Flesch Reading Ease (convert to 0-100 score)
    const readingEase = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
    const score = Math.max(0, Math.min(100, readingEase));

    // Determine complexity
    let sentenceComplexity: 'simple' | 'moderate' | 'complex';
    if (avgWordsPerSentence <= 15) {
        sentenceComplexity = 'simple';
    } else if (avgWordsPerSentence <= 25) {
        sentenceComplexity = 'moderate';
    } else {
        sentenceComplexity = 'complex';
    }

    return {
        score: Math.round(score),
        gradeLevel: Math.round(gradeLevel * 10) / 10,
        sentenceComplexity,
        avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
        avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
    };
}

// ============================================================================
// SEO Analysis
// ============================================================================

/**
 * Analyze content for SEO factors
 */
export function analyzeSEO(html: string, targetKeywords?: string[]): SEOScore {
    const plainText = html.replace(/<[^>]+>/g, ' ').toLowerCase();
    const wordCount = plainText.split(/\s+/).filter(w => w.length > 0).length;

    // Keyword density (if keywords provided)
    let keywordDensity = 0;
    if (targetKeywords && targetKeywords.length > 0) {
        let keywordCount = 0;
        for (const keyword of targetKeywords) {
            const regex = new RegExp(keyword.toLowerCase(), 'gi');
            const matches = plainText.match(regex);
            keywordCount += matches ? matches.length : 0;
        }
        keywordDensity = (keywordCount / wordCount) * 100;
    }

    // Check meta description (look for excerpt class or first paragraph in header)
    const hasMetaDescription = /<p[^>]*class="excerpt"[^>]*>/i.test(html) ||
        /<meta[^>]*name="description"[^>]*>/i.test(html);

    // Heading structure
    const h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
    const h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
    const h3Count = (html.match(/<h3[^>]*>/gi) || []).length;

    let headingStructure: 'good' | 'needs-work' | 'poor';
    if (h1Count === 1 && h2Count >= 2) {
        headingStructure = 'good';
    } else if (h1Count <= 1 && h2Count >= 1) {
        headingStructure = 'needs-work';
    } else {
        headingStructure = 'poor';
    }

    // Count links
    const internalLinks = (html.match(/<a[^>]*href="\/[^"]*"/gi) || []).length;
    const externalLinks = (html.match(/<a[^>]*href="https?:\/\/[^"]*"/gi) || []).length - internalLinks;

    // Image analysis
    const images = html.match(/<img[^>]*>/gi) || [];
    const imageAltTags = (html.match(/<img[^>]*alt="[^"]+"/gi) || []).length;
    const missingAlts = images.length - imageAltTags;

    // Calculate score
    let score = 50; // Base
    if (h1Count === 1) score += 10;
    if (h2Count >= 3) score += 10;
    if (hasMetaDescription) score += 10;
    if (keywordDensity >= 0.5 && keywordDensity <= 2.5) score += 10;
    if (missingAlts === 0 && images.length > 0) score += 5;
    if (internalLinks >= 2) score += 5;

    return {
        score: Math.min(100, score),
        keywordDensity: Math.round(keywordDensity * 100) / 100,
        hasMetaDescription,
        headingStructure,
        internalLinks,
        externalLinks: Math.max(0, externalLinks),
        imageAltTags,
        missingAlts,
    };
}

// ============================================================================
// Uniqueness Analysis
// ============================================================================

// Common AI patterns and phrases to detect
const AI_PATTERNS = [
    'in conclusion',
    'it is worth noting',
    'it is important to note',
    'in today\'s world',
    'in this article',
    'let\'s dive in',
    'without further ado',
    'at the end of the day',
    'in summary',
    'to summarize',
    'as mentioned earlier',
    'as we have seen',
    'in the modern era',
    'it goes without saying',
];

/**
 * Analyze content uniqueness and AI likelihood
 */
export function analyzeUniqueness(text: string): UniquenessScore {
    const lowerText = text.toLowerCase();

    // Count common AI patterns
    let commonPhraseCount = 0;
    for (const pattern of AI_PATTERNS) {
        if (lowerText.includes(pattern)) {
            commonPhraseCount++;
        }
    }

    // AI pattern score (higher = more AI-like)
    const aiPatternScore = Math.min(100, commonPhraseCount * 15);

    // Estimate originality (inverse of AI patterns, with variance)
    const estimatedOriginalityPct = Math.max(0, 100 - aiPatternScore - (commonPhraseCount * 5));

    // Calculate score (higher = more unique/original)
    const score = Math.max(0, 100 - aiPatternScore);

    return {
        score,
        estimatedOriginalityPct,
        commonPhraseCount,
        aiPatternScore,
    };
}

// ============================================================================
// Structure Analysis
// ============================================================================

/**
 * Analyze content structure
 */
export function analyzeStructure(html: string): StructureScore {
    // Check for intro (first paragraph after h1 or in header)
    const hasIntro = /<h1[^>]*>[\s\S]*?<\/h1>\s*<p/i.test(html) ||
        /<header[\s\S]*?<p[^>]*>/i.test(html);

    // Check for conclusion (heading with conclusion/summary/final)
    const hasConclusion = /<h[2-3][^>]*>[^<]*(?:conclusion|summary|final thoughts|wrapping up)[^<]*<\/h[2-3]>/i.test(html);

    // Count headings
    const headingCount = (html.match(/<h[1-6][^>]*>/gi) || []).length;

    // Count paragraphs
    const paragraphCount = (html.match(/<p[^>]*>/gi) || []).length;

    // Count lists
    const listCount = (html.match(/<[uo]l[^>]*>/gi) || []).length;

    // Check for FAQ
    const hasFAQ = /<h[2-3][^>]*>[^<]*(?:faq|frequently asked|questions)[^<]*<\/h[2-3]>/i.test(html) ||
        /itemtype="https:\/\/schema\.org\/FAQPage"/i.test(html);

    // Check for TOC
    const hasTableOfContents = /<nav[^>]*class="[^"]*toc[^"]*"/i.test(html) ||
        /<div[^>]*class="[^"]*table-of-contents[^"]*"/i.test(html) ||
        /<h[2-3][^>]*>[^<]*table of contents[^<]*<\/h[2-3]>/i.test(html);

    // Calculate score
    let score = 40; // Base
    if (hasIntro) score += 10;
    if (hasConclusion) score += 10;
    if (headingCount >= 4) score += 10;
    if (paragraphCount >= 8) score += 10;
    if (listCount >= 1) score += 5;
    if (hasFAQ) score += 10;
    if (hasTableOfContents) score += 5;

    return {
        score: Math.min(100, score),
        hasIntro,
        hasConclusion,
        headingCount,
        paragraphCount,
        listCount,
        hasFAQ,
        hasTableOfContents,
    };
}

// ============================================================================
// Main Scoring Function
// ============================================================================

/**
 * Score content quality across all dimensions
 * 
 * @param html - The HTML content to analyze
 * @param targetKeywords - Optional target keywords for SEO analysis
 * @returns Comprehensive quality score with issues and recommendations
 */
export function scoreContent(html: string, targetKeywords?: string[]): QualityScore {
    const readability = analyzeReadability(html);
    const seo = analyzeSEO(html, targetKeywords);
    const uniqueness = analyzeUniqueness(html);
    const structure = analyzeStructure(html);

    // Collect issues
    const issues: QualityIssue[] = [];
    const recommendations: string[] = [];

    // Readability issues
    if (readability.score < 50) {
        issues.push({
            severity: 'warning',
            category: 'readability',
            message: `Low readability score (${readability.score}/100)`,
            suggestion: 'Use shorter sentences and simpler words',
        });
    }
    if (readability.gradeLevel > 12) {
        issues.push({
            severity: 'warning',
            category: 'readability',
            message: `High reading level (Grade ${readability.gradeLevel})`,
            suggestion: 'Aim for Grade 8-10 for broader audience',
        });
    }

    // SEO issues
    if (seo.headingStructure === 'poor') {
        issues.push({
            severity: 'critical',
            category: 'seo',
            message: 'Poor heading structure',
            suggestion: 'Use exactly one H1 and multiple H2s',
        });
    }
    if (!seo.hasMetaDescription) {
        issues.push({
            severity: 'warning',
            category: 'seo',
            message: 'Missing meta description/excerpt',
            suggestion: 'Add a 150-160 character excerpt',
        });
    }
    if (seo.missingAlts > 0) {
        issues.push({
            severity: 'warning',
            category: 'seo',
            message: `${seo.missingAlts} images missing alt text`,
            suggestion: 'Add descriptive alt text to all images',
        });
    }
    if (seo.internalLinks < 2) {
        issues.push({
            severity: 'info',
            category: 'seo',
            message: 'Few internal links',
            suggestion: 'Add 2-5 internal links to related content',
        });
    }

    // Uniqueness issues
    if (uniqueness.aiPatternScore > 40) {
        issues.push({
            severity: 'warning',
            category: 'uniqueness',
            message: 'Content may appear AI-generated',
            suggestion: 'Remove common AI phrases and add unique perspective',
        });
    }

    // Structure issues
    if (!structure.hasIntro) {
        issues.push({
            severity: 'info',
            category: 'structure',
            message: 'No clear introduction found',
            suggestion: 'Add an engaging opening paragraph',
        });
    }
    if (!structure.hasConclusion) {
        issues.push({
            severity: 'info',
            category: 'structure',
            message: 'No conclusion section found',
            suggestion: 'Add a summary or conclusion heading',
        });
    }
    if (!structure.hasFAQ) {
        recommendations.push('Consider adding an FAQ section');
    }
    if (!structure.hasTableOfContents && structure.headingCount > 5) {
        recommendations.push('Add a table of contents for long articles');
    }

    // Calculate overall score (weighted)
    const overall = Math.round(
        readability.score * 0.25 +
        seo.score * 0.30 +
        uniqueness.score * 0.25 +
        structure.score * 0.20
    );

    return {
        overall,
        readability,
        seo,
        uniqueness,
        structure,
        issues,
        recommendations,
    };
}

// ============================================================================
// Quick Check Functions
// ============================================================================

/**
 * Quick check if content meets minimum quality threshold
 */
export function meetsMinimumQuality(html: string, minScore: number = 60): boolean {
    const score = scoreContent(html);
    return score.overall >= minScore;
}

/**
 * Get a simple quality rating
 */
export function getQualityRating(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 80) return 'excellent';
    if (score >= 65) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
}

/**
 * Get critical issues that should block publishing
 */
export function getCriticalIssues(qualityScore: QualityScore): QualityIssue[] {
    return qualityScore.issues.filter(i => i.severity === 'critical');
}
