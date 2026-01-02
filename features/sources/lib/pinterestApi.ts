/**
 * Pinterest API Client
 * FSD: features/sources/lib/pinterestApi.ts
 * 
 * Pinterest API v5 integration for pin and board content.
 */

// ============================================================================
// Types
// ============================================================================

export interface PinterestPin {
    id: string;
    title?: string;
    description?: string;
    link?: string;
    dominant_color?: string;
    media: {
        media_type: 'image' | 'video';
        images?: Record<string, { url: string; width: number; height: number }>;
    };
    created_at: string;
    board_id: string;
    board_owner?: {
        username: string;
    };
}

export interface PinterestBoard {
    id: string;
    name: string;
    description?: string;
    pin_count?: number;
    follower_count?: number;
    privacy: 'PUBLIC' | 'PROTECTED' | 'SECRET';
    owner: {
        username: string;
    };
    media?: {
        image_cover_url?: string;
    };
}

export interface PinterestUser {
    username: string;
    account_type?: 'BUSINESS' | 'PINNER';
    profile_image?: string;
    website_url?: string;
    follower_count?: number;
    following_count?: number;
    pin_count?: number;
    board_count?: number;
}

export interface PinterestCredentials {
    accessToken: string;
}

export interface PinterestPinResult {
    pins: PinterestPin[];
    bookmark?: string;
}

// ============================================================================
// Configuration
// ============================================================================

let pinterestCredentials: PinterestCredentials | null = null;

const PINTEREST_API_URL = 'https://api.pinterest.com/v5';

export function setPinterestCredentials(creds: PinterestCredentials): void {
    pinterestCredentials = creds;
}

export function getPinterestCredentials(): PinterestCredentials | null {
    if (pinterestCredentials) return pinterestCredentials;
    if (typeof window !== 'undefined') {
        const accessToken = localStorage.getItem('ifrit_pinterest_access_token');
        if (accessToken) {
            return { accessToken };
        }
    }
    return null;
}

export function isPinterestConfigured(): boolean {
    return !!getPinterestCredentials();
}

// ============================================================================
// API Methods
// ============================================================================

/**
 * Get user's pins
 */
export async function getUserPins(
    options: { pageSize?: number; bookmark?: string } = {}
): Promise<PinterestPinResult> {
    const creds = getPinterestCredentials();
    if (!creds) throw new Error('Pinterest credentials not configured');

    const params = new URLSearchParams({
        page_size: String(options.pageSize || 25),
    });

    if (options.bookmark) params.set('bookmark', options.bookmark);

    const response = await pinterestRequest<{ items: PinterestPin[]; bookmark?: string }>(creds, `pins?${params}`);

    return {
        pins: response.items || [],
        bookmark: response.bookmark,
    };
}

/**
 * Get a specific pin
 */
export async function getPin(pinId: string): Promise<PinterestPin> {
    const creds = getPinterestCredentials();
    if (!creds) throw new Error('Pinterest credentials not configured');

    return pinterestRequest(creds, `pins/${pinId}`);
}

/**
 * Get user's boards
 */
export async function getUserBoards(
    options: { pageSize?: number; bookmark?: string } = {}
): Promise<{ boards: PinterestBoard[]; bookmark?: string }> {
    const creds = getPinterestCredentials();
    if (!creds) throw new Error('Pinterest credentials not configured');

    const params = new URLSearchParams({
        page_size: String(options.pageSize || 25),
    });

    if (options.bookmark) params.set('bookmark', options.bookmark);

    const response = await pinterestRequest<{ items: PinterestBoard[]; bookmark?: string }>(creds, `boards?${params}`);

    return {
        boards: response.items || [],
        bookmark: response.bookmark,
    };
}

/**
 * Get pins from a board
 */
export async function getBoardPins(
    boardId: string,
    options: { pageSize?: number; bookmark?: string } = {}
): Promise<PinterestPinResult> {
    const creds = getPinterestCredentials();
    if (!creds) throw new Error('Pinterest credentials not configured');

    const params = new URLSearchParams({
        page_size: String(options.pageSize || 25),
    });

    if (options.bookmark) params.set('bookmark', options.bookmark);

    const response = await pinterestRequest<{ items: PinterestPin[]; bookmark?: string }>(creds, `boards/${boardId}/pins?${params}`);

    return {
        pins: response.items || [],
        bookmark: response.bookmark,
    };
}

/**
 * Search pins
 */
export async function searchPins(
    query: string,
    options: { pageSize?: number; bookmark?: string } = {}
): Promise<PinterestPinResult> {
    const creds = getPinterestCredentials();
    if (!creds) throw new Error('Pinterest credentials not configured');

    const params = new URLSearchParams({
        query,
        page_size: String(options.pageSize || 25),
    });

    if (options.bookmark) params.set('bookmark', options.bookmark);

    const response = await pinterestRequest<{ items: PinterestPin[]; bookmark?: string }>(creds, `search/pins?${params}`);

    return {
        pins: response.items || [],
        bookmark: response.bookmark,
    };
}

/**
 * Get user account info
 */
export async function getUserAccount(): Promise<PinterestUser> {
    const creds = getPinterestCredentials();
    if (!creds) throw new Error('Pinterest credentials not configured');

    return pinterestRequest(creds, 'user_account');
}

// ============================================================================
// Core Request Handler
// ============================================================================

async function pinterestRequest<T>(
    creds: PinterestCredentials,
    endpoint: string
): Promise<T> {
    const response = await fetch(`${PINTEREST_API_URL}/${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${creds.accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Pinterest API error: ${response.status}`);
    }

    return response.json();
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get best image URL from pin
 */
export function getPinImageUrl(pin: PinterestPin, size: 'small' | 'medium' | 'large' = 'large'): string {
    const images = pin.media?.images;
    if (!images) return '';

    // Pinterest sizes: 150x150, 400x300, 600x, 1200x, originals
    const sizeMap = {
        small: '150x150',
        medium: '400x300',
        large: '1200x',
    };

    const preferredSize = sizeMap[size];

    if (images[preferredSize]) {
        return images[preferredSize].url;
    }

    // Fallback to any available
    const available = Object.values(images);
    return available[available.length - 1]?.url || '';
}

/**
 * Get pin text content
 */
export function getPinText(pin: PinterestPin): string {
    return pin.title || pin.description || '';
}

/**
 * Check if pin links to external site
 */
export function hasExternalLink(pin: PinterestPin): boolean {
    return !!pin.link && !pin.link.includes('pinterest.com');
}

/**
 * Get board URL
 */
export function getBoardUrl(board: PinterestBoard): string {
    return `https://pinterest.com/${board.owner.username}/${board.id}`;
}

/**
 * Get pin URL
 */
export function getPinUrl(pinId: string): string {
    return `https://pinterest.com/pin/${pinId}`;
}
