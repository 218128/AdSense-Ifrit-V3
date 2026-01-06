/**
 * useDomainImport Hook
 * 
 * Manages domain import state and operations.
 * Extracted from ExpiredDomainFinder for reusability.
 */

import { useState, useCallback } from 'react';
import { parseDomains, fetchFreeDomains as fetchFreeDomainsAPI } from '@/lib/domains/api';
import { parseSpamZillaCSV, SpamZillaDomain, SpamZillaImportResult } from '@/lib/domains/spamzillaParser';
import { scoreDomain, parseDomain } from '@/lib/domains/domainScorer';
import type { DomainItem, ActionRequired } from '@/lib/domains/types';

// ============ TYPES ============

export interface UseDomainImportReturn {
    // Manual import
    manualDomains: DomainItem[];
    manualInput: string;
    setManualInput: (value: string) => void;
    isParsingManual: boolean;
    parseManualDomains: () => Promise<void>;
    clearManual: () => void;

    // Free scraping
    freeDomains: DomainItem[];
    freeLoading: boolean;
    freeError: string | null;
    freeActionRequired: ActionRequired | null;
    fetchFreeDomains: (keywords?: string) => Promise<void>;

    // SpamZilla CSV
    spamzillaDomains: DomainItem[];
    spamzillaImportStats: SpamZillaImportResult['stats'] | null;
    spamzillaPreset: string;

    // External/Owned domains (no API call, just list)
    externalDomains: DomainItem[];
    addExternalDomains: (domains: string[]) => void;
    clearExternal: () => void;

    // CSV upload handler (auto-detects format)
    handleCSVUpload: (file: File) => Promise<void>;

    // Combined
    allDomains: DomainItem[];
}

// ============ HELPERS ============

function calculateOverallScore(sz: SpamZillaDomain): number {
    let score = 0;
    score += Math.min(30, sz.trustFlow * 1.5);
    score += Math.min(25, sz.domainAuthority * 0.5);
    score += Math.max(0, 25 - sz.szScore);
    score += Math.min(10, sz.tfCfRatio * 10);
    score += Math.min(10, (sz.age || 0) * 0.5);
    return Math.round(Math.min(100, score));
}

function estimateValue(sz: SpamZillaDomain): number {
    let value = 50;
    if (sz.qualityTier === 'gold') value += 200;
    else if (sz.qualityTier === 'silver') value += 100;
    else if (sz.qualityTier === 'bronze') value += 50;
    value += sz.trustFlow * 5;
    value += sz.domainAuthority * 3;
    if (sz.tld === 'com') value *= 1.5;
    return Math.round(value);
}

function spamZillaToDomainItem(sz: SpamZillaDomain): DomainItem {
    return {
        domain: sz.domain,
        tld: sz.tld,
        source: 'spamzilla',
        status: 'unknown',
        trustFlow: sz.trustFlow,
        citationFlow: sz.citationFlow,
        tfCfRatio: sz.tfCfRatio,
        domainRating: sz.domainAuthority,
        domainAge: sz.age,
        backlinks: sz.backlinks,
        referringDomains: sz.referringDomains,
        szScore: sz.szScore,
        szDrops: sz.szDrops,
        szActiveHistory: sz.szActiveHistory,
        qualityTier: sz.qualityTier,
        adsenseReady: sz.adsenseReady,
        price: sz.price,
        auctionSource: sz.auctionSource,
        enriched: true,
        fetchedAt: Date.now(),
        score: {
            overall: calculateOverallScore(sz),
            recommendation: sz.qualityTier === 'gold' ? 'strong-buy' :
                sz.qualityTier === 'silver' ? 'buy' :
                    sz.qualityTier === 'bronze' ? 'consider' : 'avoid',
            riskLevel: sz.szScore <= 10 ? 'low' : sz.szScore <= 15 ? 'medium' : 'high',
            estimatedValue: estimateValue(sz),
        },
    };
}

// ============ HOOK ============

