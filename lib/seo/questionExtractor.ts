/**
 * Question Extractor
 * FSD: lib/seo/questionExtractor.ts
 * 
 * Extracts Q&A pairs from HTML content for AI Overview optimization.
 * Identifies questions from headings, FAQ sections, and inline questions.
 */

import type { QuestionExtractionResult, AnswerBlock } from './types';

// ============================================================================
// Question Patterns
// ============================================================================

/**
 * Common question words/patterns
 */
const QUESTION_PATTERNS = [
    /^(what|how|why|when|where|who|which|can|does|is|are|should|will|do|would)\s+/i,
    /^(what's|how's|why's|who's|where's|when's)\s+/i,
    /\?$/,
];

/**
 * FAQ section indicators
 */
const FAQ_SECTION_PATTERNS = [
    /FAQ/i,
    /frequently asked/i,
    /common questions/i,
    /questions? and answers?/i,
    /Q&A/i,
];

// ============================================================================
// Extraction Functions
// ============================================================================

/**
 * Check if text is a question
 */
function isQuestion(text: string): boolean {
    const trimmed = text.trim();
    return QUESTION_PATTERNS.some(p => p.test(trimmed));
}

/**
 * Extract questions from headings (H2-H6)
 */
function extractQuestionsFromHeadings(html: string): QuestionExtractionResult['questions'] {
    const questions: QuestionExtractionResult['questions'] = [];

    // Match headings (h2-h6)
    const headingPattern = /<h([2-6])[^>]*>(.*?)<\/h\1>/gi;
    let match;
    let position = 0;

    while ((match = headingPattern.exec(html)) !== null) {
        const headingText = match[2].replace(/<[^>]+>/g, '').trim();
        position++;

        if (isQuestion(headingText)) {
            // Find content after this heading until next heading
            const startIndex = match.index + match[0].length;
            const nextHeadingMatch = html.substring(startIndex).match(/<h[1-6][^>]*>/i);
            const endIndex = nextHeadingMatch
                ? startIndex + nextHeadingMatch.index!
                : html.length;

            const answerHtml = html.substring(startIndex, endIndex);
            const answerText = answerHtml
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 500); // Limit answer length

            if (answerText.length > 50) {
                questions.push({
                    question: headingText,
                    answer: answerText,
                    source: 'heading',
                    confidence: 0.85,
                    position,
                });
            }
        }
    }

    return questions;
}

/**
 * Extract questions from FAQ schema or FAQ sections
 */
function extractQuestionsFromFAQ(html: string): QuestionExtractionResult['questions'] {
    const questions: QuestionExtractionResult['questions'] = [];

    // Check for FAQ schema
    const schemaMatch = html.match(/"@type"\s*:\s*"FAQPage"(.*?)(?="@type"|$)/s);
    if (schemaMatch) {
        const faqContent = schemaMatch[0];
        const questionPattern = /"name"\s*:\s*"([^"]+)".*?"text"\s*:\s*"([^"]+)"/gs;
        let qMatch;
        let position = 0;

        while ((qMatch = questionPattern.exec(faqContent)) !== null) {
            questions.push({
                question: qMatch[1],
                answer: qMatch[2].substring(0, 500),
                source: 'faq',
                confidence: 0.95,
                position: ++position,
            });
        }
    }

    // Also look for FAQ sections in HTML
    const faqSectionPattern = /<(?:div|section)[^>]*class="[^"]*(?:faq|accordion)[^"]*"[^>]*>(.*?)<\/(?:div|section)>/gis;
    let faqMatch;

    while ((faqMatch = faqSectionPattern.exec(html)) !== null) {
        const faqHtml = faqMatch[1];

        // Look for question/answer pairs
        const qaPattern = /<(?:dt|h\d|button)[^>]*>(.*?)<\/(?:dt|h\d|button)>.*?<(?:dd|p|div)[^>]*>(.*?)<\/(?:dd|p|div)>/gis;
        let qaMatch;

        while ((qaMatch = qaPattern.exec(faqHtml)) !== null) {
            const q = qaMatch[1].replace(/<[^>]+>/g, '').trim();
            const a = qaMatch[2].replace(/<[^>]+>/g, '').trim();

            if (q.length > 10 && a.length > 20) {
                questions.push({
                    question: q,
                    answer: a.substring(0, 500),
                    source: 'faq',
                    confidence: 0.90,
                    position: questions.length + 1,
                });
            }
        }
    }

    return questions;
}

/**
 * Extract inline questions (questions within paragraphs)
 */
function extractInlineQuestions(html: string): QuestionExtractionResult['questions'] {
    const questions: QuestionExtractionResult['questions'] = [];
    const text = html.replace(/<[^>]+>/g, '\n');
    const sentences = text.split(/[.!]\s+/);

    let position = 0;
    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].trim();

        if (sentence.endsWith('?') && sentence.length > 15) {
            position++;

            // Find answer in next 2-3 sentences
            const answerSentences = sentences.slice(i + 1, i + 4);
            const answer = answerSentences
                .filter(s => !s.endsWith('?'))
                .join('. ')
                .trim()
                .substring(0, 500);

            if (answer.length > 50) {
                questions.push({
                    question: sentence,
                    answer,
                    source: 'inline',
                    confidence: 0.70,
                    position,
                });
            }
        }
    }

    return questions;
}

