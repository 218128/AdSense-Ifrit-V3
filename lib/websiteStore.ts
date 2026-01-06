/**
 * Legacy Websites System
 * 
 * ⚠️ DEPRECATED: This module is part of the Legacy Websites system.
 * 
 * DO NOT USE for new features. Use `features/wordpress` for WP Sites instead.
 * 
 * The Legacy Websites system was designed for GitHub-based static site
 * generation with Vercel deployment. It is no longer the recommended
 * approach but remains in the codebase for backward compatibility.
 * 
 * ## System Boundaries
 * 
 * ### Legacy Websites (THIS SYSTEM)
 * - Storage: `websites/` directory (file-based)
 * - Store: `lib/websiteStore/` and `lib/websiteStore.ts`
 * - API: `app/api/websites/`
 * - UI: `components/websites/`
 * - Features: GitHub repo creation, Vercel deployment, static generation
 * 
 * ### WP Sites (NEW SYSTEM)
 * - Storage: `localStorage` (moving to Supabase)
 * - Store: `features/wordpress/model/wpSiteStore.ts`
 * - Service: `features/wordpress/lib/wpSiteService.ts`
 * - API: `features/wordpress/api/wordpressApi.ts`
 * - UI: `features/wordpress/ui/`
 * - Features: Hostinger WordPress, REST API, AdSense optimization
 * 
 * ## Key Differences
 * 
 * | Aspect | Legacy Websites | WP Sites |
 * |--------|-----------------|----------|
 * | Hosting | Vercel (static) | Hostinger (WordPress) |
 * | Content | File-based MD | WordPress REST API |
 * | Deployment | GitHub + Vercel | Direct publish |
 * | Templates | Next.js themes | WordPress themes |
 * | Profiles | `websites/profiles/` | Hunt integration |
 * 
 * ## No Cross-Contamination
 * 
 * These systems are completely separate:
 * - Legacy NEVER imports from `features/wordpress`
 * - WP Sites NEVER imports from `lib/websiteStore`
 * - Each has its own API routes
 * - Each has its own UI components
 * 
 * @deprecated Use `features/wordpress` for new WordPress site management
 * @see features/wordpress/index.ts for the modern WP Sites system
 */

// Re-export from websiteStore for backward compatibility
export * from './websiteStore/index';

// Mark as deprecated in runtime
if (typeof console !== 'undefined') {
    console.warn(
        '[DEPRECATED] lib/websiteStore is part of the Legacy Websites system. ' +
        'For new features, use features/wordpress instead.'
    );
}
