/**
 * Translation History - BI Tracking
 * FSD: features/campaigns/model/translationHistory.ts
 * 
 * Tracks all translation operations for BI analytics and duplicate prevention.
 */

// ============================================================================
// Translation Record Entity
// ============================================================================

export interface TranslationRecord {
    id: string;

    // Source information
    sourcePostId: number;
    sourcePostUrl: string;
    sourcePostTitle: string;
    sourceSiteId: string;
    sourceLanguage?: string;      // Auto-detected or configured

    // Target information
    targetLanguage: string;
    targetSiteId: string;
    targetPostId?: number;        // Set after publish
    targetPostUrl?: string;       // Set after publish

    // Status tracking
    status: 'pending' | 'translating' | 'processing' | 'publishing' | 'published' | 'failed';

    // Timestamps
    createdAt: number;
    translatedAt?: number;
    publishedAt?: number;

    // Metrics
    characterCount: number;
    processingTimeMs?: number;

    // Post-processing applied
    postProcessingApplied?: {
        humanized?: boolean;
        readabilityOptimized?: boolean;
    };

    // Error tracking
    error?: string;
    errorStage?: 'fetch' | 'translate' | 'process' | 'publish';

    // Campaign reference
    campaignId: string;
    runId?: string;
}

// ============================================================================
// Translation History State
// ============================================================================

export interface TranslationHistoryState {
    records: TranslationRecord[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a post has already been translated to a specific language
 */
export function isAlreadyTranslated(
    records: TranslationRecord[],
    sourcePostId: number,
    targetLanguage: string,
    targetSiteId: string
): boolean {
    return records.some(
        r => r.sourcePostId === sourcePostId &&
            r.targetLanguage === targetLanguage &&
            r.targetSiteId === targetSiteId &&
            r.status === 'published'
    );
}

/**
 * Get all translations for a specific source post
 */
export function getTranslationsForPost(
    records: TranslationRecord[],
    sourcePostId: number
): TranslationRecord[] {
    return records.filter(r => r.sourcePostId === sourcePostId);
}

/**
 * Get translation statistics for a campaign
 */
export function getTranslationStats(
    records: TranslationRecord[],
    campaignId: string
): {
    total: number;
    published: number;
    failed: number;
    pending: number;
    byLanguage: Record<string, number>;
} {
    const campaignRecords = records.filter(r => r.campaignId === campaignId);

    const byLanguage: Record<string, number> = {};
    campaignRecords.forEach(r => {
        if (r.status === 'published') {
            byLanguage[r.targetLanguage] = (byLanguage[r.targetLanguage] || 0) + 1;
        }
    });

    return {
        total: campaignRecords.length,
        published: campaignRecords.filter(r => r.status === 'published').length,
        failed: campaignRecords.filter(r => r.status === 'failed').length,
        pending: campaignRecords.filter(r => !['published', 'failed'].includes(r.status)).length,
        byLanguage,
    };
}

/**
 * Create a new translation record
 */
export function createTranslationRecord(
    sourcePost: { id: number; url: string; title: string },
    sourceSiteId: string,
    targetLanguage: string,
    targetSiteId: string,
    campaignId: string,
    characterCount: number
): TranslationRecord {
    return {
        id: `trans_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        sourcePostId: sourcePost.id,
        sourcePostUrl: sourcePost.url,
        sourcePostTitle: sourcePost.title,
        sourceSiteId,
        targetLanguage,
        targetSiteId,
        status: 'pending',
        createdAt: Date.now(),
        characterCount,
        campaignId,
    };
}

/**
 * Update translation record status
 */
export function updateTranslationStatus(
    record: TranslationRecord,
    status: TranslationRecord['status'],
    updates?: Partial<TranslationRecord>
): TranslationRecord {
    return {
        ...record,
        ...updates,
        status,
        ...(status === 'published' && { publishedAt: Date.now() }),
        ...(status === 'translating' && { translatedAt: Date.now() }),
    };
}

// ============================================================================
// Translation History Retrieval
// ============================================================================

/**
 * Get translation history for a campaign
 * 
 * TODO: This feature is incomplete - currently returns empty array.
 * Need to implement a Zustand store (useTranslationHistoryStore) to persist
 * translation records across sessions. The store should:
 * 1. Save records when translations complete
 * 2. Load from localStorage on init
 * 3. Support filtering by campaignId, language, status
 */
export function getTranslationHistory(_campaignId: string): TranslationRecord[] {
    // INCOMPLETE: No persistence store implemented yet
    // When a translation store is created, this should call:
    // return useTranslationHistoryStore.getState().getRecordsByCampaign(campaignId);
    console.warn('[TranslationHistory] Feature incomplete - no persistence store. Returning empty history.');
    return [];
}
