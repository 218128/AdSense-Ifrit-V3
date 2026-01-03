/**
 * GlobalActionStatus - Fixed position panel showing all actions
 * 
 * Enterprise-grade action status display:
 * - Shows every action with step-by-step breakdown
 * - Persists until new user action
 * - Color-coded phases (running/success/error)
 * - Collapsible and minimizable
 * 
 * @module components/shared/GlobalActionStatus
 */

'use client';

import React, { useState } from 'react';
import {
    CheckCircle,
    XCircle,
    Loader2,
    ChevronDown,
    ChevronUp,
    X,
    Minus,
    Plus,
    Clock,
    Activity,
} from 'lucide-react';
import { useGlobalActionStatusStore } from '@/stores/globalActionStatusStore';
import type { GlobalActionEntry, ActionStep, ActionPhase } from '@/lib/shared/types/globalActionStatus';

// ============================================
// Helper Components
// ============================================

/**
 * Phase icon component
 */
const PhaseIcon: React.FC<{ phase: ActionPhase; size?: number; className?: string }> = ({
    phase,
    size = 16,
    className = '',
}) => {
    const iconClass = `${className}`;

    switch (phase) {
        case 'running':
            return <Loader2 size={size} className={`${iconClass} animate-spin text-purple-500`} />;
        case 'success':
            return <CheckCircle size={size} className={`${iconClass} text-green-500`} />;
        case 'error':
            return <XCircle size={size} className={`${iconClass} text-red-500`} />;
        default:
            return <Clock size={size} className={`${iconClass} text-gray-400`} />;
    }
};

/**
 * Format duration in ms to human readable
 */
const formatDuration = (ms?: number): string => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
};

/**
 * Format timestamp to time string
 */
const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
};

/**
 * Get background color class for phase
 */
const getPhaseBackground = (phase: ActionPhase): string => {
    switch (phase) {
        case 'running':
            return 'bg-purple-50 border-purple-200';
        case 'success':
            return 'bg-green-50 border-green-200';
        case 'error':
            return 'bg-red-50 border-red-200';
        default:
            return 'bg-gray-50 border-gray-200';
    }
};

// ============================================
// ActionStep Component
// ============================================

interface ActionStepItemProps {
    step: ActionStep;
    showDuration: boolean;
}

const ActionStepItem: React.FC<ActionStepItemProps> = ({ step, showDuration }) => {
    return (
        <div className="flex items-center gap-2 text-xs text-gray-600 pl-6 py-0.5">
            <PhaseIcon phase={step.phase} size={12} />
            <span className="flex-1">{step.message}</span>
            {showDuration && step.durationMs && (
                <span className="text-gray-400 font-mono text-[10px]">
                    {formatDuration(step.durationMs)}
                </span>
            )}
        </div>
    );
};

// ============================================
// ActionEntry Component
// ============================================

interface ActionEntryItemProps {
    action: GlobalActionEntry;
    showTimestamps: boolean;
    showDuration: boolean;
    expandSteps: boolean;
}

const ActionEntryItem: React.FC<ActionEntryItemProps> = ({
    action,
    showTimestamps,
    showDuration,
    expandSteps,
}) => {
    // Force expand by default - always show steps
    const [isExpanded, setIsExpanded] = useState(true);
    const hasSteps = action.steps.length > 0;

    return (
        <div
            className={`rounded-lg border p-3 mb-2 transition-all ${getPhaseBackground(action.phase)}`}
        >
            {/* Header */}
            <div className="flex items-start gap-2">
                <PhaseIcon phase={action.phase} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">{action.name}</span>
                        {showDuration && action.durationMs && (
                            <span className="text-xs text-gray-500 font-mono">
                                {formatDuration(action.durationMs)}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">{action.message}</p>
                    {action.error && (
                        <p className="text-xs text-red-600 mt-1 font-mono">{action.error}</p>
                    )}
                </div>
                {showTimestamps && (
                    <span className="text-[10px] text-gray-400 font-mono shrink-0">
                        {formatTime(action.startedAt)}
                    </span>
                )}
                {hasSteps && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-0.5 hover:bg-gray-200 rounded shrink-0"
                    >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                )}
            </div>

            {/* Progress bar */}
            {action.progress && (
                <div className="mt-2">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-purple-500 transition-all"
                            style={{
                                width: `${(action.progress.current / action.progress.total) * 100}%`,
                            }}
                        />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5 text-right">
                        {action.progress.current} / {action.progress.total}
                    </p>
                </div>
            )}

            {/* Steps */}
            {hasSteps && isExpanded && (
                <div className="mt-2 border-t border-gray-200 pt-2">
                    {action.steps.map((step) => (
                        <ActionStepItem
                            key={step.id}
                            step={step}
                            showDuration={showDuration}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// ============================================
// Main Component
// ============================================

/**
 * GlobalActionStatus Panel
 * 
 * Fixed position panel in bottom-right showing all tracked actions.
 */
export const GlobalActionStatus: React.FC = () => {
    const {
        actions,
        config,
        isMinimized,
        toggleMinimize,
        clearActions,
    } = useGlobalActionStatusStore();

    // Debug: log render state
    console.log('[GlobalActionStatus UI] Rendering with', actions.length, 'actions',
        actions.length > 0 ? `First: ${actions[0]?.name}, Steps: ${actions[0]?.steps?.length}` : '');

    // Don't render if no actions
    if (actions.length === 0) {
        console.log('[GlobalActionStatus UI] No actions - returning null');
        return null;
    }

    // Count by phase
    const runningCount = actions.filter(a => a.phase === 'running').length;
    const successCount = actions.filter(a => a.phase === 'success').length;
    const errorCount = actions.filter(a => a.phase === 'error').length;

    return (
        <div
            className="fixed bottom-4 right-4 z-50 w-80 max-h-[60vh] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
            data-testid="global-action-status"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                <div className="flex items-center gap-2">
                    <Activity size={16} />
                    <span className="font-semibold text-sm">Actions</span>
                    <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">
                        {actions.length}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {/* Status counts */}
                    {runningCount > 0 && (
                        <span className="text-xs bg-purple-500 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Loader2 size={10} className="animate-spin" />
                            {runningCount}
                        </span>
                    )}
                    {successCount > 0 && (
                        <span className="text-xs bg-green-500 px-1.5 py-0.5 rounded">
                            ✓ {successCount}
                        </span>
                    )}
                    {errorCount > 0 && (
                        <span className="text-xs bg-red-500 px-1.5 py-0.5 rounded">
                            ✕ {errorCount}
                        </span>
                    )}
                    {/* Controls */}
                    <button
                        onClick={toggleMinimize}
                        className="p-1 hover:bg-white/20 rounded ml-2"
                        title={isMinimized ? 'Expand' : 'Minimize'}
                    >
                        {isMinimized ? <Plus size={14} /> : <Minus size={14} />}
                    </button>
                    <button
                        onClick={clearActions}
                        className="p-1 hover:bg-white/20 rounded"
                        title="Clear all"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Content */}
            {!isMinimized && (
                <div className="p-3 max-h-[calc(60vh-48px)] overflow-y-auto">
                    {actions.slice(0, config.maxVisible).map((action) => (
                        <ActionEntryItem
                            key={action.id}
                            action={action}
                            showTimestamps={config.showTimestamps}
                            showDuration={config.showDuration}
                            expandSteps={config.expandSteps}
                        />
                    ))}
                    {actions.length > config.maxVisible && (
                        <p className="text-xs text-gray-500 text-center mt-2">
                            +{actions.length - config.maxVisible} more actions
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalActionStatus;
