'use client';

/**
 * Prompt Exporter
 * 
 * Shows Ifrit's article generation prompts with website context pre-filled.
 * Users can copy these to use in external AI tools (ChatGPT, Claude, etc.)
 * then drop the generated markdown back into the drafts folder.
 * 
 * Updated with CRITICAL FORMATTING RULES and image generation prompts.
 */

import { useState, useMemo } from 'react';
import { Copy, Check, ChevronDown, ChevronRight, Sparkles, Search, FileText, Wand2, Image, AlertTriangle } from 'lucide-react';

interface PromptExporterProps {
    domain: string;
    niche: string;
    siteName: string;
    template: string;
    author: {
        name: string;
        role: string;
    };
}

interface PromptSection {
    id: string;
    title: string;
    icon: React.ReactNode;
    description: string;
    prompt: string;
    tip?: string;
}

// Critical formatting rules to include in prompts
const FORMATTING_RULES = `
⚠️ CRITICAL FORMATTING RULES (MUST FOLLOW):

DO NOT include:
- Citation markers like [1], [2], [3]
- Word count markers like "(Word count: 348)"
- AI self-references ("As an AI...", "I cannot...")
- Placeholder text like [INSERT X], [YOUR X]
- Example.com or placeholder URLs

Markdown tables MUST have each row on its own line:
✅ CORRECT:
| Header1 | Header2 |
|---------|---------|
| Data1   | Data2   |

❌ WRONG (all on one line):
| Header1 | Header2 | |---|---| | Data1 | Data2 |
`;

