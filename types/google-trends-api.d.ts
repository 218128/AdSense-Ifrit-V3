declare module 'google-trends-api' {
    export interface DailyTrendsOptions {
        geo?: string;
        trendDate?: Date;
        hl?: string;
        timezone?: number;
        category?: number;
    }

    export interface RelatedQuery {
        query: string;
        exploreLink: string;
    }

    export interface TrendImage {
        newsUrl: string;
        source: string;
        imageUrl: string;
    }

    export interface TrendArticle {
        title: string;
        timeAgo: string;
        source: string;
        url: string;
        snippet: string;
    }

    export interface TrendingSearch {
        title: {
            query: string;
            exploreLink: string;
        };
        formattedTraffic: string;
        relatedQueries: RelatedQuery[];
        image?: TrendImage;
        articles?: TrendArticle[];
    }

    export interface TrendingSearchDay {
        date: string;
        formattedDate: string;
        trendingSearches: TrendingSearch[];
    }

    export interface DailyTrendsResponse {
        default: {
            trendingSearchesDays: TrendingSearchDay[];
        };
    }

    export interface InterestOverTimeOptions {
        keyword: string | string[];
        startTime?: Date;
        endTime?: Date;
        geo?: string;
        hl?: string;
        timezone?: number;
        category?: number;
    }

    export interface RegionOptions {
        keyword: string | string[];
        startTime?: Date;
        endTime?: Date;
        geo?: string;
        resolution?: string;
        hl?: string;
        timezone?: number;
        category?: number;
    }

    export interface RelatedOptions {
        keyword: string | string[];
        startTime?: Date;
        endTime?: Date;
        geo?: string;
        hl?: string;
        timezone?: number;
        category?: number;
    }

    interface GoogleTrends {
        dailyTrends(options?: DailyTrendsOptions): Promise<string>;
        interestOverTime(options: InterestOverTimeOptions): Promise<string>;
        interestByRegion(options: RegionOptions): Promise<string>;
        relatedTopics(options: RelatedOptions): Promise<string>;
        relatedQueries(options: RelatedOptions): Promise<string>;
    }

    const googleTrends: GoogleTrends;
    export default googleTrends;
}
