'use client';

/**
 * Site Decisions Panel
 * View and manage AI-generated configuration decisions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSettingsStore, ProviderId } from '@/stores/settingsStore';

interface AIDecision {
    value: string;
    reasoning: string;
    enabled?: boolean;
    frequency?: number;
    count?: number;
}

interface Decisions {
    template?: AIDecision;
    homepageLayout?: AIDecision;
    articleGridStyle?: AIDecision;
    headerStyle?: AIDecision;
    footerStyle?: AIDecision;
    cardStyle?: AIDecision;
    buttonStyle?: AIDecision;
    newsletterPlacement?: AIDecision;
    articleLayout?: AIDecision;
    typographyMood?: AIDecision;
    colorApproach?: AIDecision;
    overallStrategy?: string;
    adZones?: Record<string, AIDecision & { enabled: boolean }>;
    trustSignals?: Record<string, AIDecision & { enabled: boolean }>;
}

interface DecisionRecord {
    decisions: Decisions;
    generatedAt: number;
    profileUsed: {
        domain: string;
        niche: string;
    };
}

interface SiteDecisionsPanelProps {
    domain: string;
    onRefresh: () => void;
}

export default function SiteDecisionsPanel({ domain, onRefresh }: SiteDecisionsPanelProps) {
    const [record, setRecord] = useState<DecisionRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Load decisions
    const loadDecisions = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/websites/${domain}/ai-config`);
            const data = await response.json();
            if (data.existingDecisions) {
                setRecord(data.existingDecisions);
            }
        } catch (error) {
            console.error('Failed to load decisions:', error);
        } finally {
            setLoading(false);
        }
    }, [domain]);

    useEffect(() => {
        loadDecisions();
    }, [loadDecisions]);

    // Auto-generate decisions
    const handleAutoGenerate = useCallback(async () => {
        setGenerating(true);
        setMessage(null);

        try {
            // Get API keys from settingsStore (unified key access pattern)
            const { providerKeys, enabledProviders } = useSettingsStore.getState();
            const apiKeys: Record<string, string[]> = {};
            const providers: ProviderId[] = ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'];

            for (const provider of providers) {
                if (enabledProviders.includes(provider)) {
                    const keys = providerKeys[provider];
                    if (keys?.length > 0) {
                        apiKeys[provider] = keys.map(k => k.key);
                    }
                }
            }

            const hasAnyKeys = Object.values(apiKeys).some(keys => keys.length > 0);
            if (!hasAnyKeys) {
                setMessage({ type: 'error', text: 'No AI API keys configured. Add them in Settings → AI Providers.' });
                setGenerating(false);
                return;
            }

            const response = await fetch(`/api/websites/${domain}/ai-config/auto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKeys, strategy: 'rotate' }),
            });

            const data = await response.json();

            if (data.success) {
                setMessage({ type: 'success', text: `Decisions generated using ${data.provider}. ${data.tokensUsed || 0} tokens used.` });
                setRecord(data.decisions);
                onRefresh();
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to generate' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to generate decisions' });
        } finally {
            setGenerating(false);
        }
    }, [domain, onRefresh]);

    // Copy prompt for manual use
    const handleCopyPrompt = useCallback(async () => {
        try {
            const response = await fetch(`/api/websites/${domain}/ai-config`);
            const data = await response.json();
            if (data.prompt) {
                await navigator.clipboard.writeText(data.prompt);
                setMessage({ type: 'success', text: 'Prompt copied to clipboard!' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Failed to copy prompt' });
        }
    }, [domain]);

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading decisions...</div>;
    }

    return (
        <div style={{ padding: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>AI Configuration Decisions</h3>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        AI-optimized settings for maximum AdSense revenue
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={handleCopyPrompt} style={buttonStyle('secondary')}>
                        📋 Copy Prompt
                    </button>
                    <button onClick={handleAutoGenerate} disabled={generating} style={buttonStyle('primary', generating)}>
                        {generating ? '⏳ Generating...' : '🤖 Auto-Generate'}
                    </button>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div style={{
                    padding: '0.75rem 1rem',
                    background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                    color: message.type === 'success' ? '#065f46' : '#991b1b',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem',
                }}>
                    {message.text}
                </div>
            )}

            {/* No decisions yet */}
            {!record && (
                <div style={{ padding: '2rem', textAlign: 'center', background: '#f9fafb', borderRadius: '0.75rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
                    <h4 style={{ margin: '0 0 0.5rem' }}>No AI Decisions Yet</h4>
                    <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                        Generate optimized configuration using AI
                    </p>
                    <button onClick={handleAutoGenerate} disabled={generating} style={buttonStyle('primary', generating)}>
                        {generating ? '⏳ Generating...' : '🚀 Generate Decisions'}
                    </button>
                </div>
            )}

            {/* Decisions display */}
            {record && (
                <>
                    {/* Strategy overview */}
                    {record.decisions.overallStrategy && (
                        <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                            <strong>📊 Strategy:</strong> {record.decisions.overallStrategy}
                        </div>
                    )}

                    {/* Decision grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                        <DecisionCard title="Template" decision={record.decisions.template} />
                        <DecisionCard title="Homepage Layout" decision={record.decisions.homepageLayout} />
                        <DecisionCard title="Article Grid" decision={record.decisions.articleGridStyle} />
                        <DecisionCard title="Header Style" decision={record.decisions.headerStyle} />
                        <DecisionCard title="Footer Style" decision={record.decisions.footerStyle} />
                        <DecisionCard title="Card Style" decision={record.decisions.cardStyle} />
                        <DecisionCard title="Newsletter" decision={record.decisions.newsletterPlacement} />
                        <DecisionCard title="Typography" decision={record.decisions.typographyMood} />
                        <DecisionCard title="Article Layout" decision={record.decisions.articleLayout} />
                    </div>

                    {/* Ad Zones */}
                    {record.decisions.adZones && (
                        <div style={{ marginTop: '1.5rem' }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>💰 Ad Zone Placements</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                                {Object.entries(record.decisions.adZones).map(([key, zone]) => (
                                    <div key={key} style={{
                                        padding: '0.75rem',
                                        background: zone.enabled ? '#d1fae5' : '#f3f4f6',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.875rem',
                                    }}>
                                        <span style={{ fontWeight: 500 }}>{key}:</span> {zone.enabled ? '✅' : '❌'}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Trust Signals */}
                    {record.decisions.trustSignals && (
                        <div style={{ marginTop: '1.5rem' }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>🛡️ Trust Signals (E-E-A-T)</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                                {Object.entries(record.decisions.trustSignals).map(([key, signal]) => (
                                    <div key={key} style={{
                                        padding: '0.75rem',
                                        background: signal.enabled ? '#dbeafe' : '#f3f4f6',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.875rem',
                                    }}>
                                        <span style={{ fontWeight: 500 }}>{key}:</span> {signal.enabled ? '✅' : '❌'}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Metadata */}
                    <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                        Generated: {new Date(record.generatedAt).toLocaleString()} |
                        Profile: {record.profileUsed.niche} niche
                    </div>
                </>
            )}
        </div>
    );
}

// Helper components
function DecisionCard({ title, decision }: { title: string; decision?: AIDecision }) {
    if (!decision) return null;
    return (
        <div style={{ padding: '1rem', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{title}</div>
            <div style={{ color: '#3b82f6', fontWeight: 500, marginBottom: '0.5rem' }}>{decision.value}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{decision.reasoning}</div>
        </div>
    );
}

function buttonStyle(variant: 'primary' | 'secondary', disabled = false): React.CSSProperties {
    return {
        padding: '0.5rem 1rem',
        background: disabled ? '#9ca3af' : variant === 'primary' ? '#3b82f6' : '#f3f4f6',
        color: variant === 'primary' ? 'white' : '#374151',
        border: variant === 'secondary' ? '1px solid #e5e7eb' : 'none',
        borderRadius: '0.5rem',
        cursor: disabled ? 'wait' : 'pointer',
        fontSize: '0.875rem',
    };
}
