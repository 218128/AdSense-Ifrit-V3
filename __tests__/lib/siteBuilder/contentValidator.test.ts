/**
 * Tests for Content Validator (SiteBuilder)
 * 
 * Tests content quality validation and cleanup
 */

import {
    validateContent,
    cleanContent,
    parseFrontmatter,
    countWords,
    countHeadings,
    countParagraphs,
    countLinks,
    hasIntro,
    hasConclusion,
    getContentType
} from '@/lib/siteBuilder/contentValidator';

describe('Content Validator', () => {
    describe('parseFrontmatter()', () => {
        it('should detect frontmatter presence', () => {
            const content = `---
title: "Test Article"
description: "A test description"
---

# Content here`;

            const result = parseFrontmatter(content);

            expect(result.hasFrontmatter).toBe(true);
            expect(result.title).toBe('Test Article');
            expect(result.description).toBe('A test description');
        });

        it('should handle content without frontmatter', () => {
            const content = `# Just a heading

Some content here.`;

            const result = parseFrontmatter(content);

            expect(result.hasFrontmatter).toBe(false);
        });
    });

    describe('countWords()', () => {
        it('should count words excluding frontmatter', () => {
            const content = `---
title: "Test"
---

This is a five word sentence.`;

            const count = countWords(content);

            expect(count).toBe(6); // "This is a five word sentence"
        });

        it('should handle empty content', () => {
            expect(countWords('')).toBe(0);
        });
    });

    describe('countHeadings()', () => {
        it('should count markdown headings', () => {
            const content = `# Heading 1

Some text.

## Heading 2

More text.

### Heading 3`;

            expect(countHeadings(content)).toBe(3);
        });

        it('should handle no headings', () => {
            expect(countHeadings('Just text without headings.')).toBe(0);
        });
    });

    describe('countParagraphs()', () => {
        it('should count paragraphs', () => {
            const content = `First paragraph here.

Second paragraph here.

Third paragraph.`;

            expect(countParagraphs(content)).toBeGreaterThanOrEqual(3);
        });
    });

    describe('countLinks()', () => {
        it('should count markdown links', () => {
            const content = `Check out [this link](https://example.com) and [another](https://test.com).`;

            expect(countLinks(content)).toBe(2);
        });

        it('should handle no links', () => {
            expect(countLinks('No links here.')).toBe(0);
        });
    });

    describe('hasIntro()', () => {
        it('should detect introduction section', () => {
            const content = `# Introduction

This article explains...`;

            expect(hasIntro(content)).toBe(true);
        });

        it('should detect content before first heading as intro', () => {
            const content = `This is introductory text before any heading.

# First Heading`;

            expect(hasIntro(content)).toBe(true);
        });
    });

    describe('hasConclusion()', () => {
        it('should detect conclusion section', () => {
            const content = `# Main Content

...

## Conclusion

In summary, we learned...`;

            expect(hasConclusion(content)).toBe(true);
        });

        it('should detect final thoughts heading', () => {
            const content = `# Content

## Final Thoughts

Wrapping up...`;

            expect(hasConclusion(content)).toBe(true);
        });
    });

    describe('validateContent()', () => {
        it('should validate pillar article with sufficient content', () => {
            const content = `---
title: "Comprehensive Guide"
description: "A detailed guide"
---

# Introduction

This is a comprehensive guide that covers everything you need to know. ${' '.repeat(100)}

## Section One

${'Lorem ipsum dolor sit amet. '.repeat(100)}

## Section Two

${'Content here with lots of detail. '.repeat(100)}

## Conclusion

In conclusion, we have covered many important topics.`;

            const result = validateContent(content, 'pillar');

            expect(result.metrics.hasFrontmatter).toBe(true);
            expect(result.metrics.headingCount).toBeGreaterThanOrEqual(3);
        });

        it('should flag forbidden patterns', () => {
            const content = `---
title: "Test"
---

# Article

[Insert relevant example here]

Some content with [Add your own content].`;

            const result = validateContent(content, 'cluster');

            expect(result.issues.some(i => i.code.includes('placeholder'))).toBe(true);
        });

        it('should flag missing frontmatter', () => {
            const content = `# Article Without Frontmatter

Some content here.`;

            const result = validateContent(content, 'supporting');

            expect(result.issues.some(i => i.code === 'missing_frontmatter')).toBe(true);
        });
    });

    describe('cleanContent()', () => {
        it('should remove citation markers', () => {
            const content = `This is a fact [1]. Another fact [2].`;

            const result = cleanContent(content);

            expect(result.content).not.toContain('[1]');
            expect(result.content).not.toContain('[2]');
            expect(result.wasModified).toBe(true);
        });

        it('should remove word count markers', () => {
            const content = `Article content here. (Word count: 348)`;

            const result = cleanContent(content);

            expect(result.content).not.toContain('Word count');
            expect(result.wasModified).toBe(true);
        });

        it('should not modify clean content', () => {
            const content = `# Clean Article

This is clean content without any artifacts.`;

            const result = cleanContent(content);

            expect(result.wasModified).toBe(false);
        });
    });

    describe('getContentType()', () => {
        it('should map pillar type', () => {
            expect(getContentType('pillar')).toBe('pillar');
        });

        it('should map cluster type', () => {
            expect(getContentType('cluster')).toBe('cluster');
        });

        it('should default to cluster for unknown types', () => {
            expect(getContentType('unknown')).toBe('cluster');
        });
    });
});
