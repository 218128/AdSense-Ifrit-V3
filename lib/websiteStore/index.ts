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

// Note: Main store functions are still in parent websiteStore.ts
// They will be split into separate modules in future phases
