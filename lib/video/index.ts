/**
 * Video Module - Barrel Export
 * FSD: lib/video/index.ts
 */

export type {
    VideoPlatform,
    ShortFormDuration,
    LongFormLength,
    Caption,
    VideoSegment,
    VideoScript,
    ShortFormOptions,
    LongFormOptions,
} from './scriptGenerator';

export {
    generateShortFormScript,
    generateLongFormOutline,
    generateVideoFromArticle,
} from './scriptGenerator';
