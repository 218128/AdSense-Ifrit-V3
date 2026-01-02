'use client';

/**
 * Site Profile Section
 * FSD: features/wordpress/ui/SiteProfileSection.tsx
 * 
 * Displays and edits site metadata: niche, siteType, hosting info.
 * Note: Essential Pages are handled by LegalPagesManager - no duplication here.
 */

import { useState } from 'react';
import {
    Building2,
    Tag,
    Globe,
    Server,
    Edit2,
    Save,
    X,
} from 'lucide-react';
import { useWPSitesLegacy } from '../model/wpSiteStore';
import type { WPSite, WPSiteType } from '../model/wpSiteTypes';

interface SiteProfileSectionProps {
    site: WPSite;
}

const SITE_TYPES: { value: WPSiteType; label: string }[] = [
    { value: 'authority', label: 'Authority Blog' },
    { value: 'affiliate', label: 'Affiliate Site' },
    { value: 'magazine', label: 'Magazine' },
    { value: 'business', label: 'Business' },
    { value: 'general', label: 'General' },
];

export function SiteProfileSection({ site }: SiteProfileSectionProps) {
    const { updateSite } = useWPSitesLegacy();
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        niche: site.niche || '',
        siteType: site.siteType || 'general',
    });

    const handleSave = () => {
        updateSite(site.id, {
            niche: editData.niche,
            siteType: editData.siteType as WPSiteType,
            updatedAt: Date.now(),
        });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditData({
            niche: site.niche || '',
            siteType: site.siteType || 'general',
        });
        setIsEditing(false);
    };

    return (
        <div className="space-y-3">
            {/* Header with Edit */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-medium text-neutral-700">Site Metadata</span>
                </div>
                {!isEditing ? (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                        <Edit2 className="w-3 h-3" />
                        Edit
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCancel}
                            className="text-xs text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
                        >
                            <X className="w-3 h-3" />
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                        >
                            <Save className="w-3 h-3" />
                            Save
                        </button>
                    </div>
                )}
            </div>

            {/* Niche */}
            <div className="flex items-start gap-2">
                <Tag className="w-3.5 h-3.5 text-neutral-400 mt-0.5" />
                <div className="flex-1">
                    <div className="text-xs text-neutral-500">Niche</div>
                    {isEditing ? (
                        <input
                            type="text"
                            value={editData.niche}
                            onChange={(e) => setEditData({ ...editData, niche: e.target.value })}
                            placeholder="e.g., Tech Reviews, Health & Fitness"
                            className="w-full mt-1 px-2 py-1 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    ) : (
                        <div className="text-sm text-neutral-900">
                            {site.niche || <span className="text-neutral-400 italic">Not set</span>}
                        </div>
                    )}
                </div>
            </div>

            {/* Site Type */}
            <div className="flex items-start gap-2">
                <Globe className="w-3.5 h-3.5 text-neutral-400 mt-0.5" />
                <div className="flex-1">
                    <div className="text-xs text-neutral-500">Site Type</div>
                    {isEditing ? (
                        <select
                            value={editData.siteType}
                            onChange={(e) => setEditData({ ...editData, siteType: e.target.value as WPSiteType })}
                            className="w-full mt-1 px-2 py-1 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            {SITE_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <div className="text-sm text-neutral-900">
                            {SITE_TYPES.find(t => t.value === site.siteType)?.label || 'General'}
                        </div>
                    )}
                </div>
            </div>

            {/* Hosting Provider */}
            {site.hostingProvider && (
                <div className="flex items-start gap-2">
                    <Server className="w-3.5 h-3.5 text-neutral-400 mt-0.5" />
                    <div className="flex-1">
                        <div className="text-xs text-neutral-500">Hosting</div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-neutral-900 capitalize">{site.hostingProvider}</span>
                            {site.provisionedVia && (
                                <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                    {site.provisionedVia}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SiteProfileSection;

