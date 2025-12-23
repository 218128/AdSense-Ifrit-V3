import { NextRequest, NextResponse } from 'next/server';
import { getDomainProfile } from '@/lib/websiteStore';
import { generateAISiteBuilderPrompt, DomainProfileForAI, validateAIDecisions, createDecisionRecord, AISiteDecisions } from '@/lib/aiSiteBuilder';
import { AIKeyManager, MultiProviderAI, PROVIDERS, AIProvider } from '@/lib/ai/multiProvider';
import { executeGenerationWithAIServices, hasCapabilityHandlers } from '@/lib/ai/serverIntegration';
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

        // Try AIServices first if enabled and has handlers
        if (useAIServices && hasCapabilityHandlers('generate')) {
            console.log('[AI-Config] Trying AIServices for generation...');
            const aiServicesResult = await executeGenerationWithAIServices(prompt, {
                maxTokens: 4000,
                temperature: 0.7,
            });

            if (aiServicesResult.success && aiServicesResult.text) {
                aiResponse = {
                    success: true,
                    content: aiServicesResult.text,
                    provider: 'aiservices',
                    model: 'auto',
                };
                usedAIServices = true;
                console.log('[AI-Config] AIServices generation successful');
            } else {
                console.log('[AI-Config] AIServices failed, falling back to MultiProviderAI');
            }
        }

        // Fallback to direct MultiProviderAI
        if (!usedAIServices) {
            // Initialize key manager and AI client
            const keyManager = new AIKeyManager();

            // Add keys from request to key manager
            const keyMapping: Record<string, AIProvider> = {
                'gemini_api_key': 'gemini',
                'deepseek_api_key': 'deepseek',
                'openrouter_api_key': 'openrouter',
                'vercel_api_key': 'vercel',
                'perplexity_api_key': 'perplexity',
            };

            for (const [keyName, key] of Object.entries(apiKeys)) {
                const provider = keyMapping[keyName];
                if (provider && typeof key === 'string' && key.trim()) {
                    keyManager.addKey(provider, key.trim(), keyName);
                }
            }

            const aiClient = new MultiProviderAI(keyManager);

            // Call AI with automatic failover
            const result = await aiClient.generateContent(prompt, {
                maxTokens: 4000,
                temperature: 0.7,
                preferredProvider: preferredProvider as AIProvider | undefined,
            });

            aiResponse = result;
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
