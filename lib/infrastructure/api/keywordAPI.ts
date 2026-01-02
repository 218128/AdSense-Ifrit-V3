/**
 * Keyword API Service
 * 
 * Infrastructure layer for keyword analysis operations.
 * Contains all API/network calls for keywords.
 * 
 * @module infrastructure/api
 */

import type { KeywordItem, AnalyzedKeyword } from '@/lib/keywords/types';
import type { ActionStatus } from '@/lib/shared/types';
import { ActionStatusFactory } from '@/lib/shared/types';
import { buildKeywordAnalysisPrompt } from '@/lib/prompts';

/**
 * Analyze keywords result
 */
export interface AnalyzeKeywordsResult {
    keywords: AnalyzedKeyword[];
    successCount: number;
    failedCount: number;
}

/**
 * Analysis options
 */
export interface AnalyzeKeywordsOptions {
    researchData?: Record<string, string[]>;
}

/**
 * Analyze keywords using AI service
 * 
 * @param keywords - Keywords to analyze
 * @param onProgress - Progress callback
 * @param options - Options including research data for context
 * @returns Analyzed keywords
 */
export async function analyzeKeywords(
    keywords: KeywordItem[],
    onProgress: (status: ActionStatus) => void,
    options: AnalyzeKeywordsOptions = {}
): Promise<AnalyzeKeywordsResult> {
    if (!keywords || keywords.length === 0) {
        return { keywords: [], successCount: 0, failedCount: 0 };
    }

    onProgress(ActionStatusFactory.running(
        `Analyzing ${keywords.length} keywords...`,
        { current: 1, total: 2 }
    ));

    try {
        const { aiServices } = await import('@/lib/ai/services');

        // Build prompt using prompt layer - include research data if available
        const prompt = buildKeywordAnalysisPrompt(keywords, {
            researchData: options.researchData,
        });

        onProgress(ActionStatusFactory.running(
            'Getting AI analysis...',
            { current: 2, total: 2 }
        ));

        const result = await aiServices.execute({
            capability: 'keyword-analyze',
            prompt,
            context: { keywords: keywords.map(k => k.keyword) },
        });

        if (result.success) {
            // Debug: log what we received
            console.log('[keywordAPI] AI result:', {
                success: result.success,
                hasData: !!result.data,
                dataType: result.data ? typeof result.data : 'none',
                dataIsArray: Array.isArray(result.data),
                dataLength: Array.isArray(result.data) ? result.data.length : 'N/A',
                hasText: !!result.text,
                textPreview: result.text?.slice(0, 200),
            });

            // Result may come as structured data or as JSON text
            let analyzedKeywords: AnalyzedKeyword[] = [];

            if (result.data && Array.isArray(result.data) && result.data.length > 0) {
                // Handler returned structured data - normalize it
                console.log('[keywordAPI] Using result.data path');
                const dataItems = result.data as Record<string, unknown>[];
                analyzedKeywords = dataItems.map((item, index) => {
                    const inputKw = keywords[index] || { keyword: String(item.keyword || `Keyword ${index + 1}`), source: 'ai' as const };
                    return {
                        keyword: inputKw.keyword,
                        source: inputKw.source,
                        niche: inputKw.niche || String(item.niche || 'General'),
                        analysis: {
                            keyword: inputKw.keyword,
                            niche: String(item.niche || item.category || inputKw.niche || 'General'),
                            estimatedCPC: String(item.estimatedCPC || item.cpc || '$0.50-2.00'),
                            estimatedVolume: String(item.estimatedVolume || item.volume || '1K-10K'),
                            competition: String(item.competition || item.competitionLevel || 'Medium'),
                            score: Number(item.monetizationScore || item.score || 50),
                            intent: String(item.intent || 'informational'),
                            reasoning: String(item.recommendation || item.reasoning || item.analysis || 'AI analysis complete'),
                        },
                    };
                });
            } else if (result.text) {
                console.log('[keywordAPI] Using result.text path');
                // Handler returned text - try to parse as JSON
                try {
                    let jsonText = result.text.trim();

                    // Method 1: Extract from markdown code fence (```json ... ```)
                    const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
                    if (codeBlockMatch) {
                        jsonText = codeBlockMatch[1].trim();
                    }
                    // Method 2: Find JSON array in text (starts with [ and ends with ])
                    else {
                        const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
                        if (arrayMatch) {
                            jsonText = arrayMatch[0];
                        }
                    }

                    const parsed = JSON.parse(jsonText);
                    const aiResults = Array.isArray(parsed) ? parsed : [parsed];

                    // Normalize AI output to AnalyzedKeyword structure
                    analyzedKeywords = aiResults.map((item: Record<string, unknown>, index: number) => {
                        // Find matching input keyword
                        const inputKw = keywords[index] || keywords.find(k =>
                            k.keyword.toLowerCase() === String(item.keyword || '').toLowerCase()
                        ) || { keyword: String(item.keyword || `Keyword ${index + 1}`), source: 'ai' as const };

                        // Handle both snake_case and camelCase field names
                        const cpc = item.estimatedCPC || item.estimated_cpc || item.cpc || '$0.50-2.00';
                        const volume = item.estimatedVolume || item.estimated_volume || item.volume || item.search_volume || '1K-10K';
                        const competition = item.competition || item.competition_level || item.competitionLevel || 'Medium';
                        const score = item.monetizationScore || item.monetization_score || item.score || 50;
                        const niche = item.niche || item.niche_category || item.category || inputKw.niche || 'General';
                        const intent = item.intent || item.bestIntent || item.best_intent || 'informational';
                        const reasoning = item.recommendation || item.reasoning || item.analysis || item.best_monetization_method || 'AI analysis complete';

                        return {
                            keyword: inputKw.keyword,
                            source: inputKw.source,
                            niche: inputKw.niche || String(niche),
                            analysis: {
                                keyword: inputKw.keyword,
                                niche: String(niche),
                                estimatedCPC: String(cpc),
                                estimatedVolume: String(volume),
                                competition: String(competition),
                                score: Number(score) || 50,
                                intent: String(intent),
                                reasoning: String(reasoning),
                            },
                        };
                    });
                } catch (parseError) {
                    // If JSON parsing fails, log details and create fallback analysis
                    console.warn('[keywordAPI] JSON parsing failed:', parseError);
                    console.warn('[keywordAPI] Text that failed to parse (first 500 chars):', result.text?.slice(0, 500));
                    analyzedKeywords = keywords.map(kw => ({
                        ...kw,
                        analysis: {
                            keyword: kw.keyword,
                            niche: kw.niche || 'General',
                            estimatedCPC: '$0.50-2.00',
                            estimatedVolume: '1K-10K',
                            competition: 'Medium' as const,
                            score: 50,
                            intent: 'informational' as const,
                            reasoning: result.text?.slice(0, 200) || 'AI analysis complete',
                        },
                    }));
                }
            }

            if (analyzedKeywords.length > 0) {
                onProgress(ActionStatusFactory.success(
                    `Analyzed ${analyzedKeywords.length} keywords`,
                    analyzedKeywords.length
                ));

                return {
                    keywords: analyzedKeywords,
                    successCount: analyzedKeywords.length,
                    failedCount: keywords.length - analyzedKeywords.length,
                };
            }
        }

        throw new Error(result.error || 'Analysis failed - no data returned');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        onProgress(ActionStatusFactory.error('Keyword analysis failed', errorMessage));
        throw error;
    }
}

/**
 * Research keywords using AI
 * 
 * @param keywords - Keywords to research
 * @param onProgress - Progress callback
 * @returns Research findings
 */
export async function researchKeywords(
    keywords: string[],
    onProgress: (status: ActionStatus) => void
): Promise<{ findings: string[] }> {
    onProgress(ActionStatusFactory.running(
        `Research ${keywords.length} keywords...`
    ));

    try {
        const { aiServices } = await import('@/lib/ai/services');

        const result = await aiServices.research(
            `Latest trends and statistics for: ${keywords.join(', ')}`,
            { researchType: 'quick' }
        );

        if (result.success && result.data) {
            const findings = (result.data as { keyFindings?: string[] })?.keyFindings ||
                (result.text ? [result.text] : []);

            onProgress(ActionStatusFactory.success(
                'Research complete',
                findings.length
            ));

            return { findings };
        } else {
            throw new Error(result.error || 'Research failed');
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        onProgress(ActionStatusFactory.error('Research failed', errorMessage));
        throw error;
    }
}
