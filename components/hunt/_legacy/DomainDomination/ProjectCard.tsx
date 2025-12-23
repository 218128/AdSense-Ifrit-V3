'use client';

/**
 * ProjectCard Component
 * 
 * Extracted from FlipPipeline.tsx - displays a flip project card.
 */

import { ArrowRight, Edit2, Trash2 } from 'lucide-react';
import type { FlipProject, FlipStage } from '@/lib/flip/types';
import { calculateROI } from './flipUtils';

export interface ProjectCardProps {
    project: FlipProject;
    stage: FlipStage;
    onEdit: () => void;
    onDelete: () => void;
    onMoveNext: () => void;
}

export function ProjectCard({
    project,
    stage,
    onEdit,
    onDelete,
    onMoveNext,
}: ProjectCardProps) {
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
