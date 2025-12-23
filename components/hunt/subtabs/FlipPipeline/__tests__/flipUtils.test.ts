/**
 * Tests for flipUtils
 * 
 * Unit tests for calculateROI and calculateStats functions.
 */

import { calculateROI, calculateStats } from '../flipUtils';
import type { FlipProject } from '@/lib/flip/types';

// Helper to create a test project
function createProject(overrides: Partial<FlipProject>): FlipProject {
    return {
        id: '1',
        domain: 'test.com',
        stage: 'acquired',
        purchasePrice: 100,
        purchaseDate: '2024-01-01',
        registrar: 'test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...overrides,
    };
}

describe('calculateROI', () => {
    it('returns 0 when purchasePrice is 0', () => {
        const project = createProject({ purchasePrice: 0, salePrice: 1000 });
        expect(calculateROI(project)).toBe(0);
    });

    it('returns 0 when salePrice is undefined', () => {
        const project = createProject({ purchasePrice: 100 });
        expect(calculateROI(project)).toBe(0);
    });

    it('calculates positive ROI correctly', () => {
        // Bought for $100, sold for $200 = 100% ROI
        const project = createProject({ purchasePrice: 100, salePrice: 200 });
        expect(calculateROI(project)).toBe(100);
    });

    it('calculates negative ROI correctly', () => {
        // Bought for $200, sold for $100 = -50% ROI
        const project = createProject({ purchasePrice: 200, salePrice: 100 });
        expect(calculateROI(project)).toBe(-50);
    });

    it('handles fractional results', () => {
        // Bought for $100, sold for $150 = 50% ROI
        const project = createProject({ purchasePrice: 100, salePrice: 150 });
        expect(calculateROI(project)).toBe(50);
    });
});

describe('calculateStats', () => {
    it('returns zeroes for empty projects array', () => {
        const stats = calculateStats([]);
        expect(stats.total).toBe(0);
        expect(stats.inPipeline).toBe(0);
        expect(stats.totalInvested).toBe(0);
        expect(stats.totalProfit).toBe(0);
        expect(stats.avgROI).toBe(0);
    });

    it('counts total and in-pipeline projects correctly', () => {
        const projects: FlipProject[] = [
            createProject({ id: '1', stage: 'acquired', purchasePrice: 100 }),
            createProject({ id: '2', stage: 'building', purchasePrice: 200 }),
            createProject({ id: '3', stage: 'sold', purchasePrice: 300, salePrice: 600 }),
        ];

        const stats = calculateStats(projects);
        expect(stats.total).toBe(3);
        expect(stats.inPipeline).toBe(2); // acquired + building
    });

    it('calculates total invested correctly', () => {
        const projects: FlipProject[] = [
            createProject({ id: '1', stage: 'acquired', purchasePrice: 100 }),
            createProject({ id: '2', stage: 'sold', purchasePrice: 200, salePrice: 400 }),
        ];

        const stats = calculateStats(projects);
        expect(stats.totalInvested).toBe(300);
    });

    it('calculates profit and ROI for sold projects', () => {
        const projects: FlipProject[] = [
            createProject({ id: '1', stage: 'sold', purchasePrice: 100, salePrice: 200 }),
            createProject({ id: '2', stage: 'sold', purchasePrice: 200, salePrice: 400 }),
        ];

        const stats = calculateStats(projects);
        // Profit: (200-100) + (400-200) = 100 + 200 = 300
        expect(stats.totalProfit).toBe(300);
        // ROI: 100% for each, avg = 100%
        expect(stats.avgROI).toBe(100);
    });
});
