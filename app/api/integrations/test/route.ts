import { NextRequest, NextResponse } from 'next/server';

/**
 * Test Integration API Route
 * POST /api/integrations/test
 * 
 * Tests connection to various integrations by making a simple API call
 */

interface TestRequest {
    integration: string;
    credentials: Record<string, string>;
}

interface TestResult {
    success: boolean;
    integration: string;
    message?: string;
    user?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<TestResult>> {
    try {
        const { integration, credentials } = await req.json() as TestRequest;

        switch (integration) {
            case 'namecheap':
                return testNamecheap(credentials);
            case 'godaddy':
                return testGoDaddy(credentials);
            case 'cloudflare':
                return testCloudflare(credentials);
            case 'unsplash':
                return testUnsplash(credentials);
            case 'pexels':
                return testPexels(credentials);
            case 'umami':
                return testUmami(credentials);
            case 'devto':
                return testDevTo(credentials);
            case 'brave':
                return testBrave(credentials);
            default:
                return NextResponse.json({
                    success: false,
                    integration,
                    message: `Unknown integration: ${integration}`,
                });
        }
    } catch (error) {
        return NextResponse.json({
            success: false,
            integration: 'unknown',
            message: error instanceof Error ? error.message : 'Test failed',
        });
    }
}

// ============================================================================
// Integration Test Functions
// ============================================================================

async function testNamecheap(credentials: Record<string, string>): Promise<NextResponse<TestResult>> {
    const { namecheapApiKey, namecheapApiUser, namecheapUsername } = credentials;
    if (!namecheapApiKey || !namecheapApiUser || !namecheapUsername) {
        return NextResponse.json({
            success: false,
            integration: 'namecheap',
            message: 'Missing required credentials',
        });
    }

    try {
        // Test with balance check (doesn't modify anything)
        const url = new URL('https://api.namecheap.com/xml.response');
        url.searchParams.set('ApiUser', namecheapApiUser);
        url.searchParams.set('ApiKey', namecheapApiKey);
        url.searchParams.set('UserName', namecheapUsername);
        url.searchParams.set('Command', 'namecheap.users.getBalances');
        url.searchParams.set('ClientIp', '127.0.0.1');

        const response = await fetch(url.toString());
        const text = await response.text();

        if (text.includes('Status="OK"')) {
            return NextResponse.json({
                success: true,
                integration: 'namecheap',
                message: 'Connected successfully',
                user: namecheapUsername,
            });
        } else {
            const errorMatch = text.match(/<Error Number="\d+">(.*?)<\/Error>/);
            return NextResponse.json({
                success: false,
                integration: 'namecheap',
                message: errorMatch?.[1] || 'Connection failed',
            });
        }
    } catch (error) {
        return NextResponse.json({
            success: false,
            integration: 'namecheap',
            message: error instanceof Error ? error.message : 'Network error',
        });
    }
}

async function testGoDaddy(credentials: Record<string, string>): Promise<NextResponse<TestResult>> {
    const { godaddyApiKey, godaddyApiSecret } = credentials;
    if (!godaddyApiKey || !godaddyApiSecret) {
        return NextResponse.json({
            success: false,
            integration: 'godaddy',
            message: 'Missing API key or secret',
        });
    }

    try {
        const response = await fetch('https://api.godaddy.com/v1/domains?limit=1', {
            headers: {
                'Authorization': `sso-key ${godaddyApiKey}:${godaddyApiSecret}`,
            },
        });

        if (response.ok) {
            return NextResponse.json({
                success: true,
                integration: 'godaddy',
                message: 'Connected successfully',
            });
        } else {
            const data = await response.json().catch(() => ({}));
            return NextResponse.json({
                success: false,
                integration: 'godaddy',
                message: data.message || `HTTP ${response.status}`,
            });
        }
    } catch (error) {
        return NextResponse.json({
            success: false,
            integration: 'godaddy',
            message: error instanceof Error ? error.message : 'Network error',
        });
    }
}

async function testCloudflare(credentials: Record<string, string>): Promise<NextResponse<TestResult>> {
    const { cloudflareToken } = credentials;
    if (!cloudflareToken) {
        return NextResponse.json({
            success: false,
            integration: 'cloudflare',
            message: 'Missing API token',
        });
    }

    try {
        const response = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
            headers: {
                'Authorization': `Bearer ${cloudflareToken}`,
            },
        });

        const data = await response.json();
        if (data.success) {
            return NextResponse.json({
                success: true,
                integration: 'cloudflare',
                message: 'Connected successfully',
            });
        } else {
            return NextResponse.json({
                success: false,
                integration: 'cloudflare',
                message: data.errors?.[0]?.message || 'Token invalid',
            });
        }
    } catch (error) {
        return NextResponse.json({
            success: false,
            integration: 'cloudflare',
            message: error instanceof Error ? error.message : 'Network error',
        });
    }
}

