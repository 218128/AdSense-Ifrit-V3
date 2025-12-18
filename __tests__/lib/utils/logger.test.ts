/**
 * Tests for Logger Utility
 */

import {
    logger,
    createLogger,
    siteBuilderLogger,
    contentLogger,
    trendLogger,
    publishLogger
} from '@/lib/utils/logger';

describe('Logger Utility', () => {
    // Spy on console methods
    let consoleSpy: {
        log: jest.SpyInstance;
        warn: jest.SpyInstance;
        error: jest.SpyInstance;
    };

    beforeEach(() => {
        consoleSpy = {
            log: jest.spyOn(console, 'log').mockImplementation(),
            warn: jest.spyOn(console, 'warn').mockImplementation(),
            error: jest.spyOn(console, 'error').mockImplementation(),
        };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('logger.info', () => {
        it('should log info messages', () => {
            logger.info('Test info message');

            expect(consoleSpy.log).toHaveBeenCalled();
            expect(consoleSpy.log.mock.calls[0][0]).toContain('Test info message');
        });

        it('should include module prefix when provided', () => {
            logger.info('Module message', { module: 'TestModule' });

            expect(consoleSpy.log.mock.calls[0][0]).toContain('[TestModule]');
        });

        it('should include timestamp in message', () => {
            logger.info('Timestamp test');

            // Timestamp format: HH:MM:SS.mmm
            expect(consoleSpy.log.mock.calls[0][0]).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
        });
    });

    describe('logger.warn', () => {
        it('should log warning messages with console.warn', () => {
            logger.warn('Test warning');

            expect(consoleSpy.warn).toHaveBeenCalled();
            expect(consoleSpy.warn.mock.calls[0][0]).toContain('Test warning');
        });

        it('should include warning emoji', () => {
            logger.warn('Warning message');

            expect(consoleSpy.warn.mock.calls[0][0]).toContain('⚠️');
        });
    });

    describe('logger.error', () => {
        it('should log error messages with console.error', () => {
            logger.error('Test error');

            expect(consoleSpy.error).toHaveBeenCalled();
            expect(consoleSpy.error.mock.calls[0][0]).toContain('Test error');
        });

        it('should include error emoji', () => {
            logger.error('Error message');

            expect(consoleSpy.error.mock.calls[0][0]).toContain('❌');
        });

        it('should accept optional Error object', () => {
            const testError = new Error('Test error object');
            logger.error('Error with object', testError);

            expect(consoleSpy.error).toHaveBeenCalled();
        });
    });

    describe('logger.success', () => {
        it('should log success messages with checkmark', () => {
            logger.success('Operation completed');

            expect(consoleSpy.log).toHaveBeenCalled();
            expect(consoleSpy.log.mock.calls[0][0]).toContain('✅');
            expect(consoleSpy.log.mock.calls[0][0]).toContain('Operation completed');
        });
    });

    describe('logger.progress', () => {
        it('should log progress steps with indicator', () => {
            logger.progress('Step 1 complete');

            expect(consoleSpy.log).toHaveBeenCalled();
            expect(consoleSpy.log.mock.calls[0][0]).toContain('✓');
            expect(consoleSpy.log.mock.calls[0][0]).toContain('Step 1 complete');
        });
    });

    describe('createLogger', () => {
        it('should create a module-specific logger', () => {
            const customLogger = createLogger('CustomModule');

            expect(customLogger).toHaveProperty('debug');
            expect(customLogger).toHaveProperty('info');
            expect(customLogger).toHaveProperty('warn');
            expect(customLogger).toHaveProperty('error');
            expect(customLogger).toHaveProperty('success');
            expect(customLogger).toHaveProperty('progress');
        });

        it('should include module name in logs', () => {
            const customLogger = createLogger('MyModule');
            customLogger.info('Custom module message');

            expect(consoleSpy.log.mock.calls[0][0]).toContain('[MyModule]');
        });

        it('should work with known module names', () => {
            const sbLogger = createLogger('SiteBuilder');
            sbLogger.info('Site builder message');

            // Emoji only shown in dev mode, but module name should always be present
            expect(consoleSpy.log.mock.calls[0][0]).toContain('[SiteBuilder]');
        });
    });

    describe('Pre-configured loggers', () => {
        it('should export siteBuilderLogger', () => {
            expect(siteBuilderLogger).toBeDefined();
            siteBuilderLogger.info('Site builder test');

            expect(consoleSpy.log.mock.calls[0][0]).toContain('[SiteBuilder]');
        });

        it('should export contentLogger', () => {
            expect(contentLogger).toBeDefined();
            contentLogger.info('Content test');

            expect(consoleSpy.log.mock.calls[0][0]).toContain('[ContentGenerator]');
        });

        it('should export trendLogger', () => {
            expect(trendLogger).toBeDefined();
            trendLogger.info('Trend test');

            expect(consoleSpy.log.mock.calls[0][0]).toContain('[TrendScanner]');
        });

        it('should export publishLogger', () => {
            expect(publishLogger).toBeDefined();
            publishLogger.info('Publish test');

            expect(consoleSpy.log.mock.calls[0][0]).toContain('[Publish]');
        });
    });
});
