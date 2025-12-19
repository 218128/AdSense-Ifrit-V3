/**
 * Content Generation Prompts
 * Specialized prompts for different content types in a niche authority site
 */

export type ContentType = 'homepage' | 'pillar' | 'cluster' | 'about' | 'author';

export interface SiteContext {
    siteName: string;
    tagline: string;
    niche: string;
    audience: string;
    voice: string;
    author: {
        name: string;
        role: string;
        experience: string;
    };
}

export interface ContentRequest {
    type: ContentType;
    topic?: string;
    keywords?: string[];
    parentPillar?: string;
    categories?: string[];
    siteContext: SiteContext;
}

/**
 * Generate the appropriate prompt based on content type
 */
export function generateContentPrompt(request: ContentRequest): string {
    switch (request.type) {
        case 'homepage':
            return generateHomepagePrompt(request);
        case 'pillar':
            return generatePillarPrompt(request);
        case 'cluster':
            return generateClusterPrompt(request);
        case 'about':
            return generateAboutPrompt(request);
        case 'author':
            return generateAuthorPrompt(request);
        default:
            throw new Error(`Unknown content type: ${request.type}`);
    }
}

/**
 * Homepage Content Prompt
 * Generates hero, category descriptions, and trust elements
 */
function generateHomepagePrompt(request: ContentRequest): string {
    const { siteContext, categories = [] } = request;

    return `You are a professional web copywriter specializing in ${siteContext.niche} content.

## Task
Generate homepage content for a niche authority website.

## Site Context
- Site Name: ${siteContext.siteName}
- Tagline: ${siteContext.tagline}
- Niche: ${siteContext.niche}
- Target Audience: ${siteContext.audience}
- Voice/Tone: ${siteContext.voice}

## Generate the Following Sections:

### 1. Hero Section
Create compelling copy:
- **Headline**: Maximum 10 words, powerful and benefit-focused
- **Subheadline**: 20-30 words explaining the value proposition
- **CTA Text**: Call-to-action button text (3-5 words)

### 2. Introduction (100-150 words)
Write 2-3 paragraphs that:
- Establish why this niche matters to readers
- Position the site as the trusted authority
- Connect with the target audience's needs

### 3. Category Descriptions
For each of these categories, provide:
- Category Title
- 2-sentence description (benefit-focused)
${categories.length > 0 ? categories.map(c => `- ${c}`).join('\n') : '- Technology\n- Reviews\n- Guides\n- Comparisons'}

### 4. Trust Section
Create content that builds credibility:
- **Why Trust Us**: 2-3 sentences about expertise
- **3 Key Differentiators**: One-line each explaining what makes this site special

## Output Format
Return as structured JSON:
\`\`\`json
{
    "hero": {
        "headline": "",
        "subheadline": "",
        "ctaText": ""
    },
    "introduction": "",
    "categories": [
        { "title": "", "description": "" }
    ],
    "trust": {
        "whyTrustUs": "",
        "differentiators": ["", "", ""]
    }
}
\`\`\`

Generate authentic, engaging copy that resonates with ${siteContext.audience}.`;
}

/**
 * Pillar Article Prompt
 * Comprehensive, authoritative guides (3000-5000 words)
 */
