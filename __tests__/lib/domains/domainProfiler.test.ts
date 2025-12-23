/**
 * Domain Profiler Tests
 * 
 * Tests for domain name segmentation and profile generation.
 */

import {
    segmentDomainName,
    guessNiche,
    generatePrimaryKeywords,
    generateQuestionKeywords,
    generateSuggestedTopics,
    generateDomainProfile
} from '@/lib/domains/domainProfiler';

describe('Domain Profiler', () => {
    describe('segmentDomainName', () => {
        it('should segment hyphenated domains', () => {
            expect(segmentDomainName('access-commerce.com')).toEqual(['access', 'commerce']);
            expect(segmentDomainName('my-cool-site.com')).toEqual(['my', 'cool', 'site']);
            expect(segmentDomainName('fitness-tips.com')).toEqual(['fitness', 'tips']);
        });

        it('should segment compound domains using dictionary', () => {
            expect(segmentDomainName('techzone.com')).toEqual(['tech', 'zone']);
            expect(segmentDomainName('homeinvest.com')).toEqual(['home', 'invest']);
            expect(segmentDomainName('shopplus.com')).toEqual(['shop', 'plus']);
        });

        it('should handle short domains', () => {
            expect(segmentDomainName('io.com')).toEqual(['io']);
            expect(segmentDomainName('hub.net')).toEqual(['hub']);
        });

        it('should handle unknown compound words', () => {
            const result = segmentDomainName('xyzabc.com');
            expect(result.length).toBeGreaterThan(0);
        });

        it('should remove TLD', () => {
            expect(segmentDomainName('test.com')).not.toContain('com');
            expect(segmentDomainName('example.io')).not.toContain('io');
        });
    });

    describe('guessNiche', () => {
        it('should identify E-commerce niche', () => {
            expect(guessNiche(['shop', 'online'])).toBe('E-commerce');
            expect(guessNiche(['best', 'store'])).toBe('E-commerce');
        });

        it('should identify Technology niche', () => {
            expect(guessNiche(['tech', 'hub'])).toBe('Technology');
            expect(guessNiche(['app', 'dev'])).toBe('Technology');
        });

        it('should identify Finance niche', () => {
            expect(guessNiche(['money', 'save'])).toBe('Finance');
            expect(guessNiche(['invest', 'fund'])).toBe('Finance');
        });

        it('should identify Health & Fitness niche', () => {
            expect(guessNiche(['fitness', 'tips'])).toBe('Health & Fitness');
            expect(guessNiche(['health', 'life'])).toBe('Health & Fitness');
        });

        it('should identify Real Estate niche', () => {
            expect(guessNiche(['homes', 'local'])).toBe('Real Estate');
            expect(guessNiche(['real', 'estate'])).toBe('Real Estate');
        });

        it('should return General for unknown niches', () => {
            expect(guessNiche(['xyz', 'abc'])).toBe('General');
        });
    });

    describe('generatePrimaryKeywords', () => {
        it('should generate 5 keywords', () => {
            const keywords = generatePrimaryKeywords(['fitness', 'tips'], 'Health & Fitness');
            expect(keywords).toHaveLength(5);
        });

        it('should include base phrase', () => {
            const keywords = generatePrimaryKeywords(['tech', 'zone'], 'Technology');
            expect(keywords[0]).toBe('tech zone');
        });

        it('should include common modifiers', () => {
            const keywords = generatePrimaryKeywords(['shop', 'online'], 'E-commerce');
            expect(keywords.some(k => k.includes('best'))).toBe(true);
        });
    });

    describe('generateQuestionKeywords', () => {
        it('should generate question-based keywords', () => {
            const questions = generateQuestionKeywords(['fitness', 'tips']);

            expect(questions.some(q => q.startsWith('what is'))).toBe(true);
            expect(questions.some(q => q.startsWith('how to'))).toBe(true);
            expect(questions.some(q => q.startsWith('why'))).toBe(true);
        });

        it('should include domain words in questions', () => {
            const questions = generateQuestionKeywords(['cooking', 'recipes']);
            expect(questions[0]).toContain('cooking recipes');
        });
    });

    describe('generateSuggestedTopics', () => {
        it('should generate 5 topics', () => {
            const topics = generateSuggestedTopics(['tech', 'hub'], 'Technology');
            expect(topics).toHaveLength(5);
        });

        it('should capitalize title properly', () => {
            const topics = generateSuggestedTopics(['fitness', 'tips'], 'Health & Fitness');
            expect(topics[0]).toMatch(/^Complete Guide to/);
        });
    });

    describe('generateDomainProfile', () => {
        it('should generate complete profile for access-commerce.com', () => {
            const profile = generateDomainProfile('access-commerce.com');

            expect(profile.domain).toBe('access-commerce.com');
            expect(profile.words).toContain('access');
            expect(profile.words).toContain('commerce');
            expect(profile.niche).toBe('E-commerce');
            expect(profile.primaryKeywords.length).toBeGreaterThan(0);
            expect(profile.questionKeywords.length).toBeGreaterThan(0);
            expect(profile.suggestedTopics.length).toBeGreaterThan(0);
        });

        it('should generate profile for fitness-tips.com', () => {
            const profile = generateDomainProfile('fitness-tips.com');

            expect(profile.words).toEqual(['fitness', 'tips']);
            expect(profile.niche).toBe('Health & Fitness');
        });

        it('should generate profile for tech domain', () => {
            const profile = generateDomainProfile('techzone.io');

            expect(profile.niche).toBe('Technology');
        });

        it('should generate profile for compound domain', () => {
            const profile = generateDomainProfile('homeinvest.com');

            expect(profile.words).toContain('home');
            expect(profile.words).toContain('invest');
        });
    });
});
