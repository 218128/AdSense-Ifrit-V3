/**
 * Shared Template Components
 * 
 * These components are used across all template types:
 * - Niche Authority Blog
 * - Topical Magazine
 * - Expert Hub
 */

// Component generators
export { generateHeader, type HeaderConfig } from './header';
export { generateFooter, type FooterConfig } from './footer';
export { generateArticleCard, generateArticleCardStyles, type ArticleCardConfig } from './articleCard';
export { generateAuthorCard, generateAuthorCardStyles, type AuthorCardConfig } from './authorCard';
export { generateSocialShare, generateSocialShareStyles, type SocialShareConfig } from './socialShare';

/**
 * Generate all shared styles combined
 */
export function generateSharedStyles(): string {
    const { generateArticleCardStyles } = require('./articleCard');
    const { generateAuthorCardStyles } = require('./authorCard');
    const { generateSocialShareStyles } = require('./socialShare');

    return `
/* ================================
   SHARED COMPONENT STYLES
   ================================ */

${generateArticleCardStyles()}

${generateAuthorCardStyles()}

${generateSocialShareStyles()}
`;
}
