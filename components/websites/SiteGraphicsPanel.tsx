'use client';

/**
 * Site Graphics Panel
 * Manages website graphics (logo, favicon, OG images)
 */

import React, { useState, useCallback } from 'react';

interface SiteGraphics {
    logo?: string;
    favicon?: string;
    ogImage?: string;
    generatedAt?: number;
    themeColors?: { primary: string; secondary: string };
}

interface SiteGraphicsPanelProps {
    domain: string;
    siteName: string;
    graphics?: SiteGraphics;
    onRefresh: () => void;
}

export default function SiteGraphicsPanel({
    domain,
    siteName,
    graphics,
    onRefresh
}: SiteGraphicsPanelProps) {
    const [regenerating, setRegenerating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleRegenerate = useCallback(async () => {
        setRegenerating(true);
        setMessage(null);
        try {
            const response = await fetch(`/api/websites/${domain}/graphics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'regenerate' })
            });
            const data = await response.json();
            if (data.success) {
                setMessage({ type: 'success', text: 'Graphics regenerated! Deploy to apply.' });
                onRefresh();
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to regenerate' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Failed to regenerate graphics' });
        } finally {
            setRegenerating(false);
        }
    }, [domain, onRefresh]);

    const formatDate = (ts?: number) => ts ? new Date(ts).toLocaleDateString() : 'Never';

    return (
        <div style={{ padding: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Site Graphics</h3>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        Logo, favicon, and social sharing images
                    </p>
                </div>
                <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    style={{
                        padding: '0.5rem 1rem',
                        background: regenerating ? '#9ca3af' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: regenerating ? 'wait' : 'pointer'
                    }}
                >
                    {regenerating ? '⏳ Regenerating...' : '🔄 Regenerate All'}
                </button>
            </div>

            {/* Message */}
            {message && (
                <div style={{
                    padding: '0.75rem 1rem',
                    background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                    color: message.type === 'success' ? '#065f46' : '#991b1b',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem'
                }}>
                    {message.text}
                </div>
            )}

            {/* Theme Colors */}
            {graphics?.themeColors && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 24, height: 24, borderRadius: 4, background: graphics.themeColors.primary }} />
                        <span style={{ fontSize: '0.875rem' }}>Primary: {graphics.themeColors.primary}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 24, height: 24, borderRadius: 4, background: graphics.themeColors.secondary }} />
                        <span style={{ fontSize: '0.875rem' }}>Secondary: {graphics.themeColors.secondary}</span>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#9ca3af' }}>
                        Generated: {formatDate(graphics.generatedAt)}
                    </span>
                </div>
            )}

            {/* Graphics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                <GraphicCard title="Logo" description="Full logo with site name" previewUrl={graphics?.logo} aspect="wide" />
                <GraphicCard title="Favicon" description="Browser tab icon" previewUrl={graphics?.favicon} aspect="square" />
                <GraphicCard title="OG Image" description="Social sharing (1200×630)" previewUrl={graphics?.ogImage} aspect="og" />
            </div>

            {/* Instructions */}
            <div style={{ marginTop: '2rem', padding: '1rem', background: '#eff6ff', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#1e40af' }}>
                <strong>💡 Tips:</strong>
                <ul style={{ margin: '0.5rem 0 0 1.5rem' }}>
                    <li>Click &quot;Regenerate All&quot; to create new graphics from theme</li>
                    <li>Graphics are SVG-based for crisp display at any size</li>
                    <li>Deploy after changes to update live site</li>
                </ul>
            </div>
        </div>
    );
}

function GraphicCard({ title, description, previewUrl, aspect }: {
    title: string;
    description: string;
    previewUrl?: string;
    aspect: 'square' | 'wide' | 'og';
}) {
    const aspectRatio = { square: '1 / 1', wide: '5 / 1', og: '1200 / 630' }[aspect];

    return (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{title}</h4>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>{description}</p>

            <div style={{
                aspectRatio,
                background: '#f3f4f6',
                borderRadius: '0.5rem',
                marginTop: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: aspect === 'wide' ? '60px' : '100px',
                overflow: 'hidden'
            }}>
                {previewUrl ? (
                    <img src={previewUrl} alt={title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                    <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>📁 Not generated</span>
                )}
            </div>

            {previewUrl && (
                <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
                    <a href={previewUrl} download style={{ fontSize: '0.75rem', color: '#6b7280' }}>⬇️ Download</a>
                </div>
            )}
        </div>
    );
}
