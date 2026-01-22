/**
 * Agents Module - Barrel Export
 * FSD: lib/agents/index.ts
 */

export type {
    AgentAction,
    AgentDecision,
    PerformanceMetrics,
    AgentContext,
    AgentCycleResult,
} from './contentOperationsAgent';

export {
    runAgentCycle,
    getPendingDecisions,
    approveDecision,
    rejectDecision,
    executeDecision,
    getDecisionHistory,
    cleanupOldDecisions,
} from './contentOperationsAgent';
