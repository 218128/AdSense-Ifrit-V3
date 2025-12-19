import { NextRequest, NextResponse } from 'next/server';
import { getDomainProfile } from '@/lib/websiteStore';
import { generateAISiteBuilderPrompt, DomainProfileForAI, validateAIDecisions, createDecisionRecord, AISiteDecisions } from '@/lib/aiSiteBuilder';
import { callAIWithRotation, AI_PROVIDERS } from '@/lib/aiProviders';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Params {
    params: Promise<{ domain: string }>;
}

/**
 * POST - Auto-generate AI decisions using available AI providers
 */
export async function POST(request: NextRequest, { params }: Params): Promise<NextResponse> {
    try {
        const { domain } = await params;
        const body = await request.json();
        const { apiKeys, strategy = 'rotate' } = body;

        if (!apiKeys || Object.keys(apiKeys).length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No API keys provided. Send apiKeys object with provider keys.',
                availableProviders: Object.values(AI_PROVIDERS).map(p => ({
                    id: p.id,
                    name: p.name,
                    keyName: p.apiKeyName,
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

        // Call AI with rotation
        const aiResponse = await callAIWithRotation(apiKeys, {
            prompt,
            systemPrompt: 'You are an expert website configuration assistant. Return only valid JSON matching the exact structure specified in the prompt.',
            temperature: 0.7,
            jsonMode: true,
        }, strategy as 'rotate' | 'random');

        if (!aiResponse.success) {
            return NextResponse.json({
                success: false,
                error: aiResponse.error,
                provider: aiResponse.provider,
            }, { status: 500 });
        }

        // Parse AI response
        let decisions: AISiteDecisions;
        try {
            const parsed = JSON.parse(aiResponse.content || '{}');
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
            tokensUsed: aiResponse.tokensUsed,
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
