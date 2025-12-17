'use client';

/**
 * Flip Pipeline Component
 * 
 * Track domain flip projects from acquisition to sale.
 * Features: project creation, stage tracking, ROI calculation, valuation.
 * Now with educational guidance and watchlist integration!
 */

import { useState, useEffect } from 'react';
import {
    TrendingUp,
    Plus,
    DollarSign,
    Calendar,
    Target,
    CheckCircle,
    Clock,
    ArrowRight,
    ExternalLink,
    Edit2,
    Trash2,
    BarChart3,
    Package,
    Rocket,
    Banknote,
    HelpCircle,
    ChevronDown,
    ChevronUp,
    Download,
    BookOpen,
    Star
} from 'lucide-react';
import { DataSourceBanner } from './MetricTooltip';

export interface FlipProject {
    id: string;
    domain: string;
    stage: FlipStage;

    // Acquisition
    purchasePrice: number;
    purchaseDate: string;
    registrar: string;

    // Building
    buildingNotes?: string;
    contentCount?: number;
    trafficEstimate?: number;

    // Valuation
    currentValuation?: number;
    targetPrice?: number;

    // Sale
    salePrice?: number;
    saleDate?: string;
    marketplace?: string;

    // Calculated
    roi?: number;
    profit?: number;
    daysHeld?: number;

    createdAt: number;
    updatedAt: number;
}

interface WatchlistDomain {
    domain: string;
    score?: { overall: number };
    domainRating?: number;
    domainAge?: number;
    addedAt: number;
}

export type FlipStage = 'acquired' | 'building' | 'listed' | 'sold';

const STAGES: { id: FlipStage; label: string; icon: React.ReactNode; color: string; guidance: string }[] = [
    { id: 'acquired', label: 'Acquired', icon: <Package className="w-4 h-4" />, color: 'blue', guidance: 'Just purchased. Start planning content strategy.' },
    { id: 'building', label: 'Building', icon: <Rocket className="w-4 h-4" />, color: 'orange', guidance: 'Adding content, building traffic, improving metrics.' },
    { id: 'listed', label: 'Listed', icon: <Target className="w-4 h-4" />, color: 'purple', guidance: 'Listed on marketplace. Awaiting buyer.' },
    { id: 'sold', label: 'Sold', icon: <Banknote className="w-4 h-4" />, color: 'green', guidance: 'Sale complete! Track your ROI.' },
];

const MARKETPLACES = ['Sedo', 'Dan.com', 'Afternic', 'Flippa', 'Namecheap', 'GoDaddy', 'Other'];

const STORAGE_KEY = 'ifrit_flip_projects';
const WATCHLIST_KEY = 'ifrit_domain_watchlist';

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

function StatCard({ label, value, color = 'gray' }: { label: string; value: string | number; color?: string }) {
    const colors: Record<string, string> = {
        gray: 'text-gray-800',
        green: 'text-green-600',
        red: 'text-red-600',
    };

    return (
        <div className="text-center">
            <div className="text-xs text-gray-500 uppercase">{label}</div>
            <div className={`text-xl font-bold ${colors[color]}`}>{value}</div>
        </div>
    );
}

