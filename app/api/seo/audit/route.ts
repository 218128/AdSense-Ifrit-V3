/**
 * SEO Audit API
 * 
 * Performs comprehensive SEO analysis on articles.
 * Merges best logic from lib/seo/trafficAcquisition.ts with article metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getArticle } from '@/lib/websiteStore';
import {
    auditArticleSEO,
    suggestInternalLinks,
    suggestBacklinkOpportunities,
    SEOIssue
} from '@/lib/seo/trafficAcquisition';

interface SEOAuditResult {
    score: number;
    issues: SEOIssue[];
    internalLinkSuggestions?: Array<{
        targetSlug: string;
        anchorText: string;
        relevanceScore: number;
    }>;
    backlinkStrategies?: string[];
}

interface ArticleMeta {
    title?: string;
    description?: string;
    content: string;
    keyword?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { articleSlug, domain, keyword } = body;

        if (!articleSlug) {
            return NextResponse.json({
                success: false,
                error: 'Article slug is required'
            }, { status: 400 });
        }

        let articleContent: string | null = null;
        let articleMeta: ArticleMeta | null = null;

        if (domain) {
            const article = getArticle(domain, articleSlug);
            if (article) {
                articleContent = article.content;
                articleMeta = article as ArticleMeta;
            }
        } else {
            return NextResponse.json({
                success: false,
                error: 'Domain is required to locate the article'
            }, { status: 400 });
        }

        if (!articleContent) {
            return NextResponse.json({
                success: false,
                error: `Article not found: ${articleSlug}`
            }, { status: 404 });
        }

        // Use the enhanced audit from trafficAcquisition module
        // This includes: keyword checks, FAQ detection, strict H2 requirements
        const targetKeyword = keyword || articleMeta?.title?.split(' ').slice(0, 3).join(' ') || articleSlug;

        // Build content string with frontmatter for the lib function
        const fullContent = `---
title: "${articleMeta?.title || ''}"
description: "${articleMeta?.description || ''}"
---
${articleContent}`;

        // Get enhanced audit from lib module
        const libAudit = auditArticleSEO(fullContent, targetKeyword);

        // Additional API-level checks not in lib module
        const additionalIssues: SEOIssue[] = [];
        let additionalDeduction = 0;

        // Check for images (not in lib audit)
        const imageCount = (articleContent.match(/!\[/g) || []).length;
        if (imageCount === 0) {
            additionalIssues.push({
                type: 'info',
                message: 'No images found',
                fix: 'Add relevant images with descriptive alt text'
            });
            additionalDeduction += 5;
        }

        // Check title is too long (lib only checks 70, we want 60)
        if (articleMeta?.title && articleMeta.title.length > 60 && articleMeta.title.length <= 70) {
            additionalIssues.push({
                type: 'info',
                message: `Title slightly long (${articleMeta.title.length} chars)`,
                fix: 'Optimal title length is 50-60 characters'
            });
            additionalDeduction += 3;
        }

        // Merge issues and calculate final score
        const allIssues = [...libAudit.issues, ...additionalIssues];
        const finalScore = Math.max(0, libAudit.score - additionalDeduction);

        // Build result with optional enhancements
        const result: SEOAuditResult = {
            score: finalScore,
            issues: allIssues
        };

        // Get backlink strategies based on niche (extracted from domain or content)
        const niche = detectNiche(articleContent);
        result.backlinkStrategies = suggestBacklinkOpportunities(niche);

        return NextResponse.json({
            success: true,
            audit: result
        });

    } catch (error) {
        console.error('SEO Audit error:', error);
        return NextResponse.json({
            success: false,
            error: `SEO Audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
    }
}

/**
 * Detect niche from content for backlink suggestions
 */
function detectNiche(content: string): string {
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('security') || lowerContent.includes('cyber') || lowerContent.includes('vpn')) {
        return 'Cybersecurity';
    }
    if (lowerContent.includes('invest') || lowerContent.includes('finance') || lowerContent.includes('money')) {
        return 'Personal Finance';
    }
    if (lowerContent.includes('programming') || lowerContent.includes('code') || lowerContent.includes('developer')) {
        return 'Technology';
    }

    return 'General';
}
