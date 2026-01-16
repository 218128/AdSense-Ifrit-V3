/**
 * @legacy Legacy Websites Module
 * 
 * DEPRECATION NOTICE: This module is for the legacy GitHub/Vercel website system.
 * For WordPress/Hostinger sites, use `features/wordpress/` instead.
 * 
 * Migration Guide:
 * - Use `useWPSitesStore` instead of custom website stores
 * - Use `features/wordpress/model/wpSiteTypes.ts` for WPSite types
 * - Use `features/wordpress/lib/adsenseChecker.ts` for AdSense readiness
 */

// Websites components barrel file
export { default as WebsitesView } from './WebsitesView';
export { default as WebsiteDetail } from './WebsiteDetail';
export { default as BuildingProgress } from './BuildingProgress';
// Legacy exports - removed dead code calling /api/generate
export { default as DNSConfigPanel } from './DNSConfigPanel';
export { default as SitePreview } from './SitePreview';
export { default as PublishPanel } from './PublishPanel';
export { default as AutoConfigureWizard } from './AutoConfigureWizard';
export { default as GenerationHistory } from './GenerationHistory';
export { default as GenerationLog } from './GenerationLog';
export { default as GenerationOptions } from './GenerationOptions';
export { default as ArticleActionsMenu } from './ArticleActionsMenu';

// Article Creation Components
export { default as PromptExporter } from './PromptExporter';
export { default as SmartDropZone } from './SmartDropZone';
// BulkArticleQueue removed - called dead /api/generate
export { default as ArticleEditor } from './ArticleEditor';
export { default as ImageGallery } from './ImageGallery';
export { default as ArticleVersionHistory } from './ArticleVersionHistory';
export { default as BatchOperationsPanel } from './BatchOperationsPanel';

// Domain setup components (moved from Hunt tab)
export { default as DomainSetup } from './DomainSetup';
export { default as EmailSetup } from './EmailSetup';

// Archived (legacy) components in ./_archive/:
// - FactoryDashboard.tsx
// - StoreDashboard.tsx
// - SiteBuilderDashboard.tsx
