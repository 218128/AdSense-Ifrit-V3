/**
 * Domain Analysis API
 * 
 * Analyze a domain for acquisition suitability.
 * Returns scoring, Wayback history, spam check, and recommendations.
 * 
 * FLOW:
 * 1. If Spamzilla data provided → use its Wayback flags (fast)
 * 2. Else → call DIY Wayback check (slower)
 * 3. Always → DNS blacklist check
 * 
 * STATUS STREAMING:
 * If sessionId is provided, emits real-time status events via SSE
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    scoreDomain,
    parseDomain,
    DomainMetrics,
    WaybackData,
} from '@/lib/domains/domainScorer';
import { checkDomainHistory, estimateAgeFromWayback } from '@/lib/domains/waybacker';
import { checkDomainSpam, domainLooksTrustworthy } from '@/lib/domains/spamChecker';
import { statusEmitter } from '@/app/api/status/stream/route';

export const dynamic = 'force-dynamic';

interface AnalyzeRequest {
    domain: string;
    targetNiche?: string;
    skipWayback?: boolean;
    quickMode?: boolean;  // Skip Wayback for faster results
    sessionId?: string;   // For status streaming
    // Spamzilla data (if already enriched)
    spamzillaData?: {
        wasAdult?: boolean;
        wasCasino?: boolean;
        wasPBN?: boolean;
        hadSpam?: boolean;
        domainAge?: number;
        firstCapture?: string;
    };
}

interface BlacklistResult {
    domain: string;
    listed: boolean;
    details: { zone: string; name: string; listed: boolean; returnCode?: string }[];
}

export async function POST(request: NextRequest) {
    // Generate action ID for this analysis
    const actionId = `analyze_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    try {
        const body: AnalyzeRequest = await request.json();

        // Create status tracker if sessionId provided
        const tracker = body.sessionId
            ? statusEmitter.createTracker(body.sessionId, actionId, `Analyze: ${body.domain}`, 'domain')
            : null;

        if (!body.domain) {
            tracker?.fail('Domain is required');
            return NextResponse.json({
                success: false,
                error: 'Domain is required'
            }, { status: 400 });
        }

        // Clean domain
        const domain = body.domain
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/.*$/, '')
            .trim();

        // Validate domain format
        if (!isValidDomain(domain)) {
            tracker?.fail('Invalid domain format');
            return NextResponse.json({
                success: false,
                error: 'Invalid domain format'
            }, { status: 400 });
        }

        tracker?.step('Domain Validation', 'success', `Valid format, TLD: .${domain.split('.').pop()}`);

        // Parse domain
        const { tld, length } = parseDomain(domain);

        // Build initial metrics
        const metrics: DomainMetrics = {
            domain,
            tld,
            length,
        };

        // Run analyses in parallel - spam, trust, and blacklist
        // (running status removed - only report final results)

        const [spamResult, trustResult, blacklistResult] = await Promise.all([
            checkDomainSpam(domain),
            Promise.resolve(domainLooksTrustworthy(domain)),
            checkBlacklist(domain),
        ]);

        // Emit spam check result
        if (spamResult.isSpammy) {
            tracker?.step('Spam Check', 'fail', spamResult.issues?.map(i => i.description).join(', ') || 'Spam detected');
        } else {
            tracker?.step('Spam Check', 'success', 'No spam indicators found');
        }

        // Emit trust check result
        if (trustResult.trustworthy) {
            tracker?.step('Trust Check', 'success', trustResult.positives?.slice(0, 2).join(', ') || 'Good trust signals');
        } else {
            tracker?.step('Trust Check', 'warning', trustResult.negatives?.slice(0, 2).join(', ') || 'Low trust score');
        }

        // Emit blacklist check result
        if (blacklistResult?.listed) {
            const zones = blacklistResult.details?.filter(d => d.listed).map(d => d.name).join(', ') || 'DNS blacklist';
            tracker?.step('Blacklist Check', 'fail', `Listed in: ${zones}`);
        } else {
            tracker?.step('Blacklist Check', 'success', 'Not listed in any DNS blacklist');
        }

        // Wayback check - USE SPAMZILLA DATA IF AVAILABLE
        let waybackData: WaybackData | null = null;
        let waybackSource: 'spamzilla' | 'archive.org' | 'skipped' = 'skipped';

        if (body.spamzillaData) {
            // Use Spamzilla's pre-processed Wayback data (FAST!)
            waybackData = {
                hasHistory: true,
                wasAdult: body.spamzillaData.wasAdult,
                wasCasino: body.spamzillaData.wasCasino,
                wasPBN: body.spamzillaData.wasPBN,
                hadSpam: body.spamzillaData.hadSpam,
                firstCaptureDate: body.spamzillaData.firstCapture,
            };
            metrics.domainAge = body.spamzillaData.domainAge;
            waybackSource = 'spamzilla';

            // Emit wayback status from Spamzilla
            const issues = [];
            if (waybackData.wasAdult) issues.push('Was adult');
            if (waybackData.wasCasino) issues.push('Was casino');
            if (waybackData.wasPBN) issues.push('Was PBN');
            if (waybackData.hadSpam) issues.push('Had spam');

            if (issues.length > 0) {
                tracker?.step('History Check (Spamzilla)', 'fail', issues.join(', '));
            } else {
                tracker?.step('History Check (Spamzilla)', 'success', `Clean history, age: ${body.spamzillaData.domainAge || 'unknown'} years`);
            }
        } else if (!body.quickMode && !body.skipWayback) {
            // Fallback to DIY Wayback check (SLOWER)
            // (running status removed - only report final results)
            try {
                waybackData = await checkDomainHistory(domain);
                if (waybackData?.firstCaptureDate) {
                    metrics.domainAge = estimateAgeFromWayback(waybackData);
                }
                waybackSource = 'archive.org';

                // Emit wayback result
                const issues = [];
                if (waybackData?.wasAdult) issues.push('Was adult');
                if (waybackData?.wasCasino) issues.push('Was casino');
                if (waybackData?.wasPBN) issues.push('Was PBN');
                if (waybackData?.hadSpam) issues.push('Had spam');

                if (issues.length > 0) {
                    tracker?.step('History Check', 'fail', issues.join(', '));
                } else if (waybackData?.hasHistory) {
                    tracker?.step('History Check', 'success', `Clean since ${waybackData.firstCaptureDate || 'unknown'}`);
                } else {
                    tracker?.step('History Check', 'warning', 'No Wayback history found');
                }
            } catch (error) {
                console.error('Wayback check failed:', error);
                tracker?.step('History Check', 'warning', 'Wayback API unavailable');
                // Continue without wayback data
            }
        } else {
            tracker?.step('History Check', 'skipped', body.quickMode ? 'Quick mode' : 'Skipped');
        }

        // Calculate score
        // (running status removed - only report final results)
        const score = scoreDomain(
            metrics,
            body.targetNiche,
            waybackData || undefined
        );

        // Emit score result
        const rec = score.recommendation;
        const emoji = rec === 'strong-buy' ? '🟢' : rec === 'buy' ? '🔵' : rec === 'consider' ? '🟡' : rec === 'avoid' ? '🔴' : '⚫';
        tracker?.step(`Score: ${score.overall}/100`, 'success', `${emoji} ${rec.replace('-', ' ').toUpperCase()}`);

        // Emit risks if any
        if (score.risks && score.risks.length > 0) {
            const riskDescriptions = score.risks.slice(0, 3).map(r => r.description);
            tracker?.step('Risk Factors', 'warning', riskDescriptions.join(', '));
        }

        // Complete action
        tracker?.complete(`${emoji} ${rec.replace('-', ' ').toUpperCase()} - Score: ${score.overall}/100`);

        return NextResponse.json({
            success: true,
            domain,
            metrics,
            score: {
                overall: score.overall,
                authority: score.authority,
                trustworthiness: score.trustworthiness,
                relevance: score.relevance,
                emailPotential: score.emailPotential,
                flipPotential: score.flipPotential,
                nameQuality: score.nameQuality,
                riskLevel: score.riskLevel,
                recommendation: score.recommendation,
                reasons: score.reasons,
                risks: score.risks,
                estimatedValue: score.estimatedValue,
                estimatedMonthlyRevenue: score.estimatedMonthlyRevenue,
            },
            wayback: waybackData ? {
                hasHistory: waybackData.hasHistory,
                firstCaptureDate: waybackData.firstCaptureDate,
                lastCaptureDate: waybackData.lastCaptureDate,
                totalCaptures: waybackData.totalCaptures,
                wasAdult: waybackData.wasAdult,
                wasCasino: waybackData.wasCasino,
                hadSpam: waybackData.hadSpam,
                wasPBN: waybackData.wasPBN,
            } : null,
            spam: {
                isSpammy: spamResult.isSpammy,
                spamScore: spamResult.spamScore,
                issues: spamResult.issues,
                blacklisted: spamResult.blacklisted,
            },
            trust: {
                trustworthy: trustResult.trustworthy,
                score: trustResult.score,
                positives: trustResult.positives,
                negatives: trustResult.negatives,
            },
            blacklist: blacklistResult,
            waybackSource,
            targetNiche: body.targetNiche,
        });

    } catch (error) {
        console.error('Domain analysis error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Analysis failed'
        }, { status: 500 });
    }
}

/**
 * GET - Quick domain check (no Wayback)
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const niche = searchParams.get('niche') || undefined;

    if (!domain) {
        return NextResponse.json({
            success: false,
            error: 'Domain parameter required'
        }, { status: 400 });
    }

    // Clean domain
    const cleanDomain = domain
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/.*$/, '')
        .trim();

    if (!isValidDomain(cleanDomain)) {
        return NextResponse.json({
            success: false,
            error: 'Invalid domain format'
        }, { status: 400 });
    }

    try {
        const { tld, length } = parseDomain(cleanDomain);

        const metrics: DomainMetrics = {
            domain: cleanDomain,
            tld,
            length,
        };

        const [spamResult, trustResult] = await Promise.all([
            checkDomainSpam(cleanDomain),
            Promise.resolve(domainLooksTrustworthy(cleanDomain)),
        ]);

        const score = scoreDomain(metrics, niche);

        return NextResponse.json({
            success: true,
            domain: cleanDomain,
            score: score.overall,
            recommendation: score.recommendation,
            riskLevel: score.riskLevel,
            isSpammy: spamResult.isSpammy,
            trustworthy: trustResult.trustworthy,
            estimatedValue: score.estimatedValue,
        });

    } catch (error) {
        console.error('Quick domain check error:', error);
        return NextResponse.json({
            success: false,
            error: 'Check failed'
        }, { status: 500 });
    }
}

/**
 * Validate domain format
 */
