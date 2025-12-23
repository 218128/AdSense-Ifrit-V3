/**
 * Flip Pipeline Utilities
 * 
 * Extracted from FlipPipeline.tsx - calculation functions.
 */

import type { FlipProject, FlipStats } from '@/lib/flip/types';

export function calculateROI(project: FlipProject): number {
    if (!project.salePrice || project.purchasePrice === 0) return 0;
    return Math.round(((project.salePrice - project.purchasePrice) / project.purchasePrice) * 100);
}

export function calculateStats(projects: FlipProject[]): FlipStats {
    const soldProjects = projects.filter(p => p.stage === 'sold' && p.salePrice !== undefined);

    const totalInvested = projects.reduce((sum, p) => sum + p.purchasePrice, 0);
    const totalProfit = soldProjects.reduce((sum, p) => sum + ((p.salePrice || 0) - p.purchasePrice), 0);
    const avgROI = soldProjects.length > 0
        ? Math.round(soldProjects.reduce((sum, p) => sum + calculateROI(p), 0) / soldProjects.length)
        : 0;

    return {
        total: projects.length,
        inPipeline: projects.filter(p => p.stage !== 'sold').length,
        totalInvested: Math.round(totalInvested),
        totalProfit: Math.round(totalProfit),
        avgROI,
    };
}
