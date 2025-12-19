/**
 * FAQ Schema Generator
 * Generates JSON-LD structured data for FAQ sections
 * https://schema.org/FAQPage
 */

/**
 * Generate FAQ JSON-LD schema component
 * Parses FAQ from markdown content (looks for ## FAQ or similar headings)
 */
export function generateFAQSchema(): string {
    return `
// FAQ JSON-LD Schema Component
// Extracts FAQ from article content and generates schema
function FAQSchema({ content }: { content: string }) {
    // Parse FAQ from markdown content
    const faqSection = extractFAQ(content);
    
    if (!faqSection || faqSection.length === 0) {
        return null;
    }
    
    const schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqSection.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
            }
        }))
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}

// Extract FAQ from markdown content
function extractFAQ(content: string): Array<{ question: string; answer: string }> | null {
    // Look for FAQ section (## FAQ, ## Frequently Asked Questions, etc.)
    const faqPattern = /##\\s*(FAQ|Frequently Asked Questions|Common Questions)[\\s\\S]*?(?=##|$)/i;
    const faqMatch = content.match(faqPattern);
    
    if (!faqMatch) return null;
    
    const faqContent = faqMatch[0];
    const faqs: Array<{ question: string; answer: string }> = [];
    
    // Pattern: ### Question text followed by answer paragraph
    const questionPattern = /###\\s*(.+?)\\n([\\s\\S]*?)(?=###|$)/g;
    let match;
    
    while ((match = questionPattern.exec(faqContent)) !== null) {
        const question = match[1].trim();
        const answer = match[2].trim().replace(/\\n/g, ' ');
        
        if (question && answer) {
            faqs.push({ question, answer });
        }
    }
    
    // Alternative pattern: **Question?** followed by answer
    if (faqs.length === 0) {
        const boldPattern = /\\*\\*(.+?\\?)\\*\\*\\n([\\s\\S]*?)(?=\\*\\*|$)/g;
        
        while ((match = boldPattern.exec(faqContent)) !== null) {
            const question = match[1].trim();
            const answer = match[2].trim().replace(/\\n/g, ' ');
            
            if (question && answer) {
                faqs.push({ question, answer });
            }
        }
    }
    
    return faqs.length > 0 ? faqs : null;
}`;
}

/**
 * Generate inline FAQ schema for embedding
 */
export function generateInlineFAQSchema(): string {
    return `{/* FAQ Schema - Auto-extracted from content */}
            {(() => {
                const faqs = extractFAQFromContent(article.content);
                if (!faqs || faqs.length === 0) return null;
                
                return (
                    <script
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{
                            __html: JSON.stringify({
                                "@context": "https://schema.org",
                                "@type": "FAQPage",
                                "mainEntity": faqs.map(faq => ({
                                    "@type": "Question",
                                    "name": faq.question,
                                    "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": faq.answer
                                    }
                                }))
                            })
                        }}
                    />
                );
            })()}`;
}

/**
 * Generate FAQ extraction helper function
 */
export function generateFAQExtractor(): string {
    return `
// Extract FAQ from article content
function extractFAQFromContent(content: string): Array<{ question: string; answer: string }> | null {
    if (!content) return null;
    
    // Look for FAQ section
    const faqPattern = /##\\s*(FAQ|Frequently Asked Questions|Common Questions)[\\s\\S]*?(?=##[^#]|$)/i;
    const faqMatch = content.match(faqPattern);
    
    if (!faqMatch) return null;
    
    const faqContent = faqMatch[0];
    const faqs: Array<{ question: string; answer: string }> = [];
    
    // Pattern: ### Question followed by answer
    const questionPattern = /###\\s*(.+?)\\n([\\s\\S]*?)(?=###|$)/g;
    let match;
    
    while ((match = questionPattern.exec(faqContent)) !== null) {
        const question = match[1].trim();
        const answer = match[2].trim().replace(/\\n+/g, ' ').substring(0, 500);
        if (question && answer) {
            faqs.push({ question, answer });
        }
    }
    
    return faqs.length > 0 ? faqs : null;
}`;
}
