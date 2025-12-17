import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { apiKey } = await req.json();

        if (!apiKey) {
            return NextResponse.json(
                { success: false, error: 'API key required' },
                { status: 400 }
            );
        }

        // Test connection by fetching user info
        const response = await fetch('https://dev.to/api/users/me', {
            headers: {
                'api-key': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const user = await response.json();
            return NextResponse.json({
                success: true,
                user: {
                    username: user.username,
                    name: user.name,
                    profile_image: user.profile_image
                }
            });
        } else {
            const _error = await response.text();
            return NextResponse.json(
                { success: false, error: `Dev.to API error: ${response.status}` },
                { status: response.status }
            );
        }
    } catch (error) {
        console.error('Dev.to test error:', error);
        return NextResponse.json(
            { success: false, error: 'Connection failed' },
            { status: 500 }
        );
    }
}
