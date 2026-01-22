/**
 * Content Operations Agent
 * FSD: lib/agents/contentOperationsAgent.ts
 *
 * Autonomous agent that analyzes performance data and makes
 * content optimization decisions with human-in-the-loop approval.
 */

import { engine } from '@/lib/core/Engine';
import type { ContentFreshness } from '@/lib/seo/contentFreshnessManager';

// ============================================================================
// Types
// ============================================================================

export type AgentAction =
    | 'suggest_topic'       // Suggest new content topics
    | 'update_content'      // Request content update
    | 'optimize_ads'        // Suggest ad placement changes
    | 'flag_quality'        // Flag content for quality review
    | 'expand_format'       // Convert to additional formats
    | 'increase_frequency'  // Increase publishing frequency
    | 'decrease_frequency'  // Decrease publishing frequency
    | 'archive_content';    // Suggest archiving old content

export interface AgentDecision {
    id: string;
    action: AgentAction;
    target?: string;           // Content ID, Campaign ID, or topic
    reasoning: string;
    confidence: number;        // 0-100
    requiresApproval: boolean;
    priority: 'low' | 'medium' | 'high' | 'critical';
    suggestedAt: Date;
    status: 'pending' | 'approved' | 'rejected' | 'executed';
}

export interface PerformanceMetrics {
    revenue: number;
    traffic: number;
    date: string;
}

export interface AgentContext {
    recentPerformance: PerformanceMetrics[];
    trendingTopics: string[];
    staleContent: ContentFreshness[];
    upcomingCampaigns: { id: string; name: string; nextRun: Date }[];
    totalContent: number;
    avgQualityScore: number;
}

export interface AgentCycleResult {
    decisions: AgentDecision[];
    reasoning: string;
    nextCycleRecommended: Date;
}

// ============================================================================
// Storage
// ============================================================================

const STORAGE_KEY = 'ifrit_agent_decisions';

function loadDecisions(): AgentDecision[] {
    if (typeof window === 'undefined') return [];

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored).map((d: AgentDecision) => ({
            ...d,
            suggestedAt: new Date(d.suggestedAt),
        }));
    } catch {
        return [];
    }
}

function saveDecisions(decisions: AgentDecision[]): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
    } catch {
        console.error('[Agent] Failed to save decisions');
    }
}

// ============================================================================
// Decision Generator
// ============================================================================

