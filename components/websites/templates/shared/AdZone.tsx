/**
 * AdZone Component
 * 
 * Strategic ad placement wrapper for AdSense integration.
 * Provides responsive ad slots with placeholder or real AdSense code.
 */

import React from 'react';

export type AdFormat = 'display' | 'native' | 'in-article' | 'in-feed' | 'anchor';
export type AdSize = 'responsive' | 'leaderboard' | 'rectangle' | 'skyscraper';

interface AdZoneProps {
    id: string;
    format?: AdFormat;
    size?: AdSize;
    className?: string;
    minHeight?: number;
    showLabel?: boolean;
    adClient?: string;  // ca-pub-xxx
    adSlot?: string;    // slot ID
}

const SIZE_CLASSES: Record<AdSize, string> = {
    responsive: 'w-full min-h-[100px]',
    leaderboard: 'w-full max-w-[728px] h-[90px]',
    rectangle: 'w-[300px] h-[250px]',
    skyscraper: 'w-[160px] h-[600px]'
};

export default function AdZone({
    id,
    format = 'display',
    size = 'responsive',
    className = '',
    minHeight = 100,
    showLabel = true,
    adClient,
    adSlot
}: AdZoneProps) {
    const hasAdSense = adClient && adSlot;

    // If AdSense is configured, render actual ad
    if (hasAdSense) {
        return (
            <div
                id={`ad-${id}`}
                className={`ad-zone ${SIZE_CLASSES[size]} ${className}`}
                style={{ minHeight }}
            >
                {showLabel && (
                    <div className="text-xs text-gray-400 text-center mb-1">
                        Advertisement
                    </div>
                )}
                <ins
                    className="adsbygoogle"
                    style={{ display: 'block' }}
                    data-ad-client={adClient}
                    data-ad-slot={adSlot}
                    data-ad-format={format === 'in-article' ? 'fluid' : 'auto'}
                    data-full-width-responsive="true"
                />
            </div>
        );
    }

    // Placeholder for development/preview
    return (
        <div
            id={`ad-${id}`}
            className={`ad-zone-placeholder ${SIZE_CLASSES[size]} ${className}
                        bg-gradient-to-br from-gray-100 to-gray-200 
                        border-2 border-dashed border-gray-300 
                        rounded-lg flex items-center justify-center`}
            style={{ minHeight }}
        >
            <div className="text-center text-gray-400">
                <div className="text-sm font-medium">Ad Zone: {id}</div>
                <div className="text-xs">{format} • {size}</div>
            </div>
        </div>
    );
}

// Preset ad zones for common placements
export const AdZones = {
    AboveFold: () => (
        <AdZone id="above-fold" format="display" size="leaderboard" />
    ),
    Sidebar: () => (
        <AdZone id="sidebar" format="display" size="rectangle" />
    ),
    InArticle: () => (
        <AdZone id="in-article" format="in-article" size="responsive" showLabel={false} />
    ),
    InFeed: () => (
        <AdZone id="in-feed" format="in-feed" size="responsive" minHeight={150} />
    ),
    Footer: () => (
        <AdZone id="footer" format="display" size="leaderboard" />
    )
};
