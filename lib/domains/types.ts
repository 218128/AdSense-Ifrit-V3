/**
 * Domain Types
 * 
 * Centralized type definitions for domain-related features.
 * Used across components, hooks, and API routes.
 */

// ============ DOMAIN ITEM ============

export type DomainSource = 'manual' | 'free' | 'premium' | 'spamzilla';
export type DomainStatus = 'unknown' | 'available' | 'pending' | 'auction';
export type QualityTier = 'gold' | 'silver' | 'bronze' | 'avoid';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type Recommendation = 'strong-buy' | 'buy' | 'consider' | 'avoid';

export interface DomainScore {
    overall: number;
    recommendation: Recommendation;
    riskLevel: RiskLevel;
    estimatedValue: number;
}

export interface DomainMetrics {
    domainRating?: number;
    trustFlow?: number;
    citationFlow?: number;
    tfCfRatio?: number;
    backlinks?: number;
    referringDomains?: number;
    domainAge?: number;
    spamScore?: number;
    szScore?: number;
    szDrops?: number;
    szActiveHistory?: number;
}

export interface DomainItem extends DomainMetrics {
    domain: string;
    tld: string;
    source: DomainSource;
    status: DomainStatus;
    qualityTier?: QualityTier;
    adsenseReady?: boolean;
    price?: string;
    auctionSource?: string;
    dropDate?: string;
    enriched?: boolean;
    enrichedAt?: number;
    score?: DomainScore;
    fetchedAt: number;
}

// ============ WATCHLIST ============

export interface WatchlistDomain extends DomainItem {
    addedAt: number;
    notes?: string;
}

// ============ ANALYSIS ============

export interface AnalyzeCandidate {
    domain: string;
    tld: string;
    score: number;
    recommendation: string;
    estimatedValue?: number;
    spamzillaData?: {
        wasAdult?: boolean;
        wasCasino?: boolean;
        wasPBN?: boolean;
        hadSpam?: boolean;
        domainAge?: number;
    };
}

export interface AnalysisResult {
    success: boolean;
    domain: string;
    score: {
        overall: number;
        authority: number;
        trustworthiness: number;
        relevance: number;
        emailPotential: number;
        flipPotential: number;
        nameQuality: number;
        riskLevel: RiskLevel;
        recommendation: Recommendation;
        reasons: string[];
        risks: Array<{
            type: string;
            severity: string;
            description: string;
        }>;
        estimatedValue: number;
        estimatedMonthlyRevenue: number;
    };
    wayback: {
        hasHistory: boolean;
        firstCaptureDate?: string;
        lastCaptureDate?: string;
        totalCaptures?: number;
        wasAdult?: boolean;
        wasCasino?: boolean;
        hadSpam?: boolean;
        wasPBN?: boolean;
    } | null;
    spam: {
        isSpammy: boolean;
        spamScore: number;
        issues: Array<{ type: string; severity: string; description: string }>;
    };
    trust: {
        trustworthy: boolean;
        score: number;
        positives: string[];
        negatives: string[];
    };
    error?: string;
}

// ============ PROFILE ============

export interface DomainProfile {
    domain: string;
    niche: string;
    primaryKeywords: string[];
    secondaryKeywords: string[];
    questionKeywords: string[];
    suggestedTopics: string[];
    researchedAt?: number;
    notes?: string;
}

// ============ ACTION REQUIRED ============

export interface ActionRequired {
    type: 'captcha' | 'rate_limit' | 'blocked' | 'network';
    message: string;
    action: string;
    url?: string;
}

// ============ API RESPONSES ============

export interface ParseResult {
    success: boolean;
    domains: Array<{ domain: string; tld: string }>;
    count?: number;
    error?: string;
}

export interface FreeSearchResponse {
    success: boolean;
    domains: DomainItem[];
    source: string;
    error?: string;
    actionRequired?: ActionRequired;
}

export interface ProfileGenerateResponse {
    success: boolean;
    profile?: DomainProfile;
    error?: string;
    rawResponse?: unknown;
}
