import { NextRequest, NextResponse } from 'next/server';
import { getDomainProfile } from '@/lib/websiteStore';
import { generateAISiteBuilderPrompt, DomainProfileForAI, validateAIDecisions, createDecisionRecord, AISiteDecisions } from '@/lib/aiSiteBuilder';
import { PROVIDERS, AIProvider } from '@/lib/ai/multiProvider';
import { PROVIDER_ADAPTERS } from '@/lib/ai/providers';
import { aiServices } from '@/lib/ai/services';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Params {
    params: Promise<{ domain: string }>;
}

/**
 * POST - Auto-generate AI decisions using AIServices (preferred) or multiProvider fallback
 */
export async function POST(request: NextRequest, { params }: Params): Promise<NextResponse> {
    try {
        const { domain } = await params;
        const body = await request.json();
        const { apiKeys, preferredProvider, useAIServices = true } = body;

        if (!apiKeys || Object.keys(apiKeys).length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No API keys provided. Send apiKeys object with provider keys.',
                availableProviders: Object.entries(PROVIDERS).map(([id, p]) => ({
                    id,
                    name: p.name,
                    description: p.description,
                    pricing: p.pricing,
                })),
            }, { status: 400 });
        }

        // Get domain profile
        const profile = getDomainProfile(domain);
        if (!profile) {
            return NextResponse.json({
                success: false,
                error: 'Domain profile not found. Research the domain in Hunt tab first.',
            }, { status: 404 });
        }

        // Build AI profile
        const aiProfile: DomainProfileForAI = {
            domain: profile.domain,
            niche: profile.niche,
            primaryKeywords: profile.primaryKeywords || [],
            secondaryKeywords: profile.secondaryKeywords || [],
            questionKeywords: profile.questionKeywords || [],
            suggestedTopics: profile.suggestedTopics || [],
            suggestedCategories: profile.suggestedCategories || [],
            competitorUrls: profile.competitorUrls || [],
            contentGaps: profile.contentGaps || [],
            trafficPotential: profile.trafficPotential || 50,
            difficultyScore: profile.difficultyScore || 50,
        };

        // Generate prompt
        const prompt = generateAISiteBuilderPrompt(aiProfile);

        let aiResponse: { success: boolean; content?: string; error?: string; provider?: string; model?: string } = {
            success: false,
            error: 'No AI provider responded'
        };
        let usedAIServices = false;

        // Normalize keys to support both old and new formats first
        // Old: { 'gemini_api_key': 'key123' }
        // New: { 'gemini': ['key123', 'key456'] }
        const normalizedKeys: Record<string, string[]> = {};

        for (const [keyName, value] of Object.entries(apiKeys)) {
            // Handle old format: gemini_api_key → gemini
            if (keyName.endsWith('_api_key')) {
                const provider = keyName.replace('_api_key', '');
                if (typeof value === 'string' && value.trim()) {
                    normalizedKeys[provider] = [value.trim()];
                }
            }
            // Handle new format: provider → string[]
            else if (Array.isArray(value)) {
                normalizedKeys[keyName] = value.filter(k => typeof k === 'string' && k.trim());
            }
            // Handle new format with single key: provider → string
            else if (typeof value === 'string' && value.trim()) {
                normalizedKeys[keyName] = [value.trim()];
            }
        }

        // Try AIServices.executeWithKeys (uses Capabilities system)
        if (useAIServices) {
            console.log('[AI-Config] Trying AIServices.executeWithKeys...');
            const aiServicesResult = await aiServices.executeWithKeys(
                {
                    capability: 'generate',
                    prompt,
                    maxTokens: 4000,
                    temperature: 0.7,
                },
                normalizedKeys
            );

            if (aiServicesResult.success && aiServicesResult.text) {
                aiResponse = {
                    success: true,
                    content: aiServicesResult.text,
                    provider: aiServicesResult.handlerUsed,
                    model: aiServicesResult.model,
                };
                usedAIServices = true;
                console.log(`[AI-Config] AIServices succeeded with ${aiServicesResult.handlerUsed}`);
            } else {
                console.log('[AI-Config] AIServices.executeWithKeys failed:', aiServicesResult.error);
            }
        }

        // Fallback to direct provider execution (reuses normalizedKeys from above)
        if (!usedAIServices) {
            console.log('[AI-Config] Fallback: trying providers directly...');

            // Try providers using adapters directly
            const providerOrder: AIProvider[] = ['gemini', 'deepseek', 'openrouter', 'perplexity'];

            for (const providerId of providerOrder) {
                const keys = normalizedKeys[providerId];
                if (!keys?.length) continue;

                const adapter = PROVIDER_ADAPTERS[providerId as keyof typeof PROVIDER_ADAPTERS];
                if (!adapter) continue;

                // Try each key (rotation within provider)
                for (const apiKey of keys) {
                    try {
                        console.log(`[AI-Config] Trying ${providerId}...`);
                        const result = await adapter.chat(apiKey, {
                            prompt,
                            maxTokens: 4000,
                            temperature: 0.7,
                        });

                        if (result.success && result.content) {
                            aiResponse = {
                                success: true,
                                content: result.content,
                                provider: providerId,
                                model: result.model,
                            };
                            console.log(`[AI-Config] ${providerId} succeeded`);
                            break;
                        }
                    } catch (error) {
                        console.log(`[AI-Config] ${providerId} failed:`, error instanceof Error ? error.message : 'Unknown');
                        continue;
                    }
                }

                if (aiResponse.success) break;
            }
        }

        if (!aiResponse.success) {
            return NextResponse.json({
                success: false,
                error: aiResponse.error,
                provider: aiResponse.provider,
            }, { status: 500 });
        }

        // Parse AI response - handle markdown code blocks
        let decisions: AISiteDecisions;
        try {
            let content = aiResponse.content || '{}';
            // Remove markdown code blocks if present
            content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(content);
            decisions = parsed.decisions || parsed;
        } catch {
            return NextResponse.json({
                success: false,
                error: 'Failed to parse AI response as JSON',
                rawResponse: aiResponse.content?.substring(0, 500),
            }, { status: 500 });
        }

        // Validate decisions
        const validation = validateAIDecisions(decisions);
        if (!validation.valid) {
            return NextResponse.json({
                success: false,
                error: 'AI returned invalid decisions',
                validationErrors: validation.errors,
                rawDecisions: decisions,
            }, { status: 400 });
        }

        // Create decision record
        const record = createDecisionRecord(aiProfile, decisions);

        // Save to website directory
        const websiteDir = path.join(process.cwd(), 'websites', domain);
        if (!fs.existsSync(websiteDir)) {
            fs.mkdirSync(websiteDir, { recursive: true });
        }

        const decisionsPath = path.join(websiteDir, 'decisions.json');
        fs.writeFileSync(decisionsPath, JSON.stringify(record, null, 2));

        return NextResponse.json({
            success: true,
            message: 'AI decisions generated and saved successfully',
            provider: aiResponse.provider,
            model: aiResponse.model,
            decisions: record,
            nextStep: 'Create website via /api/websites/create with useAIDecisions: true',
        });
    } catch (error) {
        console.error('Auto-generate decisions error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
