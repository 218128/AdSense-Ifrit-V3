'use client';

/**
 * Add WordPress Site Modal
 * FSD: features/wordpress/ui/AddWPSiteModal.tsx
 * 
 * Modal for adding a new WordPress site connection.
 */

import { useState } from 'react';
import { X, Globe, User, Key, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { useWPSitesLegacy } from '../model/wpSiteStore';
import { testConnection, syncSiteMetadata } from '../api/wordpressApi';
import type { WPSite } from '../model/wpSiteTypes';

interface AddWPSiteModalProps {
    onClose: () => void;
    onSuccess?: (site: WPSite) => void;
    editSite?: WPSite;
}

export function AddWPSiteModal({ onClose, onSuccess, editSite }: AddWPSiteModalProps) {
    const { addSite, updateSite, updateSiteStatus, updateSiteMetadata } = useWPSitesLegacy();

    const [form, setForm] = useState({
        name: editSite?.name || '',
        url: editSite?.url || '',
        username: editSite?.username || '',
        appPassword: editSite?.appPassword || '',
    });
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [saving, setSaving] = useState(false);

    const handleTest = async () => {
        if (!form.url || !form.username || !form.appPassword) {
            setTestResult({ success: false, message: 'Please fill all fields' });
            return;
        }

        setTesting(true);
        setTestResult(null);

        try {
            const result = await testConnection({
                id: 'test',
                ...form,
                status: 'pending',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });

            if (result.connected) {
                setTestResult({
                    success: true,
                    message: `Connected to ${result.siteName}`
                });
                // Auto-fill name if empty
                if (!form.name && result.siteName) {
                    setForm(f => ({ ...f, name: result.siteName! }));
                }
            } else {
                setTestResult({ success: false, message: result.error || 'Connection failed' });
            }
        } catch (error) {
            setTestResult({
                success: false,
                message: error instanceof Error ? error.message : 'Test failed'
            });
        } finally {
            setTesting(false);
        }
    };

    const handleSave = async () => {
        if (!testResult?.success) {
            setTestResult({ success: false, message: 'Please test connection first' });
            return;
        }

        setSaving(true);

        try {
            let site: WPSite;

            if (editSite) {
                // Update existing
                updateSite(editSite.id, form);
                site = { ...editSite, ...form, updatedAt: Date.now() };
            } else {
                // Create new
                site = addSite(form);
            }

            // Sync metadata
            updateSiteStatus(site.id, 'connected');
            const metadata = await syncSiteMetadata(site);
            updateSiteMetadata(site.id, metadata);

            onSuccess?.(site);
            onClose();
        } catch (error) {
            setTestResult({
                success: false,
                message: error instanceof Error ? error.message : 'Save failed'
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Globe className="w-6 h-6" />
                        <h2 className="text-lg font-semibold">
                            {editSite ? 'Edit WordPress Site' : 'Add WordPress Site'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-4">
                    {/* Site Name */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Site Name
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="My Tech Blog"
                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Site URL */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            <Globe className="w-4 h-4 inline mr-1" />
                            WordPress URL
                        </label>
                        <input
                            type="url"
                            value={form.url}
                            onChange={(e) => setForm(f => ({ ...f, url: e.target.value }))}
                            placeholder="https://myblog.com"
                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Username */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            <User className="w-4 h-4 inline mr-1" />
                            Username
                        </label>
                        <input
                            type="text"
                            value={form.username}
                            onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
                            placeholder="admin"
                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Application Password */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            <Key className="w-4 h-4 inline mr-1" />
                            Application Password
                        </label>
                        <input
                            type="password"
                            value={form.appPassword}
                            onChange={(e) => setForm(f => ({ ...f, appPassword: e.target.value }))}
                            placeholder="xxxx xxxx xxxx xxxx"
                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="mt-1 text-xs text-neutral-500">
                            Generate in WordPress: Users → Profile → Application Passwords
                            <a
                                href="https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-1 text-blue-600 hover:underline inline-flex items-center"
                            >
                                Learn more <ExternalLink className="w-3 h-3 ml-0.5" />
                            </a>
                        </p>
                    </div>

                    {/* Test Result */}
                    {testResult && (
                        <div className={`p-3 rounded-lg flex items-center gap-2 ${testResult.success
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                            {testResult.success
                                ? <CheckCircle className="w-5 h-5" />
                                : <AlertCircle className="w-5 h-5" />
                            }
                            <span className="text-sm">{testResult.message}</span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
                    <button
                        onClick={handleTest}
                        disabled={testing || saving}
                        className="px-4 py-2 text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 flex items-center gap-2"
                    >
                        {testing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Testing...
                            </>
                        ) : (
                            'Test Connection'
                        )}
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-neutral-600 hover:text-neutral-800"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!testResult?.success || saving}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                editSite ? 'Update' : 'Add Site'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
