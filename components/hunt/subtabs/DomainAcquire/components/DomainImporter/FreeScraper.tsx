/**
 * FreeScraper Component
 * 
 * Button and status for scraping free domain sources.
 * Pure presentational component.
 */

'use client';

import {
    Globe,
    Search,
    Loader2,
    AlertTriangle,
    ExternalLink
} from 'lucide-react';
import type { ActionRequired } from '@/lib/domains/types';

// ============ PROPS ============

export interface FreeScraperProps {
    /** Trigger fetch action */
    onFetch: () => void;
    /** Loading state */
    isLoading: boolean;
    /** Number of domains found */
    foundCount: number;
    /** Error message if any */
    error: string | null;
    /** Action required info */
    actionRequired: ActionRequired | null;
}

// ============ COMPONENT ============

export function FreeScraper({
    onFetch,
    isLoading,
    foundCount,
    error,
    actionRequired,
}: FreeScraperProps) {
    return (
        <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <Globe className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-sm text-blue-800">
                    Free Scraping
                </span>
                <span className="text-xs text-blue-500 ml-auto">
                    🆓 Public Sources
                </span>
            </div>

            {/* Content */}
            <div className="space-y-3">
                <p className="text-xs text-blue-600">
                    Scrapes expiredomains.io for expired domain listings.
                    May be rate-limited or blocked.
                </p>

                {/* Fetch button */}
                <button
                    onClick={onFetch}
                    disabled={isLoading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Scraping...
                        </>
                    ) : (
                        <>
                            <Search className="w-4 h-4" />
                            Search Free Sources
                        </>
                    )}
                </button>

                {/* Loading status */}
                {isLoading && (
                    <div className="text-xs text-blue-500">
                        ⏳ Connecting to expiredomains.io...
                    </div>
                )}

                {/* Success count */}
                {foundCount > 0 && !isLoading && (
                    <div className="text-xs text-green-600">
                        ✅ {foundCount} domains found
                    </div>
                )}

                {/* Error display */}
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <div className="text-xs">
                                <p className="text-red-700 font-medium">{error}</p>
                                {actionRequired && (
                                    <div className="mt-2 text-red-600">
                                        <p className="font-medium">{actionRequired.message}</p>
                                        <p className="mt-1">{actionRequired.action}</p>
                                        {actionRequired.url && (
                                            <a
                                                href={actionRequired.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:underline"
                                            >
                                                Open Site <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
