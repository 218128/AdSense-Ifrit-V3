/**
 * Author Management - Zustand Store
 * FSD: features/authors/model/authorStore.ts
 * 
 * Manages author profiles with persistence, CRUD operations,
 * and matching logic for content assignment.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
    AuthorProfile,
    CreateAuthorInput,
    UpdateAuthorInput,
    AuthorMatchCriteria,
    AuthorMatchResult,
    AuthorExpertise,
    ExpertiseLevel,
    AuthorCredential,
    WPAuthorMapping,
    DEFAULT_EEAT_SIGNALS,
    EXPERTISE_LEVEL_YEARS,
} from './authorTypes';

// ============================================================================
// Store State
// ============================================================================

interface AuthorState {
    // Data
    authors: AuthorProfile[];

    // UI State
    selectedAuthorId: string | null;
    isLoading: boolean;
    error: string | null;

    // CRUD Operations
    createAuthor: (input: CreateAuthorInput) => AuthorProfile;
    updateAuthor: (id: string, updates: UpdateAuthorInput) => void;
    deleteAuthor: (id: string) => void;
    getAuthor: (id: string) => AuthorProfile | undefined;

    // Credentials & Expertise
    addCredential: (authorId: string, credential: Omit<AuthorCredential, 'id'>) => void;
    removeCredential: (authorId: string, credentialId: string) => void;
    addExpertise: (authorId: string, expertise: AuthorExpertise) => void;
    updateExpertise: (authorId: string, niche: string, updates: Partial<AuthorExpertise>) => void;
    removeExpertise: (authorId: string, niche: string) => void;

    // Site Assignment
    assignToSite: (authorId: string, siteId: string) => void;
    unassignFromSite: (authorId: string, siteId: string) => void;
    getAuthorsForSite: (siteId: string) => AuthorProfile[];
    mapToWPUser: (authorId: string, mapping: WPAuthorMapping) => void;

    // Matching
    findBestAuthor: (criteria: AuthorMatchCriteria) => AuthorMatchResult | null;
    findMatchingAuthors: (criteria: AuthorMatchCriteria, limit?: number) => AuthorMatchResult[];

    // Stats
    incrementArticleCount: (authorId: string, wordCount: number) => void;
    updateAverageEEATScore: (authorId: string, newScore: number) => void;

    // UI
    selectAuthor: (id: string | null) => void;
    setError: (error: string | null) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
    return `author_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function calculateExpertiseScore(expertise: AuthorExpertise, topic: string): number {
    let score = 0;

    // Base score from level
    const levelScores: Record<ExpertiseLevel, number> = {
        beginner: 20,
        intermediate: 40,
        advanced: 70,
        expert: 100
    };
    score += levelScores[expertise.level];

    // Bonus for years of experience
    score += Math.min(expertise.yearsExperience * 2, 20);

    // Bonus for topic match
    if (expertise.topics.some(t =>
        t.toLowerCase().includes(topic.toLowerCase()) ||
        topic.toLowerCase().includes(t.toLowerCase())
    )) {
        score += 15;
    }

    // Bonus for credentials
    score += Math.min(expertise.credentials.length * 5, 15);

    return Math.min(score, 100);
}

function matchAuthorToTopic(
    author: AuthorProfile,
    criteria: AuthorMatchCriteria
): AuthorMatchResult {
    const matchReasons: string[] = [];
    const missingExpertise: string[] = [];
    let totalScore = 0;

    // Check niche match
    const nicheExpertise = author.expertise.find(e =>
        e.niche.toLowerCase() === criteria.niche.toLowerCase() ||
        e.niche.toLowerCase().includes(criteria.niche.toLowerCase())
    );

    if (nicheExpertise) {
        const expertiseScore = calculateExpertiseScore(nicheExpertise, criteria.niche);
        totalScore += expertiseScore * 0.5; // 50% weight
        matchReasons.push(`Expert in ${nicheExpertise.niche} (${nicheExpertise.level}, ${nicheExpertise.yearsExperience}+ years)`);

        // Check minimum expertise level
        if (criteria.minExpertiseLevel) {
            const levels: ExpertiseLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
            const authorLevelIndex = levels.indexOf(nicheExpertise.level);
            const minLevelIndex = levels.indexOf(criteria.minExpertiseLevel);

            if (authorLevelIndex < minLevelIndex) {
                totalScore -= 20;
                missingExpertise.push(`Needs ${criteria.minExpertiseLevel} level, has ${nicheExpertise.level}`);
            }
        }
    } else {
        missingExpertise.push(`No expertise in ${criteria.niche}`);
        // Check if primary niche is close
        if (author.primaryNiche.toLowerCase().includes(criteria.niche.toLowerCase())) {
            totalScore += 20;
            matchReasons.push(`Primary niche is ${author.primaryNiche}`);
        }
    }

    // Check topic matches
    if (criteria.topics?.length) {
        const matchingTopics = criteria.topics.filter(topic =>
            author.expertise.some(e =>
                e.topics.some(t =>
                    t.toLowerCase().includes(topic.toLowerCase()) ||
                    topic.toLowerCase().includes(t.toLowerCase())
                )
            )
        );

        if (matchingTopics.length > 0) {
            totalScore += (matchingTopics.length / criteria.topics.length) * 30;
            matchReasons.push(`Covers ${matchingTopics.length}/${criteria.topics.length} topics`);
        } else {
            missingExpertise.push(`No coverage of requested topics`);
        }
    }

    // Check site assignment
    if (criteria.preferredSiteId) {
        if (author.assignedSiteIds.includes(criteria.preferredSiteId)) {
            totalScore += 10;
            matchReasons.push('Assigned to this site');
        } else {
            totalScore -= 5;
        }
    }

    // Bonus for credentials
    if (author.credentials.length > 0) {
        totalScore += Math.min(author.credentials.length * 3, 10);
        matchReasons.push(`Has ${author.credentials.length} credentials`);
    }

    // Bonus for social proof
    if (author.socialProfiles.length > 0) {
        totalScore += Math.min(author.socialProfiles.length * 2, 5);
    }

    // Bonus for verification
    if (author.verificationStatus === 'verified') {
        totalScore += 5;
        matchReasons.push('Verified author');
    }

    return {
        author,
        matchScore: Math.max(0, Math.min(100, Math.round(totalScore))),
        matchReasons,
        missingExpertise: missingExpertise.length > 0 ? missingExpertise : undefined
    };
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useAuthorStore = create<AuthorState>()(
    persist(
        (set, get) => ({
            // Initial State
            authors: [],
            selectedAuthorId: null,
            isLoading: false,
            error: null,

            // ─────────────────────────────────────────────────────────────────
            // CRUD Operations
            // ─────────────────────────────────────────────────────────────────

            createAuthor: (input) => {
                const newAuthor: AuthorProfile = {
                    id: generateId(),
                    name: input.name,
                    slug: generateSlug(input.name),
                    headline: input.headline,
                    bio: input.bio,
                    shortBio: input.shortBio,
                    primaryNiche: input.primaryNiche,
                    avatarUrl: input.avatarUrl,
                    email: input.email,
                    websiteUrl: input.websiteUrl,
                    linkedInUrl: input.linkedInUrl,
                    credentials: [],
                    expertise: [],
                    socialProfiles: [],
                    eeatSignals: {
                        firstHandPhrases: [
                            "In my experience,",
                            "When I tested this,",
                            "After using this for",
                            "Having worked with",
                            "From my perspective,"
                        ],
                        personalStories: [],
                        yearsStatement: "",
                        credentialMentions: [],
                        technicalInsights: [],
                        publicationLinks: [],
                        socialProofPhrases: [],
                        disclosures: [
                            "This article may contain affiliate links.",
                            "I only recommend products I've personally used."
                        ],
                        updateCommitment: "I regularly update this content to ensure accuracy."
                    },
                    assignedSiteIds: [],
                    wpAuthorMappings: [],
                    verificationStatus: 'unverified',
                    articlesPublished: 0,
                    totalWordCount: 0,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };

                set(state => ({
                    authors: [...state.authors, newAuthor]
                }));

                return newAuthor;
            },

            updateAuthor: (id, updates) => {
                set(state => ({
                    authors: state.authors.map(author =>
                        author.id === id
                            ? { ...author, ...updates, updatedAt: Date.now() }
                            : author
                    )
                }));
            },

            deleteAuthor: (id) => {
                set(state => ({
                    authors: state.authors.filter(a => a.id !== id),
                    selectedAuthorId: state.selectedAuthorId === id ? null : state.selectedAuthorId
                }));
            },

            getAuthor: (id) => {
                return get().authors.find(a => a.id === id);
            },

            // ─────────────────────────────────────────────────────────────────
            // Credentials & Expertise
            // ─────────────────────────────────────────────────────────────────

            addCredential: (authorId, credential) => {
                const fullCredential: AuthorCredential = {
                    ...credential,
                    id: `cred_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
                };

                set(state => ({
                    authors: state.authors.map(author =>
                        author.id === authorId
                            ? {
                                ...author,
                                credentials: [...author.credentials, fullCredential],
                                updatedAt: Date.now()
                            }
                            : author
                    )
                }));
            },

            removeCredential: (authorId, credentialId) => {
                set(state => ({
                    authors: state.authors.map(author =>
                        author.id === authorId
                            ? {
                                ...author,
                                credentials: author.credentials.filter(c => c.id !== credentialId),
                                updatedAt: Date.now()
                            }
                            : author
                    )
                }));
            },

            addExpertise: (authorId, expertise) => {
                set(state => ({
                    authors: state.authors.map(author =>
                        author.id === authorId
                            ? {
                                ...author,
                                expertise: [...author.expertise, expertise],
                                updatedAt: Date.now()
                            }
                            : author
                    )
                }));
            },

            updateExpertise: (authorId, niche, updates) => {
                set(state => ({
                    authors: state.authors.map(author =>
                        author.id === authorId
                            ? {
                                ...author,
                                expertise: author.expertise.map(e =>
                                    e.niche === niche ? { ...e, ...updates } : e
                                ),
                                updatedAt: Date.now()
                            }
                            : author
                    )
                }));
            },

            removeExpertise: (authorId, niche) => {
                set(state => ({
                    authors: state.authors.map(author =>
                        author.id === authorId
                            ? {
                                ...author,
                                expertise: author.expertise.filter(e => e.niche !== niche),
                                updatedAt: Date.now()
                            }
                            : author
                    )
                }));
            },

            // ─────────────────────────────────────────────────────────────────
            // Site Assignment
            // ─────────────────────────────────────────────────────────────────

            assignToSite: (authorId, siteId) => {
                set(state => ({
                    authors: state.authors.map(author =>
                        author.id === authorId && !author.assignedSiteIds.includes(siteId)
                            ? {
                                ...author,
                                assignedSiteIds: [...author.assignedSiteIds, siteId],
                                updatedAt: Date.now()
                            }
                            : author
                    )
                }));
            },

            unassignFromSite: (authorId, siteId) => {
                set(state => ({
                    authors: state.authors.map(author =>
                        author.id === authorId
                            ? {
                                ...author,
                                assignedSiteIds: author.assignedSiteIds.filter(id => id !== siteId),
                                wpAuthorMappings: author.wpAuthorMappings.filter(m => m.siteId !== siteId),
                                updatedAt: Date.now()
                            }
                            : author
                    )
                }));
            },

            getAuthorsForSite: (siteId) => {
                return get().authors.filter(a =>
                    a.assignedSiteIds.includes(siteId) || a.assignedSiteIds.length === 0
                );
            },

            mapToWPUser: (authorId, mapping) => {
                set(state => ({
                    authors: state.authors.map(author =>
                        author.id === authorId
                            ? {
                                ...author,
                                wpAuthorMappings: [
                                    ...author.wpAuthorMappings.filter(m => m.siteId !== mapping.siteId),
                                    mapping
                                ],
                                updatedAt: Date.now()
                            }
                            : author
                    )
                }));
            },

            // ─────────────────────────────────────────────────────────────────
            // Matching
            // ─────────────────────────────────────────────────────────────────

            findBestAuthor: (criteria) => {
                const matches = get().findMatchingAuthors(criteria, 1);
                return matches.length > 0 ? matches[0] : null;
            },

            findMatchingAuthors: (criteria, limit = 5) => {
                const { authors } = get();

                // Filter by site if specified
                const eligibleAuthors = criteria.preferredSiteId
                    ? authors.filter(a =>
                        a.assignedSiteIds.includes(criteria.preferredSiteId!) ||
                        a.assignedSiteIds.length === 0
                    )
                    : authors;

                // Score and sort
                const matches = eligibleAuthors
                    .map(author => matchAuthorToTopic(author, criteria))
                    .sort((a, b) => b.matchScore - a.matchScore)
                    .slice(0, limit);

                return matches;
            },

            // ─────────────────────────────────────────────────────────────────
            // Stats
            // ─────────────────────────────────────────────────────────────────

            incrementArticleCount: (authorId, wordCount) => {
                set(state => ({
                    authors: state.authors.map(author =>
                        author.id === authorId
                            ? {
                                ...author,
                                articlesPublished: author.articlesPublished + 1,
                                totalWordCount: author.totalWordCount + wordCount,
                                updatedAt: Date.now()
                            }
                            : author
                    )
                }));
            },

            updateAverageEEATScore: (authorId, newScore) => {
                const author = get().getAuthor(authorId);
                if (!author) return;

                const currentAvg = author.averageEEATScore || 0;
                const total = author.articlesPublished || 1;
                const newAvg = ((currentAvg * (total - 1)) + newScore) / total;

                set(state => ({
                    authors: state.authors.map(a =>
                        a.id === authorId
                            ? { ...a, averageEEATScore: Math.round(newAvg), updatedAt: Date.now() }
                            : a
                    )
                }));
            },

            // ─────────────────────────────────────────────────────────────────
            // UI
            // ─────────────────────────────────────────────────────────────────

            selectAuthor: (id) => {
                set({ selectedAuthorId: id });
            },

            setError: (error) => {
                set({ error });
            },
        }),
        {
            name: 'ifrit-authors',
            partialize: (state) => ({
                authors: state.authors,
            }),
        }
    )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectAllAuthors = (state: AuthorState) => state.authors;
export const selectAuthorById = (id: string) => (state: AuthorState) =>
    state.authors.find(a => a.id === id);
export const selectSelectedAuthor = (state: AuthorState) =>
    state.authors.find(a => a.id === state.selectedAuthorId);
export const selectAuthorsByNiche = (niche: string) => (state: AuthorState) =>
    state.authors.filter(a =>
        a.primaryNiche.toLowerCase().includes(niche.toLowerCase()) ||
        a.expertise.some(e => e.niche.toLowerCase().includes(niche.toLowerCase()))
    );
