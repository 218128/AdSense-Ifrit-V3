/**
 * Ifrit Template System
 * 
 * Unified template exports for website generation.
 * Each template folder is self-contained with its own generator.
 */

// Main Template Generators
export { generateTemplateFiles as generateNicheAuthorityBlog } from './niche-authority-blog/generator';
export { generateTemplateFiles as generateTopicalMagazine } from './topical-magazine/generator';
export { generateTemplateFiles as generateExpertHub } from './expert-hub/generator';

// Shared Components
export * from './shared';

// Re-export types
export type { SiteConfig } from './niche-authority-blog/generator';
