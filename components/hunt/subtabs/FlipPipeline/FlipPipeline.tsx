'use client';

/**
 * Flip Pipeline Component
 * 
 * Track domain flip projects from acquisition to sale.
 * Features: project creation, stage tracking, ROI calculation, valuation.
 * Now with educational guidance and watchlist integration!
 * 
 * REFACTORED: Extracted StatCard, ProjectCard, ProjectForm, flipUtils into separate files.
 */

import { useState, useEffect } from 'react';
import {
    TrendingUp,
    Plus,
    BarChart3,
    Package,
    Rocket,
    Target,
    Banknote,
    ChevronDown,
    ChevronUp,
    BookOpen,
    Star
} from 'lucide-react';
import { DataSourceBanner } from '../shared';

// Extracted components
import { StatCard } from './StatCard';
import { ProjectCard } from './ProjectCard';
import { ProjectForm } from './ProjectForm';
import { calculateStats } from './flipUtils';

// Types
import type { FlipProject, FlipStage } from '@/lib/flip/types';

// ============ CONSTANTS ============

interface WatchlistDomain {
    domain: string;
    score?: { overall: number };
    domainRating?: number;
    domainAge?: number;
    addedAt: number;
}

const STAGES: { id: FlipStage; label: string; icon: React.ReactNode; color: string; guidance: string }[] = [
    { id: 'acquired', label: 'Acquired', icon: <Package className="w-4 h-4" />, color: 'blue', guidance: 'Just purchased. Start planning content strategy.' },
    { id: 'building', label: 'Building', icon: <Rocket className="w-4 h-4" />, color: 'orange', guidance: 'Adding content, building traffic, improving metrics.' },
    { id: 'listed', label: 'Listed', icon: <Target className="w-4 h-4" />, color: 'purple', guidance: 'Listed on marketplace. Awaiting buyer.' },
    { id: 'sold', label: 'Sold', icon: <Banknote className="w-4 h-4" />, color: 'green', guidance: 'Sale complete! Track your ROI.' },
];

const STORAGE_KEY = 'ifrit_flip_projects';
const WATCHLIST_KEY = 'ifrit_domain_watchlist';

// ============ COMPONENT ============

