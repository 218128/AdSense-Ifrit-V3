/**
 * HTML Output Prompts
 * FSD: features/campaigns/lib/htmlPrompts.ts
 * 
 * AI prompts specifically designed for HTML output.
 * Produces semantic HTML with proper structure for WordPress.
 */

// ============================================================================
// Types
// ============================================================================

export interface HtmlPromptConfig {
    topic: string;
    niche: string;
    persona?: string;
    wordCount?: number;
    includeFAQ?: boolean;
    includeTableOfContents?: boolean;
    adDensity?: 'low' | 'medium' | 'high';
}

// ============================================================================
// HTML Article Prompt
// ============================================================================

export function buildHtmlArticlePrompt(config: HtmlPromptConfig): string {
    const {
        topic,
        niche,
        persona = 'an expert in this field',
        wordCount = 1500,
        includeFAQ = true,
        includeTableOfContents = true,
        adDensity = 'medium',
    } = config;

    const adHintCount = adDensity === 'high' ? 4 : adDensity === 'medium' ? 3 : 2;

    return `Write a comprehensive, SEO-optimized article about: "${topic}"

CRITICAL: Output ONLY valid HTML. Do not use Markdown. Do not include backticks or code fences.

## Content Requirements:
- Niche: ${niche}
- Voice: Write as ${persona}
- Target length: ${wordCount}+ words
- Style: Engaging, helpful, E-E-A-T optimized

## HTML Structure (use exactly this format):

<article>
  <header>
    <h1>[Compelling SEO-optimized title]</h1>
    <p class="excerpt">[2-3 sentence compelling introduction/meta description]</p>
  </header>

  ${includeTableOfContents ? `<nav class="toc">
    <h2>Table of Contents</h2>
    <ul>
      <li><a href="#section-1">[Section 1 Title]</a></li>
      <li><a href="#section-2">[Section 2 Title]</a></li>
      <!-- Add all sections -->
    </ul>
  </nav>` : ''}

  <section id="section-1">
    <h2>[Section Heading]</h2>
    <p>[Detailed content with proper paragraph breaks]</p>
    <!-- Include lists, tips, and examples -->
  </section>

  <!-- Add ${adHintCount}+ sections with substantial content -->
  <!-- Add <!-- AD_PLACEMENT --> comments between major sections for ad insertion -->

  ${includeFAQ ? `<section class="faq" id="faq">
    <h2>Frequently Asked Questions</h2>
    <div class="faq-item">
      <h3>[Question 1]?</h3>
      <p>[Detailed, helpful answer]</p>
    </div>
    <!-- Include 4-6 relevant FAQs -->
  </section>` : ''}

  <footer>
    <section class="conclusion">
      <h2>Final Thoughts</h2>
      <p>[Summarize key takeaways and encourage action]</p>
    </section>
  </footer>
</article>

## Important Guidelines:
1. Use semantic HTML5 tags (article, section, header, footer, nav)
2. All headings should be H2 or H3 (H1 is for title only)
3. Include bullet lists (<ul>) and numbered lists (<ol>) where appropriate
4. Add <strong> for emphasis on key terms
5. Use proper paragraph (<p>) tags - no naked text
6. Include <!-- AD_PLACEMENT --> comments where ads should go
7. Write naturally for humans first, optimize for search second
8. Include actionable tips, examples, and practical advice
9. Each section should be 150-300 words minimum

Now write the complete HTML article:`;
}

// ============================================================================
// HTML Listicle Prompt
// ============================================================================

export function buildHtmlListiclePrompt(config: HtmlPromptConfig): string {
    const {
        topic,
        niche,
        persona = 'an expert reviewer',
        wordCount = 2000,
        includeFAQ = true,
    } = config;

    return `Write a comprehensive listicle article about: "${topic}"

CRITICAL: Output ONLY valid HTML. Do not use Markdown.

## Content Requirements:
- Niche: ${niche}
- Voice: Write as ${persona}
- Target length: ${wordCount}+ words
- Format: Top 10-15 items (or "Best" list)

## HTML Structure:

<article class="listicle">
  <header>
    <h1>[Number + Best/Top + Topic Title for ${new Date().getFullYear()}]</h1>
    <p class="excerpt">[Compelling preview of what readers will learn]</p>
  </header>

  <section class="quick-picks">
    <h2>Quick Summary</h2>
    <ul class="pick-list">
      <li><strong>Best Overall:</strong> [Item] - [Short reason]</li>
      <li><strong>Best Value:</strong> [Item] - [Short reason]</li>
      <li><strong>Best for Beginners:</strong> [Item] - [Short reason]</li>
    </ul>
  </section>

  <!-- AD_PLACEMENT -->

  <section class="list-item" id="item-1">
    <h2>1. [Item Name]</h2>
    <p class="subtitle">[Brief tagline: Best for X]</p>
    
    <h3>Key Features</h3>
    <ul>
      <li>[Feature 1]</li>
      <li>[Feature 2]</li>
      <li>[Feature 3]</li>
    </ul>
    
    <h3>Pros</h3>
    <ul class="pros">
      <li>[Pro 1]</li>
      <li>[Pro 2]</li>
    </ul>
    
    <h3>Cons</h3>
    <ul class="cons">
      <li>[Con 1]</li>
    </ul>
    
    <p>[2-3 paragraphs of detailed review]</p>
  </section>

  <!-- Repeat for all items, with AD_PLACEMENT every 3-4 items -->

  ${includeFAQ ? `<section class="faq" id="faq">
    <h2>Buying Guide: What to Look For</h2>
    <div class="faq-item">
      <h3>[Consideration 1]?</h3>
      <p>[Helpful guidance]</p>
    </div>
  </section>` : ''}

  <footer>
    <section class="conclusion">
      <h2>The Bottom Line</h2>
      <p>[Final recommendations based on different user needs]</p>
    </section>
  </footer>
</article>

Write the complete HTML listicle now:`;
}