function generatePillarPrompt(request: ContentRequest): string {
    const { siteContext, topic, keywords = [] } = request;

    return `You are an expert content writer with 10+ years experience in ${siteContext.niche}. You write comprehensive, authoritative guides that establish topical expertise and rank well in search engines.

## Task
Write a PILLAR ARTICLE for a niche authority website.

## Article Details
- Topic: ${topic || 'Comprehensive Guide'}
- Primary Keyword: ${keywords[0] || topic}
- Secondary Keywords: ${keywords.slice(1).join(', ') || 'related terms'}
- Target Length: 3000-5000 words
- Site: ${siteContext.siteName}
- Audience: ${siteContext.audience}

## Required Article Structure:

### 1. Introduction (300-400 words)
- Open with a hook that addresses a pain point or question
- Explain what this guide covers and why it matters
- Preview the key takeaways
- Include the primary keyword naturally in first 100 words

### 2. Quick Picks / Summary Box
Create a comparison table with:
- Top 5 recommendations
- Columns: Name, Best For, Key Feature, Rating (X/5)
- Brief 1-line summary for each

### 3. How We Evaluate / Methodology (200-300 words)
- Explain your testing/research process
- List 4-5 criteria used for evaluation
- Establish E-E-A-T (Experience, Expertise, Authoritativeness, Trust)

### 4. Detailed Sections (5-7 main sections, 400-600 words each)
For each main topic section:
- Use H2 heading with keyword variation
- Provide comprehensive coverage
- Include practical examples and specifics
- Add pros/cons lists where appropriate
- Include expert tips and insights

### 5. Buying Guide / How to Choose (500-800 words)
- Key factors to consider
- Common mistakes to avoid
- Budget considerations
- Recommendations by use case

### 6. FAQ Section (5-7 questions)
- Use H3 for each question
- Provide concise but complete answers
- Target "People Also Ask" queries
- Include long-tail keyword variations

### 7. Conclusion (200-300 words)
- Summarize key recommendations
- Provide final buying advice
- Include a clear CTA

## Writing Guidelines
- Use first person plural ("we tested", "we recommend")
- Include specific numbers, data, and details
- Reference testing experience where appropriate
- Natural keyword placement (avoid stuffing)
- Use bullet points, tables, and formatting for scannability
- Write for humans first, SEO second

## CRITICAL FORMATTING RULES
- **NO CITATIONS**: Do NOT include citation markers like [1], [2], [3] - this is for direct publication
- **NO WORD COUNTS**: Do NOT include "(Word count: X)" anywhere
- **PROPER TABLES**: Markdown tables MUST have each row on its own line:
  | Header1 | Header2 |
  |---------|---------|  
  | Data1   | Data2   |
- **NO PLACEHOLDERS**: No [INSERT X] or [YOUR X] placeholders
- **NO AI REFERENCES**: Never mention being an AI or training data

## Author
Written by ${siteContext.author.name}, ${siteContext.author.role} with ${siteContext.author.experience} of experience.

## Output Format
Return the complete article in Markdown format with proper heading hierarchy (H1, H2, H3).`;
}

/**
 * Cluster Article Prompt
 * Focused supporting content (1500-2500 words)
 */
function generateClusterPrompt(request: ContentRequest): string {
    const { siteContext, topic, keywords = [], parentPillar } = request;

    return `You are a knowledgeable content writer creating focused, helpful articles for ${siteContext.audience}.

## Task
Write a CLUSTER ARTICLE (supporting content) for a niche authority website.

## Article Details
- Topic: ${topic || 'Focused Guide'}
- Parent Pillar: ${parentPillar || 'Main Topic Guide'}
- Target Keywords: ${keywords.join(', ') || topic}
- Target Length: 1500-2500 words
- Site: ${siteContext.siteName}

## Article Purpose
This cluster article should:
- Dive deep into ONE specific aspect of the parent topic
- Support and link back to the pillar article
- Target long-tail keywords
- Provide immediate, actionable value

## Required Structure:

### 1. Introduction (150-200 words)
- Address the specific question or need directly
- Explain what the reader will learn
- Reference the broader topic (internal link placeholder: [PILLAR_LINK])

### 2. Main Content (1000-1500 words)
- 4-6 main sections with H2 headings
- Each section should be practical and actionable
- Include specific examples, steps, or recommendations
- Use bullet points and numbered lists where appropriate

### 3. Quick Comparison or Summary (if applicable)
- Simple table comparing top options
- Clear recommendation highlighted

### 4. Expert Tips (3-5 tips)
- Pro tips from experience
- Common mistakes to avoid
- Quick wins readers can implement immediately

### 5. Conclusion (100-150 words)
- Summarize key points
- Link back to pillar: "For more comprehensive coverage, see our [PILLAR_LINK]"
- Suggest related content

## Writing Guidelines
- Conversational but authoritative tone
- Focus deeply on ONE specific aspect
- Use "you" to address the reader directly
- Include internal link placeholders: [INTERNAL_LINK: related-topic]
- Aim for featured snippet potential with clear answers

## CRITICAL FORMATTING RULES
- **NO CITATIONS**: Do NOT include citation markers like [1], [2], [3] - this is for direct publication
- **NO WORD COUNTS**: Do NOT include "(Word count: X)" anywhere
- **PROPER TABLES**: Markdown tables MUST have each row on its own line
- **NO PLACEHOLDERS**: No [INSERT X] or [YOUR X] placeholders
- **NO AI REFERENCES**: Never mention being an AI or training data

## Author
${siteContext.author.name}, ${siteContext.author.role}

## Output Format
Return the complete article in Markdown format.`;
}

