/**
 * Audience Development Module
 * FSD: lib/growth/audienceDevelopment.ts
 *
 * Tracks audience growth metrics and engagement.
 * Helps optimize for owned audience over algorithmic reach.
 */

// ============================================================================
// Types
// ============================================================================

export interface AudienceMetrics {
    emailList: {
        totalSubscribers: number;
        newThisMonth: number;
        growthRate: number;      // % month-over-month
        openRate: number;        // % of emails opened
        clickRate: number;       // % of emails clicked
    };
    community: {
        discordMembers?: number;
        slackMembers?: number;
        telegramMembers?: number;
        totalActive: number;     // Active in last 7 days
    };
    social: {
        linkedinFollowers: number;
        twitterFollowers: number;
        youtubeSubscribers: number;
        totalFollowers: number;
    };
    directTraffic: {
        monthlyVisitors: number;
        returningRate: number;   // % returning visitors
        avgTimeOnSite: number;   // seconds
    };
}

export interface GrowthStrategy {
    ownedChannels: number;      // Score 0-100
    networkBuild: number;       // Score 0-100
    contentReuse: number;       // Score 0-100
    overallHealth: number;      // Score 0-100
    recommendations: string[];
}

export interface ViralMetrics {
    shareRate: number;          // % of readers who share
    referralTraffic: number;    // % of traffic from referrals
    viralCoefficient: number;   // K-factor: shares * conversion rate
    isViral: boolean;           // K > 1 means viral growth
}

// ============================================================================
// Storage
// ============================================================================

const AUDIENCE_KEY = 'ifrit_audience_metrics';
const GROWTH_HISTORY_KEY = 'ifrit_growth_history';

interface StoredAudienceData {
    metrics: AudienceMetrics;
    lastUpdated: string;
    history: { date: string; emailTotal: number; socialTotal: number }[];
}

function getStoredData(): StoredAudienceData | null {
    if (typeof window === 'undefined') return null;
    try {
        const saved = localStorage.getItem(AUDIENCE_KEY);
        return saved ? JSON.parse(saved) : null;
    } catch {
        return null;
    }
}

function saveData(data: StoredAudienceData): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(AUDIENCE_KEY, JSON.stringify(data));
    } catch {
        console.error('[Audience] Failed to save data');
    }
}

// ============================================================================
// Metrics Management
// ============================================================================

export function getAudienceMetrics(): AudienceMetrics | null {
    const stored = getStoredData();
    return stored?.metrics ?? null;
}

export function updateAudienceMetrics(updates: Partial<AudienceMetrics>): void {
    const stored = getStoredData();
    const current = stored?.metrics ?? getDefaultMetrics();

    // Merge updates
    const updated: AudienceMetrics = {
        emailList: { ...current.emailList, ...updates.emailList },
        community: { ...current.community, ...updates.community },
        social: { ...current.social, ...updates.social },
        directTraffic: { ...current.directTraffic, ...updates.directTraffic },
    };

    // Update totals
    updated.social.totalFollowers =
        updated.social.linkedinFollowers +
        updated.social.twitterFollowers +
        updated.social.youtubeSubscribers;

    updated.community.totalActive =
        (updated.community.discordMembers ?? 0) +
        (updated.community.slackMembers ?? 0) +
        (updated.community.telegramMembers ?? 0);

    // Add to history
    const history = stored?.history ?? [];
    history.push({
        date: new Date().toISOString().split('T')[0],
        emailTotal: updated.emailList.totalSubscribers,
        socialTotal: updated.social.totalFollowers,
    });

    // Keep last 90 days
    const trimmedHistory = history.slice(-90);

    saveData({
        metrics: updated,
        lastUpdated: new Date().toISOString(),
        history: trimmedHistory,
    });
}

function getDefaultMetrics(): AudienceMetrics {
    return {
        emailList: {
            totalSubscribers: 0,
            newThisMonth: 0,
            growthRate: 0,
            openRate: 0,
            clickRate: 0,
        },
        community: {
            totalActive: 0,
        },
        social: {
            linkedinFollowers: 0,
            twitterFollowers: 0,
            youtubeSubscribers: 0,
            totalFollowers: 0,
        },
        directTraffic: {
            monthlyVisitors: 0,
            returningRate: 0,
            avgTimeOnSite: 0,
        },
    };
}

