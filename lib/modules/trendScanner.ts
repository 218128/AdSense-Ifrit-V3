import googleTrends from 'google-trends-api';
import type { TrendingSearch } from 'google-trends-api';
import { scoreTrend, TrendScore, DEFAULT_WEIGHTS, ScoringWeights } from './trendScoring';
import { analyzeCPC, getHighCPCNiches } from './cpcIntelligence';

export interface Trend {
    topic: string;
    context: string;
    category: string;
    score?: TrendScore;
}

export interface EnhancedTrend extends Trend {
    score: TrendScore;
    isHighCPC: boolean;
    cpcPotential: string;
}

export interface ScanResult {
    trends: Trend[];
    enhancedTrends?: EnhancedTrend[];
    source: 'google_trends' | 'fallback' | 'high_cpc_mode' | 'csv_import';
    error?: string;
    needsCaptcha?: boolean;
    stats?: {
        totalScanned: number;
        highCPCCount: number;
        averageScore: number;
    };
}

export interface ScanOptions {
    geo?: string;
    highCPCMode?: boolean;
    minScore?: number;
    weights?: ScoringWeights;
    maxResults?: number;
}

const DEFAULT_SCAN_OPTIONS: ScanOptions = {
    geo: 'US',
    highCPCMode: false,
    minScore: 50,
    weights: DEFAULT_WEIGHTS,
    maxResults: 5
};

/**
 * TrendScanner - Multi-source trend discovery
 * 
 * Data sources (in priority order):
 * 1. Google Trends API (scraping) - automatic, may be blocked
 * 2. CSV Import - manual upload from trends.google.com
 * 3. High-CPC evergreen keywords - always available fallback
 */
export class TrendScanner {
    private csvTrends: Trend[] = [];

    /**
     * Import trends from Google Trends CSV export
     * User can download CSV from trends.google.com and import here
     * 
     * Expected CSV format from Google Trends:
     * - Column headers in row 1-2 (skip these)
     * - Data rows: topic, [traffic], [related queries]
     */
    importFromCSV(csvContent: string): Trend[] {
        const lines = csvContent.trim().split('\n');
        const trends: Trend[] = [];

        // Skip header rows (usually first 2-3 lines from Google Trends export)
        const dataLines = lines.filter(line => {
            // Skip empty lines
            if (!line.trim()) return false;
            // Skip lines that look like headers (contain "Week" or "Date" or "Category")
            if (/^(Week|Date|Category|Top|Rising)/i.test(line)) return false;
            // Skip lines that are clearly metadata
            if (line.includes('Google Trends')) return false;
            return true;
        });

        for (const line of dataLines) {
            // Parse CSV (handle quoted values)
            const parts = this.parseCSVLine(line);
            if (parts.length >= 1 && parts[0].trim()) {
                const topic = parts[0].trim();
                const traffic = parts[1] || '';

                trends.push({
                    topic,
                    context: traffic ? `Trending with ${traffic} searches` : 'Imported from Google Trends CSV',
                    category: 'Imported'
                });
            }
        }

        this.csvTrends = trends;
        console.log(`📥 Imported ${trends.length} trends from CSV`);

        return trends;
    }

