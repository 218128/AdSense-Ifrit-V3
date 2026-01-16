/**
 * Media Asset Service
 * FSD: lib/media/MediaAssetService.ts
 * 
 * Enterprise media management:
 * - Template-based image slots
 * - AI generation (Gemini) + Stock (Unsplash/Pexels) + Search (Brave)
 * - Local cache before WP upload
 * - Parallel generation pipeline
 */

// ============================================================================
// Types
// ============================================================================

export type MediaSlotType = 'cover' | 'inline' | 'og-image' | 'twitter-card';

export type MediaSourceType = 'ai' | 'unsplash' | 'pexels' | 'brave-search' | 'auto';

export interface MediaSlot {
    type: MediaSlotType;
    position: 'featured' | 'after-intro' | 'after-h2-1' | 'after-h2-2' | 'after-h2-3' | 'before-conclusion';
    required: boolean;
    dimensions: { width: number; height: number };
    sourcePreference: MediaSourceType;
}

export interface MediaRequest {
    slot: MediaSlot;
    prompt: string;
    topic: string;
    articleId: string;
}

export interface GeneratedAsset {
    id: string;
    articleId: string;
    type: MediaSlotType;
    position: MediaSlot['position'];
    source: MediaSourceType;

    // Content
    data: Blob | null;
    dataUrl: string;  // base64 data URL for preview
    originalUrl?: string;  // Source URL (stock/AI)

    // Metadata
    altText: string;
    caption?: string;
    dimensions: { width: number; height: number };
    filename: string;
    mimeType: string;
    sizeBytes: number;

    // Status
    status: 'pending' | 'generating' | 'ready' | 'uploaded' | 'failed';
    wpMediaId?: number;
    wpMediaUrl?: string;
    error?: string;
}

export interface ArticleTemplate {
    id: string;
    name: string;
    description: string;
    mediaSlots: MediaSlot[];
}

// ============================================================================
// Default Templates
// ============================================================================

export const DEFAULT_TEMPLATES: ArticleTemplate[] = [
    {
        id: 'minimal',
        name: 'Minimal',
        description: 'Cover image only',
        mediaSlots: [
            {
                type: 'cover',
                position: 'featured',
                required: true,
                dimensions: { width: 1200, height: 628 },
                sourcePreference: 'auto',
            },
        ],
    },
    {
        id: 'standard',
        name: 'Standard',
        description: 'Cover + 2 inline + social',
        mediaSlots: [
            {
                type: 'cover',
                position: 'featured',
                required: true,
                dimensions: { width: 1200, height: 628 },
                sourcePreference: 'auto',
            },
            {
                type: 'inline',
                position: 'after-intro',
                required: false,
                dimensions: { width: 800, height: 450 },
                sourcePreference: 'auto',
            },
            {
                type: 'inline',
                position: 'after-h2-2',
                required: false,
                dimensions: { width: 800, height: 450 },
                sourcePreference: 'auto',
            },
            {
                type: 'og-image',
                position: 'featured',
                required: true,
                dimensions: { width: 1200, height: 630 },
                sourcePreference: 'auto',
            },
            {
                type: 'twitter-card',
                position: 'featured',
                required: true,
                dimensions: { width: 1200, height: 600 },
                sourcePreference: 'auto',
            },
        ],
    },
    {
        id: 'rich',
        name: 'Rich Content',
        description: 'Cover + 4 inline + social',
        mediaSlots: [
            {
                type: 'cover',
                position: 'featured',
                required: true,
                dimensions: { width: 1200, height: 628 },
                sourcePreference: 'ai',  // Prefer AI for rich
            },
            {
                type: 'inline',
                position: 'after-intro',
                required: true,
                dimensions: { width: 800, height: 450 },
                sourcePreference: 'auto',
            },
            {
                type: 'inline',
                position: 'after-h2-1',
                required: false,
                dimensions: { width: 800, height: 450 },
                sourcePreference: 'auto',
            },
            {
                type: 'inline',
                position: 'after-h2-2',
                required: true,
                dimensions: { width: 800, height: 450 },
                sourcePreference: 'auto',
            },
            {
                type: 'inline',
                position: 'before-conclusion',
                required: false,
                dimensions: { width: 800, height: 450 },
                sourcePreference: 'unsplash',  // Stock for conclusion visual
            },
            {
                type: 'og-image',
                position: 'featured',
                required: true,
                dimensions: { width: 1200, height: 630 },
                sourcePreference: 'auto',
            },
            {
                type: 'twitter-card',
                position: 'featured',
                required: true,
                dimensions: { width: 1200, height: 600 },
                sourcePreference: 'auto',
            },
        ],
    },
];

