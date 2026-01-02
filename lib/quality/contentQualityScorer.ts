/**
 * Content Quality Scorer
 * FSD: lib/quality/contentQualityScorer.ts
 * 
 * Analyzes content quality for AdSense readiness.
 * Checks word count, readability, images, links, and more.
 */

// ============================================================================
// Types
// ============================================================================

export interface ContentMetrics {
    wordCount: number;
    paragraphCount: number;
    sentenceCount: number;
    imageCount: number;
    internalLinkCount: number;
    externalLinkCount: number;
    headingCount: number;
    hasMetaDescription: boolean;
    hasFeaturedImage: boolean;
}

export interface QualityCheck {
    name: string;
    passed: boolean;
    score: number;  // 0-100
    message: string;
    suggestion?: string;
}

export interface ContentQualityResult {
    overallScore: number;  // 0-100
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    adsenseReady: boolean;
    metrics: ContentMetrics;
    checks: QualityCheck[];
}

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Extract metrics from HTML content
 */
export function extractMetrics(htmlContent: string, metaDescription?: string): ContentMetrics {
    // Strip HTML tags for text analysis
    const textContent = htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // Word count
    const words = textContent.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    // Paragraph count
    const paragraphs = htmlContent.match(/<p[^>]*>/gi) || [];
    const paragraphCount = paragraphs.length || Math.ceil(wordCount / 150); // Fallback

    // Sentence count
    const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length;

    // Image count
    const images = htmlContent.match(/<img[^>]+>/gi) || [];
    const imageCount = images.length;

    // Featured image check (first image or og:image)
    const hasFeaturedImage = imageCount > 0;

    // Link counts
    const allLinks = htmlContent.match(/<a[^>]+href="([^"]+)"[^>]*>/gi) || [];
    let internalLinkCount = 0;
    let externalLinkCount = 0;

    allLinks.forEach(link => {
        const hrefMatch = link.match(/href="([^"]+)"/i);
        if (hrefMatch) {
            const href = hrefMatch[1];
            if (href.startsWith('#') || href.startsWith('/') || !href.includes('://')) {
                internalLinkCount++;
            } else {
                externalLinkCount++;
            }
        }
    });

    // Heading count
    const headings = htmlContent.match(/<h[1-6][^>]*>/gi) || [];
    const headingCount = headings.length;

    return {
        wordCount,
        paragraphCount,
        sentenceCount,
        imageCount,
        internalLinkCount,
        externalLinkCount,
        headingCount,
        hasMetaDescription: !!(metaDescription && metaDescription.length >= 50),
        hasFeaturedImage,
    };
}

/**
 * Run quality checks on content metrics
 */
