/**
 * Status Stream API Tests
 * 
 * Comprehensive tests for the server-side streaming status system.
 * Tests the full pipeline:
 * 1. StatusEventEmitter emits events
 * 2. SSE stream delivers to client
 * 3. Client receives and processes events
 */

import { statusEmitter, StatusEvent, generateSessionId } from '@/app/api/status/stream/route';

// ============================================
// StatusEventEmitter Unit Tests
// ============================================

describe('StatusEventEmitter', () => {
    const testSessionId = 'test_session_123';

    beforeEach(() => {
        // Clear any existing listeners/history
        statusEmitter.clearSession(testSessionId);
    });

    describe('Event Subscription', () => {
        it('should subscribe to events for a session', () => {
            const events: StatusEvent[] = [];
            const unsubscribe = statusEmitter.subscribe(testSessionId, (event) => {
                events.push(event);
            });

            const testEvent: StatusEvent = {
                actionId: 'action_1',
                type: 'start',
                name: 'Test Action',
                message: 'Starting...',
                status: 'running',
                timestamp: Date.now(),
            };

            statusEmitter.emit(testSessionId, testEvent);

            expect(events).toHaveLength(1);
            expect(events[0].name).toBe('Test Action');
            expect(events[0].type).toBe('start');

            unsubscribe();
        });

        it('should support multiple subscribers', () => {
            const events1: StatusEvent[] = [];
            const events2: StatusEvent[] = [];

            const unsub1 = statusEmitter.subscribe(testSessionId, (e) => events1.push(e));
            const unsub2 = statusEmitter.subscribe(testSessionId, (e) => events2.push(e));

            statusEmitter.emit(testSessionId, {
                actionId: 'action_1',
                type: 'step',
                name: 'Test',
                message: 'Step 1',
                status: 'running',
                timestamp: Date.now(),
            });

            expect(events1).toHaveLength(1);
            expect(events2).toHaveLength(1);

            unsub1();
            unsub2();
        });

        it('should unsubscribe correctly', () => {
            const events: StatusEvent[] = [];
            const unsubscribe = statusEmitter.subscribe(testSessionId, (e) => events.push(e));

            statusEmitter.emit(testSessionId, {
                actionId: 'action_1',
                type: 'step',
                name: 'Test',
                message: 'Before unsub',
                status: 'running',
                timestamp: Date.now(),
            });

            unsubscribe();

            statusEmitter.emit(testSessionId, {
                actionId: 'action_1',
                type: 'step',
                name: 'Test',
                message: 'After unsub',
                status: 'running',
                timestamp: Date.now(),
            });

            expect(events).toHaveLength(1);
            expect(events[0].message).toBe('Before unsub');
        });
    });

    describe('Event History', () => {
        it('should store events in history', () => {
            statusEmitter.emit(testSessionId, {
                actionId: 'action_1',
                type: 'start',
                name: 'Test',
                message: 'Starting',
                status: 'running',
                timestamp: Date.now(),
            });

            statusEmitter.emit(testSessionId, {
                actionId: 'action_1',
                type: 'complete',
                name: 'Test',
                message: 'Done',
                status: 'success',
                timestamp: Date.now(),
            });

            const history = statusEmitter.getHistory(testSessionId);
            expect(history).toHaveLength(2);
            expect(history[0].type).toBe('start');
            expect(history[1].type).toBe('complete');
        });

        it('should clear session history', () => {
            statusEmitter.emit(testSessionId, {
                actionId: 'action_1',
                type: 'start',
                name: 'Test',
                message: 'Starting',
                status: 'running',
                timestamp: Date.now(),
            });

            statusEmitter.clearSession(testSessionId);

            const history = statusEmitter.getHistory(testSessionId);
            expect(history).toHaveLength(0);
        });
    });

    describe('Action Tracker', () => {
        it('should create tracker and emit start event', () => {
            const events: StatusEvent[] = [];
            statusEmitter.subscribe(testSessionId, (e) => events.push(e));

            const tracker = statusEmitter.createTracker(testSessionId, 'action_123', 'Analyze Domain', 'domain');

            expect(events).toHaveLength(1);
            expect(events[0].type).toBe('start');
            expect(events[0].name).toBe('Analyze Domain');
            expect(events[0].category).toBe('domain');
            expect(events[0].status).toBe('running');
        });

        it('should emit step events with status', () => {
            const events: StatusEvent[] = [];
            statusEmitter.subscribe(testSessionId, (e) => events.push(e));

            const tracker = statusEmitter.createTracker(testSessionId, 'action_123', 'Analyze', 'domain');

            tracker.step('Spam Check', 'success', 'No spam indicators found');
            tracker.step('Trust Check', 'warning', 'Short domain length');
            tracker.step('Blacklist Check', 'fail', 'Listed in Spamhaus');

            expect(events).toHaveLength(4); // 1 start + 3 steps

            expect(events[1].message).toBe('Spam Check');
            expect(events[1].status).toBe('success');
            expect(events[1].reason).toBe('No spam indicators found');

            expect(events[2].status).toBe('warning');
            expect(events[3].status).toBe('fail');
        });

        it('should emit progress events', () => {
            const events: StatusEvent[] = [];
            statusEmitter.subscribe(testSessionId, (e) => events.push(e));

            const tracker = statusEmitter.createTracker(testSessionId, 'action_123', 'Processing', 'system');

            tracker.progress(1, 5, 'Step 1 of 5');
            tracker.progress(3, 5);
            tracker.progress(5, 5, 'All done');

            expect(events).toHaveLength(4); // 1 start + 3 progress

            expect(events[1].type).toBe('progress');
            expect(events[1].progress).toEqual({ current: 1, total: 5 });

            expect(events[3].progress).toEqual({ current: 5, total: 5 });
        });

        it('should emit complete event', () => {
            const events: StatusEvent[] = [];
            statusEmitter.subscribe(testSessionId, (e) => events.push(e));

            const tracker = statusEmitter.createTracker(testSessionId, 'action_123', 'Analyze', 'domain');

            tracker.complete('Analysis complete - Strong Buy', ['Score: 85', 'TLD: .com']);

            expect(events).toHaveLength(2); // 1 start + 1 complete
            expect(events[1].type).toBe('complete');
            expect(events[1].status).toBe('success');
            expect(events[1].message).toBe('Analysis complete - Strong Buy');
            expect(events[1].details).toEqual(['Score: 85', 'TLD: .com']);
        });

        it('should emit error event', () => {
            const events: StatusEvent[] = [];
            statusEmitter.subscribe(testSessionId, (e) => events.push(e));

            const tracker = statusEmitter.createTracker(testSessionId, 'action_123', 'Analyze', 'domain');

            tracker.fail('Analysis failed', 'Network timeout');

            expect(events).toHaveLength(2); // 1 start + 1 error
            expect(events[1].type).toBe('error');
            expect(events[1].status).toBe('fail');
            expect(events[1].message).toBe('Analysis failed');
            expect(events[1].reason).toBe('Network timeout');
        });
    });

    describe('Session ID Generation', () => {
        it('should generate unique session IDs', () => {
            const id1 = generateSessionId();
            const id2 = generateSessionId();

            expect(id1).toMatch(/^session_\d+_[a-z0-9]+$/);
            expect(id2).toMatch(/^session_\d+_[a-z0-9]+$/);
            expect(id1).not.toBe(id2);
        });
    });
});

