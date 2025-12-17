/**
 * Rich Markdown Formatters
 * 
 * Generates enhanced Markdown elements for articles:
 * - Comparison tables
 * - Pros/Cons boxes
 * - Callout boxes
 * - Rating displays
 * - FAQ sections
 */

export interface ProductForComparison {
    name: string;
    price?: string;
    rating?: number;  // 1-5
    features: Record<string, string>;
    pros?: string[];
    cons?: string[];
    bestFor?: string;
    link?: string;
}

export interface ComparisonTableOptions {
    title?: string;
    showRatings?: boolean;
    showPrices?: boolean;
    highlightBest?: boolean;
    features: string[];  // Which features to include as columns
}

/**
 * Generate a Markdown comparison table
 */
export function generateComparisonTable(
    products: ProductForComparison[],
    options: ComparisonTableOptions
): string {
    if (products.length === 0) return '';

    const { title, showRatings = true, showPrices = true, highlightBest = true, features } = options;

    let table = '';

    // Title
    if (title) {
        table += `### ${title}\n\n`;
    }

    // Header row
    const headers = ['Product'];
    if (showRatings) headers.push('Rating');
    if (showPrices) headers.push('Price');
    headers.push(...features);
    headers.push('Best For');

    table += '| ' + headers.join(' | ') + ' |\n';
    table += '| ' + headers.map(() => '---').join(' | ') + ' |\n';

    // Find best product by rating for highlighting
    const bestProduct = highlightBest
        ? products.reduce((best, p) => (p.rating || 0) > (best.rating || 0) ? p : best, products[0])
        : null;

    // Data rows
    for (const product of products) {
        const isBest = highlightBest && product.name === bestProduct?.name;
        const cells: string[] = [];

        // Product name (with highlight)
        cells.push(isBest ? `**${product.name}** 🏆` : `**${product.name}**`);

        // Rating
        if (showRatings) {
            cells.push(product.rating ? formatRating(product.rating) : 'N/A');
        }

        // Price
        if (showPrices) {
            cells.push(product.price || 'N/A');
        }

        // Features
        for (const feature of features) {
            cells.push(product.features[feature] || '—');
        }

        // Best for
        cells.push(product.bestFor || '—');

        table += '| ' + cells.join(' | ') + ' |\n';
    }

    return table + '\n';
}

/**
 * Format a rating as stars
 */
export function formatRating(rating: number, maxStars: number = 5): string {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const emptyStars = maxStars - fullStars - (hasHalf ? 1 : 0);

    let display = '★'.repeat(fullStars);
    if (hasHalf) display += '½';
    display += '☆'.repeat(emptyStars);

    return `${display} (${rating.toFixed(1)})`;
}

/**
 * Generate a Pros/Cons box
 */
export function generateProsCons(pros: string[], cons: string[]): string {
    let output = '### ✅ Pros and ❌ Cons\n\n';

    output += '<div class="pros-cons-box">\n\n';

    // Pros
    output += '**What We Like:**\n\n';
    for (const pro of pros) {
        output += `✅ ${pro}\n\n`;
    }

    // Cons
    output += '**What Could Be Better:**\n\n';
    for (const con of cons) {
        output += `❌ ${con}\n\n`;
    }

    output += '</div>\n\n';

    return output;
}

/**
 * Generate a callout/alert box
 */
export type CalloutType = 'tip' | 'warning' | 'important' | 'note' | 'caution';

export function generateCallout(type: CalloutType, title: string, content: string): string {
    const icons: Record<CalloutType, string> = {
        tip: '💡',
        warning: '⚠️',
        important: '❗',
        note: '📝',
        caution: '🚨'
    };

    const icon = icons[type];

    return `> ${icon} **${title}**
> 
> ${content.split('\n').join('\n> ')}

`;
}

/**
 * Generate a Key Takeaways box
 */
export function generateKeyTakeaways(takeaways: string[]): string {
    let output = '### 🎯 Key Takeaways\n\n';
    output += '> **TL;DR - What You Need to Know:**\n>\n';

    for (const takeaway of takeaways) {
        output += `> • ${takeaway}\n`;
    }

    output += '\n';
    return output;
}

/**
 * Generate FAQ section with proper formatting for Schema.org
 */
export function generateFAQSection(faqs: Array<{ question: string; answer: string }>): string {
    let output = '## ❓ Frequently Asked Questions\n\n';

    for (const faq of faqs) {
        output += `### ${faq.question}\n\n`;
        output += `${faq.answer}\n\n`;
    }

    return output;
}

/**
 * Generate a verdict/rating box
 */
export function generateVerdictBox(
    productName: string,
    rating: number,
    verdict: string,
    bestFor: string,
    notIdealFor: string
): string {
    return `### 🏆 Final Verdict: ${productName}

**Overall Rating:** ${formatRating(rating)}

${verdict}

| Who Should Buy | Who Should Skip |
| --- | --- |
| ${bestFor} | ${notIdealFor} |

`;
}

/**
 * Generate a step-by-step section (HowTo friendly)
 */
export function generateSteps(steps: Array<{ title: string; content: string; tip?: string }>): string {
    let output = '';

    steps.forEach((step, index) => {
        output += `### Step ${index + 1}: ${step.title}\n\n`;
        output += `${step.content}\n\n`;

        if (step.tip) {
            output += generateCallout('tip', 'Pro Tip', step.tip);
        }
    });

    return output;
}

/**
 * Generate a materials/requirements list
 */
export function generateRequirementsList(
    title: string,
    items: Array<{ name: string; note?: string }>
): string {
    let output = `### ${title}\n\n`;

    for (const item of items) {
        output += `- **${item.name}**`;
        if (item.note) {
            output += ` — ${item.note}`;
        }
        output += '\n';
    }

    output += '\n';
    return output;
}

/**
 * Generate a quick stats/specs table
 */
export function generateQuickStats(stats: Record<string, string>, title?: string): string {
    let output = title ? `### ${title}\n\n` : '';

    output += '| Feature | Details |\n';
    output += '| --- | --- |\n';

    for (const [key, value] of Object.entries(stats)) {
        output += `| **${key}** | ${value} |\n`;
    }

    output += '\n';
    return output;
}
