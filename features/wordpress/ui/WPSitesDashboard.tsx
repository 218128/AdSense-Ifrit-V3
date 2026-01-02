'use client';

/**
 * WordPress Sites Dashboard
 * FSD: features/wordpress/ui/WPSitesDashboard.tsx
 * 
 * Main view for managing WordPress site connections.
 */

import { useState } from 'react';
import { Globe, Plus, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useWPSitesLegacy } from '../model/wpSiteStore';
import { WPSiteCard } from './WPSiteCard';
import { AddWPSiteModal } from './AddWPSiteModal';
import { HostingerHealthDashboard } from '@/features/hosting';
import type { WPSite } from '../model/wpSiteTypes';

export function WPSitesDashboard() {
    const { sites } = useWPSitesLegacy();
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingSite, setEditingSite] = useState<WPSite | null>(null);

    const connectedCount = sites.filter(s => s.status === 'connected').length;
    const errorCount = sites.filter(s => s.status === 'error').length;
    const pendingCount = sites.filter(s => s.status === 'pending').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Globe className="w-8 h-8" />
                        <div>
                            <h2 className="text-2xl font-bold">WordPress Sites</h2>
                            <p className="text-blue-100">
                                Manage your WordPress connections for automated publishing
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 flex items-center gap-2 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Add Site
                    </button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Globe className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-neutral-900">{sites.length}</div>
                        <div className="text-sm text-neutral-500">Total Sites</div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-neutral-900">{connectedCount}</div>
                        <div className="text-sm text-neutral-500">Connected</div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                        <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-neutral-900">{pendingCount}</div>
                        <div className="text-sm text-neutral-500">Pending</div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-neutral-900">{errorCount}</div>
                        <div className="text-sm text-neutral-500">Errors</div>
                    </div>
                </div>
            </div>

            {/* Sites Grid */}
            {sites.length === 0 ? (
                <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
                    <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Globe className="w-8 h-8 text-neutral-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                        No WordPress sites connected
                    </h3>
                    <p className="text-neutral-500 mb-6">
                        Connect your first WordPress site to start publishing AI-generated content.
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 inline-flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Add WordPress Site
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sites.map((site) => (
                        <WPSiteCard
                            key={site.id}
                            site={site}
                            onEdit={(s) => setEditingSite(s)}
                        />
                    ))}
                </div>
            )}

            {/* Hostinger Health Dashboard */}
            <HostingerHealthDashboard />

            {/* Add/Edit Modal */}
            {(showAddModal || editingSite) && (
                <AddWPSiteModal
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingSite(null);
                    }}
                    editSite={editingSite || undefined}
                />
            )}
        </div>
    );
}
