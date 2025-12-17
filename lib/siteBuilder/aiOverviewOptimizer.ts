/**
 * AI Overview Optimizer
 * 
 * Generates content structures optimized for AI Overview citations.
 * Sites cited in AI Overviews earn 35% more organic clicks.
 */

export interface AIOverviewBlock {
    type: 'answer_box' | 'definition' | 'numbered_list' | 'comparison_table' | 'faq' | 'key_takeaways';
    content: string;
    position: 'start' | 'after_intro' | 'mid_content' | 'before_conclusion';
}

export interface ContentStructure {
    title: string;
    metaDescription: string;
    blocks: AIOverviewBlock[];
    schemaMarkup: string[];
}

// ============================================
// AI OVERVIEW CONTENT GENERATORS
// ============================================

/**
 * Generate Answer Box format (featured snippet optimized)
 * Placed at the start of articles for direct answer queries
 */
export function generateAnswerBox(
    question: string,
    shortAnswer: string,
    details?: string
): string {
    return `
<div className="answer-box" style={{
    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
    border: '1px solid #0ea5e9',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    marginBottom: '2rem'
}}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '1.5rem' }}>💡</span>
        <strong style={{ fontSize: '1.125rem', color: '#0369a1' }}>Quick Answer</strong>
    </div>
    <p style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '0.5rem', color: '#0c4a6e' }}>
        ${question}
    </p>
    <p style={{ fontSize: '1rem', lineHeight: '1.6' }}>
        ${shortAnswer}
    </p>
    ${details ? `
    <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.75rem' }}>
        ${details}
    </p>
    ` : ''}
</div>
`;
}

/**
 * Generate Definition Block (optimized for "what is" queries)
 */
export function generateDefinitionBlock(
    term: string,
    definition: string,
    example?: string
): string {
    return `
<div className="definition-block" style={{
    background: '#fefce8',
    borderLeft: '4px solid #eab308',
    padding: '1.25rem 1.5rem',
    marginBottom: '1.5rem',
    borderRadius: '0 0.5rem 0.5rem 0'
}}>
    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '700', color: '#a16207', marginBottom: '0.5rem' }}>
        Definition
    </p>
    <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
        <strong>${term}</strong>: ${definition}
    </p>
    ${example ? `
    <p style={{ fontSize: '0.875rem', color: '#78716c', fontStyle: 'italic' }}>
        Example: ${example}
    </p>
    ` : ''}
</div>
`;
}

/**
 * Generate Numbered Steps Block (how-to optimization)
 */
export function generateNumberedSteps(
    title: string,
    steps: { step: string; detail?: string }[]
): string {
    const stepsHtml = steps.map((s, i) => `
    <li style={{ marginBottom: '1rem', paddingLeft: '0.5rem' }}>
        <strong>${s.step}</strong>
        ${s.detail ? `<p style={{ color: '#64748b', marginTop: '0.25rem', fontSize: '0.9rem' }}>${s.detail}</p>` : ''}
    </li>
    `).join('');

    return `
<div className="steps-block" style={{
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    marginBottom: '1.5rem'
}}>
    <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        📋 ${title}
    </h3>
    <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.6' }}>
        ${stepsHtml}
    </ol>
</div>
`;
}

/**
 * Generate Comparison Table (vs query optimization)
 */
export function generateComparisonTable(
    title: string,
    items: string[],
    criteria: { name: string; values: (string | boolean)[] }[]
): string {
    const headerCells = items.map(item =>
        `<th style={{ padding: '0.75rem', fontWeight: '600', background: '#f8fafc' }}>${item}</th>`
    ).join('');

    const rows = criteria.map(criterion => {
        const cells = criterion.values.map(value => {
            if (typeof value === 'boolean') {
                return `<td style={{ padding: '0.75rem', textAlign: 'center' }}>${value ? '✅' : '❌'}</td>`;
            }
            return `<td style={{ padding: '0.75rem' }}>${value}</td>`;
        }).join('');
        return `
        <tr>
            <td style={{ padding: '0.75rem', fontWeight: '500', background: '#f8fafc' }}>${criterion.name}</td>
            ${cells}
        </tr>
        `;
    }).join('');

    return `
<div className="comparison-table" style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
    <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>⚖️ ${title}</h3>
    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden' }}>
        <thead>
            <tr>
                <th style={{ padding: '0.75rem', fontWeight: '600', background: '#f1f5f9' }}>Criteria</th>
                ${headerCells}
            </tr>
        </thead>
        <tbody>
            ${rows}
        </tbody>
    </table>
</div>
`;
}

