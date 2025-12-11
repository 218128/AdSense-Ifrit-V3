import googleTrends from 'google-trends-api';

export interface Trend {
    topic: string;
    context: string;
    category: string;
}

export class TrendScanner {
    async scan(): Promise<Trend[]> {
        console.log("Scanning for latest trends...");

        try {
            // Fetch daily trends for US
            // Note: google-trends-api returns a JSON string, needs parsing
            const results = await googleTrends.dailyTrends({
                geo: 'US',
            });

            const parsedResults = JSON.parse(results);
            const days = parsedResults.default.trendingSearchesDays;

            if (!days || days.length === 0) {
                throw new Error("No trend data found");
            }

            // Get top 5 trends from the most recent day
            const topTrends = days[0].trendingSearches.slice(0, 5);

            const trends: Trend[] = topTrends.map((t: any) => ({
                topic: t.title.query,
                context: `Trending query with ${t.formattedTraffic} searches. Related: ${t.relatedQueries.map((rq: any) => rq.query).join(', ')}`,
                category: 'General'
            }));

            console.log(`Found ${trends.length} real trends.`);
            return trends;

        } catch (error) {
            console.error("Failed to fetch real trends, falling back to simulation:", error);
            // Fallback data
            return [
                {
                    topic: "AI-Powered Personal Finance Apps",
                    context: "Users are looking for AI tools that help manage budget and invest automatically.",
                    category: "Finance"
                },
                {
                    topic: "Quantum Computing for Beginners",
                    context: "Rising interest in understanding quantum computing basics as usage grows.",
                    category: "Tech"
                }
            ];
        }
    }
}
