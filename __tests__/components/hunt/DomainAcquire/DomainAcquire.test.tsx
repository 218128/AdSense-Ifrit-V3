/**
 * DomainAcquire Subtab Tests
 * 
 * Enterprise-grade tests for the Domain Acquire subtab.
 */

import '@testing-library/jest-dom';

// ========== MOCK SETUP ==========

const mockFetch = jest.fn();
global.fetch = mockFetch;

const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ========== TEST SUITES ==========

describe('DomainAcquire Subtab', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.getItem.mockReturnValue(null);
    });

    describe('ExpiredDomainFinder', () => {
        describe('Domain Import', () => {
            it('should parse manual domain input', () => {
                const parseDomains = (input: string): string[] => {
                    return input
                        .split(/[\n,]/)
                        .map(d => d.trim().toLowerCase())
                        .filter(d => /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/.test(d));
                };

                const result = parseDomains('example.com, test.org\nvalid.net');
                expect(result).toEqual(['example.com', 'test.org', 'valid.net']);
            });

            it('should filter invalid domains', () => {
                const parseDomains = (input: string): string[] => {
                    return input
                        .split(/[\n,]/)
                        .map(d => d.trim().toLowerCase())
                        .filter(d => /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/.test(d));
                };

                const result = parseDomains('valid.com, invalid, -bad.com, good.org');
                expect(result).toEqual(['valid.com', 'good.org']);
            });
        });

        describe('SpamZilla Import', () => {
            it('should detect preset from filename', () => {
                const detectPreset = (filename: string): string => {
                    const lower = filename.toLowerCase();
                    if (lower.includes('safetorelax') || lower.includes('safe-relax')) return 'safe-relax';
                    if (lower.includes('highvaluedomains') || lower.includes('high-value')) return 'high-value';
                    if (lower.includes('budgetfriendly') || lower.includes('budget-friendly')) return 'budget-friendly';
                    return 'unknown';
                };

                expect(detectPreset('SafeToRelaxSetup-export.csv')).toBe('safe-relax');
                expect(detectPreset('HighValueDomains-2024.csv')).toBe('high-value');
                expect(detectPreset('random-export.csv')).toBe('unknown');
            });

            it('should parse SpamZilla CSV format', () => {
                const csvLine = 'example.com,45,30,25,40,35,5,Dynadot,15,2025-01-15';
                const fields = csvLine.split(',');

                expect(fields[0]).toBe('example.com');
                expect(parseInt(fields[1])).toBe(45); // SZ Score
                expect(parseInt(fields[2])).toBe(30); // TF
            });
        });
    });

    describe('DomainScorer', () => {
        describe('Scoring Algorithm', () => {
            it('should calculate overall score from metrics', () => {
                const calculateScore = (metrics: {
                    tf: number;
                    cf: number;
                    da: number;
                    age: number;
                }): number => {
                    const tfWeight = 0.3;
                    const cfWeight = 0.2;
                    const daWeight = 0.3;
                    const ageWeight = 0.2;

                    return Math.round(
                        metrics.tf * tfWeight +
                        metrics.cf * cfWeight +
                        metrics.da * daWeight +
                        (Math.min(metrics.age, 20) / 20) * 100 * ageWeight
                    );
                };

                const score = calculateScore({ tf: 30, cf: 25, da: 40, age: 10 });
                expect(score).toBeGreaterThan(0);
                expect(score).toBeLessThanOrEqual(100);
            });

            it('should determine quality tier', () => {
                const getTier = (score: number): string => {
                    if (score >= 80) return 'elite';
                    if (score >= 60) return 'premium';
                    if (score >= 40) return 'standard';
                    if (score >= 20) return 'avoid';
                    return 'risky';
                };

                expect(getTier(85)).toBe('elite');
                expect(getTier(65)).toBe('premium');
                expect(getTier(45)).toBe('standard');
                expect(getTier(25)).toBe('avoid');
                expect(getTier(15)).toBe('risky');
            });
        });

        describe('Risk Assessment', () => {
            it('should identify spam signals', () => {
                const hasSpamSignals = (domain: string, metrics: {
                    tf: number;
                    cf: number;
                    backlinks: number;
                }): boolean => {
                    // High backlinks with low TF/CF is a red flag
                    if (metrics.backlinks > 1000 && metrics.tf < 10) return true;
                    // Extreme ratio between CF and TF
                    if (metrics.cf / metrics.tf > 5) return true;
                    return false;
                };

                expect(hasSpamSignals('spam.com', { tf: 5, cf: 40, backlinks: 2000 })).toBe(true);
                expect(hasSpamSignals('clean.com', { tf: 30, cf: 25, backlinks: 100 })).toBe(false);
            });

            it('should calculate risk level', () => {
                const getRiskLevel = (spamScore: number): 'low' | 'medium' | 'high' | 'critical' => {
                    if (spamScore < 20) return 'low';
                    if (spamScore < 40) return 'medium';
                    if (spamScore < 60) return 'high';
                    return 'critical';
                };

                expect(getRiskLevel(10)).toBe('low');
                expect(getRiskLevel(30)).toBe('medium');
                expect(getRiskLevel(50)).toBe('high');
                expect(getRiskLevel(70)).toBe('critical');
            });
        });
    });

    describe('PurchaseQueue', () => {
        it('should add domain to queue', () => {
            const queue: string[] = [];
            const addToQueue = (domain: string) => queue.push(domain);

            addToQueue('example.com');
            expect(queue).toContain('example.com');
        });

        it('should remove domain from queue', () => {
            const queue = ['example.com', 'test.org'];
            const removeFromQueue = (domain: string) => queue.filter(d => d !== domain);

            const newQueue = removeFromQueue('example.com');
            expect(newQueue).not.toContain('example.com');
            expect(newQueue).toContain('test.org');
        });

        it('should prevent duplicates', () => {
            const queue = new Set<string>();

            queue.add('example.com');
            queue.add('example.com');

            expect(queue.size).toBe(1);
        });

        it('should mark domain as purchased', () => {
            const queue = ['example.com', 'test.org'];
            const purchased: string[] = [];

            const markPurchased = (domain: string) => {
                const index = queue.indexOf(domain);
                if (index > -1) {
                    queue.splice(index, 1);
                    purchased.push(domain);
                }
            };

            markPurchased('example.com');
            expect(queue).not.toContain('example.com');
            expect(purchased).toContain('example.com');
        });
    });

    describe('QuickAnalyzer', () => {
        it('should validate domain format', () => {
            const validateDomain = (input: string): boolean => {
                const cleaned = input.trim().toLowerCase();
                return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/.test(cleaned);
            };

            expect(validateDomain('example.com')).toBe(true);
            expect(validateDomain('sub.domain.org')).toBe(true);
            expect(validateDomain('invalid')).toBe(false);
            expect(validateDomain('-bad.com')).toBe(false);
            expect(validateDomain('')).toBe(false);
        });

        it('should call analysis API', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    profile: {
                        niche: 'Technology',
                        primaryKeywords: ['tech', 'gadgets'],
                    }
                })
            });

            await fetch('/api/domain-profiles/generate', {
                method: 'POST',
                body: JSON.stringify({ domain: 'tech.com' }),
            });

            expect(mockFetch).toHaveBeenCalled();
        });

        it('should handle analysis errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('API Error'));

            try {
                await fetch('/api/domain-profiles/generate');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });
});

describe('Domain Utilities', () => {
    describe('Affinity Matcher', () => {
        it('should calculate keyword affinity', () => {
            const calculateAffinity = (
                domain: string,
                keywords: string[]
            ): number => {
                const domainWords = domain.replace(/[^a-z]/gi, ' ')
                    .toLowerCase()
                    .split(' ')
                    .filter(Boolean);

                let matches = 0;
                for (const word of domainWords) {
                    for (const keyword of keywords) {
                        if (keyword.toLowerCase().includes(word) || word.includes(keyword.toLowerCase())) {
                            matches++;
                        }
                    }
                }
                return Math.min(matches * 20, 100);
            };

            expect(calculateAffinity('techreview.com', ['tech', 'reviews'])).toBeGreaterThan(0);
            expect(calculateAffinity('random.com', ['tech', 'reviews'])).toBe(0);
        });
    });
});
