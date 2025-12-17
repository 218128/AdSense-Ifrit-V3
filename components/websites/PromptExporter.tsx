'use client';

/**
 * Prompt Exporter
 * 
 * Shows Ifrit's article generation prompts with website context pre-filled.
 * Users can copy these to use in external AI tools (ChatGPT, Claude, etc.)
 * then drop the generated markdown back into Ifrit.
 */

import { useState, useMemo } from 'react';
import { Copy, Check, ChevronDown, ChevronRight, Sparkles, Search, FileText, Wand2 } from 'lucide-react';

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
}

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

    const prompts: PromptSection[] = useMemo(() => [
        {
            id: 'research',
            title: 'Step 1: Research Phase',
            icon: <Search className="w-4 h-4" />,
            description: 'Gathers real products, statistics, and expert insights',
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
| --- | --- | --- | --- |

## Common Questions
List 7 frequently asked questions users have about this topic, focusing on:
- Buying decisions
- Comparisons
- How-to questions
- Value/ROI questions

Be specific, factual, and use ONLY real product names. No placeholders.`
        },
        {
            id: 'outline',
            title: 'Step 2: Outline Generation',
            icon: <FileText className="w-4 h-4" />,
            description: 'Creates a template-guided article structure',
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

2. **What Is [Topic]** (~300 words)
   - Clear definition
   - Why it matters in ${currentMonth}
   - Key benefits

3. **Top Products/Solutions** (~600 words)
   - Use REAL products from research
   - Include pros, cons, pricing
   - Comparison table

4. **How to Choose/Use** (~400 words)
   - Step-by-step guide
   - Decision criteria
   - Common mistakes to avoid

5. **Expert Tips** (~300 words)
   - Actionable advice
   - Pro tips from industry experience

6. **FAQ Section** (~200 words)
   - 5-7 real questions
   - Concise answers

7. **Conclusion** (~150 words)
   - Summary of key points
   - Call to action
   - Last updated: ${currentMonth}

For each section, provide:
- The heading (H2/H3)
- Key points to cover
- Which research data to include
- Estimated word count`
        },
        {
            id: 'article',
            title: 'Step 3: Full Article',
            icon: <Wand2 className="w-4 h-4" />,
            description: 'Generates complete article with frontmatter',
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
category: "[best matching category: how-to, review, guide, listicle, comparison]"
tags: ["tag1", "tag2", "tag3"]
template: "${template}"
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

4. **AdSense Best Practices**:
   - Clear paragraph breaks (good ad placement spots)
   - Informative subheadings
   - No thin content sections
   - Minimum 300 words per major section

5. **AI Overview Optimization**:
   - Clear, direct answers to questions
   - Structured data-friendly format
   - FAQ section with Q: A: format

Start DIRECTLY with the --- frontmatter. No preamble.`
        }
    ], [keyword, domain, niche, siteName, template, author, currentDate, currentMonth]);

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
                    Then drop the generated markdown back into Ifrit.
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
                    The prompts will be customized with this keyword
                </p>
            </div>

            {/* Prompt Sections */}
            <div className="divide-y divide-neutral-100">
                {prompts.map((section) => (
                    <div key={section.id}>
                        <button
                            onClick={() => toggleSection(section.id)}
                            className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${section.id === 'research' ? 'bg-blue-100 text-blue-600' :
                                        section.id === 'outline' ? 'bg-green-100 text-green-600' :
                                            'bg-purple-100 text-purple-600'
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
                                    <pre className="bg-neutral-900 text-neutral-100 rounded-lg p-4 text-xs overflow-auto max-h-64 whitespace-pre-wrap">
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
                                <p className="text-xs text-neutral-500 mt-2">
                                    {section.id === 'research' && 'Use this first to gather real data'}
                                    {section.id === 'outline' && 'Include research results when using this prompt'}
                                    {section.id === 'article' && 'Include both research and outline for best results'}
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer Tip */}
            <div className="p-4 bg-amber-50 border-t border-amber-100">
                <p className="text-xs text-amber-700">
                    💡 <strong>Tip:</strong> Run prompts in order (Research → Outline → Article)
                    and paste previous results into each subsequent prompt for best quality.
                </p>
            </div>
        </div>
    );
}