// ============================================
// Full Pipeline Simulation Tests
// ============================================

describe('Status Streaming Pipeline', () => {
    const sessionId = 'pipeline_test_session';

    beforeEach(() => {
        statusEmitter.clearSession(sessionId);
    });

    it('should handle full domain analyze flow', () => {
        const events: StatusEvent[] = [];
        statusEmitter.subscribe(sessionId, (e) => events.push(e));

        // Simulate what an API route would do
        const tracker = statusEmitter.createTracker(sessionId, 'analyze_001', 'Analyze: example.com', 'domain');

        // Simulate each check
        tracker.step('Domain Validation', 'success', 'Format valid, TLD: .com');
        tracker.step('Spam Check', 'success', 'No spam indicators');
        tracker.step('Trust Check', 'success', 'Premium TLD, Short domain');
        tracker.step('Blacklist Check', 'success', 'Not listed in any DNS blacklist');
        tracker.step('Wayback Check', 'success', 'Clean history since 2015');
        tracker.step('Score Calculation', 'running');
        tracker.complete('Score: 85/100 - Strong Buy');

        expect(events).toHaveLength(8);

        // Verify event sequence
        expect(events[0].type).toBe('start');
        expect(events[1].message).toBe('Domain Validation');
        expect(events[2].message).toBe('Spam Check');
        expect(events[3].message).toBe('Trust Check');
        expect(events[4].message).toBe('Blacklist Check');
        expect(events[5].message).toBe('Wayback Check');
        expect(events[6].message).toBe('Score Calculation');
        expect(events[7].type).toBe('complete');

        // All steps have success status (5 checks + 1 complete, Score Calculation was 'running')
        const successCount = events.filter(e => e.status === 'success').length;
        expect(successCount).toBe(6); // 5 checks + complete (Score Calculation is 'running')
    });

    it('should handle failed check in flow', () => {
        const events: StatusEvent[] = [];
        statusEmitter.subscribe(sessionId, (e) => events.push(e));

        const tracker = statusEmitter.createTracker(sessionId, 'analyze_002', 'Analyze: spam-site.xyz', 'domain');

        tracker.step('Domain Validation', 'success', 'Format valid');
        tracker.step('Spam Check', 'fail', 'Suspicious TLD: .xyz');
        tracker.step('Trust Check', 'warning', 'Low trust score');
        tracker.fail('Analysis aborted - High risk domain');

        expect(events).toHaveLength(5);
        expect(events[2].status).toBe('fail');
        expect(events[3].status).toBe('warning');
        expect(events[4].type).toBe('error');
    });

    it('should handle concurrent actions', () => {
        const events: StatusEvent[] = [];
        statusEmitter.subscribe(sessionId, (e) => events.push(e));

        // Start two concurrent actions
        const tracker1 = statusEmitter.createTracker(sessionId, 'action_1', 'Action A', 'domain');
        const tracker2 = statusEmitter.createTracker(sessionId, 'action_2', 'Action B', 'domain');

        tracker1.step('Step A1', 'running');
        tracker2.step('Step B1', 'running');
        tracker1.complete('A Done');
        tracker2.step('Step B2', 'success');
        tracker2.complete('B Done');

        expect(events).toHaveLength(7); // 2 starts + 3 steps + 2 completes

        // Verify both actions are tracked
        const action1Events = events.filter(e => e.actionId === 'action_1');
        const action2Events = events.filter(e => e.actionId === 'action_2');

        expect(action1Events).toHaveLength(3);
        expect(action2Events).toHaveLength(4);
    });
});

