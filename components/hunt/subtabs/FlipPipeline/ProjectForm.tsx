'use client';

/**
 * ProjectForm Component
 * 
 * Extracted from FlipPipeline.tsx - form for creating/editing flip projects.
 */

import { useState } from 'react';
import type { FlipProject, FlipStage } from '@/lib/flip/types';
import { MARKETPLACES } from '@/lib/flip/types';

// Stage configuration for the form dropdown
const STAGES: { id: FlipStage; label: string }[] = [
    { id: 'acquired', label: 'Acquired' },
    { id: 'building', label: 'Building' },
    { id: 'listed', label: 'Listed' },
    { id: 'sold', label: 'Sold' },
];

export interface ProjectFormProps {
    project: FlipProject | null;
    onSave: (project: FlipProject) => void;
    onCancel: () => void;
}

export function ProjectForm({
    project,
    onSave,
    onCancel,
}: ProjectFormProps) {
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
