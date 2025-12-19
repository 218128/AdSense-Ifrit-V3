/**
 * Generate HOWTO.md for a website's drafts folder
 * Uses profile keywords and website info for examples
 */

import fs from 'fs';
import path from 'path';

interface ProfileData {
    domain: string;
    niche: string;
    primaryKeywords: string[];
    secondaryKeywords: string[];
    suggestedTopics: string[];
    suggestedCategories: string[];
}

interface AuthorData {
    name: string;
    role: string;
}

/**
 * Generate the HOWTO.md content for a drafts folder
 */
export function generateHowToContent(
    domain: string,
    profile: ProfileData | null,
    author: AuthorData
): string {
    const today = new Date().toISOString().split('T')[0];

    // Use profile data or defaults
    const niche = profile?.niche || 'general';
    const primaryKeywords = profile?.primaryKeywords || [];
    const secondaryKeywords = profile?.secondaryKeywords || [];
    const suggestedTopics = profile?.suggestedTopics || [];
    const categories = profile?.suggestedCategories || ['guides', 'reviews', 'how-to', 'listicle', 'comparison'];
    const keywords = primaryKeywords.slice(0, 5);

    // Generate example table content based on keywords
    const exampleRows = keywords.slice(0, 3).map((kw, i) =>
        `| ${kw.charAt(0).toUpperCase() + kw.slice(1)} | Feature ${i + 1} | 4.${5 - i}/5 |`
    ).join('\n');

    // Build profile section
    const profileSection = profile ? `
## 📊 Website Profile (Use This Data!)

This website has been researched and profiled. **Use this data to generate relevant content.**

| Property | Value |
|----------|-------|
| **Domain** | ${domain} |
| **Niche** | ${niche} |
| **Author** | ${author.name} (${author.role || 'Writer'}) |

### Primary Keywords (Target These)
${primaryKeywords.length > 0 ? primaryKeywords.map(k => `- ${k}`).join('\n') : '- No keywords defined yet'}

### Secondary Keywords (Long-tail Variations)
${secondaryKeywords.length > 0 ? secondaryKeywords.map(k => `- ${k}`).join('\n') : '- No secondary keywords yet'}

### Suggested Article Topics
${suggestedTopics.length > 0 ? suggestedTopics.map((t, i) => `${i + 1}. ${t}`).join('\n') : '- No topics suggested yet'}

### Available Categories
Use one of these in your frontmatter: ${categories.join(', ')}

---
` : `
## ⚠️ No Profile Found

This website doesn't have a profile yet. To get better AI-generated content:
1. Go to Ifrit → Hunt tab
2. Research "${domain}"  
3. Save as Profile

For now, use the niche "${niche}" and generate general content.

---
`;

    return `# 🤖 AI Article Import Guide for ${domain}

Welcome! This guide helps external AI assistants (ChatGPT, Claude, Gemini, etc.) create properly formatted articles for **${domain}**.

${profileSection}

## 🎯 Article Generation Instructions

When asked to generate articles for this website:

1. **Read the Profile** above to understand the niche and keywords
2. **Use Primary Keywords** as main topics for articles
3. **Use Secondary Keywords** within article content
4. **Pick from Suggested Topics** or generate variations
5. **Follow the folder structure** below for each article
6. **Include images** (cover + 2-3 content images per article)

---

## Quick Start

**Drop files here**: \`websites/${domain}/drafts/\`

**Option A: Single markdown file**
\`\`\`
drafts/
└── my-article-title.md
\`\`\`

**Option B: Folder with images** (recommended)
\`\`\`
drafts/
└── my-article-title/
    ├── article.md          ← Required
    ├── cover.webp          ← Optional (featured image)
    └── images/             ← Optional (in-article images)
        ├── img-001.webp
        ├── img-002.webp
        └── img-003.webp
\`\`\`

---

## Article Format (article.md)

\`\`\`markdown
---
title: "Your Compelling Title Here"
date: "${today}"
description: "150-160 character meta description for SEO"
author: "${author.name}"
category: "${categories[0] || 'guides'}"
tags: [${keywords.slice(0, 3).map(k => `"${k}"`).join(', ') || '"tag1", "tag2"'}]
---

# Your Main Heading

Introduction paragraph here...

## Section Heading

Content with proper formatting...
\`\`\`

### Required Frontmatter Fields
| Field | Description | Example |
|-------|-------------|---------|
| \`title\` | Article title (include main keyword) | "Best ${keywords[0] || 'Products'} Guide" |
| \`date\` | YYYY-MM-DD format | "${today}" |
| \`description\` | 150-160 chars for SEO | "Complete guide to..." |
| \`author\` | Author name | "${author.name}" |
| \`category\` | One of: ${categories.join(', ')} | "${categories[0] || 'guides'}" |
| \`tags\` | Array of 3-5 tags | [${keywords.slice(0, 3).map(k => `"${k}"`).join(', ') || '"tag1", "tag2"'}] |

---

## ⚠️ CRITICAL FORMATTING RULES

### ❌ DO NOT Include:
- Citation markers like \`[1]\`, \`[2]\`, \`[3]\`
- Word counts like \`(Word count: 348)\`
- AI self-references ("As an AI...", "I cannot...")
- Placeholder text like \`[INSERT X]\`, \`[YOUR X]\`
- Example.com URLs

### ✅ DO Include:
- Proper markdown tables (each row on its own line)
- Real product names and specifications
- E-E-A-T signals (experience, expertise, authority)
- Clear heading hierarchy (H1 → H2 → H3)

### Table Format (Correct)
\`\`\`markdown
| Item | Features | Rating |
|------|----------|--------|
${exampleRows || '| Example Item | Feature 1 | 4.5/5 |'}
\`\`\`

### Table Format (WRONG - all on one line)
\`\`\`
| Item | Features | |---|---| | Data | More |
\`\`\`

---

## Image Guidelines

### Cover Image (cover.webp)
- Size: 1200x630px (Open Graph ratio)
- Format: WebP preferred, PNG/JPG accepted
- Content: Relevant to ${niche} niche
- No text overlays (title will be added by template)

### Content Images (images/img-XXX.webp)
- Naming: \`img-001.webp\`, \`img-002.webp\`, etc.
- Reference in markdown: \`![Alt text](/images/{slug}/images/img-001.webp)\`
- Recommended sizes: 800-1200px width
- Include descriptive alt text for accessibility

---

## Content Quality Standards

### Word Count Targets
| Content Type | Target Words | Headings |
|--------------|--------------|----------|
| Pillar Article | 2000-3500 | 8-12 |
| Cluster Article | 1200-2000 | 5-8 |
| How-To Guide | 1500-2500 | 6-10 |
| Product Review | 1000-1500 | 4-6 |

### Structure Template
\`\`\`
1. Introduction (200-300 words)
   - Hook with problem/benefit
   - What reader will learn
   
2. Quick Picks/Summary Table
   - Top 5 recommendations
   - Key features comparison
   
3. Main Content Sections (400-600 words each)
   - Use H2 for main sections
   - Include pros/cons lists
   - Add expert tips
   
4. Buying Guide / How to Choose (300-500 words)
   - Key factors
   - Common mistakes
   
5. FAQ Section (5-7 questions)
   - Use ### for each question
   - Concise answers
   
6. Conclusion (150-200 words)
   - Summary of key points
   - Call to action
\`\`\`

---

## After Dropping Files

1. **Auto-Import**: If enabled in Ifrit, files import every 5 minutes
2. **Manual Import**: Click "Scan Folder" in Content tab → Import
3. **Review**: Check imported articles, edit if needed
4. **Deploy**: Click Deploy button to push to live site

---

*This guide is auto-generated by Ifrit for ${domain}. Last updated: ${today}*
`;
}

/**
 * Ensure HOWTO.md exists in the drafts folder
 * Creates or updates it with current profile data
 */
export function ensureHowToGuide(
    domain: string,
    profile: ProfileData | null,
    author: AuthorData
): void {
    const draftsDir = path.join(process.cwd(), 'websites', domain, 'drafts');
    const howtoPath = path.join(draftsDir, 'HOWTO.md');

    // Ensure drafts directory exists
    if (!fs.existsSync(draftsDir)) {
        fs.mkdirSync(draftsDir, { recursive: true });
    }

    // Generate and write HOWTO.md
    const content = generateHowToContent(domain, profile, author);
    fs.writeFileSync(howtoPath, content, 'utf-8');
}

/**
 * Get profile data for a domain (from profiles folder)
 */
export function loadProfileForDomain(domain: string): ProfileData | null {
    const profilePath = path.join(process.cwd(), 'websites', 'profiles', `${domain}.json`);

    if (fs.existsSync(profilePath)) {
        try {
            const data = fs.readFileSync(profilePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Failed to load profile:', error);
            return null;
        }
    }

    return null;
}
