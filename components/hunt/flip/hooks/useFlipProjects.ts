/**
 * useFlipProjects Hook
 * 
 * Manages flip project state with localStorage persistence.
 */

import { useState, useCallback, useEffect } from 'react';
import type { FlipProject, FlipStage, FlipStats } from '@/lib/flip/types';
import { STORAGE_KEY } from '@/lib/flip/types';
import { calculateROI, calculateProfit, calculateDaysHeld, calculateStats, generateProjectId } from '@/lib/flip/utils';

// ============ TYPES ============

export interface UseFlipProjectsReturn {
    // State
    projects: FlipProject[];
    stats: FlipStats;

    // CRUD
    addProject: (project: Omit<FlipProject, 'id' | 'createdAt' | 'updatedAt' | 'roi' | 'profit' | 'daysHeld'>) => void;
    updateProject: (project: FlipProject) => void;
    deleteProject: (id: string) => void;

    // Stage management
    moveToStage: (projectId: string, stage: FlipStage) => void;
    getProjectsByStage: (stage: FlipStage) => FlipProject[];

    // Import
    importFromWatchlist: (domain: { domain: string; score?: { overall: number }; domainRating?: number }) => void;
}

// ============ HOOK ============

export function useFlipProjects(): UseFlipProjectsReturn {
    const [projects, setProjects] = useState<FlipProject[]>([]);

    // Load from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    setProjects(JSON.parse(saved));
                }
            } catch (e) {
                console.error('Failed to load flip projects:', e);
            }
        }
    }, []);

    // Save to localStorage
    const saveProjects = useCallback((updated: FlipProject[]) => {
        setProjects(updated);
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
    }, []);

    const addProject = useCallback((projectData: Omit<FlipProject, 'id' | 'createdAt' | 'updatedAt' | 'roi' | 'profit' | 'daysHeld'>) => {
        const now = Date.now();
        const project: FlipProject = {
            ...projectData,
            id: generateProjectId(),
            createdAt: now,
            updatedAt: now,
            roi: 0,
            profit: 0,
            daysHeld: 0,
        };
        saveProjects([...projects, project]);
    }, [projects, saveProjects]);

    const updateProject = useCallback((project: FlipProject) => {
        // Recalculate derived fields
        const updated: FlipProject = {
            ...project,
            roi: calculateROI(project),
            profit: calculateProfit(project),
            daysHeld: calculateDaysHeld(project),
            updatedAt: Date.now(),
        };
        saveProjects(projects.map(p => p.id === updated.id ? updated : p));
    }, [projects, saveProjects]);

    const deleteProject = useCallback((id: string) => {
        saveProjects(projects.filter(p => p.id !== id));
    }, [projects, saveProjects]);

    const moveToStage = useCallback((projectId: string, stage: FlipStage) => {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            updateProject({ ...project, stage });
        }
    }, [projects, updateProject]);

    const getProjectsByStage = useCallback((stage: FlipStage) => {
        return projects.filter(p => p.stage === stage);
    }, [projects]);

    const importFromWatchlist = useCallback((domain: { domain: string; score?: { overall: number }; domainRating?: number }) => {
        const now = Date.now();
        const project: FlipProject = {
            id: generateProjectId(),
            domain: domain.domain,
            stage: 'acquired',
            purchasePrice: 0,
            purchaseDate: new Date().toISOString().split('T')[0],
            registrar: '',
            currentValuation: domain.score?.overall ? domain.score.overall * 10 : undefined,
            createdAt: now,
            updatedAt: now,
            roi: 0,
            profit: 0,
            daysHeld: 0,
        };
        saveProjects([...projects, project]);
    }, [projects, saveProjects]);

    // Calculate stats
    const stats = calculateStats(projects);

    return {
        projects,
        stats,
        addProject,
        updateProject,
        deleteProject,
        moveToStage,
        getProjectsByStage,
        importFromWatchlist,
    };
}
