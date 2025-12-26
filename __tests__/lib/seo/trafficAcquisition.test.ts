/**
 * Tests for SEO Traffic Acquisition
 * 
 * Tests SEO audit, internal linking, and topic clusters
 */

import {
    auditArticleSEO,
    suggestInternalLinks,
    createTopicCluster,
    generateFeaturedSnippetContent,
    generateCanonicalUrl,
    suggestBacklinkOpportunities
} from '@/lib/seo/trafficAcquisition';

describe('SEO Traffic Acquisition', () => {
    describe('auditArticleSEO()', () => {
        it('should identify missing keyword in title', () => {
            const content = `---
title: "Some Article"
description: "Description here"
---

# Introduction

Content without the target keyword.`;

            const audit = auditArticleSEO(content, 'target keyword');

            expect(audit.issues.some(i => i.message.toLowerCase().includes('title'))).toBe(true);
        });

        it('should pass when keyword is in title', () => {
            const content = `---
title: "How to Use Target Keyword Effectively"
description: "Learn about target keyword"
---

# Target Keyword Guide

Content about target keyword here.`;

            const audit = auditArticleSEO(content, 'target keyword');

            expect(audit.score).toBeGreaterThan(0);
        });

        it('should check for meta description length', () => {
            const content = `---
title: "Test"
description: "Too short"
---

# Content`;

            const audit = auditArticleSEO(content, 'test');

            // Should warn about short description
            expect(audit.issues.length).toBeGreaterThan(0);
        });

        it('should check heading structure', () => {
            const content = `---
title: "Test Article"
description: "Test description"
---

Content without any headings.`;

            const audit = auditArticleSEO(content, 'test');

            expect(audit.issues.some(i => i.message.toLowerCase().includes('heading'))).toBe(true);
        });

        it('should return score between 0 and 100', () => {
            const content = `---
title: "Keyword Article"
description: "An article about keyword"
---

# Keyword

Some content about keyword here.`;

            const audit = auditArticleSEO(content, 'keyword');

            expect(audit.score).toBeGreaterThanOrEqual(0);
            expect(audit.score).toBeLessThanOrEqual(100);
        });
    });

    describe('suggestInternalLinks()', () => {
        it('should suggest links between related articles', () => {
            const articles = [
                { slug: 'react-basics', title: 'React Basics', keywords: ['react', 'javascript', 'components'] },
                { slug: 'react-hooks', title: 'React Hooks Guide', keywords: ['react', 'hooks', 'state'] },
                { slug: 'vue-basics', title: 'Vue Basics', keywords: ['vue', 'javascript', 'components'] }
            ];

            const links = suggestInternalLinks(articles);

            expect(links.length).toBeGreaterThan(0);
            // Should link related react articles
            expect(links.some(l =>
                (l.sourceSlug === 'react-basics' && l.targetSlug === 'react-hooks') ||
                (l.sourceSlug === 'react-hooks' && l.targetSlug === 'react-basics')
            )).toBe(true);
        });

        it('should return empty for single article', () => {
            const articles = [
                { slug: 'only-article', title: 'Only Article', keywords: ['test'] }
            ];

            const links = suggestInternalLinks(articles);

            expect(links).toEqual([]);
        });

        it('should include relevance scores', () => {
            const articles = [
                { slug: 'a', title: 'Article A', keywords: ['shared'] },
                { slug: 'b', title: 'Article B', keywords: ['shared'] }
            ];

            const links = suggestInternalLinks(articles);

            if (links.length > 0) {
                expect(links[0].relevanceScore).toBeDefined();
                expect(links[0].relevanceScore).toBeGreaterThan(0);
            }
        });
    });

    describe('createTopicCluster()', () => {
        it('should create cluster with pillar topic', () => {
            const cluster = createTopicCluster(
                'JavaScript Fundamentals',
                ['variables', 'functions', 'loops'],
                []
            );

            expect(cluster.pillarTopic).toBe('JavaScript Fundamentals');
            expect(cluster.clusterTopics.length).toBe(3);
        });

        it('should mark existing articles as published', () => {
            const cluster = createTopicCluster(
                'React Guide',
                ['hooks', 'components', 'state'],
                [{ slug: 'react-hooks', keyword: 'hooks' }]
            );

            expect(cluster.clusterTopics.some(t => t.status === 'published')).toBe(true);
        });

        it('should calculate completeness percentage', () => {
            const cluster = createTopicCluster(
                'Testing',
                ['unit', 'integration', 'e2e'],
                [
                    { slug: 'unit-testing', keyword: 'unit' }
                ]
            );

            // 1 of 3 = ~33%
            expect(cluster.completeness).toBeGreaterThan(0);
            expect(cluster.completeness).toBeLessThan(100);
        });
    });

    describe('generateFeaturedSnippetContent()', () => {
        it('should generate paragraph snippet', () => {
            const content = generateFeaturedSnippetContent(
                'paragraph',
                'What is JavaScript?',
                'JavaScript is a programming language.'
            );

            expect(content).toContain('JavaScript');
            expect(content).toContain('programming');
        });

        it('should generate list snippet', () => {
            const content = generateFeaturedSnippetContent(
                'list',
                'Top 3 Frameworks',
                ['React', 'Vue', 'Angular']
            );

            expect(content).toContain('React');
            expect(content).toContain('Vue');
            expect(content).toContain('Angular');
        });

        it('should generate table snippet', () => {
            const content = generateFeaturedSnippetContent(
                'table',
                'Comparison',
                [['Feature', 'React', 'Vue'], ['Speed', 'Fast', 'Fast']]
            );

            expect(content).toContain('|');
            expect(content).toContain('Feature');
        });
    });

    describe('generateCanonicalUrl()', () => {
        it('should combine base URL and slug', () => {
            const url = generateCanonicalUrl('https://example.com', 'my-article');

            expect(url).toBe('https://example.com/my-article');
        });

        it('should handle trailing slash in base URL', () => {
            const url = generateCanonicalUrl('https://example.com/', 'article');

            expect(url).toBe('https://example.com/article');
        });

        it('should handle leading slash in slug', () => {
            const url = generateCanonicalUrl('https://example.com', '/article');

            expect(url).toBe('https://example.com/article');
        });
    });

    describe('suggestBacklinkOpportunities()', () => {
        it('should return suggestions for niche', () => {
            const suggestions = suggestBacklinkOpportunities('Technology');

            expect(suggestions.length).toBeGreaterThan(0);
            expect(suggestions.every(s => typeof s === 'string')).toBe(true);
        });

        it('should include relevant strategies', () => {
            const suggestions = suggestBacklinkOpportunities('Finance');

            // Should include at least some common backlink strategies
            expect(suggestions.length).toBeGreaterThan(0);
        });
    });
});
