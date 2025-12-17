'use client';

import { useState, useEffect } from 'react';
import { Globe, Plus, Trash2, Edit, Check, X, Star } from 'lucide-react';
import {
    DomainConfig,
    getDomains,
    addDomain,
    updateDomain,
    deleteDomain,
    setDefaultDomain,
    getDefaultDomain,
    AVAILABLE_NICHES
} from '@/lib/domains';

interface DomainFormData {
    name: string;
    url: string;
    niche: string;
    publisherId: string;
    leaderboardSlot: string;
    articleSlot: string;
    multiplexSlot: string;
    isActive: boolean;
}

const EMPTY_FORM: DomainFormData = {
    name: '',
    url: '',
    niche: 'General',
    publisherId: '',
    leaderboardSlot: '',
    articleSlot: '',
    multiplexSlot: '',
    isActive: true
};

export default function DomainManager() {
    const [domains, setDomains] = useState<DomainConfig[]>([]);
    const [defaultDomainId, setDefaultDomainIdState] = useState<string | undefined>();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<DomainFormData>(EMPTY_FORM);

    // Load domains on mount
    useEffect(() => {
        setDomains(getDomains());
        const defaultDomain = getDefaultDomain();
        if (defaultDomain) {
            setDefaultDomainIdState(defaultDomain.id);
        }
    }, []);

    const handleInputChange = (field: keyof DomainFormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAdd = () => {
        if (!formData.name || !formData.url) return;

        const newDomain = addDomain({
            name: formData.name,
            url: formData.url.startsWith('http') ? formData.url : `https://${formData.url}`,
            niche: formData.niche,
            adsenseConfig: {
                publisherId: formData.publisherId,
                leaderboardSlot: formData.leaderboardSlot,
                articleSlot: formData.articleSlot,
                multiplexSlot: formData.multiplexSlot
            },
            isActive: formData.isActive
        });

        setDomains(prev => [...prev, newDomain]);
        setFormData(EMPTY_FORM);
        setIsAdding(false);
    };

    const handleEdit = (domain: DomainConfig) => {
        setEditingId(domain.id);
        setFormData({
            name: domain.name,
            url: domain.url,
            niche: domain.niche,
            publisherId: domain.adsenseConfig.publisherId,
            leaderboardSlot: domain.adsenseConfig.leaderboardSlot || '',
            articleSlot: domain.adsenseConfig.articleSlot || '',
            multiplexSlot: domain.adsenseConfig.multiplexSlot || '',
            isActive: domain.isActive
        });
    };

    const handleUpdate = () => {
        if (!editingId || !formData.name || !formData.url) return;

        const updated = updateDomain(editingId, {
            name: formData.name,
            url: formData.url.startsWith('http') ? formData.url : `https://${formData.url}`,
            niche: formData.niche,
            adsenseConfig: {
                publisherId: formData.publisherId,
                leaderboardSlot: formData.leaderboardSlot,
                articleSlot: formData.articleSlot,
                multiplexSlot: formData.multiplexSlot
            },
            isActive: formData.isActive
        });

        if (updated) {
            setDomains(getDomains());
        }
        setEditingId(null);
        setFormData(EMPTY_FORM);
    };

    const handleDelete = (id: string) => {
        if (confirm('Delete this domain configuration?')) {
            deleteDomain(id);
            setDomains(prev => prev.filter(d => d.id !== id));
        }
    };

    const handleSetDefault = (id: string) => {
        setDefaultDomain(id);
        setDefaultDomainIdState(id);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setIsAdding(false);
        setFormData(EMPTY_FORM);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold">Domain Management</h3>
                </div>
                {!isAdding && !editingId && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Domain
                    </button>
                )}
            </div>

            <div className="p-4 space-y-4">
                {/* Domain List */}
                {domains.length === 0 && !isAdding && (
                    <div className="text-center py-8 text-neutral-500">
                        <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No domains configured yet.</p>
                        <p className="text-sm">Add your blog domains to manage content publishing.</p>
                    </div>
                )}

                {domains.map(domain => (
                    <div
                        key={domain.id}
                        className={`p-4 rounded-lg border ${domain.isActive ? 'border-green-200 bg-green-50' : 'border-neutral-200 bg-neutral-50'
                            }`}
                    >
                        {editingId === domain.id ? (
                            <DomainForm
                                formData={formData}
                                onChange={handleInputChange}
                                onSave={handleUpdate}
                                onCancel={cancelEdit}
                                isEdit={true}
                            />
                        ) : (
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-medium">{domain.name}</h4>
                                        {defaultDomainId === domain.id && (
                                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full flex items-center gap-1">
                                                <Star className="w-3 h-3 fill-current" />
                                                Default
                                            </span>
                                        )}
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${domain.isActive ? 'bg-green-100 text-green-700' : 'bg-neutral-200 text-neutral-600'
                                            }`}>
                                            {domain.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <a href={domain.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                        {domain.url}
                                    </a>
                                    <p className="text-sm text-neutral-500 mt-1">
                                        Niche: {domain.niche} • AdSense: {domain.adsenseConfig.publisherId || 'Not configured'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {defaultDomainId !== domain.id && (
                                        <button
                                            onClick={() => handleSetDefault(domain.id)}
                                            title="Set as default"
                                            className="p-2 text-neutral-400 hover:text-yellow-500 transition-colors"
                                        >
                                            <Star className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleEdit(domain)}
                                        className="p-2 text-neutral-400 hover:text-blue-600 transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(domain.id)}
                                        className="p-2 text-neutral-400 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Add Form */}
                {isAdding && (
                    <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
                        <DomainForm
                            formData={formData}
                            onChange={handleInputChange}
                            onSave={handleAdd}
                            onCancel={cancelEdit}
                            isEdit={false}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

interface DomainFormProps {
    formData: DomainFormData;
    onChange: (field: keyof DomainFormData, value: string | boolean) => void;
    onSave: () => void;
    onCancel: () => void;
    isEdit: boolean;
}

function DomainForm({ formData, onChange, onSave, onCancel, isEdit }: DomainFormProps) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Blog Name *
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => onChange('name', e.target.value)}
                        placeholder="e.g., Finance Blog"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Domain URL *
                    </label>
                    <input
                        type="text"
                        value={formData.url}
                        onChange={(e) => onChange('url', e.target.value)}
                        placeholder="e.g., https://myblog.com"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Niche
                    </label>
                    <select
                        value={formData.niche}
                        onChange={(e) => onChange('niche', e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        {AVAILABLE_NICHES.map(niche => (
                            <option key={niche} value={niche}>{niche}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        AdSense Publisher ID
                    </label>
                    <input
                        type="text"
                        value={formData.publisherId}
                        onChange={(e) => onChange('publisherId', e.target.value)}
                        placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Leaderboard Slot
                    </label>
                    <input
                        type="text"
                        value={formData.leaderboardSlot}
                        onChange={(e) => onChange('leaderboardSlot', e.target.value)}
                        placeholder="Slot ID"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Article Slot
                    </label>
                    <input
                        type="text"
                        value={formData.articleSlot}
                        onChange={(e) => onChange('articleSlot', e.target.value)}
                        placeholder="Slot ID"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Multiplex Slot
                    </label>
                    <input
                        type="text"
                        value={formData.multiplexSlot}
                        onChange={(e) => onChange('multiplexSlot', e.target.value)}
                        placeholder="Slot ID"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => onChange('isActive', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="isActive" className="text-sm text-neutral-700">
                    Domain is active (available for content routing)
                </label>
            </div>

            <div className="flex items-center gap-2 pt-2">
                <button
                    onClick={onSave}
                    disabled={!formData.name || !formData.url}
                    className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Check className="w-4 h-4" />
                    {isEdit ? 'Save Changes' : 'Add Domain'}
                </button>
                <button
                    onClick={onCancel}
                    className="flex items-center gap-1 px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors"
                >
                    <X className="w-4 h-4" />
                    Cancel
                </button>
            </div>
        </div>
    );
}
