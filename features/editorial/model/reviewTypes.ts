/**
 * Editorial Review Types
 * FSD: features/editorial/model/reviewTypes.ts
 * 
 * Type definitions for editorial review workflow,
 * including review items, policies, and approval gates.
 */

import type { EEATScore, FullContentScore } from '@/lib/contentQuality';

// ============================================================================
// Review Status
// ============================================================================

/**
 * Review workflow status
 */
export type ReviewStatus =
    | 'pending_review'      // Awaiting human review
    | 'in_review'           // Currently being reviewed
    | 'changes_requested'   // Editor requested changes
    | 'approved'            // Ready for publishing
    | 'rejected'            // Not suitable for publishing
    | 'auto_approved';      // Passed quality threshold automatically

/**
 * Review priority level
 */
export type ReviewPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Content type for review prioritization
 */
export type ContentRiskLevel = 'standard' | 'sensitive' | 'ymyl';

// ============================================================================
// Review Item
// ============================================================================

/**
 * Citation validation result
 */
export interface CitationValidationResult {
    totalCitations: number;
    validatedCount: number;
    failedCount: number;
    issues: string[];
    overallStatus: 'valid' | 'warnings' | 'issues';
}

/**
 * Review checklist item
 */
export interface ReviewChecklistItem {
    id: string;
    label: string;
    checked: boolean;
    required: boolean;
    category: 'content' | 'accuracy' | 'compliance' | 'seo';
}

/**
 * Default review checklist
 */
export const DEFAULT_REVIEW_CHECKLIST: Omit<ReviewChecklistItem, 'checked'>[] = [
    // Content quality
    { id: 'clear_intro', label: 'Clear introduction with main points', required: true, category: 'content' },
    { id: 'logical_structure', label: 'Logical content structure', required: true, category: 'content' },
    { id: 'proper_conclusion', label: 'Proper conclusion with takeaways', required: true, category: 'content' },
    { id: 'no_ai_patterns', label: 'No obvious AI writing patterns', required: true, category: 'content' },

    // Accuracy
    { id: 'facts_verified', label: 'Key facts verified', required: true, category: 'accuracy' },
    { id: 'sources_valid', label: 'Sources are authoritative', required: true, category: 'accuracy' },
    { id: 'no_outdated_info', label: 'No outdated information', required: false, category: 'accuracy' },

    // Compliance
    { id: 'disclosure_present', label: 'Required disclosures present', required: true, category: 'compliance' },
    { id: 'no_prohibited_claims', label: 'No prohibited claims', required: true, category: 'compliance' },
    { id: 'author_attributed', label: 'Author properly attributed', required: true, category: 'compliance' },

    // SEO
    { id: 'keyword_natural', label: 'Keywords used naturally', required: false, category: 'seo' },
    { id: 'meta_complete', label: 'Meta title/description complete', required: false, category: 'seo' },
    { id: 'internal_links', label: 'Internal links added', required: false, category: 'seo' },
];

/**
 * Review change request
 */
export interface ReviewChangeRequest {
    id: string;
    reviewerId: string;
    reviewerName: string;
    createdAt: number;
    changes: string;                     // Markdown description of requested changes
    resolved: boolean;
    resolvedAt?: number;
}

/**
 * Complete review item
 */
export interface ReviewItem {
    // ─────────────────────────────────────────────────────────────────────────
    // Identity
    // ─────────────────────────────────────────────────────────────────────────
    id: string;
    runItemId?: string;                  // Link to pipeline run item
    campaignId: string;
    siteId: string;

    // ─────────────────────────────────────────────────────────────────────────
    // Content
    // ─────────────────────────────────────────────────────────────────────────
    title: string;
    content: string;                     // HTML content
    excerpt?: string;
    slug?: string;
    wordCount: number;

    // ─────────────────────────────────────────────────────────────────────────
    // Metadata
    // ─────────────────────────────────────────────────────────────────────────
    topic: string;                       // Original topic/keyword
    authorId?: string;                   // Assigned author ID
    authorName?: string;

    // ─────────────────────────────────────────────────────────────────────────
    // Quality Scores
    // ─────────────────────────────────────────────────────────────────────────
    eeatScore: EEATScore;
    aiOverviewScore?: number;
    overallQualityScore: number;

    // ─────────────────────────────────────────────────────────────────────────
    // Citation Validation
    // ─────────────────────────────────────────────────────────────────────────
    citationValidation: CitationValidationResult;

    // ─────────────────────────────────────────────────────────────────────────
    // Review State
    // ─────────────────────────────────────────────────────────────────────────
    status: ReviewStatus;
    priority: ReviewPriority;
    riskLevel: ContentRiskLevel;

