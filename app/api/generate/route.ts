import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { TrendScanner, ScanResult } from '@/lib/modules/trendScanner';
import { ContentGenerator, Article } from '@/lib/modules/contentGenerator';
import { validateUserConfig, devFallbacks } from '@/lib/config/env';
import { analyzeCPC } from '@/lib/modules/cpcIntelligence';
import { getBestPersonaForTopic, getPersonaById } from '@/lib/humanization/personas';
import { getBestTemplateForNiche, getTemplateById, ArticleType } from '@/templates/shared/articleTemplates';

export const dynamic = 'force-dynamic';

interface GenerateRequest {
    geminiKey: string;
    blogUrl?: string;
    // Multi-provider keys (from Settings Modal)
    providerKeys?: {
        gemini?: string[];
        deepseek?: string[];
        openrouter?: string[];
        vercel?: string[];
        perplexity?: string[];
    };
    selectedTopic?: {
        topic: string;
        context: string;
        source: 'live' | 'fallback';
    };
    options?: {
        persona: string;
        template: string;
        highCpcMode: boolean;
    };
    adsenseConfig?: {
        publisherId: string;
        leaderboardSlot?: string;
        articleSlot?: string;
        multiplexSlot?: string;
    };
}

interface DecisionReasoning {
    factor: string;
    value: string;
    score?: number;
}

