/**
 * Domains Module Index
 */

// Centralized Types (new)
export * from './types';

// Centralized API Functions (new)
export * from './api';

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
// NOTE: expiredDomains.ts deleted - awaiting proper API/MCP integration

// Domain Domination - Keyword Affinity Matcher
export {
    calculateDomainAffinity,
    matchKeywordsToDomains,
    getTopAffinityDomains,
    detectNicheFromKeywords,
    type AffinityScore,
    type AffinityResult,
} from './keywordAffinityMatcher';

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