/**
 * Infer questions from content structure
 * (Convert declarative statements to Q&A format)
 */
function inferQuestionsFromContent(html: string, keyword?: string): QuestionExtractionResult['questions'] {
    const questions: QuestionExtractionResult['questions'] = [];

    // Look for patterns that suggest Q&A potential
    const patterns = [
        { pattern: /The (?:best|top|main) way to ([^.]+) is/gi, template: 'What is the best way to $1?' },
        { pattern: /One of the (?:biggest|main|key) (?:benefits|advantages) of ([^.]+) is/gi, template: 'What are the benefits of $1?' },
        { pattern: /([^.]+) is (?:a|an|the) (?:process|method|technique) (?:for|of|that)/gi, template: 'What is $1?' },
        { pattern: /The (?:first|second|next) step is to ([^.]+)/gi, template: 'How do you $1?' },
    ];

    const text = html.replace(/<[^>]+>/g, ' ');
    let position = 0;

    for (const { pattern, template } of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const inferredQ = template.replace('$1', match[1].trim());

            // Get surrounding context as answer
            const startIdx = Math.max(0, match.index - 50);
            const endIdx = Math.min(text.length, match.index + match[0].length + 200);
            const answer = text.substring(startIdx, endIdx).trim();

            questions.push({
                question: inferredQ,
                answer: answer.substring(0, 500),
                source: 'inferred',
                confidence: 0.55,
                position: ++position,
            });
        }
    }

    return questions.slice(0, 5); // Max 5 inferred questions
}

// ============================================================================
// Main Extraction Function
// ============================================================================

/**
 * Extract all Q&A pairs from HTML content
 */
export function extractQuestions(
    html: string,
    options?: { keyword?: string; maxQuestions?: number }
): QuestionExtractionResult {
    const maxQuestions = options?.maxQuestions || 10;

    // Extract from all sources
    const headingQuestions = extractQuestionsFromHeadings(html);
    const faqQuestions = extractQuestionsFromFAQ(html);
    const inlineQuestions = extractInlineQuestions(html);
    const inferredQuestions = inferQuestionsFromContent(html, options?.keyword);

    // Combine and deduplicate
    const allQuestions = [
        ...faqQuestions,        // Highest priority
        ...headingQuestions,
        ...inlineQuestions,
        ...inferredQuestions,
    ];

    // Deduplicate by similar questions
    const seen = new Set<string>();
    const uniqueQuestions = allQuestions.filter(q => {
        const normalized = q.question.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
    });

    // Sort by confidence
    uniqueQuestions.sort((a, b) => b.confidence - a.confidence);

    // Limit to max
    const finalQuestions = uniqueQuestions.slice(0, maxQuestions);

    // Find best question for featured snippet
    let recommendedFeatured = 0;
    if (options?.keyword) {
        const keywordLower = options.keyword.toLowerCase();
        const keywordMatch = finalQuestions.findIndex(q =>
            q.question.toLowerCase().includes(keywordLower)
        );
        if (keywordMatch >= 0) recommendedFeatured = keywordMatch;
    }

    return {
        questions: finalQuestions,
        recommendedFeatured,
    };
}

/**
 * Convert extraction result to AnswerBlocks
 */
export function toAnswerBlocks(result: QuestionExtractionResult): AnswerBlock[] {
    return result.questions.map((q, i) => ({
        id: `answer_${i + 1}`,
        question: q.question,
        conciseAnswer: q.answer.split('.').slice(0, 2).join('.') + '.',
        expandedAnswer: q.answer,
        keyTakeaways: extractKeyTakeaways(q.answer),
        sources: [], // Would need citation extraction
        position: i === result.recommendedFeatured ? 'featured' : 'body',
        confidence: Math.round(q.confidence * 100),
    }));
}

/**
 * Extract key takeaways from answer text
 */
function extractKeyTakeaways(text: string): string[] {
    const takeaways: string[] = [];

    // Look for lists
    const listItems = text.match(/(?:^|\n)\s*[-•*]\s*([^\n]+)/g);
    if (listItems) {
        takeaways.push(...listItems.map(li => li.replace(/^\s*[-•*]\s*/, '').trim()));
    }

    // Look for numbered items
    const numberedItems = text.match(/(?:^|\n)\s*\d+[.)]\s*([^\n]+)/g);
    if (numberedItems) {
        takeaways.push(...numberedItems.map(li => li.replace(/^\s*\d+[.)]\s*/, '').trim()));
    }

    // If no lists, extract key sentences
    if (takeaways.length === 0) {
        const sentences = text.split('.').filter(s => s.trim().length > 20);
        takeaways.push(...sentences.slice(0, 3).map(s => s.trim() + '.'));
    }

    return takeaways.slice(0, 5);
}
