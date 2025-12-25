/**
 * Website Store Barrel Export
 * 
 * Re-exports all types and functions for clean imports.
 * Use: import { Website, saveWebsite } from '@/lib/websiteStore';
 */

// Export all types
export * from './types';

// Export all path helpers
export * from './paths';

// Export all article CRUD functions
export * from './articleCrud';

// Note: Main store functions are still in parent websiteStore.ts
// Website CRUD, Pages, Theme, Plugins, Versions, Profiles in main file
