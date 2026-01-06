/**
 * Media Library - Barrel Export
 * FSD: lib/media/index.ts
 */

export {
    mediaAssetService,
    DEFAULT_TEMPLATES,
    type MediaSlotType,
    type MediaSourceType,
    type MediaSlot,
    type MediaRequest,
    type GeneratedAsset,
    type ArticleTemplate,
} from './MediaAssetService';

export { useMediaAssets, type UseMediaAssetsReturn } from './hooks/useMediaAssets';
