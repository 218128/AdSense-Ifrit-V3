/**
 * useMediaAssets Hook
 * FSD: lib/media/hooks/useMediaAssets.ts
 * 
 * React hook for media asset generation with progress tracking
 */

import { useState, useCallback } from 'react';
import { mediaAssetService, type GeneratedAsset, type ArticleTemplate } from '../MediaAssetService';
import { useGlobalActionStatus } from '@/lib/shared/hooks/useGlobalActionStatus';

export interface UseMediaAssetsReturn {
    // State
    assets: GeneratedAsset[];
    isGenerating: boolean;
    progress: { current: number; total: number; slot: string } | null;
    error: string | null;

    // Actions
    generateForArticle: (articleId: string, templateId: string, topic: string, sectionTitles?: string[]) => Promise<GeneratedAsset[]>;
    generateSingleAsset: (articleId: string, type: 'cover' | 'og-image' | 'twitter-card', topic: string) => Promise<GeneratedAsset | null>;
    clearAssets: (articleId: string) => void;

    // Templates
    templates: ArticleTemplate[];
    getTemplate: (id: string) => ArticleTemplate | undefined;
}

export function useMediaAssets(): UseMediaAssetsReturn {
    const [assets, setAssets] = useState<GeneratedAsset[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState<{ current: number; total: number; slot: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { trackAction } = useGlobalActionStatus();

    const generateForArticle = useCallback(async (
        articleId: string,
        templateId: string,
        topic: string,
        sectionTitles: string[] = []
    ): Promise<GeneratedAsset[]> => {
        setIsGenerating(true);
        setError(null);
        setProgress(null);

        const template = mediaAssetService.getTemplate(templateId);
        const totalSlots = template?.mediaSlots.length || 0;

        return trackAction(
            `Generating ${totalSlots} media assets`,
            async (updateProgress) => {
                try {
                    updateProgress({ phase: 'starting', message: `Preparing ${templateId} template...` });

                    const result = await mediaAssetService.generateForArticle(
                        articleId,
                        templateId,
                        topic,
                        sectionTitles,
                        (p) => {
                            setProgress(p);
                            updateProgress({
                                phase: 'handler',
                                message: `Generating ${p.slot} (${p.current}/${p.total})`,
                                current: p.current,
                                total: p.total,
                            });
                        }
                    );

                    setAssets(result);
                    updateProgress({ phase: 'complete', message: `Generated ${result.length} assets` });

                    return result;
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : 'Media generation failed';
                    setError(errorMsg);
                    throw err;
                } finally {
                    setIsGenerating(false);
                    setProgress(null);
                }
            },
            { feature: 'media', siteId: articleId }
        );
    }, [trackAction]);

    const generateSingleAsset = useCallback(async (
        articleId: string,
        type: 'cover' | 'og-image' | 'twitter-card',
        topic: string
    ): Promise<GeneratedAsset | null> => {
        setIsGenerating(true);
        setError(null);

        return trackAction(
            `Generating ${type} image`,
            async (updateProgress) => {
                try {
                    updateProgress({ phase: 'starting', message: `Generating ${type}...` });

                    const slot = {
                        type: type as 'cover' | 'inline' | 'og-image' | 'twitter-card',
                        position: 'featured' as const,
                        required: true,
                        dimensions: type === 'cover' ? { width: 1200, height: 628 }
                            : type === 'og-image' ? { width: 1200, height: 630 }
                                : { width: 1200, height: 600 },
                        sourcePreference: 'auto' as const,
                    };

                    const asset = await mediaAssetService.generateAsset({
                        slot,
                        prompt: `${type} image for "${topic}"`,
                        topic,
                        articleId,
                    });

                    setAssets(prev => [...prev.filter(a => !(a.articleId === articleId && a.type === type)), asset]);
                    updateProgress({ phase: 'complete', message: `Generated ${type}` });

                    return asset;
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : 'Generation failed';
                    setError(errorMsg);
                    return null;
                } finally {
                    setIsGenerating(false);
                }
            },
            { feature: 'media', siteId: articleId }
        );
    }, [trackAction]);

    const clearAssets = useCallback((articleId: string) => {
        mediaAssetService.clearArticleAssets(articleId);
        setAssets(prev => prev.filter(a => a.articleId !== articleId));
    }, []);

    return {
        assets,
        isGenerating,
        progress,
        error,
        generateForArticle,
        generateSingleAsset,
        clearAssets,
        templates: mediaAssetService.getTemplates(),
        getTemplate: mediaAssetService.getTemplate.bind(mediaAssetService),
    };
}
