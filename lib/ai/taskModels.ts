/**
 * Per-Task Model Selection
 * 
 * Allows assigning specific AI models to different tasks:
 * - Article generation (quality matters)
 * - SEO metadata (cheap and fast)
 * - Site planning (reasoning capability)
 * - Research queries (web search)
 * 
 * Persisted to localStorage
 */

import { ProviderId } from './providers/base';

// ============================================
// TYPES
// ============================================

export type TaskType =
    | 'articleGeneration'
    | 'seoMetadata'
    | 'sitePlanning'
    | 'imagePrompts'
    | 'researchQueries';

export interface TaskModelAssignment {
    providerId: ProviderId;
    modelId: string;
}

export type TaskModelConfig = Record<TaskType, TaskModelAssignment | null>;

// ============================================
// DEFAULTS
// ============================================

export const TASK_DESCRIPTIONS: Record<TaskType, { name: string; description: string; recommendation: string }> = {
    articleGeneration: {
        name: 'Article Generation',
        description: 'Writing blog posts and articles',
        recommendation: 'Use high-quality models (Gemini 2.5 Pro, Claude)'
    },
    seoMetadata: {
        name: 'SEO Metadata',
        description: 'Titles, descriptions, meta tags',
        recommendation: 'Fast models work well (DeepSeek Chat, Gemini Flash)'
    },
    sitePlanning: {
        name: 'Site Planning',
        description: 'Content strategy, category organization',
        recommendation: 'Reasoning models (DeepSeek R1, Gemini with Deep Think)'
    },
    imagePrompts: {
        name: 'Image Prompts',
        description: 'Generating prompts for cover images',
        recommendation: 'Any capable model works'
    },
    researchQueries: {
        name: 'Research Queries',
        description: 'Finding information, competitor analysis',
        recommendation: 'Web-search models (Perplexity Sonar)'
    }
};

const DEFAULT_CONFIG: TaskModelConfig = {
    articleGeneration: null,
    seoMetadata: null,
    sitePlanning: null,
    imagePrompts: null,
    researchQueries: null
};

// ============================================
// STORAGE
// ============================================

const STORAGE_KEY = 'ifrit_task_models';

/**
 * Load task model configuration from localStorage
 */
export function getTaskModelConfig(): TaskModelConfig {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return DEFAULT_CONFIG;

        const parsed = JSON.parse(stored);
        return { ...DEFAULT_CONFIG, ...parsed };
    } catch {
        return DEFAULT_CONFIG;
    }
}

/**
 * Save task model configuration to localStorage
 */
export function saveTaskModelConfig(config: TaskModelConfig): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * Set model for a specific task
 */
export function setTaskModel(
    taskType: TaskType,
    providerId: ProviderId,
    modelId: string
): void {
    const config = getTaskModelConfig();
    config[taskType] = { providerId, modelId };
    saveTaskModelConfig(config);
}

/**
 * Clear model assignment for a task (use default)
 */
export function clearTaskModel(taskType: TaskType): void {
    const config = getTaskModelConfig();
    config[taskType] = null;
    saveTaskModelConfig(config);
}

/**
 * Get model assignment for a specific task
 * Falls back to default provider model if no task-specific assignment
 */
export function getTaskModel(taskType: TaskType): TaskModelAssignment | null {
    const config = getTaskModelConfig();
    return config[taskType];
}

/**
 * Check if a task has a custom model assigned
 */
export function hasTaskModel(taskType: TaskType): boolean {
    const config = getTaskModelConfig();
    return config[taskType] !== null;
}

/**
 * Get all task types as array
 */
export function getAllTaskTypes(): TaskType[] {
    return Object.keys(TASK_DESCRIPTIONS) as TaskType[];
}
