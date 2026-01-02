'use client';

/**
 * AdSense Status Tracker
 * FSD: components/adsense/AdSenseStatusTracker.tsx
 * 
 * Tracks AdSense application and approval status for sites.
 */

import { useState } from 'react';
import {
    DollarSign, Clock, CheckCircle, XCircle, AlertTriangle,
    RefreshCw, ExternalLink, Calendar, TrendingUp
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type AdSenseStatus =
    | 'not_applied'
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'suspended';

export interface AdSenseApplication {
    siteId: string;
    siteUrl: string;
    status: AdSenseStatus;
    appliedAt?: number;
    approvedAt?: number;
    rejectedAt?: number;
    rejectionReason?: string;
    notes?: string;
}

interface StatusTrackerProps {
    application: AdSenseApplication;
    onStatusChange?: (newStatus: AdSenseStatus, notes?: string) => void;
}

// ============================================================================
// Status Configuration
// ============================================================================

const STATUS_CONFIG = {
    not_applied: {
        label: 'Not Applied',
        color: 'text-neutral-500',
        bg: 'bg-neutral-100',
        icon: Clock,
        description: 'Site has not been submitted to AdSense yet',
    },
    pending: {
        label: 'Pending Review',
        color: 'text-amber-600',
        bg: 'bg-amber-100',
        icon: Clock,
        description: 'Awaiting Google review (usually 1-2 weeks)',
    },
    approved: {
        label: 'Approved',
        color: 'text-green-600',
        bg: 'bg-green-100',
        icon: CheckCircle,
        description: 'Site is approved for AdSense monetization',
    },
    rejected: {
        label: 'Rejected',
        color: 'text-red-600',
        bg: 'bg-red-100',
        icon: XCircle,
        description: 'Application was rejected - review and reapply',
    },
    suspended: {
        label: 'Suspended',
        color: 'text-red-700',
        bg: 'bg-red-100',
        icon: AlertTriangle,
        description: 'Account or site has been suspended',
    },
};

// ============================================================================
// Components
// ============================================================================

export function AdSenseStatusTracker({ application, onStatusChange }: StatusTrackerProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(application.status);
    const [notes, setNotes] = useState(application.notes || '');

    const config = STATUS_CONFIG[application.status];
    const StatusIcon = config.icon;

    const handleSave = () => {
        onStatusChange?.(selectedStatus, notes);
        setIsEditing(false);
    };

    const formatDate = (timestamp?: number) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            {/* Header */}
            <div className={`px-4 py-3 ${config.bg}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm`}>
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-neutral-900">AdSense Status</h3>
                            <a
                                href={application.siteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-neutral-500 hover:text-blue-600 flex items-center gap-1"
                            >
                                {application.siteUrl.replace(/^https?:\/\//, '')}
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg}`}>
                        <StatusIcon className={`w-4 h-4 ${config.color}`} />
                        <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                    </div>
                </div>
            </div>

            {/* Status Details */}
            <div className="p-4 space-y-4">
                <p className="text-sm text-neutral-600">{config.description}</p>

                {/* Timeline */}
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-neutral-50 rounded-lg">
                        <Calendar className="w-4 h-4 text-neutral-400 mx-auto mb-1" />
                        <div className="text-xs text-neutral-500">Applied</div>
                        <div className="text-sm font-medium">{formatDate(application.appliedAt)}</div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-lg">
                        <Clock className="w-4 h-4 text-neutral-400 mx-auto mb-1" />
                        <div className="text-xs text-neutral-500">Days Waiting</div>
                        <div className="text-sm font-medium">
                            {application.appliedAt && application.status === 'pending'
                                ? Math.floor((Date.now() - application.appliedAt) / (1000 * 60 * 60 * 24))
                                : '-'}
                        </div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-neutral-400 mx-auto mb-1" />
                        <div className="text-xs text-neutral-500">Approved</div>
                        <div className="text-sm font-medium">{formatDate(application.approvedAt)}</div>
                    </div>
                </div>

                {/* Rejection Reason */}
                {application.status === 'rejected' && application.rejectionReason && (
                    <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                        <div className="text-sm font-medium text-red-700 mb-1">Rejection Reason:</div>
                        <p className="text-sm text-red-600">{application.rejectionReason}</p>
                    </div>
                )}

                {/* Notes */}
                {application.notes && (
                    <div className="p-3 bg-neutral-50 rounded-lg">
                        <div className="text-sm font-medium text-neutral-700 mb-1">Notes:</div>
                        <p className="text-sm text-neutral-600">{application.notes}</p>
                    </div>
                )}

                {/* Edit Mode */}
                {isEditing ? (
                    <div className="space-y-3 pt-3 border-t">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Status</label>
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value as AdSenseStatus)}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            >
                                {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                                    <option key={key} value={key}>{val.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                rows={2}
                                placeholder="Any notes about the application..."
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg text-sm hover:bg-neutral-200"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="w-full py-2 text-sm text-violet-600 hover:bg-violet-50 rounded-lg"
                    >
                        Update Status
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * Mini status badge for list views
 */
export function AdSenseStatusBadge({ status }: { status: AdSenseStatus }) {
    const config = STATUS_CONFIG[status];
    const StatusIcon = config.icon;

    return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bg}`}>
            <StatusIcon className={`w-3.5 h-3.5 ${config.color}`} />
            <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
        </div>
    );
}
