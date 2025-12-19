/**
 * Content Validator
 * 
 * Validates AI-generated content for quality, completeness, and correctness.
 * Ensures no placeholder text, proper formatting, and minimum requirements.
 */

export interface ContentIssue {
    type: 'error' | 'warning';
    code: string;
    message: string;
    line?: number;
}

export interface ContentValidation {
    valid: boolean;
    issues: ContentIssue[];
    score: number; // 0-100 quality score
    metrics: {
        wordCount: number;
        headingCount: number;
        paragraphCount: number;
        linkCount: number;
        hasFrontmatter: boolean;
        hasIntro: boolean;
        hasConclusion: boolean;
    };
}

// Quality thresholds by content type
const QUALITY_RULES = {
    pillar: {
        minWords: 1500,
        minHeadings: 3,
        minParagraphs: 8,
        requireConclusion: true
    },
    cluster: {
        minWords: 800,
        minHeadings: 2,
        minParagraphs: 5,
        requireConclusion: true
    },
    about: {
        minWords: 300,
        minHeadings: 1,
        minParagraphs: 3,
        requireConclusion: false
    },
    contact: {
        minWords: 100,
        minHeadings: 1,
        minParagraphs: 2,
        requireConclusion: false
    },
    privacy: {
        minWords: 500,
        minHeadings: 3,
        minParagraphs: 5,
        requireConclusion: false
    },
    terms: {
        minWords: 500,
        minHeadings: 3,
        minParagraphs: 5,
        requireConclusion: false
    },
    disclaimer: {
        minWords: 200,
        minHeadings: 1,
        minParagraphs: 2,
        requireConclusion: false
    }
};

// Patterns that indicate AI artifacts or placeholder text
const FORBIDDEN_PATTERNS = [
    { pattern: /\[insert\s+.*?\]/gi, message: 'Contains placeholder text: [Insert ...]' },
    { pattern: /\[add\s+.*?\]/gi, message: 'Contains placeholder text: [Add ...]' },
    { pattern: /\[your\s+.*?\]/gi, message: 'Contains placeholder text: [Your ...]' },
    { pattern: /\[TODO\]/gi, message: 'Contains TODO placeholder' },
    { pattern: /lorem\s+ipsum/gi, message: 'Contains Lorem Ipsum placeholder text' },
    { pattern: /as an ai language model/gi, message: 'Contains AI self-reference' },
    { pattern: /as an ai assistant/gi, message: 'Contains AI self-reference' },
    { pattern: /i am an ai/gi, message: 'Contains AI self-reference' },
    { pattern: /i cannot browse the internet/gi, message: 'Contains AI limitation statement' },
    { pattern: /my training data/gi, message: 'Contains AI training reference' },
    { pattern: /\*\*\[.*?\]\*\*/g, message: 'Contains bracketed placeholder in bold' },
    { pattern: /XXX|FIXME/g, message: 'Contains development placeholder' },
    { pattern: /\[\d+\]/g, message: 'Contains citation markers like [1], [2]' }
];