function isValidDomain(domain: string): boolean {
    // Basic domain validation
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

    if (!domainRegex.test(domain)) {
        return false;
    }

    // Check length
    if (domain.length < 4 || domain.length > 253) {
        return false;
    }

    // Must have at least one dot
    if (!domain.includes('.')) {
        return false;
    }

    return true;
}

/**
 * Check domain against DNS blacklists
 */
async function checkBlacklist(domain: string): Promise<BlacklistResult | null> {
    try {
        // Note: In server context, we can call the blacklist API internally
        // This is more efficient than making an HTTP request to ourselves
        const dns = await import('dns');
        const { promisify } = await import('util');
        const resolve4 = promisify(dns.resolve4);

        const cleanDomain = domain.toLowerCase().replace(/^www\./, '');
        const details: BlacklistResult['details'] = [];
        let listed = false;

        // Check Spamhaus DBL (Domain Block List)
        try {
            const queryDomain = `${cleanDomain}.dbl.spamhaus.org`;
            const addresses = await resolve4(queryDomain);
            if (addresses && addresses.length > 0) {
                listed = true;
                details.push({
                    zone: 'dbl.spamhaus.org',
                    name: 'Spamhaus DBL',
                    listed: true,
                    returnCode: addresses[0],
                });
            }
        } catch (error) {
            const err = error as NodeJS.ErrnoException;
            if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
                details.push({
                    zone: 'dbl.spamhaus.org',
                    name: 'Spamhaus DBL',
                    listed: false,
                });
            }
        }

        return {
            domain: cleanDomain,
            listed,
            details,
        };
    } catch (error) {
        console.error('Blacklist check error:', error);
        return null;
    }
}
