/**
 * Website Store Barrel Export
 * 
 * Re-exports all types and functions for clean imports.
 * Use: import { Website, saveWebsite } from '@/lib/websiteStore';
 */

// Export all types
export * from './types';

// Export all functions from the main store
// Note: Functions are still in the parent websiteStore.ts for now
// They will be split into separate modules in Phase 2