    /**
     * Parse a single CSV line handling quoted values
     */
    private parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());

        return result;
    }

    /**
     * Check if we have CSV trends available
     */
    hasCSVTrends(): boolean {
        return this.csvTrends.length > 0;
    }

    /**
     * Get imported CSV trends
     */
    getCSVTrends(): Trend[] {
        return [...this.csvTrends];
    }

    /**
     * Clear imported CSV trends
     */
    clearCSVTrends(): void {
        this.csvTrends = [];
    }

    /**
     * Scan for trending topics with CPC scoring
     */
    async scan(options: ScanOptions = {}): Promise<ScanResult> {
        const opts = { ...DEFAULT_SCAN_OPTIONS, ...options };
        console.log(`🔍 Scanning for trends (High CPC Mode: ${opts.highCPCMode ? 'ON' : 'OFF'})...`);

        try {
            // Fetch daily trends
            const results = await googleTrends.dailyTrends({
                geo: opts.geo || 'US',
            });

            const parsedResults = JSON.parse(results);
            const days = parsedResults.default.trendingSearchesDays;

            if (!days || days.length === 0) {
                throw new Error("No trend data found in response");
            }

            // Get trends and score them
            const topTrends = days[0].trendingSearches.slice(0, 10); // Get more for filtering

            const trends: Trend[] = topTrends.map((t: TrendingSearch) => ({
                topic: t.title.query,
                context: this.buildContext(t),
                category: 'General'
            }));

            // Score all trends
            const enhancedTrends = this.enhanceTrends(trends);

            // Filter and sort by score
            let finalTrends = enhancedTrends;
            if (opts.highCPCMode) {
                finalTrends = enhancedTrends
                    .filter(t => t.score.cpcPotential >= (opts.minScore || 50))
                    .sort((a, b) => b.score.overallScore - a.score.overallScore);
            }

            // Limit results
            finalTrends = finalTrends.slice(0, opts.maxResults || 5);

            // If high CPC mode and not enough high-CPC trends, supplement with fallbacks
            if (opts.highCPCMode && finalTrends.length < 3) {
                console.log('⚡ Not enough high-CPC trends found, supplementing with evergreen topics...');
                const fallbacks = this.getHighCPCFallbackTrends();
                const fallbackEnhanced = this.enhanceTrends(fallbacks);
                finalTrends = [...finalTrends, ...fallbackEnhanced].slice(0, opts.maxResults || 5);
            }

            const stats = this.calculateStats(enhancedTrends);
            console.log(`✅ Found ${finalTrends.length} trends (${stats.highCPCCount} high-CPC). Avg score: ${stats.averageScore}`);

            return {
                trends: finalTrends,
                enhancedTrends: finalTrends,
                source: opts.highCPCMode ? 'high_cpc_mode' : 'google_trends',
                stats
            };

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn(`⚠️  Failed to fetch Google Trends: ${errorMessage}`);

            // Check if error looks like captcha/rate limit
            const needsCaptcha = errorMessage.includes('429') ||
                errorMessage.includes('captcha') ||
                errorMessage.includes('Too Many Requests') ||
                errorMessage.includes('blocked');

            if (needsCaptcha) {
                console.warn(`🔒 Google may be blocking requests. Consider using CSV import.`);
            }

            // Try CSV trends first if available
            if (this.csvTrends.length > 0) {
                console.log(`📥 Using ${this.csvTrends.length} imported CSV trends...`);
                const enhancedTrends = this.enhanceTrends(this.csvTrends);
                const stats = this.calculateStats(enhancedTrends);

                return {
                    trends: enhancedTrends.slice(0, opts.maxResults || 5),
                    enhancedTrends: enhancedTrends.slice(0, opts.maxResults || 5),
                    source: 'csv_import',
                    stats,
                    needsCaptcha
                };
            }

            // Fall back to high-CPC evergreen keywords
            console.warn(`⚠️  Using high-CPC fallback trends...`);
            const fallbackTrends = opts.highCPCMode
                ? this.getHighCPCFallbackTrends()
                : this.getDynamicFallbackTrends();

            const enhancedTrends = this.enhanceTrends(fallbackTrends);
            const stats = this.calculateStats(enhancedTrends);

            return {
                trends: enhancedTrends.slice(0, opts.maxResults || 5),
                enhancedTrends: enhancedTrends.slice(0, opts.maxResults || 5),
                source: 'fallback',
                error: errorMessage,
                needsCaptcha,
                stats
            };
        }
    }

    /**
     * Scan specifically for high-CPC opportunities
     */
    async scanHighCPC(): Promise<ScanResult> {
        return this.scan({ highCPCMode: true, minScore: 60 });
    }

    /**
     * Enhance trends with CPC scoring
     */
    private enhanceTrends(trends: Trend[]): EnhancedTrend[] {
        return trends.map(trend => {
            const score = scoreTrend(trend.topic);
            const cpcAnalysis = analyzeCPC(trend.topic);

            return {
                ...trend,
                score,
                isHighCPC: score.cpcPotential >= 60,
                cpcPotential: cpcAnalysis.classifications[0]?.estimatedCPC || '$1-5'
            };
        });
    }

    /**
     * Calculate statistics for a set of trends
     */
    private calculateStats(trends: EnhancedTrend[]): { totalScanned: number; highCPCCount: number; averageScore: number } {
        const highCPCCount = trends.filter(t => t.isHighCPC).length;
        const averageScore = trends.length > 0
            ? Math.round(trends.reduce((sum, t) => sum + t.score.overallScore, 0) / trends.length)
            : 0;

        return {
            totalScanned: trends.length,
            highCPCCount,
            averageScore
        };
    }

    /**
     * Build a rich context string from trend data
     */
    private buildContext(trend: TrendingSearch): string {
        const related = trend.relatedQueries
            .slice(0, 3)
            .map(rq => rq.query)
            .join(', ');

        return `Trending with ${trend.formattedTraffic} searches. Related queries: ${related || 'N/A'}.`;
    }

    /**
     * High-CPC evergreen fallback trends
     */
    private getHighCPCFallbackTrends(): Trend[] {
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;

        return [
            {
                topic: `Best VPN Services ${currentYear} Review`,
                context: `High-CPC cybersecurity keyword with strong commercial intent.`,
                category: "Cybersecurity"
            },
            {
                topic: `Top 10 High Yield Savings Accounts ${nextYear}`,
                context: `Very high CPC finance keyword. Users comparing rates.`,
                category: "Finance"
            },
            {
                topic: `Best Business Insurance for Small Business`,
                context: `Insurance keywords have highest CPC ($30-80).`,
                category: "Insurance"
            },
            {
                topic: `Best CRM Software Comparison ${currentYear}`,
                context: `B2B SaaS comparison with high commercial intent.`,
                category: "Business Software"
            },
            {
                topic: `Personal Injury Lawyer Cost Guide`,
                context: `Legal services keywords with very high CPC ($30-60).`,
                category: "Legal"
            },
            {
                topic: `Best Web Hosting for WordPress ${currentYear}`,
                context: `Hosting keywords with strong affiliate + AdSense potential.`,
                category: "Web Hosting"
            },
            {
                topic: `Cryptocurrency Investment Guide ${currentYear}`,
                context: `Crypto/investing with high CPC ($20-45).`,
                category: "Investing"
            }
        ];
    }

    /**
     * Standard evergreen fallback trends
     */
    private getDynamicFallbackTrends(): Trend[] {
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;

        return [
            {
                topic: `Best AI Tools for Business ${currentYear}`,
                context: `Evergreen topic with high search volume and CPC. Users seeking productivity tools.`,
                category: "Technology"
            },
            {
                topic: `High Yield Savings Accounts ${nextYear}`,
                context: `Finance topic with excellent CPC. Interest rate changes drive searches.`,
                category: "Finance"
            },
            {
                topic: `Remote Work Software Reviews`,
                context: `Post-pandemic evergreen topic. High intent commercial searches.`,
                category: "Technology"
            },
            {
                topic: `Personal Finance Apps Comparison`,
                context: `High-value comparison keyword. Users ready to make decisions.`,
                category: "Finance"
            },
            {
                topic: `Cybersecurity Best Practices ${currentYear}`,
                context: `Always relevant tech topic with enterprise CPC rates.`,
                category: "Technology"
            }
        ];
    }

    /**
     * Get high-CPC niche suggestions for content planning
     */
    getHighCPCNicheSuggestions() {
        return getHighCPCNiches();
    }
}
