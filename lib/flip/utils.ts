/**
 * Flip Utility Functions
 * 
 * Business logic for flip pipeline calculations.
 */

import type { FlipProject, FlipStats } from './types';

/**
 * Calculate ROI for a project
 */
export function calculateROI(project: FlipProject): number {
    if (project.salePrice && project.purchasePrice > 0) {
        return ((project.salePrice - project.purchasePrice) / project.purchasePrice) * 100;
    }
    return 0;
}

/**
 * Calculate profit for a project
 */
export function calculateProfit(project: FlipProject): number {
    if (project.salePrice && project.purchasePrice) {
        return project.salePrice - project.purchasePrice;
    }
    return 0;
}

/**
 * Calculate days held for a project
 */
export function calculateDaysHeld(project: FlipProject): number {
    const start = new Date(project.purchaseDate);
    const end = project.saleDate ? new Date(project.saleDate) : new Date();
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate aggregate stats for all projects
 */
export function calculateStats(projects: FlipProject[]): FlipStats {
    const sold = projects.filter(p => p.stage === 'sold');
    const inPipeline = projects.filter(p => p.stage !== 'sold');

    const totalInvested = projects.reduce((sum, p) => sum + p.purchasePrice, 0);
    const totalProfit = sold.reduce((sum, p) => sum + (p.profit || 0), 0);
    const avgROI = sold.length > 0
        ? sold.reduce((sum, p) => sum + (p.roi || 0), 0) / sold.length
        : 0;

    return {
        total: projects.length,
        inPipeline: inPipeline.length,
        totalInvested,
        totalProfit,
        avgROI,
    };
}

/**
 * Generate a unique project ID
 */
export function generateProjectId(): string {
    return `flip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