    // Assignment
    assignedTo?: string;                 // Reviewer ID
    assignedToName?: string;
    assignedAt?: number;

    // Checklist
    checklist: ReviewChecklistItem[];
    checklistComplete: boolean;

    // Change requests
    changeRequests: ReviewChangeRequest[];

    // ─────────────────────────────────────────────────────────────────────────
    // Auto-approval
    // ─────────────────────────────────────────────────────────────────────────
    autoApprovalEligible: boolean;
    autoApprovalBlocked?: string;        // Reason if blocked

    // ─────────────────────────────────────────────────────────────────────────
    // Review Notes
    // ─────────────────────────────────────────────────────────────────────────
    reviewNotes?: string;
    rejectionReason?: string;

    // ─────────────────────────────────────────────────────────────────────────
    // Timestamps
    // ─────────────────────────────────────────────────────────────────────────
    createdAt: number;
    updatedAt: number;
    reviewedAt?: number;
    approvedAt?: number;
    approvedBy?: string;
    publishedAt?: number;
}

// ============================================================================
// Review Policy
// ============================================================================

/**
 * Configuration for review thresholds and auto-approval
 */
export interface ReviewPolicy {
    // ─────────────────────────────────────────────────────────────────────────
    // Score Thresholds
    // ─────────────────────────────────────────────────────────────────────────
    minEEATScore: number;                // Default: 60
    minExperienceScore: number;          // Default: 50
    minExpertiseScore: number;           // Default: 60
    minCitationCount: number;            // Default: 3

    // ─────────────────────────────────────────────────────────────────────────
    // Auto-approval
    // ─────────────────────────────────────────────────────────────────────────
    enableAutoApproval: boolean;         // Default: true
    autoApproveAboveScore: number;       // Default: 85
    autoApproveRequiresCitations: boolean; // Default: true

    // ─────────────────────────────────────────────────────────────────────────
    // YMYL Handling
    // ─────────────────────────────────────────────────────────────────────────
    ymylMinScore: number;                // Default: 80
    ymylRequiresManualReview: boolean;   // Default: true
    ymylTopics: string[];                // Topics that trigger YMYL

    // ─────────────────────────────────────────────────────────────────────────
    // Workflow
    // ─────────────────────────────────────────────────────────────────────────
    requireChecklist: boolean;           // Default: true
    requireAllChecklistItems: boolean;   // Default: false (only required items)
    maxChangeRequestRounds: number;      // Default: 3
}

/**
 * Default review policy
 */
export const DEFAULT_REVIEW_POLICY: ReviewPolicy = {
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
};

// ============================================================================
// Review Queue
// ============================================================================

/**
 * Review queue filter options
 */
export interface ReviewQueueFilter {
    status?: ReviewStatus[];
    priority?: ReviewPriority[];
    riskLevel?: ContentRiskLevel[];
    campaignId?: string;
    siteId?: string;
    assignedTo?: string;
    unassignedOnly?: boolean;
}

/**
 * Review queue sort options
 */
export type ReviewQueueSort =
    | 'priority'
    | 'created_asc'
    | 'created_desc'
    | 'score_asc'
    | 'score_desc';

/**
 * Review queue statistics
 */
export interface ReviewQueueStats {
    total: number;
    pending: number;
    inReview: number;
    changesRequested: number;
    approved: number;
    rejected: number;
    autoApproved: number;

    // Averages
    avgEEATScore: number;
    avgTimeInQueue: number;              // milliseconds

    // By priority
    byPriority: Record<ReviewPriority, number>;
    byRisk: Record<ContentRiskLevel, number>;
}

// ============================================================================
// Review Actions
// ============================================================================

/**
 * Input for creating a review item
 */
export interface CreateReviewInput {
    campaignId: string;
    siteId: string;
    title: string;
    content: string;
    topic: string;
    excerpt?: string;
    slug?: string;
    authorId?: string;
    authorName?: string;
    runItemId?: string;
}

/**
 * Result of review decision
 */
export interface ReviewDecision {
    status: 'approved' | 'rejected' | 'changes_requested';
    notes?: string;
    changeRequest?: string;
    rejectionReason?: string;
}

// ============================================================================
// Errors
// ============================================================================

/**
 * Error thrown when content requires review
 */
export class ReviewRequiredError extends Error {
    constructor(
        message: string,
        public readonly reviewItem: ReviewItem,
        public readonly reason: string
    ) {
        super(message);
        this.name = 'ReviewRequiredError';
    }
}
