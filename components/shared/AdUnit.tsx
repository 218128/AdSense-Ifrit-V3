'use client';

import { useEffect } from 'react';

interface AdUnitProps {
    slot: string;
    format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
    responsive?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

declare global {
    interface Window {
        adsbygoogle: object[];
    }
}

/**
 * AdSense Ad Unit Component
 * 
 * Renders actual AdSense ads in production, or a placeholder in development.
 * 
 * @param slot - AdSense ad slot ID
 * @param format - Ad format (auto, rectangle, horizontal, vertical)
 * @param responsive - Whether the ad should be responsive
 * @param className - Additional CSS classes
 * @param style - Inline styles
 */
export default function AdUnit({
    slot,
    format = 'auto',
    responsive = true,
    className = '',
    style
}: AdUnitProps) {
    const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID;

    useEffect(() => {
        // Only push ads if AdSense ID is configured
        if (!adsenseId) return;

        try {
            // Push ad after component mounts
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (error) {
            console.error('AdSense initialization error:', error);
        }
    }, [adsenseId]);

    // Development placeholder when no AdSense ID is configured
    if (!adsenseId) {
        return (
            <div
                className={`bg-neutral-100 border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center ${className}`}
                style={style}
            >
                <div className="text-neutral-400">
                    <p className="text-sm font-medium mb-1">AdSense Placeholder</p>
                    <p className="text-xs">Slot: {slot} | Format: {format}</p>
                    <p className="text-xs mt-2 text-neutral-300">
                        Set NEXT_PUBLIC_ADSENSE_ID to enable ads
                    </p>
                </div>
            </div>
        );
    }

    return (
        <ins
            className={`adsbygoogle ${className}`}
            style={{ display: 'block', ...style }}
            data-ad-client={adsenseId}
            data-ad-slot={slot}
            data-ad-format={format}
            data-full-width-responsive={responsive.toString()}
        />
    );
}

/**
 * Leaderboard Ad Unit (728x90)
 */
export function LeaderboardAd({ slot, className = '' }: { slot: string; className?: string }) {
    return (
        <AdUnit
            slot={slot}
            format="horizontal"
            className={`min-h-[90px] ${className}`}
        />
    );
}

/**
 * Rectangle Ad Unit (300x250)
 */
export function RectangleAd({ slot, className = '' }: { slot: string; className?: string }) {
    return (
        <AdUnit
            slot={slot}
            format="rectangle"
            className={`min-h-[250px] ${className}`}
        />
    );
}

/**
 * In-Article Ad Unit
 */
export function InArticleAd({ slot, className = '' }: { slot: string; className?: string }) {
    return (
        <AdUnit
            slot={slot}
            format="auto"
            responsive={true}
            className={`my-8 ${className}`}
        />
    );
}

/**
 * Multiplex Ad Unit (Native ads grid)
 */
export function MultiplexAd({ slot, className = '' }: { slot: string; className?: string }) {
    return (
        <AdUnit
            slot={slot}
            format="auto"
            className={`min-h-[250px] ${className}`}
        />
    );
}
