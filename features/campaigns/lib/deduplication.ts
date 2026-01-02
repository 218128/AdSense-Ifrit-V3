/**
 * Campaigns Feature - Deduplication Logic
 * FSD: features/campaigns/lib/deduplication.ts
 * 
 * Prevents duplicate content by tracking generated posts.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

export interface PostRecord {
    id: string;
    campaignId: string;
    siteId: string;
    topic: string;
    topicHash: string;
    title: string;
    titleHash: string;
    slug: string;
    wpPostId?: number;
    wpPostUrl?: string;
    createdAt: number;
}

interface DeduplicationStore {
    records: PostRecord[];

    // Check if duplicate
    isDuplicate: (topic: string, campaignId?: string, siteId?: string) => boolean;
    isTitleUsed: (title: string, siteId: string) => boolean;
    isSlugUsed: (slug: string, siteId: string) => boolean;

    // Record management
    addRecord: (record: Omit<PostRecord, 'id' | 'topicHash' | 'titleHash' | 'createdAt'>) => void;
    getRecordsByTopic: (topic: string) => PostRecord[];
    getRecordsByCampaign: (campaignId: string) => PostRecord[];
    getRecordsBySite: (siteId: string) => PostRecord[];

    // Cleanup
    clearRecords: (olderThanDays?: number) => void;
    clearByCampaign: (campaignId: string) => void;
}

// ============================================================================
// Hashing Utils
// ============================================================================

/**
 * Simple hash for deduplication (not cryptographic)
 */
function simpleHash(str: string): string {
    let hash = 0;
    const normalized = str.toLowerCase().trim().replace(/\s+/g, ' ');
    for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

/**
 * Normalize topic for comparison (remove common variations)
 */
function normalizeTopic(topic: string): string {
    return topic
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\b(the|a|an|and|or|but|in|on|at|to|for|of|with|by)\b/g, '')
        .trim();
}

/**
 * Calculate similarity score between two strings (0-1)
 */
export function similarityScore(str1: string, str2: string): number {
    const s1 = normalizeTopic(str1);
    const s2 = normalizeTopic(str2);

    if (s1 === s2) return 1;

    const words1 = new Set(s1.split(' '));
    const words2 = new Set(s2.split(' '));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
}

// ============================================================================
// Store
// ============================================================================

export const useDeduplicationStore = create<DeduplicationStore>()(
    persist(
        (set, get) => ({
            records: [],

            isDuplicate: (topic, campaignId, siteId) => {
                const records = get().records;
                const normalized = normalizeTopic(topic);
                const topicHash = simpleHash(normalized);

                return records.some(r => {
                    // Exact hash match
                    if (r.topicHash === topicHash) {
                        // Optionally scope to campaign or site
                        if (campaignId && r.campaignId !== campaignId) return false;
                        if (siteId && r.siteId !== siteId) return false;
                        return true;
                    }

                    // High similarity match (> 80%)
                    const similarity = similarityScore(topic, r.topic);
                    if (similarity > 0.8) {
                        if (campaignId && r.campaignId !== campaignId) return false;
                        if (siteId && r.siteId !== siteId) return false;
                        return true;
                    }

                    return false;
                });
            },

            isTitleUsed: (title, siteId) => {
                const records = get().records;
                const titleHash = simpleHash(title);
                return records.some(r => r.siteId === siteId && r.titleHash === titleHash);
            },

            isSlugUsed: (slug, siteId) => {
                const records = get().records;
                return records.some(r => r.siteId === siteId && r.slug === slug);
            },

            addRecord: (record) => {
                const newRecord: PostRecord = {
                    id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    ...record,
                    topicHash: simpleHash(normalizeTopic(record.topic)),
                    titleHash: simpleHash(record.title),
                    createdAt: Date.now(),
                };

                set((state) => ({
                    records: [...state.records, newRecord]
                }));
            },

            getRecordsByTopic: (topic) => {
                const normalized = normalizeTopic(topic);
                return get().records.filter(r =>
                    similarityScore(r.topic, normalized) > 0.5
                );
            },

            getRecordsByCampaign: (campaignId) => {
                return get().records.filter(r => r.campaignId === campaignId);
            },

            getRecordsBySite: (siteId) => {
                return get().records.filter(r => r.siteId === siteId);
            },

            clearRecords: (olderThanDays) => {
                if (olderThanDays) {
                    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
                    set((state) => ({
                        records: state.records.filter(r => r.createdAt > cutoff)
                    }));
                } else {
                    set({ records: [] });
                }
            },

            clearByCampaign: (campaignId) => {
                set((state) => ({
                    records: state.records.filter(r => r.campaignId !== campaignId)
                }));
            },
        }),
        {
            name: 'ifrit-deduplication-store',
        }
    )
);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a topic should be skipped (duplicate check wrapper)
 */
export function shouldSkipTopic(
    topic: string,
    campaignId: string,
    siteId: string,
    options?: { checkGlobal?: boolean }
): { skip: boolean; reason?: string; similarTo?: string } {
    const store = useDeduplicationStore.getState();

    // Check for exact/similar duplicates in this campaign
    const campaignRecords = store.getRecordsByCampaign(campaignId);
    for (const record of campaignRecords) {
        const similarity = similarityScore(topic, record.topic);
        if (similarity > 0.8) {
            return {
                skip: true,
                reason: `Similar to previously generated content (${Math.round(similarity * 100)}% match)`,
                similarTo: record.title,
            };
        }
    }

    // Check site-wide if requested
    if (options?.checkGlobal) {
        const siteRecords = store.getRecordsBySite(siteId);
        for (const record of siteRecords) {
            const similarity = similarityScore(topic, record.topic);
            if (similarity > 0.9) { // Higher threshold for cross-campaign
                return {
                    skip: true,
                    reason: `Very similar content already exists on this site`,
                    similarTo: record.title,
                };
            }
        }
    }

    return { skip: false };
}

/**
 * Record a successful post generation
 */
export function recordGeneratedPost(
    campaignId: string,
    siteId: string,
    topic: string,
    title: string,
    slug: string,
    wpPostId?: number,
    wpPostUrl?: string
): void {
    useDeduplicationStore.getState().addRecord({
        campaignId,
        siteId,
        topic,
        title,
        slug,
        wpPostId,
        wpPostUrl,
    });
}
