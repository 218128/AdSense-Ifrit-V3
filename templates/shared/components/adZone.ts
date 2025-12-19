/**
 * Ad Zone Component Generator
 * Smart ad placements for AdSense
 */

export interface AdZoneConfig {
    adsensePublisherId?: string;
}

/**
 * Generate Ad Zone component
 */
export function generateAdZone(): string {
    return `
// Ad Zone Component - Smart AdSense placement
'use client';
import { useEffect, useRef, useState } from 'react';

type AdPlacement = 'header' | 'sidebar' | 'in-article' | 'footer' | 'between-posts';

function AdZone({ 
    placement,
    className = ''
}: { 
    placement: AdPlacement;
    className?: string;
}) {
    const adRef = useRef<HTMLDivElement>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        // Check if AdSense is available
        if (typeof window !== 'undefined' && (window as any).adsbygoogle && adRef.current) {
            try {
                ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
                setLoaded(true);
            } catch (e) {
                console.error('AdSense error:', e);
            }
        }
    }, []);

    // Don't render in development
    if (process.env.NODE_ENV === 'development') {
        return (
            <div className={\`ad-zone ad-zone--\${placement} \${className}\`}>
                <div className="ad-placeholder">
                    <span>Ad: {placement}</span>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={adRef}
            className={\`ad-zone ad-zone--\${placement} \${className}\`}
            aria-label="Advertisement"
        >
            <ins
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-format="auto"
                data-full-width-responsive="true"
            />
        </div>
    );
}`;
}

/**
 * Generate In-Article Ad component
 */
export function generateInArticleAd(): string {
    return `
// In-Article Ad - Appears after specific paragraph count
function InArticleAd({ paragraphNumber = 3 }: { paragraphNumber?: number }) {
    return (
        <div className="ad-zone ad-zone--in-article" data-after-paragraph={paragraphNumber}>
            {process.env.NODE_ENV === 'development' ? (
                <div className="ad-placeholder">
                    <span>In-Article Ad</span>
                </div>
            ) : (
                <ins
                    className="adsbygoogle"
                    style={{ display: 'block', textAlign: 'center' }}
                    data-ad-layout="in-article"
                    data-ad-format="fluid"
                />
            )}
        </div>
    );
}`;
}

/**
 * Generate Ad Zone CSS
 */
export function generateAdZoneStyles(): string {
    return `
/* Ad Zones */
.ad-zone {
    margin: 1.5rem 0;
    min-height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.ad-zone--header {
    margin: 0 0 1rem;
}
.ad-zone--sidebar {
    position: sticky;
    top: 2rem;
}
.ad-zone--in-article {
    margin: 2rem auto;
    max-width: 640px;
}
.ad-zone--footer {
    margin: 2rem 0 0;
}
.ad-zone--between-posts {
    margin: 1rem 0;
    padding: 0.5rem;
    background: var(--color-bg-alt);
    border-radius: 0.5rem;
}

/* Development placeholder */
.ad-placeholder {
    width: 100%;
    padding: 2rem;
    background: repeating-linear-gradient(
        45deg,
        #f3f4f6,
        #f3f4f6 10px,
        #e5e7eb 10px,
        #e5e7eb 20px
    );
    border: 2px dashed #9ca3af;
    border-radius: 0.5rem;
    text-align: center;
    color: #6b7280;
    font-size: 0.875rem;
}
`;
}