// Patterns that indicate low-quality content
const WARNING_PATTERNS = [
    { pattern: /(.{10,})\1{2,}/g, message: 'Contains excessive repetition' },
    { pattern: /^#{1,6}\s*$/gm, message: 'Contains empty headings' },
    { pattern: /https?:\/\/example\.com/gi, message: 'Contains example.com placeholder URL' },
    { pattern: /\(Word count:\s*\d+\)/gi, message: 'Contains word count marker' },
    { pattern: /\| \|---/g, message: 'Contains broken markdown table (all on one line)' }
];

/**
 * Parse frontmatter from markdown content
 */
function parseFrontmatter(content: string): { hasFrontmatter: boolean; title?: string; description?: string } {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
        return { hasFrontmatter: false };
    }

    const frontmatter = frontmatterMatch[1];
    const titleMatch = frontmatter.match(/title:\s*["']?(.+?)["']?\s*$/m);
    const descMatch = frontmatter.match(/description:\s*["']?(.+?)["']?\s*$/m);

    return {
        hasFrontmatter: true,
        title: titleMatch?.[1],
        description: descMatch?.[1]
    };
}

/**
 * Count words in markdown content (excluding frontmatter)
 */
function countWords(content: string): number {
    // Remove frontmatter
    const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
    // Remove markdown syntax
    const plainText = withoutFrontmatter
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .replace(/`[^`]+`/g, '') // Remove inline code
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
        .replace(/#+\s*/g, '') // Remove heading markers
        .replace(/[*_~`]/g, '') // Remove formatting
        .replace(/\n+/g, ' ') // Normalize whitespace
        .trim();

    return plainText.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Count headings in markdown
 */
function countHeadings(content: string): number {
    const headingMatches = content.match(/^#{1,6}\s+.+$/gm);
    return headingMatches ? headingMatches.length : 0;
}

/**
 * Count paragraphs in markdown
 */
function countParagraphs(content: string): number {
    // Remove frontmatter and code blocks
    const cleaned = content
        .replace(/^---\n[\s\S]*?\n---\n?/, '')
        .replace(/```[\s\S]*?```/g, '');

    // Count non-empty, non-heading lines
    const paragraphs = cleaned.split(/\n{2,}/).filter(p => {
        const trimmed = p.trim();
        return trimmed.length > 0 && !trimmed.startsWith('#') && !trimmed.startsWith('-') && !trimmed.startsWith('*');
    });

    return paragraphs.length;
}

/**
 * Count links in markdown
 */
function countLinks(content: string): number {
    const linkMatches = content.match(/\[([^\]]+)\]\([^)]+\)/g);
    return linkMatches ? linkMatches.length : 0;
}

/**
 * Check if content has an introduction
 */
function hasIntro(content: string): boolean {
    // Remove frontmatter
    const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n?/, '');

    // Get first paragraph (before first heading)
    const firstHeadingIndex = withoutFrontmatter.search(/^#/m);
    const beforeFirstHeading = firstHeadingIndex > 0
        ? withoutFrontmatter.substring(0, firstHeadingIndex)
        : withoutFrontmatter.substring(0, 500);

    // Check if there's substantial intro text
    const introWords = countWords(beforeFirstHeading);
    return introWords >= 30;
}

/**
 * Check if content has a conclusion
 */
function hasConclusion(content: string): boolean {
    const conclusionPatterns = [
        /#{1,3}\s*conclusion/i,
        /#{1,3}\s*final\s+thoughts/i,
        /#{1,3}\s*summary/i,
        /#{1,3}\s*wrapping\s+up/i,
        /#{1,3}\s*key\s+takeaways/i,
        /in\s+conclusion[,\s]/i,
        /to\s+sum\s+up[,\s]/i,
        /to\s+summarize[,\s]/i
    ];

    return conclusionPatterns.some(pattern => pattern.test(content));
}

/**
 * Validate article content
 */
export function validateContent(
    content: string,
    type: keyof typeof QUALITY_RULES
): ContentValidation {
    const issues: ContentIssue[] = [];
    const rules = QUALITY_RULES[type];

    // Parse metrics
    const frontmatter = parseFrontmatter(content);
    const wordCount = countWords(content);
    const headingCount = countHeadings(content);
    const paragraphCount = countParagraphs(content);
    const linkCount = countLinks(content);
    const introExists = hasIntro(content);
    const conclusionExists = hasConclusion(content);

    const metrics = {
        wordCount,
        headingCount,
        paragraphCount,
        linkCount,
        hasFrontmatter: frontmatter.hasFrontmatter,
        hasIntro: introExists,
        hasConclusion: conclusionExists
    };

    // Check frontmatter
    if (!frontmatter.hasFrontmatter) {
        issues.push({
            type: 'error',
            code: 'NO_FRONTMATTER',
            message: 'Missing frontmatter (title, description)'
        });
    } else {
        if (!frontmatter.title) {
            issues.push({
                type: 'error',
                code: 'NO_TITLE',
                message: 'Missing title in frontmatter'
            });
        }
        if (!frontmatter.description) {
            issues.push({
                type: 'warning',
                code: 'NO_DESCRIPTION',
                message: 'Missing description in frontmatter (bad for SEO)'
            });
        }
    }

    // Check word count
    if (wordCount < rules.minWords) {
        issues.push({
            type: 'error',
            code: 'LOW_WORD_COUNT',
            message: `Word count (${wordCount}) is below minimum (${rules.minWords})`
        });
    }

    // Check headings
    if (headingCount < rules.minHeadings) {
        issues.push({
            type: 'warning',
            code: 'FEW_HEADINGS',
            message: `Only ${headingCount} heading(s), recommend at least ${rules.minHeadings}`
        });
    }

    // Check paragraphs
    if (paragraphCount < rules.minParagraphs) {
        issues.push({
            type: 'warning',
            code: 'FEW_PARAGRAPHS',
            message: `Only ${paragraphCount} paragraph(s), recommend at least ${rules.minParagraphs}`
        });
    }

    // Check intro
    if (!introExists) {
        issues.push({
            type: 'warning',
            code: 'NO_INTRO',
            message: 'Missing introductory paragraph'
        });
    }

    // Check conclusion
    if (rules.requireConclusion && !conclusionExists) {
        issues.push({
            type: 'warning',
            code: 'NO_CONCLUSION',
            message: 'Missing conclusion section'
        });
    }

    // Check for forbidden patterns
    for (const { pattern, message } of FORBIDDEN_PATTERNS) {
        if (pattern.test(content)) {
            issues.push({
                type: 'error',
                code: 'FORBIDDEN_CONTENT',
                message
            });
        }
    }

    // Check for warning patterns
    for (const { pattern, message } of WARNING_PATTERNS) {
        if (pattern.test(content)) {
            issues.push({
                type: 'warning',
                code: 'QUALITY_WARNING',
                message
            });
        }
    }

    // Calculate score
    let score = 100;

    // Deduct for errors (major issues)
    const errorCount = issues.filter(i => i.type === 'error').length;
    score -= errorCount * 20;

    // Deduct for warnings (minor issues)
    const warningCount = issues.filter(i => i.type === 'warning').length;
    score -= warningCount * 5;

    // Bonus for exceeding word count
    if (wordCount >= rules.minWords * 1.5) {
        score += 5;
    }

    // Bonus for good structure
    if (headingCount >= rules.minHeadings + 2) {
        score += 5;
    }

    // Bonus for links
    if (linkCount >= 3) {
        score += 5;
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    return {
        valid: errorCount === 0,
        issues,
        score,
        metrics
    };
}

/**
 * Get content type from queue item type
 */
export function getContentType(itemType: string): keyof typeof QUALITY_RULES {
    switch (itemType) {
        case 'pillar': return 'pillar';
        case 'cluster': return 'cluster';
        case 'about': return 'about';
        case 'contact': return 'contact';
        case 'privacy': return 'privacy';
        case 'terms': return 'terms';
        case 'disclaimer': return 'disclaimer';
        default: return 'cluster';
    }
}

/**
 * Content cleanup result
 */
export interface CleanupResult {
    content: string;
    changes: string[];
    wasModified: boolean;
}

/**
 * Clean AI-generated content by removing artifacts and fixing formatting
 * 
 * Removes:
 * - Citation markers like [1], [2], [3]
 * - Word count markers like (Word count: 348)
 * - AI self-references
 * 
 * Fixes:
 * - Broken markdown tables (all on one line)
 */
export function cleanContent(content: string): CleanupResult {
    const changes: string[] = [];
    let cleaned = content;

    // Remove citation markers [1], [2], [3], etc.
    const citationPattern = /\[\d+\]/g;
    if (citationPattern.test(cleaned)) {
        const citationCount = (cleaned.match(citationPattern) || []).length;
        cleaned = cleaned.replace(citationPattern, '');
        changes.push(`Removed ${citationCount} citation markers`);
    }

    // Remove combined citation markers like [1][2][3]
    const combinedCitationPattern = /(?:\[\d+\])+/g;
    cleaned = cleaned.replace(combinedCitationPattern, '');

    // Remove word count markers like (Word count: 348)
    const wordCountPattern = /\s*\(Word count:\s*\d+\)\s*/gi;
    if (wordCountPattern.test(cleaned)) {
        cleaned = cleaned.replace(wordCountPattern, ' ');
        changes.push('Removed word count markers');
    }

    // Fix broken markdown tables (table all on one line)
    // Pattern: | Header1 | Header2 | |---|---| | Data1 | Data2 |
    const brokenTablePattern = /\|([^|\n]+\|)+\s*\|[-\s|]+\|\s*(\|[^|\n]+)+\|/g;
    const brokenTableMatches = cleaned.match(brokenTablePattern);
    if (brokenTableMatches) {
        brokenTableMatches.forEach(match => {
            const fixed = fixBrokenTable(match);
            cleaned = cleaned.replace(match, fixed);
        });
        changes.push(`Fixed ${brokenTableMatches.length} broken table(s)`);
    }

    // Clean up extra whitespace
    cleaned = cleaned.replace(/  +/g, ' '); // Multiple spaces to single
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // Max 2 newlines

    return {
        content: cleaned.trim(),
        changes,
        wasModified: changes.length > 0
    };
}

/**
 * Fix a broken markdown table that's all on one line
 */
function fixBrokenTable(tableStr: string): string {
    // Split by pipe, filter empties, reconstruct
    const parts = tableStr.split('|').map(p => p.trim()).filter(p => p.length > 0);

    // Find separator row (contains only dashes)
    const separatorIndex = parts.findIndex(p => /^-+$/.test(p));

    if (separatorIndex === -1) {
        // Can't identify structure, return original
        return tableStr;
    }

    // Count columns from separator
    let colCount = 0;
    let i = separatorIndex;
    while (i < parts.length && /^-+$/.test(parts[i])) {
        colCount++;
        i++;
    }

    if (colCount === 0) return tableStr;

    // Build table
    const headers = parts.slice(0, colCount);
    const separators = parts.slice(separatorIndex, separatorIndex + colCount);
    const dataParts = parts.slice(separatorIndex + colCount);

    // Build rows
    const rows: string[][] = [];
    for (let j = 0; j < dataParts.length; j += colCount) {
        const row = dataParts.slice(j, j + colCount);
        if (row.length === colCount) {
            rows.push(row);
        }
    }

    // Construct properly formatted table
    let table = '| ' + headers.join(' | ') + ' |\n';
    table += '| ' + separators.join(' | ') + ' |\n';
    rows.forEach(row => {
        table += '| ' + row.join(' | ') + ' |\n';
    });

    return table;
}
