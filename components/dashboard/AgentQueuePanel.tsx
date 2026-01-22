'use client';

/**
 * Agent Queue Panel
 * 
 * Human-in-the-loop approval for AI agent decisions.
 * Wires lib/agents/contentOperationsAgent to the Dashboard.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Bot, RefreshCw, CheckCircle, XCircle, Play,
    ThumbsUp, ThumbsDown, Clock, AlertCircle, Zap
} from 'lucide-react';
import type { AgentDecision } from '@/lib/agents/contentOperationsAgent';

export function AgentQueuePanel() {
    const [pendingDecisions, setPendingDecisions] = useState<AgentDecision[]>([]);
    const [recentHistory, setRecentHistory] = useState<AgentDecision[]>([]);
    const [loading, setLoading] = useState(true);
    const [runningCycle, setRunningCycle] = useState(false);

    const loadDecisions = useCallback(async () => {
        setLoading(true);
        try {
            const {
                getPendingDecisions,
                getDecisionHistory,
            } = await import('@/lib/agents/contentOperationsAgent');

            setPendingDecisions(getPendingDecisions());
            setRecentHistory(getDecisionHistory(10).filter(d => d.status !== 'pending'));
        } catch (error) {
            console.error('Failed to load decisions:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleApprove = async (decisionId: string) => {
        const { approveDecision, executeDecision } = await import('@/lib/agents/contentOperationsAgent');
        approveDecision(decisionId);
        await executeDecision(decisionId, true);
        loadDecisions();
    };

    const handleReject = async (decisionId: string) => {
        const { rejectDecision } = await import('@/lib/agents/contentOperationsAgent');
        rejectDecision(decisionId);
        loadDecisions();
    };

    const runAgentCycle = async () => {
        setRunningCycle(true);
        try {
            const response = await fetch('/api/agents/run-cycle', { method: 'POST' });
            if (response.ok) {
                await loadDecisions();
            }
        } catch (error) {
            console.error('Agent cycle failed:', error);
        } finally {
            setRunningCycle(false);
        }
    };

    useEffect(() => {
        loadDecisions();
    }, [loadDecisions]);

    const getActionIcon = (action: AgentDecision['action']) => {
        const icons: Record<string, React.ReactNode> = {
            suggest_topic: '💡',
            update_content: '✏️',
            optimize_ads: '💰',
            flag_quality: '⚠️',
            expand_format: '📱',
            increase_frequency: '📈',
            decrease_frequency: '📉',
            archive_content: '📦',
        };
        return icons[action] || '🤖';
    };

    const getPriorityColor = (priority: AgentDecision['priority']) => {
        const colors = {
            critical: 'bg-red-100 text-red-700 border-red-200',
            high: 'bg-orange-100 text-orange-700 border-orange-200',
            medium: 'bg-amber-100 text-amber-700 border-amber-200',
            low: 'bg-green-100 text-green-700 border-green-200',
        };
        return colors[priority];
    };

    const getStatusBadge = (status: AgentDecision['status']) => {
        const configs = {
            pending: { color: 'bg-blue-100 text-blue-700', icon: <Clock className="w-3 h-3" /> },
            approved: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
            rejected: { color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
            executed: { color: 'bg-purple-100 text-purple-700', icon: <Zap className="w-3 h-3" /> },
        };
        const config = configs[status];
        return (
            <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${config.color}`}>
                {config.icon}
                {status}
            </span>
        );
    };

    const getConfidenceBar = (confidence: number) => {
        const getColor = () => {
            if (confidence >= 80) return 'bg-green-500';
            if (confidence >= 60) return 'bg-amber-500';
            return 'bg-red-500';
        };

        return (
            <div className="w-20 h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div
                    className={`h-full ${getColor()}`}
                    style={{ width: `${confidence}%` }}
                />
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold">Agent Decision Queue</h3>
                    {pendingDecisions.length > 0 && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                            {pendingDecisions.length} pending
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadDecisions}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-neutral-50"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={runAgentCycle}
                        disabled={runningCycle}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                        <Play className={`w-4 h-4 ${runningCycle ? 'animate-pulse' : ''}`} />
                        {runningCycle ? 'Running...' : 'Run Analysis'}
                    </button>
                </div>
            </div>

            {/* Pending Decisions */}
            <div className="bg-white border rounded-xl p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    Pending Approval
                </h4>
                {pendingDecisions.length > 0 ? (
                    <div className="space-y-3">
                        {pendingDecisions.map((decision) => (
                            <div
                                key={decision.id}
                                className={`p-4 rounded-lg border ${getPriorityColor(decision.priority)}`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">{getActionIcon(decision.action)}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium capitalize">
                                                {decision.action.replace(/_/g, ' ')}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(decision.priority)}`}>
                                                {decision.priority}
                                            </span>
                                        </div>
                                        <p className="text-sm text-neutral-600 mb-2">
                                            {decision.reasoning}
                                        </p>
                                        {decision.target && (
                                            <p className="text-xs text-neutral-500">
                                                Target: <span className="font-mono">{decision.target}</span>
                                            </p>
                                        )}
                                        <div className="flex items-center gap-4 mt-3">
                                            <div className="flex items-center gap-2 text-xs text-neutral-500">
                                                <span>Confidence:</span>
                                                {getConfidenceBar(decision.confidence)}
                                                <span>{decision.confidence}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleApprove(decision.id)}
                                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                                            title="Approve"
                                        >
                                            <ThumbsUp className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleReject(decision.id)}
                                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                                            title="Reject"
                                        >
                                            <ThumbsDown className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-neutral-500">
                        <Bot className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                        <p>No pending decisions</p>
                        <p className="text-sm mt-1">Click "Run Analysis" to trigger an agent cycle</p>
                    </div>
                )}
            </div>

            {/* Recent History */}
            {recentHistory.length > 0 && (
                <div className="bg-white border rounded-xl p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-neutral-500" />
                        Recent Decisions
                    </h4>
                    <div className="space-y-2">
                        {recentHistory.map((decision) => (
                            <div
                                key={decision.id}
                                className="flex items-center gap-3 p-2 bg-neutral-50 rounded-lg"
                            >
                                <span className="text-lg">{getActionIcon(decision.action)}</span>
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium capitalize">
                                        {decision.action.replace(/_/g, ' ')}
                                    </span>
                                    {decision.target && (
                                        <span className="text-xs text-neutral-500 ml-2">
                                            → {decision.target}
                                        </span>
                                    )}
                                </div>
                                {getStatusBadge(decision.status)}
                                <span className="text-xs text-neutral-400">
                                    {new Date(decision.suggestedAt).toLocaleDateString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AgentQueuePanel;
