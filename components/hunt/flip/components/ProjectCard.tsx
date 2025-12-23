/**
 * ProjectCard Component
 * 
 * Displays a flip project in a kanban-style card.
 * Pure presentational component.
 */

'use client';

import {
    Edit2,
    Trash2,
    ArrowRight,
    Globe,
    DollarSign,
    Calendar
} from 'lucide-react';
import type { FlipProject } from '@/lib/flip/types';

// ============ PROPS ============

export interface ProjectCardProps {
    /** Project data */
    project: FlipProject;
    /** Edit callback */
    onEdit: () => void;
    /** Delete callback */
    onDelete: () => void;
    /** Move to next stage callback */
    onMoveNext?: () => void;
    /** Show move button */
    showMoveButton?: boolean;
}

// ============ COMPONENT ============

export function ProjectCard({
    project,
    onEdit,
    onDelete,
    onMoveNext,
    showMoveButton = true,
}: ProjectCardProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="p-4 bg-white border border-neutral-200 rounded-xl hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-neutral-400" />
                    <a
                        href={`https://${project.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-neutral-900 hover:text-indigo-600"
                    >
                        {project.domain}
                    </a>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onEdit}
                        className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                    <span className="text-neutral-500 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Purchase
                    </span>
                    <span className="font-medium">{formatCurrency(project.purchasePrice)}</span>
                </div>
                {project.currentValuation && (
                    <div className="flex items-center justify-between">
                        <span className="text-neutral-500">Valuation</span>
                        <span className="font-medium text-green-600">
                            {formatCurrency(project.currentValuation)}
                        </span>
                    </div>
                )}
                {project.daysHeld !== undefined && project.daysHeld > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="text-neutral-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Days Held
                        </span>
                        <span className="font-medium">{project.daysHeld}</span>
                    </div>
                )}
                {project.stage === 'sold' && project.roi !== undefined && (
                    <div className="flex items-center justify-between">
                        <span className="text-neutral-500">ROI</span>
                        <span className={`font-bold ${project.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {project.roi.toFixed(0)}%
                        </span>
                    </div>
                )}
            </div>

            {/* Move button */}
            {showMoveButton && onMoveNext && project.stage !== 'sold' && (
                <button
                    onClick={onMoveNext}
                    className="mt-3 w-full px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 text-sm font-medium flex items-center justify-center gap-2"
                >
                    Move to Next Stage
                    <ArrowRight className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}