// ============================================================================
// Growth Strategy Analysis
// ============================================================================

export function analyzeGrowthStrategy(metrics: AudienceMetrics): GrowthStrategy {
    const recommendations: string[] = [];

    // Score owned channels (email is 4x more valuable)
    const emailScore = Math.min(100,
        (metrics.emailList.totalSubscribers / 1000) * 10 +
        metrics.emailList.openRate * 100 +
        metrics.emailList.clickRate * 200
    );

    // Score social/network build
    const socialScore = Math.min(100,
        (metrics.social.totalFollowers / 10000) * 50 +
        (metrics.community.totalActive / 100) * 50
    );

    // Score content reuse (based on platform diversity)
    let contentReuseScore = 0;
    if (metrics.social.linkedinFollowers > 0) contentReuseScore += 25;
    if (metrics.social.twitterFollowers > 0) contentReuseScore += 25;
    if (metrics.social.youtubeSubscribers > 0) contentReuseScore += 30;
    if (metrics.community.totalActive > 0) contentReuseScore += 20;

    // Overall health
    const overallHealth = Math.round(
        emailScore * 0.4 +    // Email weighted highest
        socialScore * 0.3 +
        contentReuseScore * 0.3
    );

    // Generate recommendations
    if (metrics.emailList.totalSubscribers < 1000) {
        recommendations.push('Build email list to 1,000+ subscribers for stable revenue');
    }
    if (metrics.emailList.openRate < 0.2) {
        recommendations.push('Improve email open rate (currently below 20%)');
    }
    if (metrics.social.youtubeSubscribers === 0) {
        recommendations.push('Start YouTube channel for video monetization');
    }
    if (metrics.community.totalActive === 0) {
        recommendations.push('Build community (Discord/Slack) for direct engagement');
    }
    if (metrics.directTraffic.returningRate < 0.2) {
        recommendations.push('Increase returning visitors through content series');
    }

    return {
        ownedChannels: Math.round(emailScore),
        networkBuild: Math.round(socialScore),
        contentReuse: Math.round(contentReuseScore),
        overallHealth,
        recommendations: recommendations.slice(0, 4),
    };
}

// ============================================================================
// Viral Coefficient
// ============================================================================

export function calculateViralMetrics(
    shareClicks: number,
    totalReaders: number,
    referralVisitors: number,
    totalVisitors: number,
    newReaderConversion: number, // % of referred visitors who become readers
): ViralMetrics {
    const shareRate = totalReaders > 0 ? shareClicks / totalReaders : 0;
    const referralTraffic = totalVisitors > 0 ? referralVisitors / totalVisitors : 0;

    // K-factor: (shares per reader) * (conversion rate of those shares)
    const viralCoefficient = shareRate * newReaderConversion;

    return {
        shareRate,
        referralTraffic,
        viralCoefficient,
        isViral: viralCoefficient > 1,
    };
}

// ============================================================================
// Summary Dashboard Data
// ============================================================================

export function getAudienceSummary(): {
    totalReach: number;
    ownedAudience: number;
    rentedAudience: number;
    ownedPercentage: number;
    monthlyGrowth: number;
} {
    const metrics = getAudienceMetrics();
    if (!metrics) {
        return {
            totalReach: 0,
            ownedAudience: 0,
            rentedAudience: 0,
            ownedPercentage: 0,
            monthlyGrowth: 0,
        };
    }

    // Owned = email + community (direct contact)
    const ownedAudience =
        metrics.emailList.totalSubscribers +
        metrics.community.totalActive;

    // Rented = social followers (platform-dependent)
    const rentedAudience = metrics.social.totalFollowers;

    const totalReach = ownedAudience + rentedAudience;
    const ownedPercentage = totalReach > 0 ? (ownedAudience / totalReach) * 100 : 0;

    // Calculate growth from email (most reliable metric)
    const monthlyGrowth = metrics.emailList.growthRate;

    return {
        totalReach,
        ownedAudience,
        rentedAudience,
        ownedPercentage: Math.round(ownedPercentage),
        monthlyGrowth,
    };
}