async function testUnsplash(credentials: Record<string, string>): Promise<NextResponse<TestResult>> {
    // Try both key names for compatibility: unsplashKey (new) and unsplashAccessKey (legacy)
    const accessKey = credentials.unsplashKey || credentials.unsplashAccessKey;
    if (!accessKey) {
        return NextResponse.json({
            success: false,
            integration: 'unsplash',
            message: 'Missing access key',
        });
    }

    try {
        // Use /photos endpoint (works with Access Key)
        // Note: /me requires OAuth user authentication, not just Access Key
        const response = await fetch('https://api.unsplash.com/photos?per_page=1', {
            headers: {
                'Authorization': `Client-ID ${accessKey}`,
            },
        });

        if (response.ok) {
            return NextResponse.json({
                success: true,
                integration: 'unsplash',
                message: 'Connected successfully',
            });
        } else {
            const errorText = await response.text().catch(() => '');
            return NextResponse.json({
                success: false,
                integration: 'unsplash',
                message: `HTTP ${response.status}${errorText ? `: ${errorText.substring(0, 50)}` : ''}`,
            });
        }
    } catch (error) {
        return NextResponse.json({
            success: false,
            integration: 'unsplash',
            message: error instanceof Error ? error.message : 'Network error',
        });
    }
}

async function testPexels(credentials: Record<string, string>): Promise<NextResponse<TestResult>> {
    // Try both key names for compatibility: pexelsKey (new) and pexelsApiKey (legacy)
    const apiKey = credentials.pexelsKey || credentials.pexelsApiKey;
    if (!apiKey) {
        return NextResponse.json({
            success: false,
            integration: 'pexels',
            message: 'Missing API key',
        });
    }

    try {
        const response = await fetch('https://api.pexels.com/v1/search?query=test&per_page=1', {
            headers: {
                'Authorization': apiKey,
            },
        });

        if (response.ok) {
            return NextResponse.json({
                success: true,
                integration: 'pexels',
                message: 'Connected successfully',
            });
        } else {
            return NextResponse.json({
                success: false,
                integration: 'pexels',
                message: `HTTP ${response.status}`,
            });
        }
    } catch (error) {
        return NextResponse.json({
            success: false,
            integration: 'pexels',
            message: error instanceof Error ? error.message : 'Network error',
        });
    }
}

async function testUmami(credentials: Record<string, string>): Promise<NextResponse<TestResult>> {
    const { umamiEndpoint, umamiToken } = credentials;
    if (!umamiEndpoint || !umamiToken) {
        return NextResponse.json({
            success: false,
            integration: 'umami',
            message: 'Missing endpoint or token',
        });
    }

    try {
        const response = await fetch(`${umamiEndpoint}/api/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${umamiToken}`,
            },
        });

        if (response.ok) {
            return NextResponse.json({
                success: true,
                integration: 'umami',
                message: 'Connected successfully',
            });
        } else {
            return NextResponse.json({
                success: false,
                integration: 'umami',
                message: `HTTP ${response.status}`,
            });
        }
    } catch (error) {
        return NextResponse.json({
            success: false,
            integration: 'umami',
            message: error instanceof Error ? error.message : 'Network error',
        });
    }
}

async function testDevTo(credentials: Record<string, string>): Promise<NextResponse<TestResult>> {
    const { devtoApiKey } = credentials;
    if (!devtoApiKey) {
        return NextResponse.json({
            success: false,
            integration: 'devto',
            message: 'Missing API key',
        });
    }

    try {
        const response = await fetch('https://dev.to/api/users/me', {
            headers: {
                'api-key': devtoApiKey,
            },
        });

        if (response.ok) {
            const data = await response.json();
            return NextResponse.json({
                success: true,
                integration: 'devto',
                message: 'Connected successfully',
                user: data.username,
            });
        } else {
            return NextResponse.json({
                success: false,
                integration: 'devto',
                message: `HTTP ${response.status}`,
            });
        }
    } catch (error) {
        return NextResponse.json({
            success: false,
            integration: 'devto',
            message: error instanceof Error ? error.message : 'Network error',
        });
    }
}

async function testBrave(credentials: Record<string, string>): Promise<NextResponse<TestResult>> {
    const apiKey = credentials.braveApiKey;
    if (!apiKey) {
        return NextResponse.json({
            success: false,
            integration: 'brave',
            message: 'Missing API key',
        });
    }

    try {
        const response = await fetch('https://api.search.brave.com/res/v1/images/search?q=test&count=1', {
            headers: {
                'Accept': 'application/json',
                'X-Subscription-Token': apiKey,
            },
        });

        if (response.ok) {
            return NextResponse.json({
                success: true,
                integration: 'brave',
                message: 'Connected successfully',
            });
        } else {
            const errorText = await response.text().catch(() => '');
            return NextResponse.json({
                success: false,
                integration: 'brave',
                message: `HTTP ${response.status}${errorText ? `: ${errorText.substring(0, 50)}` : ''}`,
            });
        }
    } catch (error) {
        return NextResponse.json({
            success: false,
            integration: 'brave',
            message: error instanceof Error ? error.message : 'Network error',
        });
    }
}
