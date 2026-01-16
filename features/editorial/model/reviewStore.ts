/**
 * Editorial Review Store
 * FSD: features/editorial/model/reviewStore.ts
 * 
 * Zustand store for managing editorial review workflow,
 * including queue management, approval actions, and statistics.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
    ReviewItem,
    ReviewStatus,
    ReviewPolicy,
    ReviewQueueFilter,
    ReviewQueueSort,
    ReviewQueueStats,
    CreateReviewInput,
    ReviewDecision,
    ReviewChecklistItem,
    ReviewChangeRequest,
    CitationValidationResult,
} from './reviewTypes';
// Value imports (runtime constants)
import { DEFAULT_REVIEW_CHECKLIST } from './reviewTypes';
import { calculateEEATScore } from '@/lib/contentQuality';
import { quickAIOverviewCheck } from '@/lib/seo';

// ============================================================================
// Store State
// ============================================================================

interface ReviewState {
    // Data
    items: ReviewItem[];
    policy: ReviewPolicy;

    // UI State
    selectedItemId: string | null;
    filter: ReviewQueueFilter;
    sort: ReviewQueueSort;
    isLoading: boolean;
    error: string | null;

    // CRUD Operations
    createReviewItem: (input: CreateReviewInput) => ReviewItem;
    updateReviewItem: (id: string, updates: Partial<ReviewItem>) => void;
    deleteReviewItem: (id: string) => void;
    getReviewItem: (id: string) => ReviewItem | undefined;

    // Queue Management
    getFilteredItems: () => ReviewItem[];
    getQueueStats: () => ReviewQueueStats;
    setFilter: (filter: ReviewQueueFilter) => void;
    setSort: (sort: ReviewQueueSort) => void;
    clearFilters: () => void;

    // Assignment
    assignReviewer: (itemId: string, reviewerId: string, reviewerName: string) => void;
    unassignReviewer: (itemId: string) => void;

    // Review Actions
    startReview: (itemId: string) => void;
    submitDecision: (itemId: string, decision: ReviewDecision) => void;
    requestChanges: (itemId: string, changes: string, reviewerName: string) => void;
    resolveChangeRequest: (itemId: string, requestId: string) => void;

    // Checklist
    toggleChecklistItem: (itemId: string, checklistId: string) => void;
    isChecklistComplete: (itemId: string) => boolean;

    // Auto-approval
    checkAutoApproval: (itemId: string) => { eligible: boolean; reason?: string };
    processAutoApproval: (itemId: string) => boolean;

    // Policy
    updatePolicy: (updates: Partial<ReviewPolicy>) => void;

    // UI
    selectItem: (id: string | null) => void;
    setError: (error: string | null) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
    return `review_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function detectRiskLevel(topic: string, policy: ReviewPolicy): ReviewItem['riskLevel'] {
    const topicLower = topic.toLowerCase();
    if (policy.ymylTopics.some(t => topicLower.includes(t))) {
        return 'ymyl';
    }
    // Add more sensitive topic detection if needed
    return 'standard';
}

function calculatePriority(
    riskLevel: ReviewItem['riskLevel'],
    score: number
): ReviewItem['priority'] {
    if (riskLevel === 'ymyl') return 'high';
    if (score < 50) return 'high';
    if (score < 70) return 'normal';
    return 'low';
}

function validateCitations(content: string): CitationValidationResult {
    // Simple citation check - reuse from contentQuality
    const { extractCitations, analyzeCitations } = require('@/lib/contentQuality');
    const citations = extractCitations(content);
    const wordCount = content.replace(/<[^>]+>/g, ' ').split(/\s+/).length;
    const analysis = analyzeCitations(citations, wordCount);

    const issues: string[] = [];
    if (analysis.byTier.problematic > 0) {
        issues.push(`${analysis.byTier.problematic} citations from problematic sources`);
    }
    if (analysis.failed > 0) {
        issues.push(`${analysis.failed} citations could not be verified`);
    }

    return {
        totalCitations: analysis.total,
        validatedCount: analysis.verified,
        failedCount: analysis.failed,
        issues,
        overallStatus: issues.length === 0 ? 'valid' :
            issues.length < 2 ? 'warnings' : 'issues',
    };
}

function initializeChecklist(): ReviewChecklistItem[] {
    return DEFAULT_REVIEW_CHECKLIST.map(item => ({
        ...item,
        checked: false,
    }));
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useReviewStore = create<ReviewState>()(
    persist(
        (set, get) => ({
            // Initial State
            items: [],
            policy: {
                minEEATScore: 60,
                minExperienceScore: 50,
                minExpertiseScore: 60,
                minCitationCount: 3,
                enableAutoApproval: true,
                autoApproveAboveScore: 85,
                autoApproveRequiresCitations: true,
                ymylMinScore: 80,
                ymylRequiresManualReview: true,
                ymylTopics: [
                    'health', 'medical', 'medicine', 'fitness', 'nutrition', 'diet',
                    'finance', 'investing', 'insurance', 'tax', 'legal', 'law',
                ],
                requireChecklist: true,
                requireAllChecklistItems: false,
                maxChangeRequestRounds: 3,
            },
            selectedItemId: null,
            filter: {},
            sort: 'priority',
            isLoading: false,
            error: null,

            // ─────────────────────────────────────────────────────────────────
            // CRUD Operations
            // ─────────────────────────────────────────────────────────────────

            createReviewItem: (input) => {
                const { policy } = get();

                // Calculate scores
                const eeatScore = calculateEEATScore(input.content);
                const aiOverview = quickAIOverviewCheck(input.content);
                const overallQualityScore = Math.round(
                    (eeatScore.overall * 0.7) + (aiOverview.score * 0.3)
                );

                // Validate citations
                const citationValidation = validateCitations(input.content);

                // Determine risk level and priority
                const riskLevel = detectRiskLevel(input.topic, policy);
                const priority = calculatePriority(riskLevel, overallQualityScore);

                // Check auto-approval eligibility
                let autoApprovalEligible = false;
                let autoApprovalBlocked: string | undefined;

                if (policy.enableAutoApproval) {
                    if (overallQualityScore >= policy.autoApproveAboveScore) {
                        if (riskLevel === 'ymyl' && policy.ymylRequiresManualReview) {
                            autoApprovalBlocked = 'YMYL content requires manual review';
                        } else if (policy.autoApproveRequiresCitations &&
                            citationValidation.totalCitations < policy.minCitationCount) {
                            autoApprovalBlocked = `Minimum ${policy.minCitationCount} citations required`;
                        } else if (citationValidation.overallStatus === 'issues') {
                            autoApprovalBlocked = 'Citation issues need resolution';
                        } else {
                            autoApprovalEligible = true;
                        }
                    } else {
                        autoApprovalBlocked = `Score ${overallQualityScore} below threshold ${policy.autoApproveAboveScore}`;
                    }
                }

                const newItem: ReviewItem = {
                    id: generateId(),
                    runItemId: input.runItemId,
                    campaignId: input.campaignId,
                    siteId: input.siteId,

                    title: input.title,
                    content: input.content,
                    excerpt: input.excerpt,
                    slug: input.slug,
                    wordCount: input.content.replace(/<[^>]+>/g, ' ').split(/\s+/).length,

                    topic: input.topic,
                    authorId: input.authorId,
                    authorName: input.authorName,

                    eeatScore,
                    aiOverviewScore: aiOverview.score,
                    overallQualityScore,

                    citationValidation,

                    status: 'pending_review',
                    priority,
                    riskLevel,

                    checklist: initializeChecklist(),
                    checklistComplete: false,
                    changeRequests: [],

                    autoApprovalEligible,
                    autoApprovalBlocked,

                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };

                set(state => ({
                    items: [...state.items, newItem]
                }));

                return newItem;
            },

            updateReviewItem: (id, updates) => {
                set(state => ({
                    items: state.items.map(item =>
                        item.id === id
                            ? { ...item, ...updates, updatedAt: Date.now() }
                            : item
                    )
                }));
            },

            deleteReviewItem: (id) => {
                set(state => ({
                    items: state.items.filter(item => item.id !== id),
                    selectedItemId: state.selectedItemId === id ? null : state.selectedItemId
                }));
            },

            getReviewItem: (id) => {
                return get().items.find(item => item.id === id);
            },

            // ─────────────────────────────────────────────────────────────────
            // Queue Management
            // ─────────────────────────────────────────────────────────────────

            getFilteredItems: () => {
                const { items, filter, sort } = get();

                let filtered = [...items];

                // Apply filters
                if (filter.status?.length) {
                    filtered = filtered.filter(i => filter.status!.includes(i.status));
                }
                if (filter.priority?.length) {
                    filtered = filtered.filter(i => filter.priority!.includes(i.priority));
                }
                if (filter.riskLevel?.length) {
                    filtered = filtered.filter(i => filter.riskLevel!.includes(i.riskLevel));
                }
                if (filter.campaignId) {
                    filtered = filtered.filter(i => i.campaignId === filter.campaignId);
                }
                if (filter.siteId) {
                    filtered = filtered.filter(i => i.siteId === filter.siteId);
                }
                if (filter.assignedTo) {
                    filtered = filtered.filter(i => i.assignedTo === filter.assignedTo);
                }
                if (filter.unassignedOnly) {
                    filtered = filtered.filter(i => !i.assignedTo);
                }

                // Apply sorting
                const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };

                switch (sort) {
                    case 'priority':
                        filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
                        break;
                    case 'created_asc':
                        filtered.sort((a, b) => a.createdAt - b.createdAt);
                        break;
                    case 'created_desc':
                        filtered.sort((a, b) => b.createdAt - a.createdAt);
                        break;
                    case 'score_asc':
                        filtered.sort((a, b) => a.overallQualityScore - b.overallQualityScore);
                        break;
                    case 'score_desc':
                        filtered.sort((a, b) => b.overallQualityScore - a.overallQualityScore);
                        break;
                }

                return filtered;
            },

            getQueueStats: () => {
                const { items } = get();

                const stats: ReviewQueueStats = {
                    total: items.length,
                    pending: items.filter(i => i.status === 'pending_review').length,
                    inReview: items.filter(i => i.status === 'in_review').length,
                    changesRequested: items.filter(i => i.status === 'changes_requested').length,
                    approved: items.filter(i => i.status === 'approved').length,
                    rejected: items.filter(i => i.status === 'rejected').length,
                    autoApproved: items.filter(i => i.status === 'auto_approved').length,

                    avgEEATScore: items.length > 0
                        ? Math.round(items.reduce((s, i) => s + i.eeatScore.overall, 0) / items.length)
                        : 0,
                    avgTimeInQueue: items.length > 0
                        ? items.reduce((s, i) => s + (Date.now() - i.createdAt), 0) / items.length
                        : 0,

                    byPriority: {
                        low: items.filter(i => i.priority === 'low').length,
                        normal: items.filter(i => i.priority === 'normal').length,
                        high: items.filter(i => i.priority === 'high').length,
                        urgent: items.filter(i => i.priority === 'urgent').length,
                    },
                    byRisk: {
                        standard: items.filter(i => i.riskLevel === 'standard').length,
                        sensitive: items.filter(i => i.riskLevel === 'sensitive').length,
                        ymyl: items.filter(i => i.riskLevel === 'ymyl').length,
                    },
                };

                return stats;
            },

            setFilter: (filter) => set({ filter }),
            setSort: (sort) => set({ sort }),
            clearFilters: () => set({ filter: {} }),

            // ─────────────────────────────────────────────────────────────────
            // Assignment
            // ─────────────────────────────────────────────────────────────────

            assignReviewer: (itemId, reviewerId, reviewerName) => {
                set(state => ({
                    items: state.items.map(item =>
                        item.id === itemId
                            ? {
                                ...item,
                                assignedTo: reviewerId,
                                assignedToName: reviewerName,
                                assignedAt: Date.now(),
                                updatedAt: Date.now(),
                            }
                            : item
                    )
                }));
            },

            unassignReviewer: (itemId) => {
                set(state => ({
                    items: state.items.map(item =>
                        item.id === itemId
                            ? {
                                ...item,
                                assignedTo: undefined,
                                assignedToName: undefined,
                                assignedAt: undefined,
                                updatedAt: Date.now(),
                            }
                            : item
                    )
                }));
            },

            // ─────────────────────────────────────────────────────────────────
            // Review Actions
            // ─────────────────────────────────────────────────────────────────

            startReview: (itemId) => {
                set(state => ({
                    items: state.items.map(item =>
                        item.id === itemId
                            ? { ...item, status: 'in_review' as ReviewStatus, updatedAt: Date.now() }
                            : item
                    )
                }));
            },

            submitDecision: (itemId, decision) => {
                set(state => ({
                    items: state.items.map(item => {
                        if (item.id !== itemId) return item;

                        const now = Date.now();
                        const updates: Partial<ReviewItem> = {
                            updatedAt: now,
                            reviewedAt: now,
                        };

                        if (decision.status === 'approved') {
                            updates.status = 'approved';
                            updates.approvedAt = now;
                            updates.reviewNotes = decision.notes;
                        } else if (decision.status === 'rejected') {
                            updates.status = 'rejected';
                            updates.rejectionReason = decision.rejectionReason;
                            updates.reviewNotes = decision.notes;
                        } else if (decision.status === 'changes_requested') {
                            updates.status = 'changes_requested';
                            updates.reviewNotes = decision.notes;
                        }

                        return { ...item, ...updates };
                    })
                }));
            },

            requestChanges: (itemId, changes, reviewerName) => {
                const changeRequest: ReviewChangeRequest = {
                    id: `cr_${Date.now()}`,
                    reviewerId: 'current_user', // Would come from auth
                    reviewerName,
                    createdAt: Date.now(),
                    changes,
                    resolved: false,
                };

                set(state => ({
                    items: state.items.map(item =>
                        item.id === itemId
                            ? {
                                ...item,
                                status: 'changes_requested' as ReviewStatus,
                                changeRequests: [...item.changeRequests, changeRequest],
                                updatedAt: Date.now(),
                            }
                            : item
                    )
                }));
            },

            resolveChangeRequest: (itemId, requestId) => {
                set(state => ({
                    items: state.items.map(item =>
                        item.id === itemId
                            ? {
                                ...item,
                                changeRequests: item.changeRequests.map(cr =>
                                    cr.id === requestId
                                        ? { ...cr, resolved: true, resolvedAt: Date.now() }
                                        : cr
                                ),
                                updatedAt: Date.now(),
                            }
                            : item
                    )
                }));
            },

            // ─────────────────────────────────────────────────────────────────
            // Checklist
            // ─────────────────────────────────────────────────────────────────

            toggleChecklistItem: (itemId, checklistId) => {
                set(state => ({
                    items: state.items.map(item => {
                        if (item.id !== itemId) return item;

                        const newChecklist = item.checklist.map(ci =>
                            ci.id === checklistId ? { ...ci, checked: !ci.checked } : ci
                        );

                        const allRequiredChecked = newChecklist
                            .filter(ci => ci.required)
                            .every(ci => ci.checked);

                        return {
                            ...item,
                            checklist: newChecklist,
                            checklistComplete: allRequiredChecked,
                            updatedAt: Date.now(),
                        };
                    })
                }));
            },

            isChecklistComplete: (itemId) => {
                const item = get().items.find(i => i.id === itemId);
                if (!item) return false;
                return item.checklist.filter(ci => ci.required).every(ci => ci.checked);
            },

            // ─────────────────────────────────────────────────────────────────
            // Auto-approval
            // ─────────────────────────────────────────────────────────────────

            checkAutoApproval: (itemId) => {
                const item = get().items.find(i => i.id === itemId);
                if (!item) return { eligible: false, reason: 'Item not found' };

                if (item.autoApprovalBlocked) {
                    return { eligible: false, reason: item.autoApprovalBlocked };
                }

                return { eligible: item.autoApprovalEligible };
            },

            processAutoApproval: (itemId) => {
                const { checkAutoApproval } = get();
                const result = checkAutoApproval(itemId);

                if (result.eligible) {
                    set(state => ({
                        items: state.items.map(item =>
                            item.id === itemId
                                ? {
                                    ...item,
                                    status: 'auto_approved' as ReviewStatus,
                                    approvedAt: Date.now(),
                                    reviewNotes: 'Auto-approved: meets quality thresholds',
                                    updatedAt: Date.now(),
                                }
                                : item
                        )
                    }));
                    return true;
                }

                return false;
            },

            // ─────────────────────────────────────────────────────────────────
            // Policy
            // ─────────────────────────────────────────────────────────────────

            updatePolicy: (updates) => {
                set(state => ({
                    policy: { ...state.policy, ...updates }
                }));
            },

            // ─────────────────────────────────────────────────────────────────
            // UI
            // ─────────────────────────────────────────────────────────────────

            selectItem: (id) => set({ selectedItemId: id }),
            setError: (error) => set({ error }),
        }),
        {
            name: 'ifrit-editorial-reviews',
            partialize: (state) => ({
                items: state.items,
                policy: state.policy,
            }),
        }
    )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectPendingReviews = (state: ReviewState) =>
    state.items.filter(i => i.status === 'pending_review' || i.status === 'in_review');

export const selectApprovedReviews = (state: ReviewState) =>
    state.items.filter(i => i.status === 'approved' || i.status === 'auto_approved');

export const selectHighPriorityItems = (state: ReviewState) =>
    state.items.filter(i => i.priority === 'high' || i.priority === 'urgent');

export const selectItemsByStatus = (status: ReviewStatus) => (state: ReviewState) =>
    state.items.filter(i => i.status === status);
