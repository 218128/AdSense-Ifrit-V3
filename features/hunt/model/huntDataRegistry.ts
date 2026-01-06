/**
 * Hunt Data Registry
 * FSD: features/hunt/model/huntDataRegistry.ts
 * 
 * Unified registry that links Hunt data with WP Sites and Campaigns.
 * Enables:
 * - New sites via CreateSiteButton → full Hunt data passed immediately
 * - Existing owned domains → Hunt data linked retroactively
 * - Profile data → merged into campaign context
 * 
 * All data sources remain separate but fully aware of each other.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OwnedDomain, SelectedKeyword, SelectedTrend } from './huntStore';
import type { DomainProfile } from '@/lib/domains/types';
import type { HuntCampaignContext, EnrichedKeyword } from '@/features/campaigns/model/campaignContext';

// ============================================================================
// Types
// ============================================================================

/**
 * Link between a domain and its associated data sources
 */
export interface DomainDataLink {
    /** Domain name (unique key) */
    domain: string;

    /** Associated WP Site ID (if site created) */
    wpSiteId?: string;

    /** Associated Campaign IDs */
    campaignIds: string[];

    /** Hunt data source */
    huntData?: {
        /** From Hunt keyword analysis */
        keywords: EnrichedKeyword[];
        /** From Hunt trend analysis */
        trends?: SelectedTrend[];
        /** Identified niche */
        niche?: string;
        /** When Hunt data was captured */
        capturedAt: number;
    };

    /** Domain profile (from profile generation) */
    profileData?: {
        profile: DomainProfile;
        generatedAt: number;
    };

    /** When this link was created */
    createdAt: number;
    /** When this link was last updated */
    updatedAt: number;
}

/**
 * Article tracking for BI
 */
export interface KeywordArticleTrack {
    keyword: string;
    domain: string;
    campaignId: string;
    wpPostId?: number;
    wpPostUrl?: string;
    publishedAt?: number;
    performance?: {
        views?: number;
        ctr?: number;
        position?: number;
    };
}

// ============================================================================
// Store Interface
// ============================================================================

interface HuntDataRegistry {
    /** Domain data links */
    links: Record<string, DomainDataLink>;

    /** Keyword to article tracking */
    keywordArticles: KeywordArticleTrack[];

    // === Link Management ===

    /** Create or update a domain link */
    upsertLink: (domain: string, update: Partial<Omit<DomainDataLink, 'domain' | 'createdAt'>>) => void;

    /** Get link for a domain */
    getLink: (domain: string) => DomainDataLink | undefined;

    /** Link WP Site to domain */
    linkWPSite: (domain: string, wpSiteId: string) => void;

    /** Link Campaign to domain */
    linkCampaign: (domain: string, campaignId: string) => void;

    /** Get link by WP Site ID */
    getLinkByWPSite: (wpSiteId: string) => DomainDataLink | undefined;

    // === Hunt Data ===

    /** Store Hunt data for a domain */
    setHuntData: (domain: string, huntData: DomainDataLink['huntData']) => void;

    /** Store profile data for a domain */
    setProfileData: (domain: string, profile: DomainProfile) => void;

    // === Campaign Context Builder ===

    /** Build HuntCampaignContext from all linked data */
    buildCampaignContext: (domain: string) => HuntCampaignContext | undefined;

    /** Build context from WP Site ID */
    buildCampaignContextForSite: (wpSiteId: string) => HuntCampaignContext | undefined;

    // === Keyword Article Tracking ===

    /** Record article published for keyword */
    recordArticlePublished: (track: Omit<KeywordArticleTrack, 'publishedAt'>) => void;

    /** Update article performance */
    updateArticlePerformance: (keyword: string, campaignId: string, performance: KeywordArticleTrack['performance']) => void;

    /** Get articles for a keyword */
    getArticlesForKeyword: (keyword: string) => KeywordArticleTrack[];

