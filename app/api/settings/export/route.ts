/**
 * Settings Export/Import API
 * 
 * GET  /api/settings/export - Download all settings as JSON file
 * POST /api/settings/import - Import settings from uploaded JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'data');

// All known localStorage keys to export
const STORAGE_KEYS = {
    // AI Providers (array format)
    aiProviders: [
        'ifrit_gemini_keys',
        'ifrit_deepseek_keys',
        'ifrit_openrouter_keys',
        'ifrit_vercel_keys',
        'ifrit_perplexity_keys',
        'ifrit_enabled_providers',
    ],
    // AI Providers (legacy single key format)
    aiLegacy: [
        'GEMINI_API_KEY',
        'ifrit_gemini_key',
        'ifrit_deepseek_key',
        'ifrit_openrouter_key',
    ],
    // GitHub & Vercel
    integrations: [
        'ifrit_github_token',
        'ifrit_github_user',
        'ifrit_vercel_token',
        'ifrit_vercel_user',
        'github_token',
    ],
    // AdSense
    adsense: [
        'ADSENSE_PUBLISHER_ID',
        'ADSENSE_LEADERBOARD_SLOT',
        'ADSENSE_ARTICLE_SLOT',
        'ADSENSE_MULTIPLEX_SLOT',
    ],
    // Blog
    blog: [
        'USER_BLOG_URL',
    ],
    // Domain Providers
    domains: [
        'ifrit_namecheap_user',
        'ifrit_namecheap_key',
        'ifrit_namecheap_username',
        'ifrit_namecheap_client_ip',
        'ifrit_spamzilla_key',
        'ifrit_cloudflare_token',
        'namecheap_api_key',
        'namecheap_api_user',
        'namecheap_username',
        'namecheap_client_ip',
        'namecheap_sandbox',
    ],
    // Hunt - Domain Watchlist
    hunt: [
        'ifrit_domain_watchlist',
    ],
    // Dev.to & Content Distribution
    content: [
        'ifrit_devto_api_key',
        'devto_api_key',
    ],
};

interface ExportData {
    version: string;
    exportedAt: string;
    app: string;
    settings: Record<string, string | null>;
}

// GET - Generate export file for download
export async function GET() {
    try {
        // Read from saved backup file if exists
        const backupFile = path.join(BACKUP_DIR, 'user-settings-backup.json');
        let savedSettings: Record<string, string | null> = {};

        if (fs.existsSync(backupFile)) {
            try {
                const content = fs.readFileSync(backupFile, 'utf-8');
                const backup = JSON.parse(content);

                // Use rawKeys directly if available (contains all original localStorage keys)
                if (backup.rawKeys) {
                    savedSettings = backup.rawKeys;
                } else if (backup.settings) {
                    // Fallback: Flatten the backup structure to simple key-value
                    const { integrations, blog, adsense, aiProviders } = backup.settings;

                    if (integrations) {
                        if (integrations.githubToken) savedSettings['ifrit_github_token'] = integrations.githubToken;
                        if (integrations.githubUser) savedSettings['ifrit_github_user'] = integrations.githubUser;
                        if (integrations.vercelToken) savedSettings['ifrit_vercel_token'] = integrations.vercelToken;
                        if (integrations.vercelUser) savedSettings['ifrit_vercel_user'] = integrations.vercelUser;
                    }
                    if (blog?.url) savedSettings['USER_BLOG_URL'] = blog.url;
                    if (adsense) {
                        if (adsense.publisherId) savedSettings['ADSENSE_PUBLISHER_ID'] = adsense.publisherId;
                        if (adsense.leaderboardSlot) savedSettings['ADSENSE_LEADERBOARD_SLOT'] = adsense.leaderboardSlot;
                        if (adsense.articleSlot) savedSettings['ADSENSE_ARTICLE_SLOT'] = adsense.articleSlot;
                        if (adsense.multiplexSlot) savedSettings['ADSENSE_MULTIPLEX_SLOT'] = adsense.multiplexSlot;
                    }
                    if (aiProviders) {
                        for (const [provider, data] of Object.entries(aiProviders)) {
                            savedSettings[`ifrit_${provider}_keys`] = JSON.stringify(data);
                        }
                    }
                }
            } catch (e) {
                console.error('Could not parse backup file:', e);
            }
        }

        const exportData: ExportData = {
            version: '2.0.0',
            exportedAt: new Date().toISOString(),
            app: 'AdSense Ifrit V3',
            settings: savedSettings,
        };

        // Return as downloadable JSON file
        const jsonContent = JSON.stringify(exportData, null, 2);

        return new NextResponse(jsonContent, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="ifrit-settings-${new Date().toISOString().split('T')[0]}.json"`,
            },
        });

    } catch (error) {
        console.error('Error exporting settings:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to export settings' },
            { status: 500 }
        );
    }
}

// POST - Import settings from uploaded JSON
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { settings, clientSettings } = body;

        if (!settings && !clientSettings) {
            return NextResponse.json(
                { success: false, error: 'No settings provided' },
                { status: 400 }
            );
        }

        // Ensure backup directory exists
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }

        // If clientSettings provided (from browser), save directly
        if (clientSettings) {
            const backupFile = path.join(BACKUP_DIR, 'user-settings-backup.json');

            // Convert flat key-value to structured format
            const structured = {
                version: '2.0.0',
                timestamp: Date.now(),
                settings: {
                    integrations: {
                        githubToken: clientSettings['ifrit_github_token'],
                        githubUser: clientSettings['ifrit_github_user'],
                        vercelToken: clientSettings['ifrit_vercel_token'],
                        vercelUser: clientSettings['ifrit_vercel_user'],
                    },
                    blog: {
                        url: clientSettings['USER_BLOG_URL'],
                    },
                    adsense: {
                        publisherId: clientSettings['ADSENSE_PUBLISHER_ID'],
                        leaderboardSlot: clientSettings['ADSENSE_LEADERBOARD_SLOT'],
                        articleSlot: clientSettings['ADSENSE_ARTICLE_SLOT'],
                        multiplexSlot: clientSettings['ADSENSE_MULTIPLEX_SLOT'],
                    },
                    domains: {
                        namecheapUser: clientSettings['ifrit_namecheap_user'],
                        namecheapKey: clientSettings['ifrit_namecheap_key'],
                        spamzillaKey: clientSettings['ifrit_spamzilla_key'],
                        cloudflareToken: clientSettings['ifrit_cloudflare_token'],
                    },
                    hunt: {
                        // expiredDomains removed - awaiting API integration
                    },
                    content: {
                        devtoKey: clientSettings['ifrit_devto_api_key'],
                    },
                    // Store AI provider keys
                    aiProviders: {} as Record<string, unknown>,
                },
                rawKeys: clientSettings, // Store raw keys for easy restoration
            };

            // Extract AI provider keys
            for (const key of Object.keys(clientSettings)) {
                if (key.includes('_keys') && key.startsWith('ifrit_')) {
                    const provider = key.replace('ifrit_', '').replace('_keys', '');
                    try {
                        structured.settings.aiProviders[provider] = JSON.parse(clientSettings[key]);
                    } catch {
                        structured.settings.aiProviders[provider] = clientSettings[key];
                    }
                }
            }

            fs.writeFileSync(backupFile, JSON.stringify(structured, null, 2), 'utf-8');

            return NextResponse.json({
                success: true,
                message: 'Settings saved to server backup',
                keysStored: Object.keys(clientSettings).length,
            });
        }

        // Handle import from file
        if (settings) {
            const importedSettings = typeof settings === 'string' ? JSON.parse(settings) : settings;

            const backupFile = path.join(BACKUP_DIR, 'user-settings-backup.json');
            fs.writeFileSync(backupFile, JSON.stringify({
                version: importedSettings.version || '2.0.0',
                timestamp: Date.now(),
                importedAt: new Date().toISOString(),
                settings: importedSettings.settings || {},
                rawKeys: importedSettings.settings || {},
            }, null, 2), 'utf-8');

            return NextResponse.json({
                success: true,
                message: 'Settings imported successfully',
                keysToRestore: importedSettings.settings ? Object.keys(importedSettings.settings) : [],
            });
        }

        return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });

    } catch (error) {
        console.error('Error importing settings:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to import settings' },
            { status: 500 }
        );
    }
}
