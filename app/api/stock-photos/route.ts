import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface StockPhoto {
    id: string;
    url: string;
    thumbUrl: string;
    width: number;
    height: number;
    alt: string;
    photographer: string;
    attribution: string;
    source: 'unsplash' | 'pexels';
}

interface SearchRequest {
    query: string;
    count?: number;
}

/**
 * Stock Photo Search API
 * 
 * Searches Unsplash and Pexels for stock photos.
 * API keys are passed from client or read from localStorage on server.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body: SearchRequest & { unsplashKey?: string; pexelsKey?: string } = await request.json();
        const { query, count = 6, unsplashKey, pexelsKey } = body;

        if (!query) {
            return NextResponse.json(
                { success: false, error: 'Query is required' },
                { status: 400 }
            );
        }

        const photos: StockPhoto[] = [];

        // Try Unsplash first
        if (unsplashKey) {
            try {
                const params = new URLSearchParams({
                    query,
                    per_page: count.toString(),
                    orientation: 'landscape'
                });

                const response = await fetch(
                    `https://api.unsplash.com/search/photos?${params}`,
                    {
                        headers: {
                            'Authorization': `Client-ID ${unsplashKey}`
                        }
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    const unsplashPhotos = data.results.map((photo: {
                        id: string;
                        urls: { regular: string; thumb: string };
                        width: number;
                        height: number;
                        alt_description?: string;
                        description?: string;
                        user: { name: string };
                    }) => ({
                        id: photo.id,
                        url: photo.urls.regular,
                        thumbUrl: photo.urls.thumb,
                        width: photo.width,
                        height: photo.height,
                        alt: photo.alt_description || photo.description || query,
                        photographer: photo.user.name,
                        attribution: `Photo by ${photo.user.name} on Unsplash`,
                        source: 'unsplash' as const
                    }));
                    photos.push(...unsplashPhotos);
                }
            } catch (error) {
                console.error('Unsplash search failed:', error);
            }
        }

        // Try Pexels if we don't have enough photos
        if (pexelsKey && photos.length < count) {
            try {
                const params = new URLSearchParams({
                    query,
                    per_page: (count - photos.length).toString(),
                    orientation: 'landscape'
                });

                const response = await fetch(
                    `https://api.pexels.com/v1/search?${params}`,
                    {
                        headers: {
                            'Authorization': pexelsKey
                        }
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    const pexelsPhotos = data.photos.map((photo: {
                        id: number;
                        src: { large: string; medium: string };
                        width: number;
                        height: number;
                        alt?: string;
                        photographer: string;
                    }) => ({
                        id: String(photo.id),
                        url: photo.src.large,
                        thumbUrl: photo.src.medium,
                        width: photo.width,
                        height: photo.height,
                        alt: photo.alt || query,
                        photographer: photo.photographer,
                        attribution: `Photo by ${photo.photographer} on Pexels`,
                        source: 'pexels' as const
                    }));
                    photos.push(...pexelsPhotos);
                }
            } catch (error) {
                console.error('Pexels search failed:', error);
            }
        }

        return NextResponse.json({
            success: true,
            photos,
            query
        });
    } catch (error) {
        console.error('Stock photo search error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to search photos' },
            { status: 500 }
        );
    }
}