// ============================================================================
// Media Asset Service Class
// ============================================================================

class MediaAssetServiceClass {
    private static instance: MediaAssetServiceClass;
    private assets: Map<string, GeneratedAsset> = new Map();
    private templates: Map<string, ArticleTemplate> = new Map();

    private constructor() {
        // Load default templates
        for (const template of DEFAULT_TEMPLATES) {
            this.templates.set(template.id, template);
        }
    }

    static getInstance(): MediaAssetServiceClass {
        if (!MediaAssetServiceClass.instance) {
            MediaAssetServiceClass.instance = new MediaAssetServiceClass();
        }
        return MediaAssetServiceClass.instance;
    }

    // ========================================
    // Template Management
    // ========================================

    getTemplates(): ArticleTemplate[] {
        return Array.from(this.templates.values());
    }

    getTemplate(id: string): ArticleTemplate | undefined {
        return this.templates.get(id);
    }

    addTemplate(template: ArticleTemplate): void {
        this.templates.set(template.id, template);
    }

    // ========================================
    // Asset Generation
    // ========================================

    /**
     * Generate all media assets for an article based on template
     */
    async generateForArticle(
        articleId: string,
        templateId: string,
        topic: string,
        sectionTitles: string[],
        onProgress?: (progress: { current: number; total: number; slot: string }) => void
    ): Promise<GeneratedAsset[]> {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }

        const assets: GeneratedAsset[] = [];
        const total = template.mediaSlots.length;

        for (let i = 0; i < template.mediaSlots.length; i++) {
            const slot = template.mediaSlots[i];
            onProgress?.({ current: i + 1, total, slot: slot.type });

            // Build prompt based on slot type
            const prompt = this.buildPromptForSlot(slot, topic, sectionTitles);

            try {
                const asset = await this.generateAsset({
                    slot,
                    prompt,
                    topic,
                    articleId,
                });
                assets.push(asset);
                this.assets.set(asset.id, asset);
            } catch (error) {
                // Create failed asset placeholder
                assets.push({
                    id: `${articleId}-${slot.type}-${slot.position}`,
                    articleId,
                    type: slot.type,
                    position: slot.position,
                    source: slot.sourcePreference,
                    data: null,
                    dataUrl: '',
                    altText: '',
                    dimensions: slot.dimensions,
                    filename: '',
                    mimeType: 'image/webp',
                    sizeBytes: 0,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Generation failed',
                });
            }
        }

