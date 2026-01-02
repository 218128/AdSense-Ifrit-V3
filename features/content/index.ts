/**
 * Content Feature - Barrel Export
 * FSD: features/content/index.ts
 * 
 * Content manipulation utilities: spintax, search/replace, variations.
 */

// Spintax Engine
export {
    expandSpintax,
    hasSpintax,
    countVariations,
    generateAllVariations,
    createSpintax,
    extractSpinGroups,
    validateSpintax,
    autoSpin,
    COMMON_SYNONYMS,
    type SpintaxOptions,
    type SpintaxResult,
} from './lib/spintaxEngine';

// Search & Replace
export {
    applyRule,
    applyRules,
    applyRuleSetToContent,
    createAffiliateLinkRule,
    createWordRule,
    createHtmlCleanupRule,
    createUrlRule,
    simpleRule,
    bulkRules,
    CLEANUP_RULES,
    SEO_RULES,
    type ReplaceRule,
    type ReplaceResult,
    type RuleSet,
} from './lib/searchReplace';

// Content Variations
export {
    generateVariations,
    quickVariations,
    createABTestVariants,
    type ContentPiece,
    type VariationOptions,
    type VariationStrategy,
    type ContentVariation,
} from './lib/contentVariations';
