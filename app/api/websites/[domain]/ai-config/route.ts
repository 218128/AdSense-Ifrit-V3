import { NextRequest, NextResponse } from 'next/server';
import { getDomainProfile } from '@/lib/websiteStore';
import {
    generateAISiteBuilderPrompt,
    DomainProfileForAI,
    validateAIDecisions,
    createDecisionRecord,
    AISiteDecisions
} from '@/lib/aiSiteBuilder';
import { FEATURE_CATALOG } from '@/templates/shared/featureCatalog';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

interface Params {
    params: Promise<{ domain: string }>;
}

/**
 * GET - Get the AI prompt for configuring a website
 */
export async function GET(request: NextRequest, { params }: Params): Promise<NextResponse> {
    try {
        const { domain } = await params;

        // Get domain profile
        const profile = getDomainProfile(domain);

        if (!profile) {
            return NextResponse.json({
                success: false,
                error: 'Domain profile not found. Research the domain in Hunt tab first.',
            }, { status: 404 });
        }

        // Build profile for AI
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

        // Generate the prompt
        const prompt = generateAISiteBuilderPrompt(aiProfile);

        // Check if decisions already exist
        const decisionsPath = path.join(process.cwd(), 'websites', domain, 'decisions.json');
        let existingDecisions = null;
        if (fs.existsSync(decisionsPath)) {
            existingDecisions = JSON.parse(fs.readFileSync(decisionsPath, 'utf-8'));
        }

        return NextResponse.json({
            success: true,
            domain,
            profile: aiProfile,
            prompt,
            featureCatalog: FEATURE_CATALOG,
            existingDecisions,
            instructions: 'Copy the prompt and paste it to your AI assistant. Then POST the AI response back to this endpoint.',
        });
    } catch (error) {
        console.error('AI Site Builder GET error:', error);
        return NextResponse.json({ success: false, error: 'Failed to generate prompt' }, { status: 500 });
    }
}

/**
 * POST - Save AI decisions for a website
 */
export async function POST(request: NextRequest, { params }: Params): Promise<NextResponse> {
    try {
        const { domain } = await params;
        const body = await request.json();

        // Expect either raw AI response or parsed decisions
        let decisions: AISiteDecisions;

        if (body.aiResponse) {
            // Parse AI response JSON
            try {
                const parsed = JSON.parse(body.aiResponse);
                decisions = parsed.decisions || parsed;
            } catch {
                return NextResponse.json({
                    success: false,
                    error: 'Invalid AI response JSON',
                }, { status: 400 });
            }
        } else if (body.decisions) {
            decisions = body.decisions;
        } else {
            return NextResponse.json({
                success: false,
                error: 'Missing decisions or aiResponse in request body',
            }, { status: 400 });
        }

        // Validate decisions
        const validation = validateAIDecisions(decisions);
        if (!validation.valid) {
            return NextResponse.json({
                success: false,
                error: 'Invalid decisions',
                validationErrors: validation.errors,
            }, { status: 400 });
        }

        // Get profile for record
        const profile = getDomainProfile(domain);
        const aiProfile: DomainProfileForAI = {
            domain,
            niche: profile?.niche || 'general',
            primaryKeywords: profile?.primaryKeywords || [],
            secondaryKeywords: profile?.secondaryKeywords || [],
            questionKeywords: profile?.questionKeywords || [],
            suggestedTopics: profile?.suggestedTopics || [],
            suggestedCategories: profile?.suggestedCategories || [],
            competitorUrls: profile?.competitorUrls || [],
            contentGaps: profile?.contentGaps || [],
            trafficPotential: profile?.trafficPotential || 50,
            difficultyScore: profile?.difficultyScore || 50,
        };

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
            message: 'AI decisions saved successfully',
            decisions: record,
            nextStep: 'Use these decisions when creating the website via /api/websites/create',
        });
    } catch (error) {
        console.error('AI Site Builder POST error:', error);
        return NextResponse.json({ success: false, error: 'Failed to save decisions' }, { status: 500 });
    }
}