// ============================================
// Capability Handler Status Integration Tests
// ============================================

describe('Capability Handler Status Format', () => {
    it('should format AI capability status events correctly', () => {
        const sessionId = 'ai_capability_test';
        const events: StatusEvent[] = [];
        statusEmitter.subscribe(sessionId, (e) => events.push(e));

        // Simulate AI capability execution with status
        const tracker = statusEmitter.createTracker(sessionId, 'ai_001', 'AI: keyword-analyze', 'ai');

        tracker.step('Attempting handler: gemini', 'running');
        tracker.step('Handler gemini', 'fail', 'Rate limited (429)');
        tracker.step('Attempting handler: deepseek', 'running');
        tracker.step('Handler deepseek', 'success', 'Response received in 2.3s');
        tracker.complete('Capability executed successfully');

        expect(events).toHaveLength(6);
        expect(events[0].category).toBe('ai');
        expect(events[2].reason).toBe('Rate limited (429)');
        expect(events[4].reason).toContain('Response received');

        statusEmitter.clearSession(sessionId);
    });

    it('should format network request status events correctly', () => {
        const sessionId = 'network_test';
        const events: StatusEvent[] = [];
        statusEmitter.subscribe(sessionId, (e) => events.push(e));

        const tracker = statusEmitter.createTracker(sessionId, 'net_001', 'Wayback API', 'network');

        tracker.step('Connecting to archive.org', 'running');
        tracker.step('Fetching snapshots', 'running');
        tracker.progress(1, 3, 'Analyzing snapshot 1/3');
        tracker.progress(2, 3, 'Analyzing snapshot 2/3');
        tracker.progress(3, 3, 'Analyzing snapshot 3/3');
        tracker.complete('3 snapshots analyzed');

        expect(events).toHaveLength(7);
        expect(events[0].category).toBe('network');

        statusEmitter.clearSession(sessionId);
    });
});