/**
 * About Page Prompt
 * E-E-A-T focused trust-building content
 */
function generateAboutPrompt(request: ContentRequest): string {
    const { siteContext } = request;

    return `You are a copywriter specializing in E-E-A-T optimized content that builds trust and credibility.

## Task
Generate an About page for a niche authority website.

## Site Details
- Site Name: ${siteContext.siteName}
- Niche: ${siteContext.niche}
- Target Audience: ${siteContext.audience}
- Author: ${siteContext.author.name}, ${siteContext.author.role}

## Generate the Following Sections:

### 1. Opening Statement (2-3 sentences)
- What the site is about
- Who it serves
- Core value proposition

### 2. Our Story (150-200 words)
- Why this site was created
- Personal connection to the niche
- Gap in market we fill
- Make it authentic and relatable

### 3. Our Mission (80-100 words)
- Clear mission statement
- Commitment to readers
- What we promise to deliver

### 4. How We Create Content (150-200 words)
- Research methodology
- Testing/review process
- Editorial standards
- Commitment to honesty and transparency

### 5. Meet the Team
For ${siteContext.author.name}:
- Role: ${siteContext.author.role}
- Experience: ${siteContext.author.experience}
- Background and expertise
- Personal interests in the niche
- What drives their passion

### 6. Contact Section
- Invitation to reach out
- Types of inquiries welcomed
- Response time expectation

## Tone
Professional but approachable, confident but humble. Build trust without bragging.

## Output Format
Return as Markdown with proper heading structure.`;
}

/**
 * Author Bio Prompt
 * Creates authentic author persona for E-E-A-T
 */
function generateAuthorPrompt(request: ContentRequest): string {
    const { siteContext } = request;

    return `You are creating an authentic author persona for E-E-A-T compliance.

## Task
Generate an author bio that demonstrates expertise and builds trust.

## Author Details
- Name: ${siteContext.author.name}
- Role: ${siteContext.author.role}
- Experience: ${siteContext.author.experience}
- Site: ${siteContext.siteName}
- Niche: ${siteContext.niche}

## Generate:

### 1. Short Bio (50-75 words)
For article bylines. Include:
- Current role and experience level
- Specialty areas
- One personal touch that humanizes

### 2. Full Bio (200-300 words)
For author page. Include:
- Professional background
- How they got into this field
- Review/writing philosophy
- Personal interests related to niche
- Why helping the audience matters

### 3. Credentials Summary
- Years of experience
- Expertise areas (3-4 bullet points)
- Notable achievements or qualifications

## Guidelines
- Make the persona believable and relatable
- Avoid over-the-top claims
- Include specific but realistic details
- Balance professionalism with personality

## Output Format
Return as JSON:
\`\`\`json
{
    "shortBio": "",
    "fullBio": "",
    "credentials": {
        "experience": "",
        "expertiseAreas": [],
        "achievements": []
    }
}
\`\`\``;
}

/**
 * Default site context for testing
 */
export function getDefaultSiteContext(): SiteContext {
    return {
        siteName: '299Riyal',
        tagline: 'Best Tech Under 299 SAR',
        niche: 'Budget Tech & Gadgets',
        audience: 'Saudi shoppers looking for quality tech at affordable prices',
        voice: 'Helpful, practical, deal-savvy',
        author: {
            name: 'Ahmed Al-Rashid',
            role: 'Tech Editor',
            experience: '8+ years'
        }
    };
}