        return assets;
    }

    /**
     * Generate a single media asset
     */
    async generateAsset(request: MediaRequest): Promise<GeneratedAsset> {
        const assetId = `${request.articleId}-${request.slot.type}-${request.slot.position}`;

        // Determine source strategy
        const sources = this.getSourceChain(request.slot.sourcePreference);

        for (const source of sources) {
            try {
                const result = await this.fetchFromSource(source, request);
                if (result) {
                    // Map internal 'search' source to valid MediaSourceType
                    const sourceType: MediaSourceType = source === 'search' ? 'auto' : source;
                    return {
                        id: assetId,
                        articleId: request.articleId,
                        type: request.slot.type,
                        position: request.slot.position,
                        source: sourceType,
                        data: result.blob,
                        dataUrl: result.dataUrl,
                        originalUrl: result.originalUrl,
                        altText: this.generateAltText(request.topic, request.slot.type),
                        dimensions: request.slot.dimensions,
                        filename: `${request.slot.type}-${request.slot.position}.webp`,
                        mimeType: 'image/webp',
                        sizeBytes: result.blob.size,
                        status: 'ready',
                    };
                }
            } catch (error) {
                console.warn(`[MediaAssetService] ${source} failed:`, error);
                // Try next source
            }
        }

        throw new Error('All media sources failed');
    }

    // ========================================
    // Source Handlers - Use Capabilities API
    // ========================================

    private getSourceChain(preference: MediaSourceType): ('ai' | 'search')[] {
        switch (preference) {
            case 'ai':
                return ['ai', 'search'];  // Try AI first, then stock search
            case 'unsplash':
            case 'pexels':
            case 'brave-search':
            case 'auto':
            default:
                return ['search', 'ai'];  // Try stock search first (free), then AI
        }
    }

    private async fetchFromSource(
        source: 'ai' | 'search',
        request: MediaRequest
    ): Promise<{ blob: Blob; dataUrl: string; originalUrl?: string } | null> {
        if (source === 'ai') {
            return this.fetchViaImagesCapability(request);
        } else {
            return this.fetchViaSearchImagesCapability(request);
        }
    }

    /**
     * Use `images` capability for AI generation (Gemini, OpenRouter, etc.)
     */
    private async fetchViaImagesCapability(request: MediaRequest): Promise<{ blob: Blob; dataUrl: string; originalUrl?: string } | null> {
        try {
            const response = await fetch('/api/capabilities/images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: request.prompt,
                    topic: request.topic,
                    itemType: request.slot.type,
                }),
            });

            if (!response.ok) return null;

            const data = await response.json();
            if (!data.success) {
                console.warn('[MediaAssetService] images capability failed:', data.error);
                return null;
            }

            // data.text is the image URL or base64 from AI
            const imageUrl = data.text;
            if (!imageUrl) return null;

            // If it's a data URL, parse it directly
            if (imageUrl.startsWith('data:')) {
                const base64 = imageUrl.split(',')[1];
                const mimeMatch = imageUrl.match(/data:(.*?);/);
                const mimeType = mimeMatch?.[1] || 'image/png';
                const bytes = atob(base64);
                const arr = new Uint8Array(bytes.length);
                for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
                const blob = new Blob([arr], { type: mimeType });
                return { blob, dataUrl: imageUrl };
            }

            // Otherwise fetch the URL
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) return null;

            const blob = await imageResponse.blob();
            const dataUrl = await this.blobToDataUrl(blob);
            return { blob, dataUrl, originalUrl: imageUrl };

        } catch (error) {
            console.warn('[MediaAssetService] images capability error:', error);
            return null;
        }
    }

    /**
     * Use `search-images` capability for stock photos (Unsplash, Pexels, Brave)
     * NEW: Aggregated mode - queries all available handlers in parallel and scores results
     */
    private async fetchViaSearchImagesCapability(request: MediaRequest): Promise<{ blob: Blob; dataUrl: string; originalUrl?: string } | null> {
        try {
            // Get integration keys from client-side
            // SoC: Service retrieves keys, passes to route, route passes to handlers
            let integrationKeys: Record<string, string> = {};
            try {
                const { getAllIntegrationKeys } = await import('@/lib/ai/utils/getCapabilityKey');
                integrationKeys = await getAllIntegrationKeys();
            } catch {
                // KeyManager not available
            }

            // Request aggregated results from all handlers
            const response = await fetch('/api/capabilities/search-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: request.topic,
                    topic: request.topic,
                    itemType: request.slot.type,
                    aggregated: true,  // Request aggregated results from all handlers
                    ...integrationKeys,
                }),
            });

            if (!response.ok) return null;

            const data = await response.json();
            if (!data.success) {
                console.warn('[MediaAssetService] search-images capability failed:', data.error);
                return null;
            }

            // Import scoring functions dynamically
            const { scoreAndRankImages, getDefaultCriteria } = await import('./scoring');

            // data.data contains all image results from handlers
            const allImages = data.data || [];

            if (allImages.length === 0) {
                // Fallback to single result
                const imageUrl = data.text;
                if (!imageUrl) return null;
                return this.downloadImage(imageUrl);
            }

            // Score and rank images based on slot requirements
            const criteria = getDefaultCriteria(request.slot.type);
            criteria.targetWidth = request.slot.dimensions.width;
            criteria.targetHeight = request.slot.dimensions.height;

            const rankedImages = scoreAndRankImages(allImages, criteria);

            // Log scoring results with breakdown
            if (rankedImages.length > 0) {
                const winner = rankedImages[0];
                const { resolution, aspectRatio, sourcePreference, metadata } = winner.scoreBreakdown;
                console.log(`[ImageScoring] Winner: ${winner.source} (${winner.width}x${winner.height})`);
                console.log(`[ImageScoring]   Score: ${winner.score}/100 = Res:${resolution} + AR:${aspectRatio} + Src:${sourcePreference} + Meta:${metadata}`);
                console.log(`[ImageScoring]   From ${rankedImages.length} candidates`);
            }

            // Pick the best image
            const bestImage = rankedImages[0];
            if (!bestImage?.url) return null;

            return this.downloadImage(bestImage.url);

        } catch (error) {
            console.warn('[MediaAssetService] search-images aggregated error:', error);
            return null;
        }
    }

    /**
     * Download image from URL and return blob + dataUrl
     */
    private async downloadImage(imageUrl: string): Promise<{ blob: Blob; dataUrl: string; originalUrl: string } | null> {
        try {
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) return null;

            const blob = await imageResponse.blob();
            const dataUrl = await this.blobToDataUrl(blob);
            return { blob, dataUrl, originalUrl: imageUrl };
        } catch {
            return null;
        }
    }

    // ========================================
    // Helpers
    // ========================================

    private buildPromptForSlot(slot: MediaSlot, topic: string, sectionTitles: string[]): string {
        switch (slot.type) {
            case 'cover':
                return `Professional featured image for article about "${topic}". Modern, clean design suitable for blog header. 16:9 aspect ratio.`;
            case 'og-image':
                return `Open Graph social sharing image for "${topic}". Bold, eye-catching design optimized for social media preview cards.`;
            case 'twitter-card':
                return `Twitter Card image for article about "${topic}". Clean design with good contrast for small preview display.`;
            case 'inline':
                // Use section title if available
                const sectionIndex = slot.position.includes('h2')
                    ? parseInt(slot.position.replace('after-h2-', '')) - 1
                    : 0;
                const sectionTitle = sectionTitles[sectionIndex] || topic;
                return `Illustration for section "${sectionTitle}" in article about "${topic}". Informative visual that enhances understanding.`;
            default:
                return `Image related to ${topic}`;
        }
    }

    private generateAltText(topic: string, type: MediaSlotType): string {
        switch (type) {
            case 'cover':
                return `Featured image for ${topic}`;
            case 'og-image':
                return `${topic} - social preview`;
            case 'twitter-card':
                return `${topic} - Twitter preview`;
            case 'inline':
                return `Illustration: ${topic}`;
            default:
                return topic;
        }
    }

    private blobToDataUrl(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // ========================================
    // Asset Retrieval
    // ========================================

    getAsset(assetId: string): GeneratedAsset | undefined {
        return this.assets.get(assetId);
    }

    getAssetsForArticle(articleId: string): GeneratedAsset[] {
        return Array.from(this.assets.values())
            .filter(a => a.articleId === articleId);
    }

    clearArticleAssets(articleId: string): void {
        for (const [id, asset] of this.assets) {
            if (asset.articleId === articleId) {
                this.assets.delete(id);
            }
        }
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const mediaAssetService = MediaAssetServiceClass.getInstance();
