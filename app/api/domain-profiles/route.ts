/**
 * Domain Profiles API
 * 
 * Manage domain research profiles that transfer data from Hunt to Websites.
 * 
 * GET    /api/domain-profiles         - List all profiles
 * GET    /api/domain-profiles?domain= - Get specific profile
 * POST   /api/domain-profiles         - Save/update profile
 * DELETE /api/domain-profiles?domain= - Delete profile
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    saveDomainProfile,
    getDomainProfile,
    listDomainProfiles,
    deleteDomainProfile,
    DomainProfile
} from '@/lib/websiteStore';

// ============================================
// GET - List profiles or get specific one
// ============================================

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const domain = searchParams.get('domain');

        if (domain) {
            // Get specific profile
            const profile = getDomainProfile(domain);

            if (!profile) {
                return NextResponse.json(
                    { success: false, error: 'Profile not found' },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                profile
            });
        }

        // List all profiles
        const profiles = listDomainProfiles();

        return NextResponse.json({
            success: true,
            profiles,
            count: profiles.length
        });
    } catch (error) {
        console.error('Error fetching profiles:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch profiles' },
            { status: 500 }
        );
    }
}

// ============================================
// POST - Save/update profile
// ============================================

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.domain) {
            return NextResponse.json(
                { success: false, error: 'Domain is required' },
                { status: 400 }
            );
        }

        // Build profile with defaults
        const now = Date.now();

        const profile: DomainProfile = {
            domain: body.domain,
            niche: body.niche || 'general',
            purchaseType: body.purchaseType || 'external',
            purchasedAt: body.purchasedAt || now,

            // Deep Analysis (from body or defaults)
            deepAnalysis: body.deepAnalysis || {
                score: {
                    overall: 50,
                    authority: 0,
                    trustworthiness: 0,
                    relevance: 50,
                    emailPotential: 50,
                    flipPotential: 50,
                    nameQuality: 50,
                },
                riskLevel: 'medium',
                recommendation: 'consider',
                estimatedValue: 0,
                estimatedMonthlyRevenue: 0,
                wayback: { hasHistory: false },
                risks: [],
                trust: { trustworthy: true, score: 50, positives: [], negatives: [] },
                analyzedAt: now,
            },

            // Keyword Analysis (from body or defaults)
            keywordAnalysis: body.keywordAnalysis || {
                sourceKeywords: [],
                analysisResults: [],
                primaryKeywords: body.primaryKeywords || [],
                secondaryKeywords: body.secondaryKeywords || [],
                questionKeywords: body.questionKeywords || [],
                totalSearchVolume: 0,
                averageCPC: 0,
                analyzedAt: now,
            },

            // AI Niche (from body or defaults)
            aiNiche: body.aiNiche || {
                niche: body.niche || 'general',
                suggestedTopics: body.suggestedTopics || [],
                primaryKeywords: body.primaryKeywords || [],
                contentAngles: [],
                targetAudience: '',
                monetizationStrategy: '',
                generatedBy: 'manual',
                generatedAt: now,
            },

            // Legacy fields
            primaryKeywords: body.primaryKeywords || [],
            secondaryKeywords: body.secondaryKeywords || [],
            questionKeywords: body.questionKeywords || [],

            competitorUrls: body.competitorUrls || [],
            contentGaps: body.contentGaps || [],
            trafficPotential: body.trafficPotential || 0,
            difficultyScore: body.difficultyScore || 0,

            suggestedTopics: body.suggestedTopics || [],
            suggestedCategories: body.suggestedCategories || [],

            researchedAt: body.researchedAt || now,
            notes: body.notes || '',

            transferredToWebsite: body.transferredToWebsite || false,
            websiteCreatedAt: body.websiteCreatedAt
        };

        saveDomainProfile(profile);

        return NextResponse.json({
            success: true,
            message: 'Profile saved',
            profile
        });
    } catch (error) {
        console.error('Error saving profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to save profile' },
            { status: 500 }
        );
    }
}

// ============================================
// DELETE - Remove profile
// ============================================

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const domain = searchParams.get('domain');

        if (!domain) {
            return NextResponse.json(
                { success: false, error: 'Domain parameter required' },
                { status: 400 }
            );
        }

        const deleted = deleteDomainProfile(domain);

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: 'Profile not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Profile deleted'
        });
    } catch (error) {
        console.error('Error deleting profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete profile' },
            { status: 500 }
        );
    }
}