/**
 * Generate FAQ Section (FAQ schema optimized)
 */
export function generateFAQSection(
    faqs: { question: string; answer: string }[]
): string {
    const faqItems = faqs.map((faq, i) => `
    <details style={{ 
        marginBottom: '0.75rem', 
        border: '1px solid #e2e8f0', 
        borderRadius: '0.5rem',
        overflow: 'hidden'
    }}>
        <summary style={{ 
            padding: '1rem', 
            cursor: 'pointer', 
            fontWeight: '600',
            background: '#f8fafc',
            listStyle: 'none'
        }}>
            <span style={{ marginRight: '0.5rem' }}>❓</span>
            ${faq.question}
        </summary>
        <div style={{ padding: '1rem', background: 'white' }}>
            <p>${faq.answer}</p>
        </div>
    </details>
    `).join('');

    return `
<div className="faq-section" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
    <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Frequently Asked Questions</h2>
    ${faqItems}
</div>
`;
}

/**
 * Generate Key Takeaways Box (summary optimization)
 */
export function generateKeyTakeaways(takeaways: string[]): string {
    const items = takeaways.map(t => `
    <li style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
        <span style={{ color: '#10b981' }}>✓</span>
        <span>${t}</span>
    </li>
    `).join('');

    return `
<div className="key-takeaways" style={{
    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
    border: '1px solid #10b981',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    marginBottom: '2rem'
}}>
    <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        🎯 Key Takeaways
    </h3>
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        ${items}
    </ul>
</div>
`;
}

/**
 * Generate Pro Tip Box
 */
export function generateProTip(tip: string): string {
    return `
<div className="pro-tip" style={{
    background: '#faf5ff',
    borderLeft: '4px solid #a855f7',
    padding: '1rem 1.25rem',
    marginBottom: '1.5rem',
    borderRadius: '0 0.5rem 0.5rem 0'
}}>
    <p style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', margin: 0 }}>
        <span style={{ fontSize: '1.25rem' }}>💡</span>
        <span><strong>Pro Tip:</strong> ${tip}</span>
    </p>
</div>
`;
}

/**
 * Generate Expert Quote Block
 */
export function generateExpertQuote(
    quote: string,
    author: string,
    role: string
): string {
    return `
<blockquote style={{
    background: '#f8fafc',
    borderLeft: '4px solid #0ea5e9',
    padding: '1.5rem',
    margin: '1.5rem 0',
    borderRadius: '0 0.5rem 0.5rem 0'
}}>
    <p style={{ fontSize: '1.125rem', fontStyle: 'italic', marginBottom: '1rem', color: '#334155' }}>
        "${quote}"
    </p>
    <footer style={{ fontSize: '0.875rem', color: '#64748b' }}>
        — <strong>${author}</strong>, ${role}
    </footer>
</blockquote>
`;
}

// ============================================
// CONTENT STRUCTURE BUILDERS
// ============================================

export interface ArticleEnhancement {
    position: 'before_content' | 'after_intro' | 'mid_content' | 'before_conclusion' | 'after_content';
    component: string;
}

/**
 * Get recommended AI Overview enhancements for content type
 */
