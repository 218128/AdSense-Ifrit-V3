/**
 * Tests for Flip Utility Functions
 */

import {
    calculateROI,
    calculateProfit,
    calculateDaysHeld,
    calculateStats,
    generateProjectId
} from '@/lib/flip/utils';
import type { FlipProject } from '@/lib/flip/types';

const mockProject: FlipProject = {
    id: 'test-1',
    domain: 'test.com',
    stage: 'sold',
    purchasePrice: 100,
    purchaseDate: '2024-01-01',
    registrar: 'Namecheap',
    salePrice: 300,
    saleDate: '2024-06-01',
    createdAt: Date.now(),
    updatedAt: Date.now(),
};

describe('Flip Utils', () => {
    describe('calculateROI', () => {
        it('calculates ROI correctly for sold project', () => {
            const roi = calculateROI(mockProject);
            expect(roi).toBe(200); // (300-100)/100 * 100 = 200%
        });

        it('returns 0 for unsold project', () => {
            const unsold = { ...mockProject, salePrice: undefined };
            expect(calculateROI(unsold)).toBe(0);
        });

        it('returns 0 for zero purchase price', () => {
            const zeroPurchase = { ...mockProject, purchasePrice: 0 };
            expect(calculateROI(zeroPurchase)).toBe(0);
        });
    });

    describe('calculateProfit', () => {
        it('calculates profit correctly', () => {
            const profit = calculateProfit(mockProject);
            expect(profit).toBe(200); // 300 - 100
        });

        it('returns 0 for unsold project', () => {
            const unsold = { ...mockProject, salePrice: undefined };
            expect(calculateProfit(unsold)).toBe(0);
        });
    });

    describe('calculateDaysHeld', () => {
        it('calculates days held for sold project', () => {
            const days = calculateDaysHeld(mockProject);
            expect(days).toBe(152); // Jan 1 to Jun 1 = ~152 days
        });

        it('calculates days to today for unsold project', () => {
            const unsold = { ...mockProject, saleDate: undefined };
            const days = calculateDaysHeld(unsold);
            expect(days).toBeGreaterThan(0);
        });
    });

    describe('calculateStats', () => {
        it('calculates aggregate stats', () => {
            const projects: FlipProject[] = [
                mockProject,
                { ...mockProject, id: 'test-2', stage: 'building', salePrice: undefined, profit: undefined, roi: undefined },
            ];
            const stats = calculateStats(projects);

            expect(stats.total).toBe(2);
            expect(stats.inPipeline).toBe(1);
            expect(stats.totalInvested).toBe(200);
        });

        it('handles empty project list', () => {
            const stats = calculateStats([]);
            expect(stats.total).toBe(0);
            expect(stats.avgROI).toBe(0);
        });
    });

    describe('generateProjectId', () => {
        it('generates unique IDs', () => {
            const id1 = generateProjectId();
            const id2 = generateProjectId();
            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^flip_/);
        });
    });
});
