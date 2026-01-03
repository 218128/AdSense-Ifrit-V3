/**
 * Global Action Status Store Tests
 * 
 * Tests for Zustand store managing global action status tracking.
 * Follows enterprise-grade testing patterns.
 */

import { useGlobalActionStatusStore } from '@/stores/globalActionStatusStore';

// Reset store before each test
beforeEach(() => {
    useGlobalActionStatusStore.setState({
        actions: [],
        config: {
            showTimestamps: true,
            showDuration: true,
            expandSteps: true,
            maxVisible: 10,
            autoCollapseSeconds: 0,
        },
        isMinimized: false,
        lastUserActionAt: Date.now(),
    });
});

describe('Global Action Status Store', () => {
    describe('Action Lifecycle', () => {
        it('should start an action and return ID', () => {
            const { startAction } = useGlobalActionStatusStore.getState();

            const actionId = startAction('Test Action', 'domain');

            expect(actionId).toBeDefined();
            expect(actionId).toMatch(/^action_/);

            const { actions } = useGlobalActionStatusStore.getState();
            expect(actions).toHaveLength(1);
            expect(actions[0].name).toBe('Test Action');
            expect(actions[0].category).toBe('domain');
            expect(actions[0].phase).toBe('running');
        });

        it('should update action message', () => {
            const { startAction, updateAction } = useGlobalActionStatusStore.getState();

            const actionId = startAction('Test Action', 'domain');
            updateAction(actionId, 'Updated message');

            const { actions } = useGlobalActionStatusStore.getState();
            expect(actions[0].message).toBe('Updated message');
        });

        it('should complete action successfully', () => {
            const { startAction, completeAction } = useGlobalActionStatusStore.getState();

            const actionId = startAction('Test Action', 'domain');
            completeAction(actionId, 'Done successfully');

            const { actions } = useGlobalActionStatusStore.getState();
            expect(actions[0].phase).toBe('success');
            expect(actions[0].message).toBe('Done successfully');
            expect(actions[0].completedAt).toBeDefined();
            expect(actions[0].durationMs).toBeDefined();
        });

        it('should fail action with error', () => {
            const { startAction, failAction } = useGlobalActionStatusStore.getState();

            const actionId = startAction('Test Action', 'domain');
            failAction(actionId, 'Something went wrong');

            const { actions } = useGlobalActionStatusStore.getState();
            expect(actions[0].phase).toBe('error');
            expect(actions[0].error).toBe('Something went wrong');
            expect(actions[0].completedAt).toBeDefined();
        });
    });

    describe('Steps', () => {
        it('should add step to action', () => {
            const { startAction, addStep } = useGlobalActionStatusStore.getState();

            const actionId = startAction('Test Action', 'domain');
            const stepId = addStep(actionId, 'Step 1');

            expect(stepId).toBeDefined();

            const { actions } = useGlobalActionStatusStore.getState();
            expect(actions[0].steps).toHaveLength(1);
            expect(actions[0].steps[0].message).toBe('Step 1');
            expect(actions[0].steps[0].phase).toBe('running');
        });

        it('should complete step', () => {
            const { startAction, addStep, completeStep } = useGlobalActionStatusStore.getState();

            const actionId = startAction('Test Action', 'domain');
            const stepId = addStep(actionId, 'Step 1');
            completeStep(actionId, stepId, true);

            const { actions } = useGlobalActionStatusStore.getState();
            expect(actions[0].steps[0].phase).toBe('success');
            expect(actions[0].steps[0].completedAt).toBeDefined();
            expect(actions[0].steps[0].durationMs).toBeDefined();
        });

        it('should fail step', () => {
            const { startAction, addStep, completeStep } = useGlobalActionStatusStore.getState();

            const actionId = startAction('Test Action', 'domain');
            const stepId = addStep(actionId, 'Step 1');
            completeStep(actionId, stepId, false);

            const { actions } = useGlobalActionStatusStore.getState();
            expect(actions[0].steps[0].phase).toBe('error');
        });
    });

    describe('Progress', () => {
        it('should set progress on action', () => {
            const { startAction, setProgress } = useGlobalActionStatusStore.getState();

            const actionId = startAction('Test Action', 'domain');
            setProgress(actionId, 3, 10);

            const { actions } = useGlobalActionStatusStore.getState();
            expect(actions[0].progress).toEqual({ current: 3, total: 10 });
        });
    });

    describe('Panel Controls', () => {
        it('should clear all actions', () => {
            const { startAction, clearActions } = useGlobalActionStatusStore.getState();

            startAction('Action 1', 'domain');
            startAction('Action 2', 'keyword');
            clearActions();

            const { actions } = useGlobalActionStatusStore.getState();
            expect(actions).toHaveLength(0);
        });

        it('should mark user action and clear', () => {
            const { startAction, markUserAction } = useGlobalActionStatusStore.getState();

            startAction('Action 1', 'domain');
            markUserAction();

            const { actions, lastUserActionAt } = useGlobalActionStatusStore.getState();
            expect(actions).toHaveLength(0);
            expect(lastUserActionAt).toBeDefined();
        });

        it('should toggle minimize state', () => {
            const { toggleMinimize } = useGlobalActionStatusStore.getState();

            expect(useGlobalActionStatusStore.getState().isMinimized).toBe(false);

            toggleMinimize();
            expect(useGlobalActionStatusStore.getState().isMinimized).toBe(true);

            toggleMinimize();
            expect(useGlobalActionStatusStore.getState().isMinimized).toBe(false);
        });

        it('should update config', () => {
            const { setConfig } = useGlobalActionStatusStore.getState();

            setConfig({ maxVisible: 5, showDuration: false });

            const { config } = useGlobalActionStatusStore.getState();
            expect(config.maxVisible).toBe(5);
            expect(config.showDuration).toBe(false);
            expect(config.showTimestamps).toBe(true); // Unchanged
        });
    });

    describe('Multiple Actions', () => {
        it('should track multiple concurrent actions', () => {
            const { startAction } = useGlobalActionStatusStore.getState();

            startAction('Action 1', 'domain');
            startAction('Action 2', 'keyword');
            startAction('Action 3', 'ai');

            const { actions } = useGlobalActionStatusStore.getState();
            expect(actions).toHaveLength(3);
            expect(actions[0].category).toBe('domain');
            expect(actions[1].category).toBe('keyword');
            expect(actions[2].category).toBe('ai');
        });

        it('should complete specific action by ID', () => {
            const { startAction, completeAction } = useGlobalActionStatusStore.getState();

            const id1 = startAction('Action 1', 'domain');
            const id2 = startAction('Action 2', 'keyword');

            completeAction(id1);

            const { actions } = useGlobalActionStatusStore.getState();
            expect(actions[0].phase).toBe('success');
            expect(actions[1].phase).toBe('running');
        });
    });

    describe('Action Categories', () => {
        it('should support all category types', () => {
            const { startAction } = useGlobalActionStatusStore.getState();

            const categories = ['domain', 'keyword', 'content', 'ai', 'network', 'file', 'system'] as const;

            categories.forEach(cat => {
                startAction(`${cat} action`, cat);
            });

            const { actions } = useGlobalActionStatusStore.getState();
            expect(actions).toHaveLength(7);
            categories.forEach((cat, idx) => {
                expect(actions[idx].category).toBe(cat);
            });
        });
    });
});
