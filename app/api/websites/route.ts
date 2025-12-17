/**
 * Unified Website API
 * 
 * Endpoints:
 * GET  /api/websites - List all websites
 * POST /api/websites - Create new website
 * GET  /api/websites/migrate - Run migration from legacy storage
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    listWebsites,
    saveWebsite,
    Website
} from '@/lib/websiteStore';
import { getCurrentVersion } from '@/lib/templateVersions';

export async function GET() {
    try {
        const websites = listWebsites();
        return NextResponse.json({
            success: true,
            websites,
            count: websites.length
        });
    } catch (error) {
        console.error('Error listing websites:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to list websites' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            domain,
            name,
            niche,
            template = 'niche-authority',
            author,
            githubRepo,
            githubOwner,
            vercelProject,
            aiProviders = [],
            contentStrategy = '40-40-20',
            eeatEnabled = true,
            aiOverviewOptimized = true
        } = body;

        if (!domain) {
            return NextResponse.json(
                { success: false, error: 'Domain is required' },
                { status: 400 }
            );
        }

        const templateVersion = getCurrentVersion(template);

        const website: Website = {
            id: `site_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            domain,
            name: name || domain.split('.')[0],
            niche: niche || 'general',
            template: {
                id: template,
                version: templateVersion,
                installedAt: Date.now()
            },
            fingerprint: {
                providers: aiProviders,
                providerHistory: [],
                contentStrategy,
                eeatEnabled: false,
                aiOverviewOptimized: false,
                generatedAt: Date.now(),
                articleTemplatesUsed: []
            },
            deployment: {
                githubRepo: githubRepo || '',
                githubOwner: githubOwner || '',
                vercelProject: vercelProject || '',
                liveUrl: `https://${domain}`,
                pendingChanges: 0
            },
            stats: {
                articlesCount: 0,
                totalWords: 0,
                estimatedMonthlyRevenue: 0
            },
            versions: [{
                version: '1.0.1',
                templateVersion,
                deployedAt: Date.now(),
                commitSha: '',
                changes: ['Initial site creation'],
                canRollback: false
            }],
            author: author || {
                name: 'Unknown',
                role: 'Author'
            },
            status: 'setup',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        saveWebsite(website);

        return NextResponse.json({
            success: true,
            website
        });
    } catch (error) {
        console.error('Error creating website:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create website' },
            { status: 500 }
        );
    }
}
