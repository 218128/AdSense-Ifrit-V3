'use client';

/**
 * Health Status Indicator Component
 * 
 * Shows visual health status for configured services.
 */

import { useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Circle, Loader2, RefreshCw } from 'lucide-react';
import type { ServiceHealth, HealthStatus } from '@/lib/config/healthMonitor';

interface HealthStatusIndicatorProps {
    serviceId: string;
    serviceName: string;
    health?: ServiceHealth;
    onCheck?: () => Promise<ServiceHealth>;
    showLabel?: boolean;
    size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<HealthStatus, { icon: React.ElementType; color: string; bgColor: string }> = {
    healthy: { icon: CheckCircle2, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    degraded: { icon: AlertCircle, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
    unhealthy: { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-500/10' },
    unconfigured: { icon: Circle, color: 'text-gray-400', bgColor: 'bg-gray-500/10' },
    unknown: { icon: Circle, color: 'text-gray-400', bgColor: 'bg-gray-500/10' },
};

export function HealthStatusIndicator({
    serviceId,
    serviceName,
    health,
    onCheck,
    showLabel = true,
    size = 'sm',
}: HealthStatusIndicatorProps) {
    const [checking, setChecking] = useState(false);
    const [localHealth, setLocalHealth] = useState<ServiceHealth | undefined>(health);

    const handleCheck = useCallback(async () => {
        if (!onCheck || checking) return;

        setChecking(true);
        try {
            const result = await onCheck();
            setLocalHealth(result);
        } finally {
            setChecking(false);
        }
    }, [onCheck, checking]);

    const currentHealth = localHealth || health;
    const status = currentHealth?.status || 'unconfigured';
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

    return (
        <div className="flex items-center gap-2">
            {/* Status Icon */}
            <div className={`flex items-center gap-1.5 ${config.bgColor} px-2 py-1 rounded-full`}>
                {checking ? (
                    <Loader2 className={`${iconSize} text-blue-500 animate-spin`} />
                ) : (
                    <Icon className={`${iconSize} ${config.color}`} />
                )}

                {showLabel && (
                    <span className={`text-xs font-medium ${config.color}`}>
                        {checking ? 'Checking...' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                )}
            </div>

            {/* Refresh Button */}
            {onCheck && !checking && (
                <button
                    onClick={handleCheck}
                    className="p-1 text-gray-400 hover:text-gray-200 rounded transition-colors"
                    title={`Check ${serviceName} health`}
                >
                    <RefreshCw className="w-3 h-3" />
                </button>
            )}

            {/* Latency/Error Info */}
            {currentHealth?.latency && status === 'healthy' && (
                <span className="text-xs text-gray-500">
                    {currentHealth.latency}ms
                </span>
            )}
            {currentHealth?.error && (
                <span className="text-xs text-red-400 truncate max-w-[150px]" title={currentHealth.error}>
                    {currentHealth.error}
                </span>
            )}
        </div>
    );
}

/**
 * Compact inline health dot (for tight spaces)
 */
export function HealthDot({ status }: { status: HealthStatus }) {
    const colors: Record<HealthStatus, string> = {
        healthy: 'bg-green-500',
        degraded: 'bg-yellow-500',
        unhealthy: 'bg-red-500',
        unconfigured: 'bg-gray-400',
        unknown: 'bg-gray-400',
    };

    return (
        <span
            className={`inline-block w-2 h-2 rounded-full ${colors[status]}`}
            title={status}
        />
    );
}

export default HealthStatusIndicator;