export function getAIOverviewEnhancements(
    contentTypeId: string,
    topic: string,
    niche: string
): ArticleEnhancement[] {
    const enhancements: ArticleEnhancement[] = [];

    switch (contentTypeId) {
        case 'what_is_guide':
        case 'beginners_guide':
            enhancements.push({
                position: 'before_content',
                component: generateAnswerBox(
                    `What is ${topic}?`,
                    `[AI will generate a concise 1-2 sentence answer about ${topic}]`,
                    'Read on for the complete guide.'
                )
            });
            enhancements.push({
                position: 'after_intro',
                component: generateDefinitionBlock(
                    topic,
                    `[AI will generate a clear, authoritative definition]`,
                    `[AI will provide a relevant example]`
                )
            });
            break;

        case 'step_by_step_guide':
        case 'ultimate_guide':
            enhancements.push({
                position: 'before_content',
                component: generateKeyTakeaways([
                    '[Key point 1 about the process]',
                    '[Key point 2 with specific benefit]',
                    '[Key point 3 with time/effort estimate]'
                ])
            });
            enhancements.push({
                position: 'after_intro',
                component: generateNumberedSteps(
                    `Quick Steps: ${topic}`,
                    [
                        { step: 'Step 1', detail: '[Brief description]' },
                        { step: 'Step 2', detail: '[Brief description]' },
                        { step: 'Step 3', detail: '[Brief description]' }
                    ]
                )
            });
            break;

        case 'comparison_guide':
            enhancements.push({
                position: 'after_intro',
                component: generateComparisonTable(
                    `${topic} Comparison`,
                    ['Option A', 'Option B', 'Option C'],
                    [
                        { name: 'Price', values: ['$$$', '$$', '$'] },
                        { name: 'Best For', values: ['[Use case]', '[Use case]', '[Use case]'] },
                        { name: 'Rating', values: ['⭐⭐⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐'] }
                    ]
                )
            });
            break;

        case 'troubleshooting_guide':
            enhancements.push({
                position: 'before_content',
                component: generateAnswerBox(
                    `How to fix ${topic}?`,
                    `[Quick summary of the most common solution]`,
                    'See all solutions below.'
                )
            });
            break;
    }

    // Always add FAQ section for AI Overview optimization
    enhancements.push({
        position: 'before_conclusion',
        component: generateFAQSection([
            { question: `What is ${topic}?`, answer: '[AI will generate answer]' },
            { question: `Why is ${topic} important?`, answer: '[AI will generate answer]' },
            { question: `How do I get started with ${topic}?`, answer: '[AI will generate answer]' },
            { question: `What are common mistakes with ${topic}?`, answer: '[AI will generate answer]' },
            { question: `Is ${topic} worth it?`, answer: '[AI will generate answer]' }
        ])
    });

    return enhancements;
}

/**
 * Generate CSS for AI Overview blocks
 */
export function getAIOverviewCSS(): string {
    return `
/* AI Overview Optimized Blocks */
.answer-box, .definition-block, .steps-block, 
.comparison-table, .faq-section, .key-takeaways,
.pro-tip, .expert-quote {
    font-family: var(--font-sans, system-ui, sans-serif);
}

.answer-box {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border: 1px solid #0ea5e9;
}

.definition-block {
    background: #fefce8;
    border-left: 4px solid #eab308;
}

.key-takeaways {
    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
    border: 1px solid #10b981;
}

.pro-tip {
    background: #faf5ff;
    border-left: 4px solid #a855f7;
}

.faq-section details summary {
    display: flex;
    align-items: center;
}

.faq-section details summary::marker {
    display: none;
}

.faq-section details[open] summary {
    border-bottom: 1px solid #e2e8f0;
}

/* Print-friendly styles */
@media print {
    .answer-box, .key-takeaways {
        break-inside: avoid;
    }
}
`;
}

/**
 * Prompt instructions for AI content generation with AI Overview optimization
 */
export function getAIOverviewPromptInstructions(contentTypeId: string): string {
    const baseInstructions = `
IMPORTANT: Optimize content for AI Overview citations:

1. **Answer Box Format**: Start with a clear, direct answer in the first paragraph.
   - Answer the main question in 40-60 words
   - Use simple, declarative sentences
   - Include the target keyword naturally

2. **Definition Clarity**: For any key terms, provide clear definitions.
   - Use "X is..." or "X refers to..." format
   - Keep definitions to 1-2 sentences

3. **Structured Lists**: Use numbered steps when explaining processes.
   - Start each step with an action verb
   - Keep steps concise but complete

4. **Comparison Format**: For comparisons, use clear criteria and ratings.
   - Present data in structured format
   - Include a clear winner/recommendation

5. **FAQ Integration**: Include 5 relevant FAQs at the end.
   - Answer each question in 2-3 sentences
   - Use complete sentences in answers

6. **Key Takeaways**: Summarize 3-5 key points.
   - Use bullet format with checkmarks
   - Each point should be actionable
`;

    const typeSpecific: Record<string, string> = {
        'what_is_guide': `
Focus: Definition and explanation.
- Lead with a clear, authoritative definition
- Explain "why it matters" early
- Include examples to illustrate concepts
`,
        'step_by_step_guide': `
Focus: Actionable steps.
- Number all steps clearly (Step 1, Step 2, etc.)
- Start each step with an action verb
- Include time estimates where relevant
- Add pro tips between steps
`,
        'comparison_guide': `
Focus: Structured comparison.
- Lead with the winner/recommendation
- Use comparison tables with clear criteria
- Include pros and cons for each option
- End with "Who should choose X" sections
`
    };

    return baseInstructions + (typeSpecific[contentTypeId] || '');
}
