/**
 * Logger Utility
 * 
 * Centralized logging with environment-aware behavior.
 * In development: logs to console
 * In production: can be extended to log to external services
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
    /** Module/component name for prefixing */
    module?: string;
    /** Additional metadata */
    data?: Record<string, unknown>;
}

const isDev = process.env.NODE_ENV === 'development';

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
};

// Emoji prefixes for different modules
const moduleEmoji: Record<string, string> = {
    SiteBuilder: '🏗️',
    ContentGenerator: '📝',
    TrendScanner: '🔍',
    GitHub: '🐙',
    Vercel: '▲',
    Publish: '📤',
    Revalidate: '🔄',
    Namecheap: '🌐',
};

function formatMessage(level: LogLevel, message: string, options?: LogOptions): string {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
    const emoji = options?.module ? (moduleEmoji[options.module] || '📋') : '';
    const prefix = options?.module ? `[${options.module}]` : '';

    if (isDev) {
        return `${colors.dim}${timestamp}${colors.reset} ${emoji} ${prefix} ${message}`;
    }
    return `${timestamp} ${prefix} ${message}`;
}

/**
 * Main logger object
 */
export const logger = {
    /**
     * Debug level - only shown in development
     */
    debug(message: string, options?: LogOptions): void {
        if (isDev) {
            console.log(formatMessage('debug', message, options));
        }
    },

    /**
     * Info level - general information
     */
    info(message: string, options?: LogOptions): void {
        console.log(formatMessage('info', message, options));
    },

    /**
     * Warning level - potential issues
     */
    warn(message: string, options?: LogOptions): void {
        console.warn(`${colors.yellow}⚠️${colors.reset} ${formatMessage('warn', message, options)}`);
    },

    /**
     * Error level - errors that need attention
     */
    error(message: string, error?: Error, options?: LogOptions): void {
        console.error(`${colors.red}❌${colors.reset} ${formatMessage('error', message, options)}`);
        if (error && isDev) {
            console.error(error);
        }
    },

    /**
     * Success indicator - for completed operations
     */
    success(message: string, options?: LogOptions): void {
        console.log(`${colors.green}✅${colors.reset} ${formatMessage('info', message, options)}`);
    },

    /**
     * Progress indicator - for multi-step operations
     */
    progress(step: string, options?: LogOptions): void {
        console.log(`${colors.cyan}   ✓${colors.reset} ${formatMessage('info', step, options)}`);
    },
};

/**
 * Create a module-specific logger
 */
export function createLogger(module: string) {
    return {
        debug: (message: string) => logger.debug(message, { module }),
        info: (message: string) => logger.info(message, { module }),
        warn: (message: string) => logger.warn(message, { module }),
        error: (message: string, error?: Error) => logger.error(message, error, { module }),
        success: (message: string) => logger.success(message, { module }),
        progress: (step: string) => logger.progress(step, { module }),
    };
}

// Pre-configured loggers for common modules
export const siteBuilderLogger = createLogger('SiteBuilder');
export const contentLogger = createLogger('ContentGenerator');
export const trendLogger = createLogger('TrendScanner');
export const publishLogger = createLogger('Publish');