function generateId(): string {
    return `decision_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createDecision(
    action: AgentAction,
    reasoning: string,
    confidence: number,
    target?: string,
    priority: AgentDecision['priority'] = 'medium'
): AgentDecision {
    return {
        id: generateId(),
        action,
        target,
        reasoning,
        confidence,
        requiresApproval: confidence < 85, // High-confidence decisions can auto-execute
        priority,
        suggestedAt: new Date(),
        status: 'pending',
    };
}

// ============================================================================
// Analysis Functions
// ============================================================================

function analyzePerformanceTrend(metrics: PerformanceMetrics[]): {
    revenueTrend: 'up' | 'stable' | 'down';
    trafficTrend: 'up' | 'stable' | 'down';
    changePercent: number;
} {
    if (metrics.length < 2) {
        return { revenueTrend: 'stable', trafficTrend: 'stable', changePercent: 0 };
    }

    const recent = metrics.slice(-7);
    const previous = metrics.slice(-14, -7);

    const recentRevenue = recent.reduce((s, m) => s + m.revenue, 0);
    const previousRevenue = previous.reduce((s, m) => s + m.revenue, 0);
    const recentTraffic = recent.reduce((s, m) => s + m.traffic, 0);
    const previousTraffic = previous.reduce((s, m) => s + m.traffic, 0);

    const revenueChange = previousRevenue > 0
        ? ((recentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

    const trafficChange = previousTraffic > 0
        ? ((recentTraffic - previousTraffic) / previousTraffic) * 100
        : 0;

    return {
        revenueTrend: revenueChange > 5 ? 'up' : revenueChange < -5 ? 'down' : 'stable',
        trafficTrend: trafficChange > 5 ? 'up' : trafficChange < -5 ? 'down' : 'stable',
        changePercent: revenueChange,
    };
}

// ============================================================================
// Main Agent Cycle
// ============================================================================

const AGENT_PROMPT = `You are a content operations AI agent. Analyze the following data and suggest actions.

**Performance Data:**
{performance}

**Stale Content ({staleCount} items):**
{staleContent}

**Trending Topics:**
{trendingTopics}

**Current Stats:**
- Total content: {totalContent}
- Average quality score: {avgQuality}
- Upcoming campaigns: {campaignCount}

**Your Task:**
Analyze this data and suggest 2-5 actions to optimize content operations.
For each action, provide:
1. Action type (one of: suggest_topic, update_content, optimize_ads, flag_quality, expand_format, archive_content)
2. Target (content ID or topic)
3. Reasoning (1-2 sentences)
4. Confidence (0-100)
5. Priority (low/medium/high/critical)

**Output JSON format:**
{
  "decisions": [
    {
      "action": "update_content",
      "target": "content_id_or_topic",
      "reasoning": "Why this action is recommended",
      "confidence": 85,
      "priority": "high"
    }
  ],
  "overallAssessment": "Brief summary of content health"
}`;

/**
 * Run an agent analysis cycle.
 */
export async function runAgentCycle(context: AgentContext): Promise<AgentCycleResult> {
    console.log('[Agent] Starting analysis cycle...');

    const { revenueTrend, trafficTrend, changePercent } = analyzePerformanceTrend(context.recentPerformance);

    // Build prompt
    const prompt = AGENT_PROMPT
        .replace('{performance}', `Revenue: ${revenueTrend} (${changePercent.toFixed(1)}%), Traffic: ${trafficTrend}`)
        .replace('{staleCount}', String(context.staleContent.length))
        .replace('{staleContent}', context.staleContent.slice(0, 5).map(c =>
            `- ${c.title} (score: ${c.freshnessScore}, action: ${c.suggestedAction})`
        ).join('\n'))
        .replace('{trendingTopics}', context.trendingTopics.slice(0, 5).join(', ') || 'None detected')
        .replace('{totalContent}', String(context.totalContent))
        .replace('{avgQuality}', String(context.avgQualityScore))
        .replace('{campaignCount}', String(context.upcomingCampaigns.length));

    try {
        const result = await engine.execute({
            capability: 'generate',
            prompt,
            context: { outputFormat: 'json' },
        });

        // Parse AI response
        const jsonMatch = result.text?.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, result.text];
        const parsed = JSON.parse(jsonMatch[1] || '{}');

        const decisions: AgentDecision[] = (parsed.decisions || []).map((d: {
            action: AgentAction;
            target?: string;
            reasoning: string;
            confidence: number;
            priority?: AgentDecision['priority'];
        }) => createDecision(
            d.action,
            d.reasoning,
            d.confidence,
            d.target,
            d.priority || 'medium'
        ));

        // Save decisions
        const existing = loadDecisions();
        saveDecisions([...existing, ...decisions]);

        // Determine next cycle time based on activity
        const nextCycle = new Date();
        nextCycle.setHours(nextCycle.getHours() + (decisions.length > 3 ? 12 : 24));

        return {
            decisions,
            reasoning: parsed.overallAssessment || 'Analysis complete',
            nextCycleRecommended: nextCycle,
        };
    } catch (error) {
        console.error('[Agent] Cycle failed:', error);
        return {
            decisions: [],
            reasoning: 'Agent cycle failed',
            nextCycleRecommended: new Date(Date.now() + 60 * 60 * 1000), // Retry in 1 hour
        };
    }
}

/**
 * Get pending decisions awaiting approval.
 */
export function getPendingDecisions(): AgentDecision[] {
    return loadDecisions().filter(d => d.status === 'pending');
}

/**
 * Approve a decision.
 */
export function approveDecision(decisionId: string): boolean {
    const decisions = loadDecisions();
    const decision = decisions.find(d => d.id === decisionId);

    if (decision) {
        decision.status = 'approved';
        saveDecisions(decisions);
        return true;
    }
    return false;
}

/**
 * Reject a decision.
 */
export function rejectDecision(decisionId: string): boolean {
    const decisions = loadDecisions();
    const decision = decisions.find(d => d.id === decisionId);

    if (decision) {
        decision.status = 'rejected';
        saveDecisions(decisions);
        return true;
    }
    return false;
}

/**
 * Execute an approved decision.
 */
export async function executeDecision(
    decisionId: string,
    humanApproved: boolean = true
): Promise<{ success: boolean; result?: unknown; error?: string }> {
    const decisions = loadDecisions();
    const decision = decisions.find(d => d.id === decisionId);

    if (!decision) {
        return { success: false, error: 'Decision not found' };
    }

    if (decision.requiresApproval && !humanApproved) {
        return { success: false, error: 'Decision requires human approval' };
    }

    try {
        // Execute based on action type
        switch (decision.action) {
            case 'suggest_topic':
                // Return the suggested topic for manual review
                return {
                    success: true,
                    result: { suggestedTopic: decision.target, reasoning: decision.reasoning }
                };

            case 'update_content':
                // Mark for update (actual update done by user)
                decision.status = 'executed';
                saveDecisions(decisions);
                return {
                    success: true,
                    result: { contentId: decision.target, action: 'marked_for_update' }
                };

            case 'archive_content':
                decision.status = 'executed';
                saveDecisions(decisions);
                return {
                    success: true,
                    result: { contentId: decision.target, action: 'marked_for_archive' }
                };

            default:
                decision.status = 'executed';
                saveDecisions(decisions);
                return {
                    success: true,
                    result: { action: decision.action, message: 'Action logged for manual execution' }
                };
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Execution failed'
        };
    }
}

/**
 * Get decision history.
 */
export function getDecisionHistory(limit: number = 50): AgentDecision[] {
    return loadDecisions()
        .sort((a, b) => new Date(b.suggestedAt).getTime() - new Date(a.suggestedAt).getTime())
        .slice(0, limit);
}

/**
 * Clear old executed decisions.
 */
export function cleanupOldDecisions(daysOld: number = 30): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const decisions = loadDecisions();
    const remaining = decisions.filter(d =>
        d.status === 'pending' || new Date(d.suggestedAt) > cutoff
    );

    const removed = decisions.length - remaining.length;
    saveDecisions(remaining);
    return removed;
}