interface GenerateResponse {
    success?: boolean;
    message: string;
    article?: string;
    slug?: string;
    trendSource?: 'google_trends' | 'fallback' | 'high_cpc_mode' | 'user_selected' | 'csv_import';
    // Step 1: Topic
    topicName?: string;
    topicContext?: string;
    // Step 2: CPC
    cpcScore?: number;
    cpcNiche?: string;
    cpcIntent?: string;
    cpcReasoning?: DecisionReasoning[];
    // Step 3: Persona
    persona?: string;
    personaSpecialty?: string;
    personaReasoning?: DecisionReasoning[];
    // Step 4: Template
    template?: string;
    templateReasoning?: DecisionReasoning[];
    // Step 5: Content
    wordCount?: number;
    sectionCount?: number;
    // General
    warning?: string;
    error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<GenerateResponse>> {
    try {
        const body: GenerateRequest = await req.json();

        const geminiKey = body.geminiKey || devFallbacks.geminiApiKey;

        const validation = validateUserConfig({ geminiApiKey: geminiKey });
        if (!validation.valid) {
            return NextResponse.json(
                {
                    message: 'Missing required configuration',
                    error: `Please configure: ${validation.missing.join(', ')} in Settings`
                },
                { status: 400 }
            );
        }

        // 1. Get topic (user-selected or scan)
        let selectedTrend: { topic: string; context: string };
        let trendSource: GenerateResponse['trendSource'];

        if (body.selectedTopic) {
            // User selected a specific topic
            selectedTrend = body.selectedTopic;
            trendSource = body.selectedTopic.source === 'live' ? 'google_trends' : 'user_selected';
        } else {
            // Auto-scan for trends
            const scanner = new TrendScanner();
            const highCpcMode = body.options?.highCpcMode ?? true;
            const scanResult: ScanResult = highCpcMode
                ? await scanner.scanHighCPC()
                : await scanner.scan();

            if (!scanResult.trends || scanResult.trends.length === 0) {
                return NextResponse.json({
                    message: 'No trends found',
                    trendSource: scanResult.source
                }, { status: 200 });
            }

            selectedTrend = scanResult.trends[0];
            trendSource = highCpcMode ? 'high_cpc_mode' : scanResult.source;
        }

        // 2. Analyze CPC with detailed reasoning
        const cpcAnalysis = analyzeCPC(selectedTrend.topic);
        const primaryClassification = cpcAnalysis.classifications[0];
        const cpcIntent = primaryClassification?.intent || 'informational';
        const cpcCompetition = primaryClassification?.competitionLevel || 'medium';
        const cpcEstimate = primaryClassification?.estimatedCPC || '$5-15';

        const cpcReasoning: DecisionReasoning[] = [
            { factor: 'Niche Match', value: cpcAnalysis.primaryNiche, score: 30 },
            { factor: 'Buyer Intent', value: cpcIntent, score: cpcIntent === 'commercial' || cpcIntent === 'transactional' ? 25 : 10 },
            { factor: 'Competition', value: cpcCompetition, score: cpcCompetition === 'high' ? 20 : 15 },
            { factor: 'CPC Range', value: cpcEstimate, score: cpcAnalysis.score > 70 ? 25 : 15 }
        ];

        // 3. Select persona with reasoning
        let selectedPersona;
        let personaObj;
        const personaReasoning: DecisionReasoning[] = [];

        if (body.options?.persona && body.options.persona !== 'auto') {
            personaObj = getPersonaById(body.options.persona);
            selectedPersona = personaObj?.name || body.options.persona;
            personaReasoning.push({ factor: 'Selection', value: 'Manual override by user' });
        } else {
            personaObj = getBestPersonaForTopic(selectedTrend.topic);
            selectedPersona = personaObj.name;

            // Explain why this persona was chosen
            const personaSpecialtyMain = personaObj.specialties?.[0] || 'General';
            personaReasoning.push(
                { factor: 'Topic Match', value: `"${selectedTrend.topic}" → ${personaSpecialtyMain}`, score: 40 },
                { factor: 'Expertise Level', value: `${personaObj.yearsExperience} years experience`, score: 30 },
                { factor: 'Voice Style', value: personaObj.writingStyle?.formality || 'professional', score: 20 },
                { factor: 'Niche Fit', value: `${cpcAnalysis.primaryNiche} ↔ ${personaSpecialtyMain}`, score: 10 }
            );
        }

        // 4. Select template with reasoning
        let selectedTemplate;
        let templateObj;
        const templateReasoning: DecisionReasoning[] = [];

        if (body.options?.template && body.options.template !== 'auto') {
            templateObj = getTemplateById(body.options.template as ArticleType);
            selectedTemplate = templateObj?.name || body.options.template;
            templateReasoning.push({ factor: 'Selection', value: 'Manual override by user' });
        } else {
            templateObj = getBestTemplateForNiche(cpcAnalysis.primaryNiche);
            selectedTemplate = templateObj.name;

            // Explain why this template was chosen
            templateReasoning.push(
                { factor: 'Niche Match', value: `${cpcAnalysis.primaryNiche} → ${templateObj.name}`, score: 35 },
                { factor: 'CPC Potential', value: templateObj.cpcPotential, score: 30 },
                { factor: 'Word Target', value: `${templateObj.targetWordCount} words`, score: 20 },
                { factor: 'Schema Types', value: templateObj.schemaTypes.slice(0, 2).join(', '), score: 15 }
            );
        }

        // Convert topic to slug
        const keyword = selectedTrend.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        // Check if content already exists
        const generator = new ContentGenerator();
        if (generator.exists(keyword)) {
            return NextResponse.json({
                success: false,
                message: 'Content already exists for this topic',
                article: selectedTrend.topic,
                slug: keyword,
                trendSource,
                topicName: selectedTrend.topic,
                cpcScore: cpcAnalysis.score,
                persona: selectedPersona,
                template: selectedTemplate,
                warning: 'Article already generated - try a different topic'
            }, { status: 200 });
        }

        // 5. Generate article (with multi-provider key rotation if providerKeys provided)
        const article: Article = await generator.generate(
            keyword,
            selectedTrend.context,
            geminiKey!,
            {
                blogUrl: body.blogUrl,
                adsenseConfig: body.adsenseConfig
            },
            body.providerKeys
        );
        generator.save(article);

        // Calculate metrics
        const wordCount = article.body.split(/\s+/).length;
        const sectionCount = (article.body.match(/^## /gm) || []).length;

        // Trigger revalidation
        try {
            revalidatePath('/');
            revalidatePath(`/${article.slug}`);
        } catch {
            // Continue anyway
        }

        return NextResponse.json({
            success: true,
            message: 'Article generated successfully',
            article: article.title,
            slug: article.slug,
            trendSource,
            // Step 1
            topicName: selectedTrend.topic,
            topicContext: selectedTrend.context,
            // Step 2
            cpcScore: cpcAnalysis.score,
            cpcNiche: cpcAnalysis.primaryNiche,
            cpcIntent,
            cpcReasoning,
            // Step 3
            persona: selectedPersona,
            personaSpecialty: personaObj?.specialties?.[0],
            personaReasoning,
            // Step 4
            template: selectedTemplate,
            templateReasoning,
            // Step 5
            wordCount,
            sectionCount,
            warning: trendSource === 'fallback' ? 'Used fallback trends' : undefined
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('❌ Generation Error:', error);
        return NextResponse.json(
            { message: 'Generation failed', error: errorMessage },
            { status: 500 }
        );
    }
}
