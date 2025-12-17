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

export const dynamic = 'force-dynamic';

interface AnalyzeRequest {
    domain: string;
    targetNiche?: string;
    skipWayback?: boolean;
    quickMode?: boolean;  // Skip Wayback for faster results
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
    try {
        const body: AnalyzeRequest = await request.json();

        if (!body.domain) {
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
            return NextResponse.json({
                success: false,
                error: 'Invalid domain format'
            }, { status: 400 });
        }

        // Parse domain
        const { tld, length } = parseDomain(domain);

        // Build initial metrics
        const metrics: DomainMetrics = {
            domain,
            tld,
            length,
        };

        // Run analyses in parallel - spam, trust, and blacklist
        const [spamResult, trustResult, blacklistResult] = await Promise.all([
            checkDomainSpam(domain),
            Promise.resolve(domainLooksTrustworthy(domain)),
            checkBlacklist(domain),
        ]);

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
        } else if (!body.quickMode && !body.skipWayback) {
            // Fallback to DIY Wayback check (SLOWER)
            try {
                waybackData = await checkDomainHistory(domain);
                if (waybackData?.firstCaptureDate) {
                    metrics.domainAge = estimateAgeFromWayback(waybackData);
                }
                waybackSource = 'archive.org';
            } catch (error) {
                console.error('Wayback check failed:', error);
                // Continue without wayback data
            }
        }

        // Calculate score
        const score = scoreDomain(
            metrics,
            body.targetNiche,
            waybackData || undefined
        );

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