export function useDomainImport(): UseDomainImportReturn {
    // Manual import state
    const [manualDomains, setManualDomains] = useState<DomainItem[]>([]);
    const [manualInput, setManualInput] = useState('');
    const [isParsingManual, setIsParsingManual] = useState(false);

    // Free scraping state
    const [freeDomains, setFreeDomains] = useState<DomainItem[]>([]);
    const [freeLoading, setFreeLoading] = useState(false);
    const [freeError, setFreeError] = useState<string | null>(null);
    const [freeActionRequired, setFreeActionRequired] = useState<ActionRequired | null>(null);

    // SpamZilla state
    const [spamzillaDomains, setSpamzillaDomains] = useState<DomainItem[]>([]);
    const [spamzillaImportStats, setSpamzillaImportStats] = useState<SpamZillaImportResult['stats'] | null>(null);
    const [spamzillaPreset, setSpamzillaPreset] = useState<string>('');

    // External/Owned domains state
    const [externalDomains, setExternalDomains] = useState<DomainItem[]>([]);

    // Parse manual text input
    const parseManualDomains = useCallback(async () => {
        if (!manualInput.trim()) return;

        setIsParsingManual(true);
        try {
            const data = await parseDomains(manualInput);
            if (data.success && data.domains) {
                const parsed: DomainItem[] = data.domains.map((d: { domain: string; tld: string }) => ({
                    ...d,
                    source: 'manual' as const,
                    status: 'unknown' as const,
                    fetchedAt: Date.now(),
                }));

                const scored = parsed.map(d => {
                    const { tld, length } = parseDomain(d.domain);
                    const scoreResult = scoreDomain({ domain: d.domain, tld, length, dataSource: 'free-api' });
                    return { ...d, score: scoreResult };
                });

                setManualDomains(prev => {
                    const existing = new Set(prev.map(d => d.domain));
                    const newDomains = scored.filter(d => !existing.has(d.domain));
                    return [...prev, ...newDomains];
                });
                setManualInput('');
            }
        } catch (error) {
            console.error('Parse error:', error);
        } finally {
            setIsParsingManual(false);
        }
    }, [manualInput]);

    const clearManual = useCallback(() => {
        setManualDomains([]);
        setManualInput('');
    }, []);

    // Fetch from free sources
    const fetchFreeDomains = useCallback(async (keywords?: string) => {
        setFreeLoading(true);
        setFreeError(null);
        setFreeActionRequired(null);

        try {
            const data = await fetchFreeDomainsAPI(keywords);

            if (data.success && data.domains) {
                const domains: DomainItem[] = data.domains.map((d: DomainItem) => {
                    const { tld, length } = parseDomain(d.domain);
                    const scoreResult = scoreDomain({ domain: d.domain, tld, length, dataSource: 'free-api' });
                    return {
                        ...d,
                        source: 'free' as const,
                        status: 'unknown' as const,
                        fetchedAt: Date.now(),
                        score: scoreResult,
                    };
                });
                setFreeDomains(domains);
            } else {
                setFreeError(data.error || 'Failed to fetch domains');
                if (data.actionRequired) {
                    setFreeActionRequired(data.actionRequired);
                }
            }
        } catch (error) {
            setFreeError(error instanceof Error ? error.message : 'Network error');
        } finally {
            setFreeLoading(false);
        }
    }, []);

    // Handle CSV upload (auto-detects SpamZilla vs plain)
    const handleCSVUpload = useCallback(async (file: File) => {
        return new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                const filename = file.name;

                // Detect SpamZilla format
                const firstLine = content.split('\n')[0];
                const isSpamZillaFormat = firstLine.includes('TF') && firstLine.includes('SZ Score');

                if (isSpamZillaFormat) {
                    try {
                        const result = parseSpamZillaCSV(content, filename);
                        const domainItems = result.domains.map(spamZillaToDomainItem);

                        setSpamzillaDomains(prev => {
                            const existing = new Set(prev.map(d => d.domain));
                            const newDomains = domainItems.filter(d => !existing.has(d.domain));
                            return [...prev, ...newDomains];
                        });
                        setSpamzillaImportStats(result.stats);
                        setSpamzillaPreset(result.preset);

                        console.log(`[SpamZilla Import] ${result.domains.length} domains imported`);
                    } catch (error) {
                        console.error('[SpamZilla Import] Error:', error);
                        setManualInput(prev => prev + '\n' + content);
                    }
                } else {
                    // Plain CSV - add to manual input
                    setManualInput(prev => prev + '\n' + content);
                }
                resolve();
            };
            reader.readAsText(file);
        });
    }, []);

    // Add external/owned domains (no API call, just add to list)
    const addExternalDomains = useCallback((domains: string[]) => {
        const validDomains = domains
            .map(d => d.trim().toLowerCase())
            .filter(d => /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/.test(d));

        const newItems: DomainItem[] = validDomains.map(domain => {
            const { tld, length } = parseDomain(domain);
            const scoreResult = scoreDomain({ domain, tld, length, dataSource: 'manual' });
            return {
                domain,
                tld,
                source: 'external' as const,
                status: 'owned' as const,
                fetchedAt: Date.now(),
                score: scoreResult,
            };
        });

        setExternalDomains(prev => {
            const existing = new Set(prev.map(d => d.domain));
            const unique = newItems.filter(d => !existing.has(d.domain));
            return [...prev, ...unique];
        });
    }, []);

    const clearExternal = useCallback(() => {
        setExternalDomains([]);
    }, []);

    // Combine all domains
    const allDomains = [...manualDomains, ...freeDomains, ...spamzillaDomains, ...externalDomains];

    return {
        // Manual
        manualDomains,
        manualInput,
        setManualInput,
        isParsingManual,
        parseManualDomains,
        clearManual,
        // Free
        freeDomains,
        freeLoading,
        freeError,
        freeActionRequired,
        fetchFreeDomains,
        // SpamZilla
        spamzillaDomains,
        spamzillaImportStats,
        spamzillaPreset,
        // External/Owned
        externalDomains,
        addExternalDomains,
        clearExternal,
        // Upload
        handleCSVUpload,
        // Combined
        allDomains,
    };
}