export default function PromptExporter({
    domain,
    niche,
    siteName,
    template,
    author
}: PromptExporterProps) {
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [keyword, setKeyword] = useState('');

    const currentDate = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const articleSlug = keyword ? keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : 'your-article-slug';

    const prompts: PromptSection[] = useMemo(() => [
        {
            id: 'research',
            title: 'Step 1: Research Phase',
            icon: <Search className="w-4 h-4" />,
            description: 'Gathers real products, statistics, and expert insights',
            tip: 'Use this first to gather real data before writing',
            prompt: `You are a research assistant gathering factual information for an article about "${keyword || '[YOUR KEYWORD]'}" for the website ${siteName} (${domain}).

WEBSITE CONTEXT:
- Niche: ${niche}
- Template: ${template}
- Author: ${author.name} (${author.role})

Provide the following in a structured format:

## Real Products/Tools
List 5-7 ACTUAL, EXISTING products or tools related to this topic. For each include:
- Product Name (must be real, not placeholder)
- Key Features (2-3 bullet points)
- Approximate Pricing (monthly/yearly or one-time)
- Official Website URL
- Target User (who it's best for)

## Industry Statistics (2025 Data)
Provide 5-7 relevant, recent statistics about this topic:
- Include the year/source for each stat
- Focus on data that supports purchase decisions
- Include market size, growth rates, or user statistics

## Expert Insights
Share 3-4 actionable insights that industry experts recommend:
- Include the type of expert (what credentials would they have)
- Make these specific and actionable

## Pricing Comparison
Create a quick pricing comparison of the top 3 products:
| Product | Free Tier | Basic Plan | Pro Plan |
|---------|-----------|------------|----------|
| [Real Product 1] | ... | ... | ... |
| [Real Product 2] | ... | ... | ... |
| [Real Product 3] | ... | ... | ... |

## Common Questions
List 7 frequently asked questions users have about this topic, focusing on:
- Buying decisions
- Comparisons
- How-to questions
- Value/ROI questions

${FORMATTING_RULES}

Be specific, factual, and use ONLY real product names. No placeholders like "Product A".`
        },
        {
            id: 'outline',
            title: 'Step 2: Outline Generation',
            icon: <FileText className="w-4 h-4" />,
            description: 'Creates a template-guided article structure',
            tip: 'Include research results when using this prompt',
            prompt: `Create a detailed article outline for ${siteName} about "${keyword || '[YOUR KEYWORD]'}".

WEBSITE CONTEXT:
- Domain: ${domain}
- Niche: ${niche}
- Template Style: ${template}
- Author: ${author.name} (${author.role})

TARGET: 2000+ words, optimized for AdSense and AI Overview

SECTIONS TO INCLUDE:

1. **Introduction** (~200 words)
   - Hook with problem/opportunity
   - Promise of what reader will learn
   - Brief authority statement

2. **Quick Picks Table** (~100 words)
   - Top 5 recommendations in a table
   - Columns: Name, Best For, Key Feature, Rating

3. **What Is [Topic]** (~300 words)
   - Clear definition
   - Why it matters in ${currentMonth}
   - Key benefits
   - 📸 IMAGE PLACEMENT: Infographic or concept illustration

4. **Top Products/Solutions** (~600 words)
   - Use REAL products from research
   - Include pros, cons, pricing
   - Comparison table
   - 📸 IMAGE PLACEMENT: Product comparison visual

5. **How to Choose/Use** (~400 words)
   - Step-by-step guide
   - Decision criteria
   - Common mistakes to avoid

6. **Expert Tips** (~300 words)
   - Actionable advice
   - Pro tips from industry experience

7. **FAQ Section** (~200 words)
   - 5-7 real questions
   - Concise answers

8. **Conclusion** (~150 words)
   - Summary of key points
   - Call to action
   - Last updated: ${currentMonth}

For each section, provide:
- The heading (H2/H3)
- Key points to cover
- Which research data to include
- Suggested image placement

${FORMATTING_RULES}`
        },
        {
            id: 'article',
            title: 'Step 3: Full Article',
            icon: <Wand2 className="w-4 h-4" />,
            description: 'Generates complete article with frontmatter',
            tip: 'Include both research AND outline for best results',
            prompt: `Write a complete, publication-ready article for ${siteName}.

ARTICLE DETAILS:
- Topic: "${keyword || '[YOUR KEYWORD]'}"
- Website: ${domain}
- Niche: ${niche}
- Author: ${author.name} (${author.role})

REQUIRED FRONTMATTER (YAML format at the start):
---
title: "[Compelling title with keyword]"
date: "${currentDate}"
description: "[150-160 character meta description]"
author: "${author.name}"
category: "[best matching: guides, reviews, how-to, listicle, comparison]"
tags: ["tag1", "tag2", "tag3"]
---

CONTENT REQUIREMENTS:

1. **Structure**:
   - Use ## for H2 headings, ### for H3
   - Include comparison tables using Markdown syntax
   - Add blockquotes for expert insights
   - Use bullet points for features/lists

2. **Quality**:
   - Minimum 2000 words
   - Use REAL products/tools (not placeholders)
   - Include specific prices and features
   - Natural keyword integration
   - E-E-A-T signals (experience, expertise, authority, trust)

3. **Formatting**:
   - **Bold** important terms
   - Use emoji sparingly (✅ ⚠️ 💡)
   - Include "Key Takeaways" box before conclusion
   - End with "Last Updated: ${currentMonth}"

4. **Image Placeholders**:
   Use this syntax where images should go:
   ![Descriptive alt text](/images/${articleSlug}/images/img-001.webp)
   
   Suggest 3-5 image placements with descriptive alt text.

5. **AdSense Best Practices**:
   - Clear paragraph breaks (good ad placement spots)
   - Informative subheadings
   - No thin content sections
   - Minimum 300 words per major section

6. **AI Overview Optimization**:
   - Clear, direct answers to questions
   - Structured data-friendly format
   - FAQ section with proper Q&A format

${FORMATTING_RULES}

Start DIRECTLY with the --- frontmatter. No preamble or "Here is the article" text.`
        },
        {
            id: 'images',
            title: 'Step 4: Image Generation',
            icon: <Image className="w-4 h-4" />,
            description: 'Prompts for Midjourney, DALL-E, or other image generators',
            tip: 'Use these prompts in image AI tools to create visuals',
            prompt: `Generate image prompts for the article about "${keyword || '[YOUR KEYWORD]'}" for ${siteName}.

WEBSITE STYLE:
- Niche: ${niche}
- Template: ${template}
- Tone: Professional, informative, trustworthy

Create prompts for the following images:

## 1. Cover Image (1200x630px - Open Graph ratio)
Purpose: Featured image for social sharing and article header
Style: Clean, professional, eye-catching without text overlays

**Prompt for Midjourney/DALL-E:**
"Professional ${niche} themed image for article about ${keyword || '[topic]'}, clean modern style, subtle gradient background, relevant product/concept visualization, high quality photography style, no text, 16:9 aspect ratio --ar 16:9 --style raw"

## 2. Concept Infographic (800x600px)
Purpose: Explain the main concept visually
Style: Flat design with icons

**Prompt:**
"Flat design infographic style illustration showing [core concept of ${keyword || 'topic'}], using blue and green color scheme, white background, include 3-4 icons representing key features, modern minimalist style, no text --ar 4:3"

## 3. Product Comparison Visual (1000x600px)
Purpose: Compare top options side-by-side
Style: Clean comparison layout

**Prompt:**
"Modern product comparison layout with 3 placeholder spots, clean grid design, professional photography style, neutral background, subtle shadows, ready for product overlay --ar 5:3"

## 4. How-To Step Illustration (800x400px)
Purpose: Illustrate a process or steps
Style: Sequential numbered steps

**Prompt:**
"Step-by-step process illustration with 4-5 connected steps, flat design icons, connecting arrows, blue accent color, white background, modern infographic style --ar 2:1"

## 5. Expert Tip Callout (600x400px)
Purpose: Highlight expert advice
Style: Quote-style with icon

**Prompt:**
"Professional advice callout design with lightbulb icon, subtle gradient card, modern corporate style, space for text overlay, trustworthy appearance --ar 3:2"

---

FILE NAMING CONVENTION:
After generating, save as:
- Cover: cover.webp
- Others: img-001.webp, img-002.webp, etc.

FOLDER STRUCTURE:
\`\`\`
drafts/${articleSlug}/
├── article.md
├── cover.webp
└── images/
    ├── img-001.webp
    ├── img-002.webp
    └── img-003.webp
\`\`\`

TIP: Convert images to WebP format for best performance (use https://squoosh.app)`
        }
    ], [keyword, domain, niche, siteName, template, author, currentDate, currentMonth, articleSlug]);

    const handleCopy = async (id: string, text: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const toggleSection = (id: string) => {
        setExpandedSection(expandedSection === id ? null : id);
    };

    return (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-neutral-200">
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-neutral-900">Export Ifrit Prompts</h3>
                </div>
                <p className="text-sm text-neutral-600">
                    Copy these prompts to use in ChatGPT, Claude, or other AI tools.
                    Then drop the generated markdown into the <code className="bg-white px-1 rounded">drafts/</code> folder.
                </p>
            </div>

            {/* Keyword Input */}
            <div className="p-4 border-b border-neutral-100">
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Target Keyword
                </label>
                <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="e.g., best project management software 2025"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-neutral-400 mt-1">
                    The prompts will be customized with this keyword and generate slug: <code>{articleSlug || 'your-article-slug'}</code>
                </p>
            </div>

            {/* Critical Rules Warning */}
            <div className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-amber-800">
                        <strong>Important:</strong> All prompts include critical formatting rules.
                        Ensure AI output has no citation markers [1][2], no word counts, and properly formatted tables.
                    </div>
                </div>
            </div>

            {/* Prompt Sections */}
            <div className="divide-y divide-neutral-100 mt-2">
                {prompts.map((section) => (
                    <div key={section.id}>
                        <button
                            onClick={() => toggleSection(section.id)}
                            className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${section.id === 'research' ? 'bg-blue-100 text-blue-600' :
                                        section.id === 'outline' ? 'bg-green-100 text-green-600' :
                                            section.id === 'article' ? 'bg-purple-100 text-purple-600' :
                                                'bg-orange-100 text-orange-600'
                                    }`}>
                                    {section.icon}
                                </div>
                                <div className="text-left">
                                    <div className="font-medium text-neutral-900">{section.title}</div>
                                    <div className="text-xs text-neutral-500">{section.description}</div>
                                </div>
                            </div>
                            {expandedSection === section.id ? (
                                <ChevronDown className="w-5 h-5 text-neutral-400" />
                            ) : (
                                <ChevronRight className="w-5 h-5 text-neutral-400" />
                            )}
                        </button>

                        {expandedSection === section.id && (
                            <div className="px-4 pb-4">
                                <div className="relative">
                                    <pre className="bg-neutral-900 text-neutral-100 rounded-lg p-4 text-xs overflow-auto max-h-96 whitespace-pre-wrap">
                                        {section.prompt}
                                    </pre>
                                    <button
                                        onClick={() => handleCopy(section.id, section.prompt)}
                                        className={`absolute top-2 right-2 p-2 rounded-lg transition-colors ${copiedId === section.id
                                                ? 'bg-green-500 text-white'
                                                : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                                            }`}
                                    >
                                        {copiedId === section.id ? (
                                            <Check className="w-4 h-4" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                                {section.tip && (
                                    <p className="text-xs text-neutral-500 mt-2">
                                        💡 {section.tip}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer - Workflow */}
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-100">
                <p className="text-xs text-green-800 font-medium mb-2">📋 Recommended Workflow</p>
                <ol className="text-xs text-green-700 space-y-1">
                    <li>1. Run prompts in order: Research → Outline → Article → Images</li>
                    <li>2. Save article as <code className="bg-white px-1 rounded">{articleSlug || 'your-slug'}/article.md</code></li>
                    <li>3. Add cover.webp and images/ folder</li>
                    <li>4. Drop folder into <code className="bg-white px-1 rounded">drafts/</code></li>
                    <li>5. Click &quot;Scan Folder&quot; in Content tab to import</li>
                </ol>
            </div>
        </div>
    );
}
