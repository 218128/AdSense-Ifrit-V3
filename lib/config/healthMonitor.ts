/**
 * Health Monitor - Service health checking
 * 
 * Provides health status for all configured services.
 * Part of the Enterprise Configuration Hub.
 */

// ============ TYPES ============

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unconfigured' | 'unknown';

export interface ServiceHealth {
    status: HealthStatus;
    lastCheck: number;
    latency?: number;
    error?: string;
    message?: string;
}

export interface HealthCheckResult {
    services: Record<string, ServiceHealth>;
    overall: HealthStatus;
    timestamp: number;
}

// ============ HEALTH CHECK FUNCTIONS ============

/**
 * Check if an AI provider is healthy
 */
export async function checkProviderHealth(
    providerId: string,
    apiKey: string
): Promise<ServiceHealth> {
    if (!apiKey) {
        return { status: 'unconfigured', lastCheck: Date.now(), message: 'No API key configured' };
    }

    const start = Date.now();

    try {
        const response = await fetch('/api/ai-providers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'validate',
                provider: providerId,
                apiKey,
            }),
        });

        const data = await response.json();
        const latency = Date.now() - start;

        if (data.valid) {
            return {
                status: 'healthy',
                lastCheck: Date.now(),
                latency,
                message: `Valid (${data.models?.length || 0} models available)`,
            };
        }

        return {
            status: 'unhealthy',
            lastCheck: Date.now(),
            latency,
            error: data.error || 'Validation failed',
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            lastCheck: Date.now(),
            error: error instanceof Error ? error.message : 'Network error',
        };
    }
}

/**
 * Check if GitHub integration is healthy
 */
export async function checkGitHubHealth(token: string): Promise<ServiceHealth> {
    if (!token) {
        return { status: 'unconfigured', lastCheck: Date.now(), message: 'No token configured' };
    }

    const start = Date.now();

    try {
        const response = await fetch('/api/github-setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'validate', token }),
        });

        const data = await response.json();
        const latency = Date.now() - start;

        if (data.success) {
            return {
                status: 'healthy',
                lastCheck: Date.now(),
                latency,
                message: `Connected as ${data.user || 'user'}`,
            };
        }

        return {
            status: 'unhealthy',
            lastCheck: Date.now(),
            latency,
            error: data.error || 'Validation failed',
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            lastCheck: Date.now(),
            error: error instanceof Error ? error.message : 'Network error',
        };
    }
}

/**
 * Check if Vercel integration is healthy
 */
export async function checkVercelHealth(token: string): Promise<ServiceHealth> {
    if (!token) {
        return { status: 'unconfigured', lastCheck: Date.now(), message: 'No token configured' };
    }

    const start = Date.now();

    try {
        const response = await fetch('/api/vercel-setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'validate', token }),
        });

        const data = await response.json();
        const latency = Date.now() - start;

        if (data.success) {
            return {
                status: 'healthy',
                lastCheck: Date.now(),
                latency,
                message: `Connected as ${data.user || 'user'}`,
            };
        }

        return {
            status: 'unhealthy',
            lastCheck: Date.now(),
            latency,
            error: data.error || 'Validation failed',
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            lastCheck: Date.now(),
            error: error instanceof Error ? error.message : 'Network error',
        };
    }
}

/**
 * Check MCP server health
 */
export async function checkMCPHealth(serverId: string, apiKey?: string): Promise<ServiceHealth> {
    const start = Date.now();

    try {
        const response = await fetch('/api/mcp/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serverId, apiKey }),
        });

        const data = await response.json();
        const latency = Date.now() - start;

        if (data.success) {
            return {
                status: 'healthy',
                lastCheck: Date.now(),
                latency,
                message: `${data.tools?.length || 0} tools available`,
            };
        }

        return {
            status: data.requiresKey ? 'unconfigured' : 'unhealthy',
            lastCheck: Date.now(),
            latency,
            error: data.error,
            message: data.requiresKey ? 'API key required' : undefined,
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            lastCheck: Date.now(),
            error: error instanceof Error ? error.message : 'Network error',
        };
    }
}

// ============ UTILITY FUNCTIONS ============

/**
 * Calculate overall health from individual services
 */
export function calculateOverallHealth(services: Record<string, ServiceHealth>): HealthStatus {
    const statuses = Object.values(services);

    if (statuses.length === 0) return 'unknown';

    const unhealthyCount = statuses.filter(s => s.status === 'unhealthy').length;
    const healthyCount = statuses.filter(s => s.status === 'healthy').length;
    const configuredCount = statuses.filter(s => s.status !== 'unconfigured').length;

    if (configuredCount === 0) return 'unconfigured';
    if (unhealthyCount > configuredCount / 2) return 'unhealthy';
    if (healthyCount === configuredCount) return 'healthy';
    return 'degraded';
}

/**
 * Get status color for UI
 */
export function getHealthColor(status: HealthStatus): string {
    switch (status) {
        case 'healthy': return 'green';
        case 'degraded': return 'yellow';
        case 'unhealthy': return 'red';
        case 'unconfigured': return 'gray';
        default: return 'gray';
    }
}

/**
 * Get status icon name (Lucide)
 */
export function getHealthIcon(status: HealthStatus): string {
    switch (status) {
        case 'healthy': return 'CheckCircle2';
        case 'degraded': return 'AlertCircle';
        case 'unhealthy': return 'XCircle';
        case 'unconfigured': return 'Circle';
        default: return 'HelpCircle';
    }
}
