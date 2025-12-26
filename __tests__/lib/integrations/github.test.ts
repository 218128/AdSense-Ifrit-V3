/**
 * Tests for GitHub Integration
 * 
 * Comprehensive tests for GitHub API integration
 */

// Setup fetch mock before imports
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock websiteStore functions used by github.ts
jest.mock('@/lib/websiteStore', () => ({
    getInstalledPlugins: jest.fn().mockReturnValue([]),
    getTheme: jest.fn().mockReturnValue(null)
}));

// Mock template generators
jest.mock('@/templates/niche-authority-blog/generator', () => ({
    generateTemplateFiles: jest.fn().mockReturnValue([
        { path: 'package.json', content: '{}' },
        { path: 'app/page.tsx', content: 'export default function Home() {}' }
    ])
}));

jest.mock('@/templates/topical-magazine/generator', () => ({
    generateTemplateFiles: jest.fn().mockReturnValue([])
}));

jest.mock('@/templates/expert-hub/generator', () => ({
    generateTemplateFiles: jest.fn().mockReturnValue([])
}));

jest.mock('@/templates/shared/themeGenerator', () => ({
    generateDefaultThemeCSS: jest.fn().mockReturnValue(':root {}')
}));

import {
    validateGitHubToken,
    createGitHubRepo
} from '@/lib/integrations/github';

describe('GitHub Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockReset();
    });

    // Helper to create mock response
    const createMockResponse = (data: unknown, ok: boolean = true, status: number = 200) => ({
        ok,
        status,
        json: jest.fn().mockResolvedValue(data),
        text: jest.fn().mockResolvedValue(JSON.stringify(data))
    });

    describe('validateGitHubToken()', () => {
        it('should return valid user on success', async () => {
            const mockUser = {
                login: 'testuser',
                name: 'Test User',
                avatar_url: 'https://github.com/testuser.png'
            };

            mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

            const result = await validateGitHubToken('valid-token');

            expect(result.success).toBe(true);
            expect(result.user?.username).toBe('testuser');
            expect(result.user?.name).toBe('Test User');
            expect(result.user?.avatar).toContain('github.com');
        });

        it('should return error on invalid token', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse(
                { message: 'Bad credentials' },
                false,
                401
            ));

            const result = await validateGitHubToken('invalid-token');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await validateGitHubToken('test-token');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Network error');
        });

        it('should call correct API endpoint with auth header', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse({ login: 'user' }));

            await validateGitHubToken('my-token');

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.github.com/user',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer my-token'
                    })
                })
            );
        });
    });

    describe('createGitHubRepo()', () => {
        it('should return error when token or repoName missing', async () => {
            const result = await createGitHubRepo('', 'repo', 'domain.com');

            expect(result.success).toBe(false);
            expect(result.error).toContain('required');
        });

        it('should create new repository successfully', async () => {
            // 1. Validate token
            mockFetch.mockResolvedValueOnce(createMockResponse({
                login: 'testuser',
                name: 'Test User',
                avatar_url: 'https://github.com/testuser.png'
            }));

            // 2. Check if repo exists (404 = doesn't exist)
            mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 404));

            // 3. Create repo
            mockFetch.mockResolvedValueOnce(createMockResponse({
                full_name: 'testuser/my-blog',
                html_url: 'https://github.com/testuser/my-blog'
            }));

            const result = await createGitHubRepo('token', 'my-blog', 'myblog.com');

            expect(result.success).toBe(true);
            expect(result.repoFullName).toBe('testuser/my-blog');
            expect(result.repoUrl).toContain('github.com');
        });

        it('should return existing repo if already exists', async () => {
            // 1. Validate token
            mockFetch.mockResolvedValueOnce(createMockResponse({
                login: 'testuser',
                name: 'Test User',
                avatar_url: 'https://github.com/testuser.png'
            }));

            // 2. Repo exists
            mockFetch.mockResolvedValueOnce(createMockResponse({
                full_name: 'testuser/existing-repo',
                html_url: 'https://github.com/testuser/existing-repo'
            }));

            const result = await createGitHubRepo('token', 'existing-repo', 'example.com');

            expect(result.success).toBe(true);
            expect(result.message).toContain('already exists');
            expect(result.repoFullName).toBe('testuser/existing-repo');
        });

        it('should handle API errors during creation', async () => {
            // 1. Validate token
            mockFetch.mockResolvedValueOnce(createMockResponse({
                login: 'testuser',
                name: 'Test User',
                avatar_url: 'https://github.com/testuser.png'
            }));

            // 2. Repo doesn't exist
            mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 404));

            // 3. Create fails
            mockFetch.mockResolvedValueOnce(createMockResponse(
                { message: 'Validation failed' },
                false,
                400
            ));

            const result = await createGitHubRepo('token', 'bad-repo', 'example.com');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Validation failed');
        });

        it('should handle invalid token', async () => {
            // Token validation fails
            mockFetch.mockResolvedValueOnce(createMockResponse(
                { message: 'Bad credentials' },
                false,
                401
            ));

            const result = await createGitHubRepo('invalid-token', 'repo', 'domain.com');

            expect(result.success).toBe(false);
        });
    });
});
