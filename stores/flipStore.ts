/**
 * Flip Store - Zustand state management for Flip Pipeline
 * 
 * Centralizes state for domain flip projects.
 * Uses persist middleware for localStorage persistence.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FlipProject, FlipStage, FlipStats } from '@/lib/flip/types';
import { STORAGE_KEY } from '@/lib/flip/types';

// ============ HELPERS ============

function calculateROI(project: FlipProject): number {
    if (!project.salePrice || project.purchasePrice === 0) return 0;
    return Math.round(((project.salePrice - project.purchasePrice) / project.purchasePrice) * 100);
}

function calculateStats(projects: FlipProject[]): FlipStats {
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

// ============ STORE INTERFACE ============

interface FlipStore {
    // State
    projects: FlipProject[];

    // CRUD Operations
    addProject: (project: FlipProject) => void;
    updateProject: (project: FlipProject) => void;
    deleteProject: (id: string) => void;

    // Stage Management
    moveToStage: (projectId: string, stage: FlipStage) => void;

    // Computed
    getStats: () => FlipStats;
    getProjectsByStage: (stage: FlipStage) => FlipProject[];
}

// ============ STORE IMPLEMENTATION ============

export const useFlipStore = create<FlipStore>()(
    persist(
        (set, get) => ({
            projects: [],

            addProject: (project) => set((state) => ({
                projects: [...state.projects, project]
            })),

            updateProject: (project) => set((state) => ({
                projects: state.projects.map(p =>
                    p.id === project.id ? { ...project, updatedAt: Date.now() } : p
                )
            })),

            deleteProject: (id) => set((state) => ({
                projects: state.projects.filter(p => p.id !== id)
            })),

            moveToStage: (projectId, stage) => set((state) => ({
                projects: state.projects.map(p =>
                    p.id === projectId ? { ...p, stage, updatedAt: Date.now() } : p
                )
            })),

            getStats: () => calculateStats(get().projects),

            getProjectsByStage: (stage) => get().projects.filter(p => p.stage === stage),
        }),
        {
            name: STORAGE_KEY,
        }
    )
);

// ============ SELECTORS ============

export const selectProjects = (state: FlipStore) => state.projects;
export const selectStats = (state: FlipStore) => state.getStats();