export function runQualityChecks(metrics: ContentMetrics): QualityCheck[] {
    const checks: QualityCheck[] = [];

    // 1. Word Count Check (Critical for AdSense)
    const minWords = 500;
    const idealWords = 1000;
    let wordScore = 0;
    if (metrics.wordCount >= idealWords) wordScore = 100;
    else if (metrics.wordCount >= minWords) wordScore = 50 + ((metrics.wordCount - minWords) / (idealWords - minWords)) * 50;
    else wordScore = (metrics.wordCount / minWords) * 50;

    checks.push({
        name: 'Word Count',
        passed: metrics.wordCount >= minWords,
        score: Math.min(100, wordScore),
        message: `${metrics.wordCount} words`,
        suggestion: metrics.wordCount < minWords
            ? `Add ${minWords - metrics.wordCount} more words (minimum 500 for AdSense)`
            : undefined,
    });

    // 2. Images Check
    const imageScore = metrics.imageCount > 0 ? Math.min(100, metrics.imageCount * 30) : 0;
    checks.push({
        name: 'Images',
        passed: metrics.imageCount >= 1,
        score: imageScore,
        message: `${metrics.imageCount} image(s)`,
        suggestion: metrics.imageCount === 0
            ? 'Add at least one image to improve engagement'
            : undefined,
    });

    // 3. Featured Image Check
    checks.push({
        name: 'Featured Image',
        passed: metrics.hasFeaturedImage,
        score: metrics.hasFeaturedImage ? 100 : 0,
        message: metrics.hasFeaturedImage ? 'Has featured image' : 'No featured image',
        suggestion: !metrics.hasFeaturedImage
            ? 'Add a featured image for better SEO and social sharing'
            : undefined,
    });

    // 4. Internal Links Check
    const internalLinkScore = Math.min(100, metrics.internalLinkCount * 25);
    checks.push({
        name: 'Internal Links',
        passed: metrics.internalLinkCount >= 2,
        score: internalLinkScore,
        message: `${metrics.internalLinkCount} internal link(s)`,
        suggestion: metrics.internalLinkCount < 2
            ? 'Add internal links to other posts for better SEO'
            : undefined,
    });

    // 5. Headings Check
    const headingScore = metrics.headingCount >= 3 ? 100 : metrics.headingCount * 33;
    checks.push({
        name: 'Headings',
        passed: metrics.headingCount >= 2,
        score: headingScore,
        message: `${metrics.headingCount} heading(s)`,
        suggestion: metrics.headingCount < 2
            ? 'Add H2/H3 headings to structure content'
            : undefined,
    });

    // 6. Meta Description Check
    checks.push({
        name: 'Meta Description',
        passed: metrics.hasMetaDescription,
        score: metrics.hasMetaDescription ? 100 : 0,
        message: metrics.hasMetaDescription ? 'Has meta description' : 'No meta description',
        suggestion: !metrics.hasMetaDescription
            ? 'Add a meta description (50-160 characters)'
            : undefined,
    });

    // 7. Paragraph Structure
    const avgWordsPerParagraph = metrics.paragraphCount > 0
        ? metrics.wordCount / metrics.paragraphCount
        : metrics.wordCount;
    const paragraphScore = avgWordsPerParagraph <= 150 ? 100 : Math.max(0, 100 - (avgWordsPerParagraph - 150));
    checks.push({
        name: 'Paragraph Length',
        passed: avgWordsPerParagraph <= 150,
        score: paragraphScore,
        message: `~${Math.round(avgWordsPerParagraph)} words/paragraph`,
        suggestion: avgWordsPerParagraph > 150
            ? 'Break up long paragraphs for better readability'
            : undefined,
    });

    return checks;
}

/**
 * Calculate overall content quality score
 */
export function scoreContent(
    htmlContent: string,
    metaDescription?: string
): ContentQualityResult {
    const metrics = extractMetrics(htmlContent, metaDescription);
    const checks = runQualityChecks(metrics);

    // Calculate weighted overall score
    const weights: Record<string, number> = {
        'Word Count': 30,
        'Images': 15,
        'Featured Image': 10,
        'Internal Links': 15,
        'Headings': 10,
        'Meta Description': 10,
        'Paragraph Length': 10,
    };

    let totalWeight = 0;
    let weightedScore = 0;

    for (const check of checks) {
        const weight = weights[check.name] || 10;
        weightedScore += check.score * weight;
        totalWeight += weight;
    }

    const overallScore = Math.round(weightedScore / totalWeight);

    // Determine grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (overallScore >= 90) grade = 'A';
    else if (overallScore >= 75) grade = 'B';
    else if (overallScore >= 60) grade = 'C';
    else if (overallScore >= 40) grade = 'D';
    else grade = 'F';

    // AdSense readiness check
    const criticalChecks = checks.filter(c =>
        ['Word Count', 'Featured Image'].includes(c.name)
    );
    const adsenseReady = overallScore >= 60 && criticalChecks.every(c => c.passed);

    return {
        overallScore,
        grade,
        adsenseReady,
        metrics,
        checks,
    };
}

/**
 * Score multiple posts and return aggregate stats
 */
export function scoreMultiplePosts(
    posts: Array<{ content: string; metaDescription?: string }>
): {
    averageScore: number;
    totalPosts: number;
    adsenseReadyPosts: number;
    postsNeedingWork: number;
} {
    const results = posts.map(p => scoreContent(p.content, p.metaDescription));

    const totalPosts = results.length;
    const averageScore = totalPosts > 0
        ? Math.round(results.reduce((sum, r) => sum + r.overallScore, 0) / totalPosts)
        : 0;
    const adsenseReadyPosts = results.filter(r => r.adsenseReady).length;
    const postsNeedingWork = results.filter(r => !r.adsenseReady).length;

    return {
        averageScore,
        totalPosts,
        adsenseReadyPosts,
        postsNeedingWork,
    };
}
