/**
 * SEO Audit API
 * 
 * Performs real SEO analysis on articles.
 * No mock data - returns actual analysis or error.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWebsite, listArticles, getArticle } from '@/lib/websiteStore';

interface SEOIssue {
    type: 'error' | 'warning' | 'info';
    message: string;
    fix: string;
}

interface SEOAuditResult {
    score: number;
    issues: SEOIssue[];
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { articleSlug, domain } = body;

        if (!articleSlug) {
            return NextResponse.json({
                success: false,
                error: 'Article slug is required'
            }, { status: 400 });
        }

        // Find the article across all websites if domain not specified
        let articleContent: string | null = null;
        let articleMeta: any = null;

        if (domain) {
            const article = getArticle(domain, articleSlug);
            if (article) {
                articleContent = article.content;
                articleMeta = article;
            }
        } else {
            // Search across all websites
            // For now, return error - domain should be provided
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

        // Perform real SEO analysis
        const issues: SEOIssue[] = [];
        let score = 100;

        // 1. Check title length
        if (articleMeta?.title) {
            const titleLength = articleMeta.title.length;
            if (titleLength < 30) {
                issues.push({
                    type: 'warning',
                    message: `Title too short (${titleLength} chars)`,
                    fix: 'Expand title to 50-60 characters for better SEO'
                });
                score -= 10;
            } else if (titleLength > 60) {
                issues.push({
                    type: 'warning',
                    message: `Title too long (${titleLength} chars)`,
                    fix: 'Shorten title to under 60 characters to avoid truncation in search results'
                });
                score -= 5;
            }
        } else {
            issues.push({
                type: 'error',
                message: 'Missing title',
                fix: 'Add a descriptive title to the article'
            });
            score -= 20;
        }

        // 2. Check meta description
        if (articleMeta?.description) {
            const descLength = articleMeta.description.length;
            if (descLength < 120) {
                issues.push({
                    type: 'warning',
                    message: `Meta description too short (${descLength} chars)`,
                    fix: 'Expand description to 150-160 characters'
                });
                score -= 10;
            } else if (descLength > 160) {
                issues.push({
                    type: 'info',
                    message: `Meta description slightly long (${descLength} chars)`,
                    fix: 'Consider shortening to 160 characters'
                });
                score -= 3;
            }
        } else {
            issues.push({
                type: 'error',
                message: 'Missing meta description',
                fix: 'Add a compelling meta description for better click-through rates'
            });
            score -= 15;
        }

        // 3. Check content length  
        const wordCount = articleContent.split(/\s+/).length;
        if (wordCount < 300) {
            issues.push({
                type: 'error',
                message: `Content too short (${wordCount} words)`,
                fix: 'Aim for at least 1000 words for comprehensive coverage'
            });
            score -= 20;
        } else if (wordCount < 1000) {
            issues.push({
                type: 'warning',
                message: `Content could be longer (${wordCount} words)`,
                fix: 'Consider expanding to 1500+ words for competitive topics'
            });
            score -= 10;
        }

        // 4. Check for headings
        const h2Count = (articleContent.match(/## /g) || []).length;
        const h3Count = (articleContent.match(/### /g) || []).length;

        if (h2Count === 0) {
            issues.push({
                type: 'warning',
                message: 'No H2 headings found',
                fix: 'Add H2 headings to structure your content'
            });
            score -= 10;
        }

        // 5. Check for images
        const imageCount = (articleContent.match(/!\[/g) || []).length;
        if (imageCount === 0) {
            issues.push({
                type: 'info',
                message: 'No images found',
                fix: 'Add relevant images with descriptive alt text'
            });
            score -= 5;
        }

        // 6. Check for internal links
        const linkCount = (articleContent.match(/\]\(/g) || []).length;
        if (linkCount < 2) {
            issues.push({
                type: 'info',
                message: 'Few internal/external links',
                fix: 'Add 2-3 relevant links to related content'
            });
            score -= 5;
        }

        // Ensure score doesn't go below 0
        score = Math.max(0, score);

        const result: SEOAuditResult = {
            score,
            issues
        };

        return NextResponse.json({
            success: true,
            result
        });

    } catch (error) {
        console.error('SEO Audit error:', error);
        return NextResponse.json({
            success: false,
            error: `SEO Audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
    }
}
