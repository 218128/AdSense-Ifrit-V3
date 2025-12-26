/**
 * Tests for Vercel Integration
 * 
 * Comprehensive tests for Vercel API integration
 */

// Setup fetch mock before imports
const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
    validateVercelToken,
    createVercelProject,
    addVercelDomain
} from '@/lib/integrations/vercel';

describe('Vercel Integration', () => {
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

    describe('validateVercelToken()', () => {
        it('should return valid user on success', async () => {
            const mockUser = {
                user: {
                    username: 'testuser',
                    name: 'Test User',
                    email: 'test@example.com'
                }
            };

            mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

            const result = await validateVercelToken('valid-token');

            expect(result.success).toBe(true);
            expect(result.user?.username).toBe('testuser');
            expect(result.user?.email).toBe('test@example.com');
        });

        it('should return error on invalid token', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse(
                { error: { message: 'Invalid token' } },
                false,
                401
            ));

            const result = await validateVercelToken('invalid-token');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid token');
        });

        it('should handle network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await validateVercelToken('test-token');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Network error');
        });

        it('should call correct API endpoint', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse({ user: {} }));

            await validateVercelToken('test-token');

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.vercel.com/v2/user',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-token'
                    })
                })
            );
        });
    });

    describe('createVercelProject()', () => {
        it('should return error when missing requirements', async () => {
            const result = await createVercelProject('', 'project', 'user/repo');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing requirements');
        });

        it('should return existing project if already exists', async () => {
            const existingProject = {
                id: 'proj_123',
                name: 'my-project'
            };

            mockFetch.mockResolvedValueOnce(createMockResponse(existingProject));

            const result = await createVercelProject('token', 'my-project', 'user/repo');

            expect(result.success).toBe(true);
            expect(result.projectId).toBe('proj_123');
            expect(result.message).toContain('already exists');
        });

        it('should create new project when not exists', async () => {
            // First call: check existing (404)
            mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 404));

            // Second call: create project
            const newProject = {
                id: 'proj_new',
                name: 'new-project'
            };
            mockFetch.mockResolvedValueOnce(createMockResponse(newProject));

            const result = await createVercelProject('token', 'new-project', 'user/repo');

            expect(result.success).toBe(true);
            expect(result.projectId).toBe('proj_new');
            expect(result.projectUrl).toContain('vercel.app');
        });

        it('should handle creation error gracefully', async () => {
            // Check existing: 404
            mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 404));

            // Create: error
            mockFetch.mockResolvedValueOnce(createMockResponse(
                { error: { message: 'Permission denied' } },
                false,
                403
            ));

            const result = await createVercelProject('token', 'project', 'user/repo');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Permission denied');
        });

        it('should fall back to simple project when repo not found', async () => {
            // Check existing: 404
            mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 404));

            // Create with repo: repo_not_found
            mockFetch.mockResolvedValueOnce(createMockResponse(
                { error: { code: 'repo_not_found' } },
                false,
                400
            ));

            // Create simple: success
            mockFetch.mockResolvedValueOnce(createMockResponse({
                id: 'proj_simple',
                name: 'simple-project'
            }));

            const result = await createVercelProject('token', 'simple-project', 'user/repo');

            expect(result.success).toBe(true);
            expect(result.needsGitLink).toBe(true);
            expect(result.message).toContain('Link GitHub manually');
        });
    });

    describe('addVercelDomain()', () => {
        it('should add domain successfully', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse({
                verified: true
            }));

            const result = await addVercelDomain('token', 'proj_123', 'example.com');

            expect(result.success).toBe(true);
            expect(result.domain).toBe('example.com');
            expect(result.verified).toBe(true);
        });

        it('should return success if domain already configured', async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse(
                { error: { code: 'domain_already_in_use' } },
                false,
                400
            ));

            const result = await addVercelDomain('token', 'proj_123', 'example.com');

            expect(result.success).toBe(true);
            expect(result.message).toContain('already configured');
        });

        it('should return DNS records when domain not verified', async () => {
            // Add domain: unverified
            mockFetch.mockResolvedValueOnce(createMockResponse({ verified: false }));

            // Get config: misconfigured
            mockFetch.mockResolvedValueOnce(createMockResponse({
                misconfigured: true
            }));

            const result = await addVercelDomain('token', 'proj_123', 'example.com');

            expect(result.success).toBe(true);
            expect(result.verified).toBe(false);
            expect(result.dnsRecords).toBeDefined();
            expect(result.dnsRecords?.find(r => r.type === 'A')).toBeDefined();
        });

        it('should handle errors gracefully', async () => {
            mockFetch.mockRejectedValueOnce(new Error('API error'));

            const result = await addVercelDomain('token', 'proj_123', 'example.com');

            expect(result.success).toBe(false);
            expect(result.error).toContain('API error');
        });
    });
});