export default function FlipPipeline() {
    const [projects, setProjects] = useState<FlipProject[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingProject, setEditingProject] = useState<FlipProject | null>(null);
    const [showGuide, setShowGuide] = useState(true);
    const [watchlist, setWatchlist] = useState<WatchlistDomain[]>([]);
    const [showWatchlistImport, setShowWatchlistImport] = useState(false);

    // Load projects and watchlist on mount
    useEffect(() => {
        const savedProjects = localStorage.getItem(STORAGE_KEY);
        if (savedProjects) {
            try {
                setProjects(JSON.parse(savedProjects));
            } catch {
                // Ignore
            }
        }

        const savedWatchlist = localStorage.getItem(WATCHLIST_KEY);
        if (savedWatchlist) {
            try {
                setWatchlist(JSON.parse(savedWatchlist));
            } catch {
                // Ignore
            }
        }
    }, []);

    // Save projects
    const saveProjects = (updated: FlipProject[]) => {
        setProjects(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    const addProject = (project: FlipProject) => {
        const updated = [...projects, project];
        saveProjects(updated);
        setShowForm(false);
    };

    const importFromWatchlist = (domain: WatchlistDomain) => {
        const newProject: FlipProject = {
            id: crypto.randomUUID(),
            domain: domain.domain,
            stage: 'acquired',
            purchasePrice: 0,
            purchaseDate: new Date().toISOString().split('T')[0],
            registrar: 'Unknown',
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        addProject(newProject);
        setShowWatchlistImport(false);
    };

    const updateProject = (project: FlipProject) => {
        const updated = projects.map(p => p.id === project.id ? project : p);
        saveProjects(updated);
        setEditingProject(null);
    };

    const deleteProject = (id: string) => {
        if (!confirm('Delete this flip project?')) return;
        const updated = projects.filter(p => p.id !== id);
        saveProjects(updated);
    };

    const moveToStage = (projectId: string, stage: FlipStage) => {
        const updated = projects.map(p => {
            if (p.id === projectId) {
                return { ...p, stage, updatedAt: Date.now() };
            }
            return p;
        });
        saveProjects(updated);
    };

    // Filter watchlist to only show domains not already in projects
    const availableWatchlist = watchlist.filter(
        w => !projects.some(p => p.domain === w.domain)
    );

    // Calculate stats
    const stats = calculateStats(projects);

    return (
        <div className="space-y-4">
            {/* Data Source Banner */}
            <DataSourceBanner type="flip" />

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-pink-600 to-rose-600 px-6 py-4 text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <TrendingUp className="w-6 h-6" />
                        Domain Flip Pipeline
                    </h2>
                    <p className="text-pink-100 text-sm mt-1">
                        Track domains from acquisition to profitable sale
                    </p>
                </div>

                {/* Educational Guide - Collapsible */}
                <div className="px-6 py-3 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200">
                    <button
                        onClick={() => setShowGuide(!showGuide)}
                        className="w-full flex items-center justify-between text-amber-800"
                    >
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            <span className="font-medium text-sm">📚 How to Use the Flip Pipeline</span>
                        </div>
                        {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showGuide && (
                        <div className="mt-3 space-y-3">
                            <div className="grid grid-cols-4 gap-2 text-xs">
                                {STAGES.map(stage => (
                                    <div key={stage.id} className={`bg-white rounded-lg p-2 border-l-4 border-${stage.color}-500`}>
                                        <div className={`font-medium text-${stage.color}-700 flex items-center gap-1 mb-1`}>
                                            {stage.icon} {stage.label}
                                        </div>
                                        <p className="text-gray-600">{stage.guidance}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-white/70 rounded-lg p-3 text-xs text-amber-700">
                                <strong>💡 Tips:</strong>
                                <ul className="mt-1 space-y-1 ml-4 list-disc">
                                    <li>Track purchase price accurately for ROI calculation</li>
                                    <li>Update valuations as you build the site</li>
                                    <li>Move domains through stages as they progress</li>
                                    <li>Import domains from your Expired Finder watchlist</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <div className="grid grid-cols-5 gap-4">
                        <StatCard label="Total Projects" value={stats.total} />
                        <StatCard label="In Pipeline" value={stats.inPipeline} />
                        <StatCard label="Invested" value={`$${stats.totalInvested}`} />
                        <StatCard label="Total Profit" value={`$${stats.totalProfit}`} color={stats.totalProfit >= 0 ? 'green' : 'red'} />
                        <StatCard label="Avg ROI" value={`${stats.avgROI}%`} color={stats.avgROI >= 0 ? 'green' : 'red'} />
                    </div>
                </div>

                {/* Action Bar */}
                <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <BarChart3 className="w-4 h-4" />
                        <span>{projects.length} flip projects</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Import from Watchlist Button */}
                        {availableWatchlist.length > 0 && (
                            <button
                                onClick={() => setShowWatchlistImport(!showWatchlistImport)}
                                className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 flex items-center gap-2 text-sm"
                            >
                                <Star className="w-4 h-4" />
                                Import from Watchlist ({availableWatchlist.length})
                            </button>
                        )}
                        <button
                            onClick={() => setShowForm(true)}
                            className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Project
                        </button>
                    </div>
                </div>

                {/* Watchlist Import Panel */}
                {showWatchlistImport && availableWatchlist.length > 0 && (
                    <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-200">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-yellow-800">
                                🌟 Import domains from your Expired Finder watchlist
                            </span>
                            <button
                                onClick={() => setShowWatchlistImport(false)}
                                className="text-yellow-600 hover:text-yellow-800"
                            >
                                ×
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {availableWatchlist.map(domain => (
                                <div key={domain.domain} className="flex items-center justify-between bg-white rounded-lg p-2 border border-yellow-200">
                                    <div>
                                        <span className="font-medium text-sm">{domain.domain}</span>
                                        <span className="text-xs text-gray-500 ml-2">
                                            Score: {domain.score?.overall || '?'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => importFromWatchlist(domain)}
                                        className="text-xs px-2 py-1 bg-pink-100 text-pink-700 rounded hover:bg-pink-200"
                                    >
                                        Import →
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Kanban-style Pipeline View */}
                <div className="p-6">
                    <div className="grid grid-cols-4 gap-4">
                        {STAGES.map(stage => (
                            <div key={stage.id} className="bg-gray-50 rounded-lg p-3">
                                <div className={`flex items-center gap-2 mb-3 text-${stage.color}-600`}>
                                    {stage.icon}
                                    <span className="font-medium">{stage.label}</span>
                                    <span className="px-1.5 py-0.5 bg-white rounded text-xs">
                                        {projects.filter(p => p.stage === stage.id).length}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {projects
                                        .filter(p => p.stage === stage.id)
                                        .map(project => (
                                            <ProjectCard
                                                key={project.id}
                                                project={project}
                                                stage={stage.id}
                                                onEdit={() => setEditingProject(project)}
                                                onDelete={() => deleteProject(project.id)}
                                                onMoveNext={() => {
                                                    const currentIdx = STAGES.findIndex(s => s.id === project.stage);
                                                    if (currentIdx < STAGES.length - 1) {
                                                        moveToStage(project.id, STAGES[currentIdx + 1].id);
                                                    }
                                                }}
                                            />
                                        ))
                                    }

                                    {projects.filter(p => p.stage === stage.id).length === 0 && (
                                        <div className="p-4 text-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                                            No projects
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Add/Edit Form Modal */}
                {(showForm || editingProject) && (
                    <ProjectForm
                        project={editingProject}
                        onSave={editingProject ? updateProject : addProject}
                        onCancel={() => {
                            setShowForm(false);
                            setEditingProject(null);
                        }}
                    />
                )}

                {/* Empty State */}
                {projects.length === 0 && !showForm && (
                    <div className="p-12 text-center">
                        <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500">No flip projects yet</p>
                        <p className="text-sm text-gray-400 mt-1">
                            Add a domain project to track from acquisition to sale
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