// ============================================================================
// HTML How-To Prompt
// ============================================================================

export function buildHtmlHowToPrompt(config: HtmlPromptConfig): string {
    const {
        topic,
        niche,
        persona = 'an experienced instructor',
        wordCount = 1500,
        includeFAQ = true,
    } = config;

    return `Write a comprehensive how-to guide about: "${topic}"

CRITICAL: Output ONLY valid HTML. Do not use Markdown.

## Content Requirements:
- Niche: ${niche}
- Voice: Write as ${persona}
- Target length: ${wordCount}+ words
- Format: Step-by-step tutorial

## HTML Structure:

<article class="how-to">
  <header>
    <h1>How to [Action]: [Specific Outcome] (Step-by-Step Guide)</h1>
    <p class="excerpt">[Preview of what they'll learn and why it matters]</p>
  </header>

  <section class="overview">
    <h2>What You'll Learn</h2>
    <ul>
      <li>[Skill/outcome 1]</li>
      <li>[Skill/outcome 2]</li>
      <li>[Skill/outcome 3]</li>
    </ul>
    
    <div class="meta-info">
      <p><strong>Difficulty:</strong> [Beginner/Intermediate/Advanced]</p>
      <p><strong>Time Required:</strong> [X minutes/hours]</p>
      <p><strong>What You'll Need:</strong> [Brief list]</p>
    </div>
  </section>

  <!-- AD_PLACEMENT -->

  <section class="materials" id="materials">
    <h2>Materials & Tools Needed</h2>
    <ul>
      <li>[Item 1] - [why needed]</li>
      <li>[Item 2] - [why needed]</li>
    </ul>
  </section>

  <section class="steps" id="steps">
    <h2>Step-by-Step Instructions</h2>
    
    <div class="step" id="step-1">
      <h3>Step 1: [Action Title]</h3>
      <p>[Detailed explanation of what to do]</p>
      <p><strong>Pro Tip:</strong> [Helpful insider advice]</p>
    </div>

    <!-- AD_PLACEMENT after step 3 -->

    <div class="step" id="step-2">
      <h3>Step 2: [Action Title]</h3>
      <p>[Detailed explanation]</p>
    </div>

    <!-- Continue with all steps -->
  </section>

  <section class="troubleshooting" id="troubleshooting">
    <h2>Common Mistakes to Avoid</h2>
    <ul>
      <li><strong>[Mistake 1]:</strong> [How to avoid/fix it]</li>
      <li><strong>[Mistake 2]:</strong> [How to avoid/fix it]</li>
    </ul>
  </section>

  ${includeFAQ ? `<section class="faq" id="faq">
    <h2>Frequently Asked Questions</h2>
    <div class="faq-item">
      <h3>[Common question]?</h3>
      <p>[Helpful answer]</p>
    </div>
  </section>` : ''}

  <footer>
    <section class="next-steps">
      <h2>What's Next?</h2>
      <p>[Encourage further learning or action]</p>
    </section>
  </footer>
</article>

Write the complete HTML how-to guide now:`;
}

// ============================================================================
// Prompt Selector
// ============================================================================

export type ArticleType = 'guide' | 'listicle' | 'howto';

export function buildHtmlPrompt(type: ArticleType, config: HtmlPromptConfig): string {
    switch (type) {
        case 'listicle':
            return buildHtmlListiclePrompt(config);
        case 'howto':
            return buildHtmlHowToPrompt(config);
        case 'guide':
        default:
            return buildHtmlArticlePrompt(config);
    }
}