    /** Get all keywords that have been published to articles */
    getPublishedKeywords: (domain?: string) => string[];
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useHuntDataRegistry = create<HuntDataRegistry>()(
    persist(
        (set, get) => ({
            links: {},
            keywordArticles: [],

            // === Link Management ===

            upsertLink: (domain, update) => set((state) => {
                const existing = state.links[domain];
                const now = Date.now();

                return {
                    links: {
                        ...state.links,
                        [domain]: {
                            domain,
                            campaignIds: [],
                            createdAt: existing?.createdAt || now,
                            ...existing,
                            ...update,
                            updatedAt: now,
                        },
                    },
                };
            }),

            getLink: (domain) => get().links[domain],

            linkWPSite: (domain, wpSiteId) => {
                get().upsertLink(domain, { wpSiteId });
            },

            linkCampaign: (domain, campaignId) => {
                const existing = get().links[domain];
                const campaignIds = existing?.campaignIds || [];
                if (!campaignIds.includes(campaignId)) {
                    get().upsertLink(domain, { campaignIds: [...campaignIds, campaignId] });
                }
            },

            getLinkByWPSite: (wpSiteId) => {
                const links = get().links;
                return Object.values(links).find(l => l.wpSiteId === wpSiteId);
            },

            // === Hunt Data ===

            setHuntData: (domain, huntData) => {
                get().upsertLink(domain, { huntData });
            },

            setProfileData: (domain, profile) => {
                get().upsertLink(domain, {
                    profileData: {
                        profile,
                        generatedAt: Date.now(),
                    },
                });
            },

            // === Campaign Context Builder ===

            buildCampaignContext: (domain) => {
                const link = get().links[domain];
                if (!link) return undefined;

                // Start with empty context
                const context: HuntCampaignContext = {
                    keywords: [],
                    niche: { name: 'General' },
                };

                // Layer Hunt data
                if (link.huntData) {
                    context.keywords = link.huntData.keywords;
                    context.trends = link.huntData.trends?.map(t => ({
                        topic: t.topic,
                        source: t.source,
                        niche: t.niche,
                        cpcScore: t.cpcScore,
                    }));
                    if (link.huntData.niche) {
                        context.niche = { name: link.huntData.niche };
                    }
                }

                // Layer Profile data
                if (link.profileData?.profile) {
                    const profile = link.profileData.profile;
                    context.domainProfile = {
                        domain,
                        pillars: profile.suggestedTopics || [],
                        targetAudience: profile.targetAudience,
                        existingTopics: profile.suggestedTopics,
                    };
                    // Enhance niche from profile
                    if (profile.niche && !link.huntData?.niche) {
                        context.niche = {
                            name: profile.niche,
                            pillars: profile.suggestedTopics,
                        };
                    } else if (profile.suggestedTopics) {
                        context.niche.pillars = profile.suggestedTopics;
                    }
                }

                return context;
            },

            buildCampaignContextForSite: (wpSiteId) => {
                const link = get().getLinkByWPSite(wpSiteId);
                if (!link) return undefined;
                return get().buildCampaignContext(link.domain);
            },

            // === Keyword Article Tracking ===

            recordArticlePublished: (track) => set((state) => ({
                keywordArticles: [
                    ...state.keywordArticles.filter(
                        ka => !(ka.keyword === track.keyword && ka.campaignId === track.campaignId)
                    ),
                    { ...track, publishedAt: Date.now() },
                ],
            })),

            updateArticlePerformance: (keyword, campaignId, performance) => set((state) => ({
                keywordArticles: state.keywordArticles.map(ka =>
                    ka.keyword === keyword && ka.campaignId === campaignId
                        ? { ...ka, performance: { ...ka.performance, ...performance } }
                        : ka
                ),
            })),

            getArticlesForKeyword: (keyword) => {
                return get().keywordArticles.filter(ka => ka.keyword === keyword);
            },

            getPublishedKeywords: (domain) => {
                const articles = get().keywordArticles;
                if (!domain) return [...new Set(articles.map(a => a.keyword))];
                return [...new Set(
                    articles.filter(a => a.domain === domain).map(a => a.keyword)
                )];
            },
        }),
        {
            name: 'ifrit_hunt_data_registry',
            partialize: (state) => ({
                links: state.links,
                keywordArticles: state.keywordArticles,
            }),
        }
    )
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Capture Hunt data for a domain when creating site
 */
export function captureHuntDataForDomain(
    domain: string,
    keywords: EnrichedKeyword[],
    trends?: SelectedTrend[],
    niche?: string
): void {
    useHuntDataRegistry.getState().setHuntData(domain, {
        keywords,
        trends,
        niche,
        capturedAt: Date.now(),
    });
}

/**
 * Link existing owned domain to Hunt registry
 */
export function linkOwnedDomainToRegistry(
    ownedDomain: OwnedDomain,
    selectedKeywords?: SelectedKeyword[]
): void {
    const registry = useHuntDataRegistry.getState();

    // Build enriched keywords from owned domain + selected keywords
    const keywords: EnrichedKeyword[] = [
        // From owned domain's associated keywords
        ...(ownedDomain.associatedKeywords || []).map(kw => ({
            keyword: kw,
            niche: ownedDomain.profile?.niche,
        })),
        // From selected keywords
        ...(selectedKeywords || []).map(sk => ({
            keyword: sk.keyword,
            niche: sk.niche,
            cpc: sk.cpc,
            research: sk.researchFindings,
        })),
    ];

    // Set hunt data
    registry.setHuntData(ownedDomain.domain, {
        keywords,
        niche: ownedDomain.profile?.niche,
        capturedAt: Date.now(),
    });

    // Set profile data if available
    if (ownedDomain.profile) {
        registry.setProfileData(ownedDomain.domain, ownedDomain.profile);
    }
}

/**
 * Get campaign context for any domain (new or existing)
 */
export function getHuntContextForDomain(domain: string): HuntCampaignContext | undefined {
    return useHuntDataRegistry.getState().buildCampaignContext(domain);
}

/**
 * Get campaign context for a WP Site
 */
export function getHuntContextForSite(wpSiteId: string): HuntCampaignContext | undefined {
    return useHuntDataRegistry.getState().buildCampaignContextForSite(wpSiteId);
}