function ProjectCard({
    project,
    stage,
    onEdit,
    onDelete,
    onMoveNext,
}: {
    project: FlipProject;
    stage: FlipStage;
    onEdit: () => void;
    onDelete: () => void;
    onMoveNext: () => void;
}) {
    const roi = calculateROI(project);

    return (
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
                <div>
                    <h4 className="font-medium text-gray-900 text-sm">{project.domain}</h4>
                    <div className="text-xs text-gray-500">
                        ${project.purchasePrice} • {new Date(project.purchaseDate).toLocaleDateString()}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={onEdit} className="p-1 text-gray-400 hover:text-gray-600">
                        <Edit2 className="w-3 h-3" />
                    </button>
                    <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-600">
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {stage === 'sold' && project.salePrice !== undefined ? (
                <div className={`text-sm ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {roi >= 0 ? '📈' : '📉'} {roi}% ROI (${project.salePrice - project.purchasePrice} profit)
                </div>
            ) : project.currentValuation ? (
                <div className="text-sm text-purple-600">
                    Est. ${project.currentValuation}
                </div>
            ) : null}

            {stage !== 'sold' && (
                <button
                    onClick={onMoveNext}
                    className="mt-2 w-full py-1 text-xs text-pink-600 hover:bg-pink-50 rounded flex items-center justify-center gap-1"
                >
                    Next Stage <ArrowRight className="w-3 h-3" />
                </button>
            )}
        </div>
    );
}

function ProjectForm({
    project,
    onSave,
    onCancel,
}: {
    project: FlipProject | null;
    onSave: (project: FlipProject) => void;
    onCancel: () => void;
}) {
    const [form, setForm] = useState<Partial<FlipProject>>(project || {
        domain: '',
        stage: 'acquired',
        purchasePrice: 0,
        purchaseDate: new Date().toISOString().split('T')[0],
        registrar: 'Namecheap',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const now = Date.now();
        const newProject: FlipProject = {
            id: project?.id || crypto.randomUUID(),
            domain: form.domain || '',
            stage: form.stage as FlipStage || 'acquired',
            purchasePrice: form.purchasePrice || 0,
            purchaseDate: form.purchaseDate || new Date().toISOString(),
            registrar: form.registrar || 'Namecheap',
            buildingNotes: form.buildingNotes,
            contentCount: form.contentCount,
            currentValuation: form.currentValuation,
            targetPrice: form.targetPrice,
            salePrice: form.salePrice,
            saleDate: form.saleDate,
            marketplace: form.marketplace,
            createdAt: project?.createdAt || now,
            updatedAt: now,
        };

        onSave(newProject);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
            <div className="bg-white rounded-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold mb-4">
                    {project ? 'Edit Project' : 'Add Flip Project'}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                            <input
                                type="text"
                                value={form.domain}
                                onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
                                placeholder="example.com"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                            <select
                                value={form.stage}
                                onChange={e => setForm(f => ({ ...f, stage: e.target.value as FlipStage }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            >
                                {STAGES.map(s => (
                                    <option key={s.id} value={s.id}>{s.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price</label>
                            <input
                                type="number"
                                value={form.purchasePrice}
                                onChange={e => setForm(f => ({ ...f, purchasePrice: parseFloat(e.target.value) || 0 }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                            <input
                                type="date"
                                value={form.purchaseDate?.split('T')[0]}
                                onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Registrar</label>
                            <input
                                type="text"
                                value={form.registrar}
                                onChange={e => setForm(f => ({ ...f, registrar: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Valuation</label>
                            <input
                                type="number"
                                value={form.currentValuation || ''}
                                onChange={e => setForm(f => ({ ...f, currentValuation: parseFloat(e.target.value) || undefined }))}
                                placeholder="Estimated value"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Target Price</label>
                            <input
                                type="number"
                                value={form.targetPrice || ''}
                                onChange={e => setForm(f => ({ ...f, targetPrice: parseFloat(e.target.value) || undefined }))}
                                placeholder="Asking price"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                min="0"
                            />
                        </div>
                    </div>

                    {form.stage === 'sold' && (
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price</label>
                                <input
                                    type="number"
                                    value={form.salePrice || ''}
                                    onChange={e => setForm(f => ({ ...f, salePrice: parseFloat(e.target.value) || undefined }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Date</label>
                                <input
                                    type="date"
                                    value={form.saleDate?.split('T')[0] || ''}
                                    onChange={e => setForm(f => ({ ...f, saleDate: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Marketplace</label>
                                <select
                                    value={form.marketplace || ''}
                                    onChange={e => setForm(f => ({ ...f, marketplace: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                    <option value="">Select...</option>
                                    {MARKETPLACES.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                            value={form.buildingNotes || ''}
                            onChange={e => setForm(f => ({ ...f, buildingNotes: e.target.value }))}
                            placeholder="Building strategy, content plan, etc..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                        >
                            {project ? 'Update' : 'Add'} Project
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function calculateROI(project: FlipProject): number {
    if (!project.salePrice || project.purchasePrice === 0) return 0;
    return Math.round(((project.salePrice - project.purchasePrice) / project.purchasePrice) * 100);
}

function calculateStats(projects: FlipProject[]): {
    total: number;
    inPipeline: number;
    totalInvested: number;
    totalProfit: number;
    avgROI: number;
} {
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
