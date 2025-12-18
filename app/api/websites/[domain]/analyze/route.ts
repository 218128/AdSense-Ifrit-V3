/**
 * Template Analyzer API
 * 
 * Analyzes a website's template for E-E-A-T and AI Overview compliance.
 * 
 * GET /api/websites/[domain]/analyze
 *   - Returns in-app analysis results
 * 
 * GET /api/websites/[domain]/analyze?prompt=true
 *   - Returns a copyable prompt for external AI evaluation
 * 
 * POST /api/websites/[domain]/analyze
 *   - Apply scores from external AI analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWebsite, saveWebsite, Website } from '@/lib/websiteStore';

interface TemplateAnalysis {
    // Feature detection
    hasAboutPage: boolean;
    hasAuthorSchema: boolean;
    hasArticleSchema: boolean;
    hasFAQSchema: boolean;
    hasEditorialPolicy: boolean;
    hasSourceCitations: boolean;
    hasAnswerBox: boolean;
    hasDefinitionBlocks: boolean;
    hasComparisonTables: boolean;

    // Scores (0-100)
    eeatScore: number;
    aiOverviewScore: number;

    // Details
    detectedFeatures: string[];
    missingFeatures: string[];

    // Analysis metadata
    analyzedAt: number;
    source: 'in-app' | 'external-ai' | 'manual';
}

interface GitHubFile {
    name: string;
    download_url: string;
}

type AnalysisKey = keyof TemplateAnalysis;

// In-app rule-based analyzer
async function analyzeTemplate(
    githubOwner: string,
    githubRepo: string,
    githubToken: string
): Promise<TemplateAnalysis> {
    const analysis: TemplateAnalysis = {
        hasAboutPage: false,
        hasAuthorSchema: false,
        hasArticleSchema: false,
        hasFAQSchema: false,
        hasEditorialPolicy: false,
        hasSourceCitations: false,
        hasAnswerBox: false,
        hasDefinitionBlocks: false,
        hasComparisonTables: false,
        eeatScore: 0,
        aiOverviewScore: 0,
        detectedFeatures: [],
        missingFeatures: [],
        analyzedAt: Date.now(),
        source: 'in-app'
    };

    const headers = {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AdSense-Ifrit'
    };

    // Check for key files
    const filesToCheck = [
        { path: 'app/about/page.tsx', feature: 'hasAboutPage', name: 'About Page' },
        { path: 'app/editorial-policy/page.tsx', feature: 'hasEditorialPolicy', name: 'Editorial Policy' },
        { path: 'content/about.md', feature: 'hasAboutPage', name: 'About Page' },
    ];

    for (const file of filesToCheck) {
        try {
            const res = await fetch(
                `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${file.path}`,
                { headers }
            );
            if (res.ok) {
                analysis[file.feature as AnalysisKey] = true as never;
                analysis.detectedFeatures.push(file.name);
            }
        } catch {
            // File doesn't exist
        }
    }

    // Check layout.tsx for schema markup patterns
    try {
        const layoutRes = await fetch(
            `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/app/layout.tsx`,
            { headers }
        );
        if (layoutRes.ok) {
            const layoutData = await layoutRes.json();
            const content = Buffer.from(layoutData.content, 'base64').toString('utf-8');

            // Check for schema patterns
            if (content.includes('application/ld+json') || content.includes('schema.org')) {
                if (content.includes('Person') || content.includes('author')) {
                    analysis.hasAuthorSchema = true;
                    analysis.detectedFeatures.push('Author Schema');
                }
                if (content.includes('Article') || content.includes('NewsArticle') || content.includes('BlogPosting')) {
                    analysis.hasArticleSchema = true;
                    analysis.detectedFeatures.push('Article Schema');
                }
            }
        }
    } catch {
        // No layout or can't read
    }

    // Check a sample article for AI Overview optimization patterns
    try {
        const contentRes = await fetch(
            `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/content`,
            { headers }
        );
        if (contentRes.ok) {
            const files = await contentRes.json();
            const mdFiles = (files as GitHubFile[]).filter((f) =>
                f.name.endsWith('.md') &&
                !['about.md', 'privacy.md', 'terms.md'].includes(f.name)
            );

            if (mdFiles.length > 0) {
                // Check first article
                const articleRes = await fetch(mdFiles[0].download_url);
                if (articleRes.ok) {
                    const articleContent = await articleRes.text();

                    // FAQ detection
                    if (articleContent.includes('## FAQ') ||
                        articleContent.includes('## Frequently Asked') ||
                        articleContent.match(/\?\n\n/g)) {
                        analysis.hasFAQSchema = true;
                        analysis.detectedFeatures.push('FAQ Section');
                    }

                    // Answer box patterns (definition at start)
                    if (articleContent.match(/^#+\s.+\n\n[A-Z].{50,200}\./m)) {
                        analysis.hasAnswerBox = true;
                        analysis.detectedFeatures.push('Answer Box Format');
                    }

                    // Comparison tables
                    if (articleContent.includes('| ---') || articleContent.includes('|:---')) {
                        analysis.hasComparisonTables = true;
                        analysis.detectedFeatures.push('Comparison Tables');
                    }

                    // Source citations
                    if (articleContent.match(/\[(\d+)\]/) ||
                        articleContent.includes('Source:') ||
                        articleContent.includes('according to')) {
                        analysis.hasSourceCitations = true;
                        analysis.detectedFeatures.push('Source Citations');
                    }
                }
            }
        }
    } catch {
        // Can't check content
    }

    // Calculate E-E-A-T score
    let eeatPoints = 0;
    if (analysis.hasAboutPage) eeatPoints += 20;
    if (analysis.hasAuthorSchema) eeatPoints += 20;
    if (analysis.hasArticleSchema) eeatPoints += 15;
    if (analysis.hasEditorialPolicy) eeatPoints += 20;
    if (analysis.hasSourceCitations) eeatPoints += 25;
    analysis.eeatScore = eeatPoints;

    // Calculate AI Overview score
    let aioPoints = 0;
    if (analysis.hasAnswerBox) aioPoints += 25;
    if (analysis.hasFAQSchema) aioPoints += 25;
    if (analysis.hasComparisonTables) aioPoints += 20;
    if (analysis.hasArticleSchema) aioPoints += 15;
    if (analysis.hasSourceCitations) aioPoints += 15;
    analysis.aiOverviewScore = aioPoints;

    // Identify missing features
    const allFeatures = [
        { key: 'hasAboutPage', name: 'About Page' },
        { key: 'hasAuthorSchema', name: 'Author Schema' },
        { key: 'hasArticleSchema', name: 'Article Schema' },
        { key: 'hasFAQSchema', name: 'FAQ Section' },
        { key: 'hasEditorialPolicy', name: 'Editorial Policy' },
        { key: 'hasSourceCitations', name: 'Source Citations' },
        { key: 'hasAnswerBox', name: 'Answer Box Format' },
        { key: 'hasComparisonTables', name: 'Comparison Tables' }
    ];

    for (const feat of allFeatures) {
        if (!analysis[feat.key as AnalysisKey]) {
            analysis.missingFeatures.push(feat.name);
        }
    }

    return analysis;
}

// Generate prompt for external AI evaluation
function generateExternalPrompt(website: Website, sampleContent?: string): string {
    return `# Website Template Analysis Request

## Website Information
- **Domain**: ${website.domain}
- **Template**: ${website.template.id} v${website.template.version}
- **Niche**: ${website.niche}
- **Articles**: ${website.stats.articlesCount}

## Task
Analyze this website template for:
1. **E-E-A-T Compliance** (Experience, Expertise, Authoritativeness, Trustworthiness)
2. **AI Overview Optimization** (Structured content for AI citation)

## Evaluation Criteria

### E-E-A-T Signals (score 0-100)
- About page with author credentials
- Author schema markup
- Editorial policy
- Source citations and references
- Article authorship attribution

### AI Overview Optimization (score 0-100)
- Answer box format (direct answers in first paragraph)
- FAQ sections with question-answer pairs
- Comparison tables
- Numbered step-by-step guides
- Definition blocks
- Article schema markup

${sampleContent ? `## Sample Article Content
\`\`\`
${sampleContent.substring(0, 2000)}
\`\`\`
` : ''}

## Required Output Format
Please respond with ONLY this JSON (no additional text):

\`\`\`json
{
  "eeatScore": <0-100>,
  "aiOverviewScore": <0-100>,
  "detectedFeatures": ["feature1", "feature2", ...],
  "missingFeatures": ["feature1", "feature2", ...],
  "recommendations": ["recommendation1", ...]
}
\`\`\``;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> }
) {
    try {
        const { domain } = await params;
        const website = getWebsite(domain);

        if (!website) {
            return NextResponse.json(
                { success: false, error: 'Website not found' },
                { status: 404 }
            );
        }

        const { searchParams } = new URL(request.url);
        const wantPrompt = searchParams.get('prompt') === 'true';

        // Return copyable prompt for external AI
        if (wantPrompt) {
            return NextResponse.json({
                success: true,
                prompt: generateExternalPrompt(website),
                instructions: 'Copy this prompt to Claude, GPT, or your preferred AI. Then use POST /api/websites/{domain}/analyze to apply the results.'
            });
        }

        // Get GitHub token for in-app analysis
        const githubToken = request.headers.get('x-github-token');

        if (!githubToken) {
            return NextResponse.json({
                success: false,
                error: 'GitHub token required for in-app analysis. Pass via x-github-token header, or use ?prompt=true for external AI prompt.',
                promptAvailable: true
            }, { status: 400 });
        }

        const { githubOwner, githubRepo } = website.deployment;

        if (!githubOwner || !githubRepo) {
            return NextResponse.json(
                { success: false, error: 'GitHub repo not configured' },
                { status: 400 }
            );
        }

        const analysis = await analyzeTemplate(githubOwner, githubRepo, githubToken);

        return NextResponse.json({
            success: true,
            analysis,
            current: {
                eeatEnabled: website.fingerprint.eeatEnabled,
                aiOverviewOptimized: website.fingerprint.aiOverviewOptimized,
                eeatScore: website.fingerprint.eeatScore,
                aiOverviewScore: website.fingerprint.aiOverviewScore
            }
        });

    } catch (error) {
        console.error('Error analyzing website:', error);
        return NextResponse.json(
            { success: false, error: 'Analysis failed' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> }
) {
    try {
        const { domain } = await params;
        const website = getWebsite(domain);

        if (!website) {
            return NextResponse.json(
                { success: false, error: 'Website not found' },
                { status: 404 }
            );
        }

        const body = await request.json();
        const {
            eeatScore,
            aiOverviewScore,
            detectedFeatures,
            missingFeatures,
            source = 'external-ai'
        } = body;

        // Validate scores
        if (typeof eeatScore !== 'number' || typeof aiOverviewScore !== 'number') {
            return NextResponse.json(
                { success: false, error: 'eeatScore and aiOverviewScore are required numbers' },
                { status: 400 }
            );
        }

        // Update website fingerprint
        website.fingerprint.eeatScore = Math.min(100, Math.max(0, eeatScore));
        website.fingerprint.aiOverviewScore = Math.min(100, Math.max(0, aiOverviewScore));
        website.fingerprint.eeatEnabled = eeatScore >= 50;
        website.fingerprint.aiOverviewOptimized = aiOverviewScore >= 50;
        website.fingerprint.lastAnalyzedAt = Date.now();
        website.fingerprint.analysisSource = source;
        website.updatedAt = Date.now();

        saveWebsite(website);

        return NextResponse.json({
            success: true,
            updated: {
                eeatScore: website.fingerprint.eeatScore,
                aiOverviewScore: website.fingerprint.aiOverviewScore,
                eeatEnabled: website.fingerprint.eeatEnabled,
                aiOverviewOptimized: website.fingerprint.aiOverviewOptimized,
                analysisSource: source
            },
            detectedFeatures,
            missingFeatures
        });

    } catch (error) {
        console.error('Error applying analysis:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to apply analysis' },
            { status: 500 }
        );
    }
}
