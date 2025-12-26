/**
 * Tests for Content Validator (SiteBuilder)
 * 
 * Tests content quality validation and cleanup using public API
 */

import {
    validateContent,
    cleanContent,
    getContentType
} from '@/lib/siteBuilder/contentValidator';

describe('Content Validator', () => {
    describe('validateContent()', () => {
        it('should validate pillar article with sufficient content', () => {
            const content = `---
title: "Comprehensive Guide"
description: "A detailed guide"
---

# Introduction

This is a comprehensive guide that covers everything you need to know.

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

        it('should validate cluster article', () => {
            const content = `---
title: "Cluster Topic"
description: "A focused article"
---

# Main Topic

${'This is cluster content. '.repeat(50)}

## Details

${'More information here. '.repeat(50)}`;

            const result = validateContent(content, 'cluster');

            expect(result.metrics.hasFrontmatter).toBe(true);
        });

        it('should flag forbidden patterns like placeholders', () => {
            const content = `---
title: "Test"
---

# Article

[Insert relevant example here]

Some content with [Add your own content].`;

            const result = validateContent(content, 'cluster');

            // Implementation uses 'FORBIDDEN_CONTENT' code for placeholder patterns
            expect(result.issues.some(i => i.code === 'FORBIDDEN_CONTENT')).toBe(true);
        });

        it('should flag missing frontmatter', () => {
            const content = `# Article Without Frontmatter

Some content here.`;

            const result = validateContent(content, 'cluster');

            // Implementation uses 'NO_FRONTMATTER' code
            expect(result.issues.some(i => i.code === 'NO_FRONTMATTER')).toBe(true);
        });

        it('should return metrics object', () => {
            const content = `---
title: "Test"
description: "Test desc"
---

# Heading

Some content here.`;

            const result = validateContent(content, 'cluster');

            expect(result.metrics).toHaveProperty('wordCount');
            expect(result.metrics).toHaveProperty('headingCount');
            expect(result.metrics).toHaveProperty('paragraphCount');
            expect(result.metrics).toHaveProperty('hasFrontmatter');
        });

        it('should return issues array', () => {
            const content = `Short content`;

            const result = validateContent(content, 'pillar');

            expect(Array.isArray(result.issues)).toBe(true);
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

        it('should return modified flag', () => {
            const content = `Test content`;

            const result = cleanContent(content);

            expect(typeof result.wasModified).toBe('boolean');
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

        it('should handle about page type', () => {
            expect(getContentType('about')).toBe('about');
        });

        it('should handle privacy page type', () => {
            expect(getContentType('privacy')).toBe('privacy');
        });
    });
});
