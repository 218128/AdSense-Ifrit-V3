/**
 * AdSense API Client
 * FSD: lib/monetization/adsenseClient.ts
 *
 * Google AdSense Management API v2 client for fetching live revenue data.
 * Uses OAuth2 for authentication.
 *
 * @see https://developers.google.com/adsense/management/reference/rest
 */

import { adsense_v2 } from '@googleapis/adsense';
import type {
    AdSenseAccount,
    AdSenseReportRequest,
    AdSenseReportResponse,
    RevenueDataPoint,
} from './types';

// ============================================================================
// Types
// ============================================================================

export interface AdSenseCredentials {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
}

export interface AdSenseConnectionStatus {
    connected: boolean;
    accountId?: string;
    accountName?: string;
    error?: string;
    lastSync?: number;
}

// ============================================================================
// Client Factory
// ============================================================================

/**
 * Create an authenticated AdSense API client
 */
function createAdSenseClient(credentials: AdSenseCredentials): adsense_v2.Adsense {
    const { OAuth2Client } = require('google-auth-library');

    const oauth2Client = new OAuth2Client(
        credentials.clientId,
        credentials.clientSecret
    );

    oauth2Client.setCredentials({
        refresh_token: credentials.refreshToken,
    });

    return new adsense_v2.Adsense({
        auth: oauth2Client,
    });
}

// ============================================================================
// Connection Test
// ============================================================================

/**
 * Test AdSense API connection and return account info
 */
export async function testAdSenseConnection(
    credentials: AdSenseCredentials
): Promise<AdSenseConnectionStatus> {
    try {
        const client = createAdSenseClient(credentials);

        // List accounts to verify connection
        const response = await client.accounts.list();
        const accounts = response.data.accounts || [];

        if (accounts.length === 0) {
            return {
                connected: false,
                error: 'No AdSense accounts found for this user',
            };
        }

        const primaryAccount = accounts[0];

        return {
            connected: true,
            accountId: primaryAccount.name?.replace('accounts/', ''),
            accountName: primaryAccount.displayName || 'AdSense Account',
            lastSync: Date.now(),
        };
    } catch (error) {
        return {
            connected: false,
            error: error instanceof Error ? error.message : 'Unknown error connecting to AdSense',
        };
    }
}

// ============================================================================
// Account Info
// ============================================================================

/**
 * Get AdSense account details
 */
export async function getAdSenseAccount(
    credentials: AdSenseCredentials
): Promise<AdSenseAccount | null> {
    try {
        const client = createAdSenseClient(credentials);
        const response = await client.accounts.list();
        const accounts = response.data.accounts || [];

        if (accounts.length === 0) return null;

        const account = accounts[0];

        return {
            id: account.name?.replace('accounts/', '') || '',
            name: account.displayName || 'AdSense Account',
            reportingTimeZone: String(account.timeZone || 'UTC'),
            createTime: account.createTime || '',
            pendingTasks: account.pendingTasks || [],
        };
    } catch (error) {
        console.error('[AdSense] Failed to get account:', error);
        return null;
    }
}

// ============================================================================
// Report Generation
// ============================================================================

/**
 * Generate an AdSense report for earnings data
 */
export async function generateAdSenseReport(
    credentials: AdSenseCredentials,
    request: AdSenseReportRequest
): Promise<AdSenseReportResponse | null> {
    try {
        const client = createAdSenseClient(credentials);

        // Get account ID first
        const accountsResponse = await client.accounts.list();
        const accounts = accountsResponse.data.accounts || [];
        if (accounts.length === 0) {
            console.error('[AdSense] No accounts found');
            return null;
        }

        const accountName = accounts[0].name!;

        // Build report request using the correct v2 API format with dot notation
        const reportResponse = await client.accounts.reports.generate({
            account: accountName,
            dateRange: 'CUSTOM',
            'startDate.year': request.startDate.year,
            'startDate.month': request.startDate.month,
            'startDate.day': request.startDate.day,
            'endDate.year': request.endDate.year,
            'endDate.month': request.endDate.month,
            'endDate.day': request.endDate.day,
            dimensions: request.dimensions || ['DATE'],
            metrics: request.metrics || ['PAGE_VIEWS', 'IMPRESSIONS', 'CLICKS', 'ESTIMATED_EARNINGS'],
        });

        const data = reportResponse.data;

        return {
            headers: data.headers?.map(h => h.name || '') || [],
            rows: (data.rows || []).map(row => ({
                cells: (row.cells || []).map(cell => ({ value: cell.value || '0' })),
            })),
            totals: data.totals ? {
                cells: (data.totals.cells || []).map(cell => ({ value: cell.value || '0' })),
            } : undefined,
            warnings: data.warnings || [],
        };
    } catch (error) {
        console.error('[AdSense] Failed to generate report:', error);
        return null;
    }
}

