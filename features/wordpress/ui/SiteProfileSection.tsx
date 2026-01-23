'use client';

/**
 * Site Profile Section
 * FSD: features/wordpress/ui/SiteProfileSection.tsx
 * 
 * Displays and edits site metadata: niche, siteType, hosting info.
 * Also shows Hunt Profile data if loaded (profileData).
 */

import { useState, useEffect } from 'react';
import {
    Building2,
    Tag,
    Globe,
    Server,
    Edit2,
    Save,
    X,
    Download,
    Loader2,
    CheckCircle,
    Key,
    Lightbulb,
    AlertTriangle,
} from 'lucide-react';
import { useWPSitesStore } from '../model/wpSiteStore';
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
    const { updateSite, loadHuntProfile } = useWPSitesStore();
    const [isEditing, setIsEditing] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [hasHuntProfile, setHasHuntProfile] = useState(false);
    const [editData, setEditData] = useState({
        niche: site.profileData?.niche || '',
        siteType: site.siteType || 'general',
    });

    // Extract domain from URL
    const domain = site.url.replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Check if Hunt has a profile for this domain
    useEffect(() => {
        const checkHuntProfile = async () => {
            try {
                const { getOwnedDomains } = await import('@/features/hunt');
                const owned = getOwnedDomains();
                setHasHuntProfile(owned.some(d => d.domain === domain && d.profile));
            } catch {
                setHasHuntProfile(false);
            }
        };
        checkHuntProfile();
    }, [domain]);

    const handleSave = () => {
        // Update profileData with new niche if it exists, or create minimal profileData
        const updatedProfileData = site.profileData
            ? { ...site.profileData, niche: editData.niche }
            : {
                niche: editData.niche,
                primaryKeywords: [],
                secondaryKeywords: [],
                questionKeywords: [],
                suggestedTopics: [],
                sourceDomain: domain,
                loadedFromHuntAt: Date.now(),
            };
        updateSite(site.id, {
            profileData: updatedProfileData,
            siteType: editData.siteType as WPSiteType,
            updatedAt: Date.now(),
        });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditData({
            niche: site.profileData?.niche || '',
            siteType: site.siteType || 'general',
        });
        setIsEditing(false);
    };

    const handleLoadHuntProfile = async () => {
        setLoadingProfile(true);
        const success = await loadHuntProfile(site.id, domain);
        setLoadingProfile(false);
        if (success) {
            // Refresh edit data with new profile niche
            setEditData(prev => ({
                ...prev,
                niche: site.profileData?.niche || prev.niche,
            }));
        }
    };

    const profileData = site.profileData;

    return (
        <div className="space-y-4">
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

            {/* Load Hunt Profile Button */}
            {!profileData && hasHuntProfile && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-amber-700 text-sm">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>Hunt profile available for this domain</span>
                        </div>
                        <button
                            onClick={handleLoadHuntProfile}
                            disabled={loadingProfile}
                            className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {loadingProfile ? (
                                <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Loading...
                                </>
                            ) : (
                                <>
                                    <Download className="w-3 h-3" />
                                    Load Hunt Profile
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Hunt Profile Data (if loaded) */}
            {profileData && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-3">
                    <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Hunt Profile Loaded
                        <span className="text-xs font-normal text-green-600">
                            ({new Date(profileData.loadedFromHuntAt).toLocaleDateString()})
                        </span>
                    </div>

                    {/* Keywords */}
                    {profileData.primaryKeywords.length > 0 && (
                        <div>
                            <div className="flex items-center gap-1 text-xs text-green-600 mb-1">
                                <Key className="w-3 h-3" />
                                Primary Keywords
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {profileData.primaryKeywords.slice(0, 5).map((kw, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                                        {kw}
                                    </span>
                                ))}
                                {profileData.primaryKeywords.length > 5 && (
                                    <span className="text-xs text-green-600">
                                        +{profileData.primaryKeywords.length - 5} more
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Topics */}
                    {profileData.suggestedTopics.length > 0 && (
                        <div>
                            <div className="flex items-center gap-1 text-xs text-green-600 mb-1">
                                <Lightbulb className="w-3 h-3" />
                                Suggested Topics
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {profileData.suggestedTopics.slice(0, 3).map((topic, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                                        {topic}
                                    </span>
                                ))}
                                {profileData.suggestedTopics.length > 3 && (
                                    <span className="text-xs text-green-600">
                                        +{profileData.suggestedTopics.length - 3} more
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

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
                            {site.profileData?.niche || <span className="text-neutral-400 italic">Not set</span>}
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
