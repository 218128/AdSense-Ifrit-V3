/**
 * SEO Module Index
 */

export type {
    InternalLink,
    TopicCluster,
    SEOAudit,
    SEOIssue
} from './trafficAcquisition';

export {
    auditArticleSEO,
    suggestInternalLinks,
    createTopicCluster,
    generateFeaturedSnippetContent,
    generateCanonicalUrl,
    suggestBacklinkOpportunities
} from './trafficAcquisition';
