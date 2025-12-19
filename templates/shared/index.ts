/**
 * Shared Template Components
 * 
 * Reusable component generators for all templates.
 */

// Theme Seed System
export * from './themeSeed';

// Layout Components
export { generateHeader } from './components/header';
export { generateFooter } from './components/footer';

// Article Components
export { generateArticleCard } from './components/articleCard';
export { generateTableOfContents } from './components/tableOfContents';
export { generateReadingProgress } from './components/readingProgress';
export { generateRelatedArticles } from './components/relatedArticles';
export { generateSocialShare } from './components/socialShare';

// Trust/SEO Components
export { generateAuthorCard } from './components/authorCard';
export { generateAuthorCredentials } from './components/authorCredentials';
export { generateTrustBadges } from './components/trustBadges';
export { generateDateBadges } from './components/dateBadges';
export { generateSEOMetadata } from './components/seoHead';

// Monetization
export { generateAdZone } from './components/adZone';
export { generateNewsletter } from './components/newsletter';

// Schema (Structured Data)
export * from './schema';

// SEO Files (ads.txt, robots.txt, sitemap, manifest)
export {
    generateAdsTxt,
    generateRobotsTxt,
    generateSitemapXml,
    generateManifest
} from './components/seoFiles';

// Site Graphics (logos, favicons, OG images)
export {
    generateSiteGraphics,
    generateGraphicsFiles,
    generateTextLogo,
    generateIconLogo,
    generateOgImage,
    generateArticleOgImage,
    svgToDataUrl,
    svgToBase64
} from './graphics';

// Article Templates
export * from './articleTemplates';