// ============================================================================
// Convenience: Fetch Earnings for Date Range
// ============================================================================

/**
 * Fetch daily earnings for a date range
 */
export async function fetchEarningsReport(
    credentials: AdSenseCredentials,
    startDate: Date,
    endDate: Date
): Promise<RevenueDataPoint[]> {
    const request: AdSenseReportRequest = {
        startDate: {
            year: startDate.getFullYear(),
            month: startDate.getMonth() + 1,
            day: startDate.getDate(),
        },
        endDate: {
            year: endDate.getFullYear(),
            month: endDate.getMonth() + 1,
            day: endDate.getDate(),
        },
        dimensions: ['DATE'],
        metrics: ['PAGE_VIEWS', 'IMPRESSIONS', 'CLICKS', 'ESTIMATED_EARNINGS'],
    };

    const report = await generateAdSenseReport(credentials, request);

    if (!report || !report.rows) return [];

    // Parse report rows into RevenueDataPoint[]
    const headerMap = new Map<string, number>();
    report.headers.forEach((h, i) => headerMap.set(h, i));

    return report.rows.map(row => {
        const getCell = (name: string): string => {
            const idx = headerMap.get(name);
            return idx !== undefined ? row.cells[idx]?.value || '0' : '0';
        };

        const pageViews = parseInt(getCell('PAGE_VIEWS'), 10) || 0;
        const impressions = parseInt(getCell('IMPRESSIONS'), 10) || 0;
        const clicks = parseInt(getCell('CLICKS'), 10) || 0;
        // AdSense returns earnings in micros (1/1,000,000 of currency)
        const earningsMicros = parseInt(getCell('ESTIMATED_EARNINGS'), 10) || 0;
        const revenue = earningsMicros / 1_000_000;

        return {
            date: getCell('DATE'),
            pageViews,
            impressions,
            clicks,
            revenue: Math.round(revenue * 100), // Convert to cents
            rpm: pageViews > 0 ? (revenue / pageViews) * 1000 : 0,
            ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
            cpc: clicks > 0 ? revenue / clicks : 0,
        };
    });
}

// ============================================================================
// Convenience: Get Today's Earnings
// ============================================================================

/**
 * Fetch today's earnings summary
 */
export async function getTodaysEarnings(
    credentials: AdSenseCredentials
): Promise<RevenueDataPoint | null> {
    const today = new Date();
    const data = await fetchEarningsReport(credentials, today, today);
    return data.length > 0 ? data[0] : null;
}

/**
 * Fetch last 7 days earnings
 */
export async function getLast7DaysEarnings(
    credentials: AdSenseCredentials
): Promise<RevenueDataPoint[]> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return fetchEarningsReport(credentials, start, end);
}

/**
 * Fetch last 30 days earnings
 */
export async function getLast30DaysEarnings(
    credentials: AdSenseCredentials
): Promise<RevenueDataPoint[]> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return fetchEarningsReport(credentials, start, end);
}

// ============================================================================
// Page-Level Attribution
// ============================================================================

/**
 * Fetch earnings grouped by page URL
 */
export async function getEarningsByPage(
    credentials: AdSenseCredentials,
    startDate: Date,
    endDate: Date,
    limit: number = 50
): Promise<Array<{ url: string; revenue: number; pageViews: number; rpm: number }>> {
    const request: AdSenseReportRequest = {
        startDate: {
            year: startDate.getFullYear(),
            month: startDate.getMonth() + 1,
            day: startDate.getDate(),
        },
        endDate: {
            year: endDate.getFullYear(),
            month: endDate.getMonth() + 1,
            day: endDate.getDate(),
        },
        dimensions: ['PAGE_URL'],
        metrics: ['PAGE_VIEWS', 'ESTIMATED_EARNINGS'],
    };

    const report = await generateAdSenseReport(credentials, request);

    if (!report || !report.rows) return [];

    const headerMap = new Map<string, number>();
    report.headers.forEach((h, i) => headerMap.set(h, i));

    const results = report.rows.map(row => {
        const getCell = (name: string): string => {
            const idx = headerMap.get(name);
            return idx !== undefined ? row.cells[idx]?.value || '0' : '0';
        };

        const pageViews = parseInt(getCell('PAGE_VIEWS'), 10) || 0;
        const earningsMicros = parseInt(getCell('ESTIMATED_EARNINGS'), 10) || 0;
        const revenue = earningsMicros / 1_000_000;

        return {
            url: getCell('PAGE_URL'),
            revenue: Math.round(revenue * 100),
            pageViews,
            rpm: pageViews > 0 ? (revenue / pageViews) * 1000 : 0,
        };
    });

    // Sort by revenue descending and limit
    return results
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
}
