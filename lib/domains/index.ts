/**
 * Domains Module Index
 */

export type { DomainConfig, AdsenseConfig, DomainsState } from './domainConfig';

export {
    getDomains,
    getDomainById,
    getDefaultDomain,
    addDomain,
    updateDomain,
    deleteDomain,
    setDefaultDomain,
    getDomainsByNiche,
    getBestDomainForTopic,
    AVAILABLE_NICHES
} from './domainConfig';

// Domain Domination - Scorer
export {
    scoreDomain,
    parseDomain,
    quickQualityCheck,
    NICHE_KEYWORDS,
    type DomainMetrics,
    type DomainScore,
    type DomainRisk,
    type WaybackData,
    type AdditionalChecks,
} from './domainScorer';

// Domain Domination - Wayback
export {
    checkWaybackAvailability,
    getWaybackSnapshots,
    checkDomainHistory,
    quickHistoryCheck,
    analyzeContent,
    estimateAgeFromWayback,
    type WaybackSnapshot,
} from './waybacker';

// Domain Domination - Spam Checker
export {
    checkDomainSpam,
    quickSpamCheck,
    domainLooksTrustworthy,
    fetchSpamzillaData,
    type SpamCheckResult,
    type SpamIssue,
    type SpamCheck,
    type SpamzillaData,
} from './spamChecker';

// Domain Domination - Expired Domains
export {
    searchExpiredDomains,
    addToWatchlist,
    removeFromWatchlist,
    getWatchlist,
    checkAvailability,
    getPurchaseLinks,
    isExpiredDomainsConfigured,
    toMetrics,
    type ExpiredDomain,
    type SearchFilters,
    type SearchResult,
    type ExpiredDomainsConfig,
} from './expiredDomains';

// Domain Domination - Email Deliverability
export {
    EMAIL_PROVIDERS,
    generateEmailConfig,
    generateDMARC,
    estimateDeliverability,
    formatRecordForDisplay,
    generateDNSInstructions,
    combineSPFRecords,
    saveEmailConfig,
    getSavedConfigs,
    getEmailConfig,
    getProvider,
    getFreeProviders,
    type EmailDNSConfig,
    type DNSRecord,
    type EmailProvider,
    type EmailStatus,
} from './emailDeliverability';
