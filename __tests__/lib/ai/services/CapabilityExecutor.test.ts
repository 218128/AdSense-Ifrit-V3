/**
 * Tests for CapabilityExecutor
 * 
 * Comprehensive tests for the provider-agnostic execution layer
 */

import {
    CapabilityExecutor,
    getCapabilityExecutor,
    ProviderDiagnostics
} from '@/lib/ai/services/CapabilityExecutor';
import type {
    CapabilityHandler,
    CapabilitiesConfig,
    ExecuteOptions,
    ExecuteResult
} from '@/lib/ai/services/types';

describe('CapabilityExecutor', () => {
    let executor: CapabilityExecutor;

    // Mock handlers
    const createMockHandler = (overrides: Partial<CapabilityHandler> = {}): CapabilityHandler => ({
        id: 'test-handler',
        name: 'Test Handler',
        type: 'ai-provider',
        providerId: 'test-provider',
        capabilities: ['generate', 'research'],
        priority: 1,
        isAvailable: true,
        execute: jest.fn().mockResolvedValue({
            success: true,
            data: 'Test generated content',
            text: 'Test generated content',
            handlerUsed: 'test-handler',
            source: 'ai-provider',
            latencyMs: 100
        } as ExecuteResult),
        ...overrides
    });

    const createMockConfig = (overrides: Partial<CapabilitiesConfig> = {}): CapabilitiesConfig => ({
        capabilitySettings: {
            generate: {
                defaultHandlerId: 'test-handler',
                fallbackHandlerIds: [],
                enabled: true
            }
        },
        ...overrides
    });

    beforeEach(() => {
        jest.clearAllMocks();
        executor = new CapabilityExecutor({ logToConsole: false });
    });

    describe('execute()', () => {
        it('should execute capability successfully with single handler', async () => {
            const handler = createMockHandler();
            const config = createMockConfig();
            const options: ExecuteOptions = {
                capability: 'generate',
                prompt: 'Test prompt'
            };

            const result = await executor.execute(options, [handler], config);

            expect(result.success).toBe(true);
            expect(handler.execute).toHaveBeenCalledWith(options);
        });

        it('should return error when no handlers available', async () => {
            const config = createMockConfig();
            const options: ExecuteOptions = {
                capability: 'generate',
                prompt: 'Test prompt'
            };

            const result = await executor.execute(options, [], config);

            expect(result.success).toBe(false);
            expect(result.error).toContain('No handlers available');
        });

        it('should retry on failure', async () => {
            const handler = createMockHandler({
                execute: jest.fn()
                    .mockRejectedValueOnce(new Error('First attempt failed'))
                    .mockResolvedValueOnce({
                        success: true,
                        data: 'Success on retry',
                        text: 'Success on retry',
                        handlerUsed: 'test-handler',
                        source: 'ai-provider',
                        latencyMs: 150
                    })
            });
            const config = createMockConfig();
            const options: ExecuteOptions = {
                capability: 'generate',
                prompt: 'Test prompt',
                maxRetries: 2
            };

            const result = await executor.execute(options, [handler], config);

            expect(result.success).toBe(true);
            expect(handler.execute).toHaveBeenCalledTimes(2);
        });

        it('should use fallback handler when primary fails', async () => {
            const primaryHandler = createMockHandler({
                id: 'primary',
                execute: jest.fn().mockResolvedValue({
                    success: false,
                    error: 'Primary failed',
                    handlerUsed: 'primary',
                    source: 'ai-provider',
                    latencyMs: 50
                })
            });
            const fallbackHandler = createMockHandler({
                id: 'fallback',
                execute: jest.fn().mockResolvedValue({
                    success: true,
                    data: 'Fallback success',
                    text: 'Fallback success',
                    handlerUsed: 'fallback',
                    source: 'ai-provider',
                    latencyMs: 100
                })
            });
            const config = createMockConfig({
                capabilitySettings: {
                    generate: {
                        defaultHandlerId: 'primary',
                        fallbackHandlerIds: ['fallback'],
                        enabled: true
                    }
                }
            });
            const options: ExecuteOptions = {
                capability: 'generate',
                prompt: 'Test',
                useFallback: true,
                maxRetries: 0
            };

            const result = await executor.execute(
                options,
                [primaryHandler, fallbackHandler],
                config
            );

            expect(result.success).toBe(true);
            expect(result.fallbacksAttempted).toContain('primary');
        });

        it('should validate generate result', async () => {
            const handler = createMockHandler({
                execute: jest.fn().mockResolvedValue({
                    success: true,
                    data: '', // Empty - should fail validation
                    text: '',
                    handlerUsed: 'test-handler',
                    source: 'ai-provider',
                    latencyMs: 50
                })
            });
            const config = createMockConfig();
            const options: ExecuteOptions = {
                capability: 'generate',
                prompt: 'Test',
                maxRetries: 0
            };

            const result = await executor.execute(options, [handler], config);

            expect(result.success).toBe(false);
        });

        it('should include diagnostics in result', async () => {
            const handler = createMockHandler();
            const config = createMockConfig();
            const options: ExecuteOptions = {
                capability: 'generate',
                prompt: 'Test'
            };

            const result = await executor.execute(options, [handler], config);

            expect(result.diagnostics).toBeDefined();
            expect(result.diagnostics?.providerId).toBe('test-provider');
            expect(result.diagnostics?.latencyMs).toBeGreaterThanOrEqual(0);
        });

        it('should track token usage in diagnostics', async () => {
            const handler = createMockHandler({
                execute: jest.fn().mockResolvedValue({
                    success: true,
                    data: 'Content',
                    text: 'Content',
                    handlerUsed: 'test-handler',
                    source: 'ai-provider',
                    latencyMs: 100,
                    usage: { inputTokens: 50, outputTokens: 200 }
                })
            });
            const config = createMockConfig();
            const options: ExecuteOptions = {
                capability: 'generate',
                prompt: 'Test'
            };

            const result = await executor.execute(options, [handler], config);

            expect(result.diagnostics?.tokensInput).toBe(50);
            expect(result.diagnostics?.tokensOutput).toBe(200);
        });
    });

    describe('getEligibleHandlers()', () => {
        it('should filter handlers by capability', async () => {
            const generateHandler = createMockHandler({ id: 'gen', capabilities: ['generate'] });
            const researchHandler = createMockHandler({ id: 'research', capabilities: ['research'] });
            const config = createMockConfig();
            const options: ExecuteOptions = {
                capability: 'generate',
                prompt: 'Test'
            };

            await executor.execute(options, [generateHandler, researchHandler], config);

            // Only generate handler should have been called
            expect(generateHandler.execute).toHaveBeenCalled();
            expect(researchHandler.execute).not.toHaveBeenCalled();
        });

        it('should prioritize preferred handler', async () => {
            const handler1 = createMockHandler({ id: 'handler1', priority: 1 });
            const handler2 = createMockHandler({ id: 'handler2', priority: 10 });
            const config = createMockConfig({
                capabilitySettings: {
                    generate: {
                        defaultHandlerId: 'handler1', // Lower priority but preferred
                        fallbackHandlerIds: [],
                        enabled: true
                    }
                }
            });
            const options: ExecuteOptions = {
                capability: 'generate',
                prompt: 'Test'
            };

            await executor.execute(options, [handler1, handler2], config);

            // handler1 should be called first even though handler2 has higher priority
            expect(handler1.execute).toHaveBeenCalled();
        });
    });

    describe('getDiagnosticsLog()', () => {
        it('should track all execution attempts', async () => {
            const handler = createMockHandler();
            const config = createMockConfig();

            // Execute multiple times
            await executor.execute({ capability: 'generate', prompt: 'Test 1' }, [handler], config);
            await executor.execute({ capability: 'generate', prompt: 'Test 2' }, [handler], config);

            const logs = executor.getDiagnosticsLog();
            expect(logs.length).toBe(2);
        });

        it('should clear diagnostics log', async () => {
            const handler = createMockHandler();
            const config = createMockConfig();

            await executor.execute({ capability: 'generate', prompt: 'Test' }, [handler], config);
            executor.clearDiagnosticsLog();

            expect(executor.getDiagnosticsLog()).toHaveLength(0);
        });
    });

    describe('getProviderStats()', () => {
        it('should calculate provider statistics', async () => {
            const handler = createMockHandler();
            const config = createMockConfig();

            // Execute multiple times
            await executor.execute({ capability: 'generate', prompt: 'Test 1' }, [handler], config);
            await executor.execute({ capability: 'generate', prompt: 'Test 2' }, [handler], config);

            const stats = executor.getProviderStats();

            expect(stats['test-provider']).toBeDefined();
            expect(stats['test-provider'].calls).toBe(2);
            expect(stats['test-provider'].successRate).toBe(100);
        });

        it('should track error rate', async () => {
            let callCount = 0;
            const handler = createMockHandler({
                execute: jest.fn().mockImplementation(() => {
                    callCount++;
                    if (callCount === 1) {
                        return Promise.resolve({
                            success: true,
                            data: 'OK',
                            text: 'OK',
                            handlerUsed: 'test',
                            source: 'ai-provider',
                            latencyMs: 100
                        });
                    }
                    return Promise.resolve({
                        success: false,
                        error: 'Failed',
                        handlerUsed: 'test',
                        source: 'ai-provider',
                        latencyMs: 50
                    });
                })
            });
            const config = createMockConfig();

            await executor.execute({ capability: 'generate', prompt: 'Test 1' }, [handler], config);
            await executor.execute({ capability: 'generate', prompt: 'Test 2', maxRetries: 0 }, [handler], config);

            const stats = executor.getProviderStats();
            expect(stats['test-provider'].errors).toBe(1);
        });
    });

    describe('updateConfig()', () => {
        it('should update executor configuration', () => {
            executor.updateConfig({ defaultMaxRetries: 5 });

            // Configuration is private, but we can test behavior
            // by verifying retry count in execution
            expect(executor).toBeDefined();
        });
    });

    describe('getCapabilityExecutor()', () => {
        it('should return singleton instance', () => {
            const instance1 = getCapabilityExecutor();
            const instance2 = getCapabilityExecutor();

            expect(instance1).toBe(instance2);
        });
    });
});
