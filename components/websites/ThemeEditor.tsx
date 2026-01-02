'use client';

/**
 * Theme Editor Component
 * 
 * Allows editing CSS for a website:
 * - Quick color pickers for primary/secondary colors
 * - Full CSS editor for globals.css
 * - Version history with restore capability
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Palette,
    Save,
    History,
    RotateCcw,
    Loader2,
    Code,
    RefreshCw,
    CheckCircle,
    AlertTriangle,
    Eye,
    EyeOff
} from 'lucide-react';

interface ThemeConfig {
    globals: string;
    variables: {
        primaryColor: string;
        secondaryColor: string;
        bgColor: string;
        textColor: string;
        fontFamily?: string;
    };
    custom?: string;
    lastModifiedAt: number;
}

interface ThemeVersion {
    id: string;
    globals: string;
    savedAt: number;
    reason: string;
}

interface ThemeEditorProps {
    domain: string;
    onRefresh?: () => void;
}

export default function ThemeEditor({ domain, onRefresh }: ThemeEditorProps) {
    const [theme, setTheme] = useState<ThemeConfig | null>(null);
    const [versions, setVersions] = useState<ThemeVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [editedGlobals, setEditedGlobals] = useState('');
    const [editedVariables, setEditedVariables] = useState<ThemeConfig['variables']>({
        primaryColor: '#2563eb',
        secondaryColor: '#10b981',
        bgColor: '#ffffff',
        textColor: '#1f2937',
        fontFamily: 'Inter, sans-serif'
    });
    const [hasChanges, setHasChanges] = useState(false);
    const [activeTab, setActiveTab] = useState<'quick' | 'advanced'>('quick');
    const [showVersions, setShowVersions] = useState(false);
    const [hasLocalTheme, setHasLocalTheme] = useState(false);

    // Fetch theme
    const fetchTheme = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/websites/${domain}/theme`);
            const data = await response.json();

            if (data.success) {
                setTheme(data.theme);
                setVersions(data.versions || []);
                setEditedGlobals(data.theme.globals || '');
                setEditedVariables(data.theme.variables || editedVariables);
                setHasLocalTheme(data.hasLocalTheme);
                setHasChanges(false);
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to load theme' });
        } finally {
            setLoading(false);
        }
    }, [domain]);

    useEffect(() => {
        fetchTheme();
    }, [fetchTheme]);

    // Track changes
    useEffect(() => {
        if (theme) {
            const globalsChanged = editedGlobals !== (theme.globals || '');
            const varsChanged = JSON.stringify(editedVariables) !== JSON.stringify(theme.variables);
            setHasChanges(globalsChanged || varsChanged);
        }
    }, [editedGlobals, editedVariables, theme]);

    // Save theme
    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const response = await fetch(`/api/websites/${domain}/theme`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    globals: editedGlobals,
                    variables: editedVariables,
                    createVersion: true,
                    versionReason: 'manual'
                })
            });

            const data = await response.json();

            if (data.success) {
                setMessage({ type: 'success', text: 'Theme saved! Deploy to apply changes.' });
                setTheme(data.theme);
                setHasChanges(false);
                await fetchTheme();
                onRefresh?.();
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to save theme' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to save theme' });
        } finally {
            setSaving(false);
        }
    };

    // Restore version
    const handleRestore = async (versionId: string) => {
        setSaving(true);
        setMessage(null);

        try {
            const response = await fetch(`/api/websites/${domain}/theme`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ versionId })
            });

            const data = await response.json();

            if (data.success) {
                setMessage({ type: 'success', text: 'Theme restored!' });
                await fetchTheme();
                onRefresh?.();
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to restore' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to restore theme' });
        } finally {
            setSaving(false);
        }
    };

    // Update CSS variable in globals
    const updateCssVariable = (varName: string, value: string) => {
        const newVars = { ...editedVariables, [varName]: value };
        setEditedVariables(newVars);

        // Also update in globals.css if present
        if (editedGlobals) {
            let newGlobals = editedGlobals;
            const varMap: Record<string, string> = {
                primaryColor: '--color-primary',
                secondaryColor: '--color-secondary',
                bgColor: '--color-bg',
                textColor: '--color-text'
            };
            const cssVar = varMap[varName];
            if (cssVar) {
                const regex = new RegExp(`(${cssVar}:\\s*)([^;]+)(;)`);
                if (regex.test(newGlobals)) {
                    newGlobals = newGlobals.replace(regex, `$1${value}$3`);
                    setEditedGlobals(newGlobals);
                }
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Palette className="w-6 h-6 text-purple-500" />
                    <h3 className="text-lg font-semibold">Theme Editor</h3>
                    {!hasLocalTheme && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                            No local theme - using template default
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowVersions(!showVersions)}
                        className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50 flex items-center gap-1"
                    >
                        <History className="w-4 h-4" />
                        {showVersions ? 'Hide' : 'History'}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        className={`px-4 py-1.5 text-sm rounded-lg flex items-center gap-2 ${hasChanges
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                            }`}
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save Theme
                    </button>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-3 rounded-lg flex items-center gap-2 ${message.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.type === 'success' ? (
                        <CheckCircle className="w-4 h-4" />
                    ) : (
                        <AlertTriangle className="w-4 h-4" />
                    )}
                    {message.text}
                </div>
            )}

            {/* Tab Switch */}
            <div className="flex border-b border-neutral-200">
                <button
                    onClick={() => setActiveTab('quick')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'quick'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-neutral-600 hover:text-neutral-800'
                        }`}
                >
                    <Palette className="w-4 h-4 inline mr-2" />
                    Quick Colors
                </button>
                <button
                    onClick={() => setActiveTab('advanced')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'advanced'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-neutral-600 hover:text-neutral-800'
                        }`}
                >
                    <Code className="w-4 h-4 inline mr-2" />
                    Advanced CSS
                </button>
            </div>

            {/* Quick Colors Tab */}
            {activeTab === 'quick' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Primary Color */}
                    <div className="p-4 border border-neutral-200 rounded-lg">
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Primary Color
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={editedVariables.primaryColor}
                                onChange={(e) => updateCssVariable('primaryColor', e.target.value)}
                                className="w-10 h-10 rounded cursor-pointer border border-neutral-300"
                            />
                            <input
                                type="text"
                                value={editedVariables.primaryColor}
                                onChange={(e) => updateCssVariable('primaryColor', e.target.value)}
                                className="flex-1 px-2 py-1 text-sm border border-neutral-300 rounded font-mono"
                            />
                        </div>
                    </div>

                    {/* Secondary Color */}
                    <div className="p-4 border border-neutral-200 rounded-lg">
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Secondary Color
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={editedVariables.secondaryColor}
                                onChange={(e) => updateCssVariable('secondaryColor', e.target.value)}
                                className="w-10 h-10 rounded cursor-pointer border border-neutral-300"
                            />
                            <input
                                type="text"
                                value={editedVariables.secondaryColor}
                                onChange={(e) => updateCssVariable('secondaryColor', e.target.value)}
                                className="flex-1 px-2 py-1 text-sm border border-neutral-300 rounded font-mono"
                            />
                        </div>
                    </div>

                    {/* Background Color */}
                    <div className="p-4 border border-neutral-200 rounded-lg">
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Background
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={editedVariables.bgColor}
                                onChange={(e) => updateCssVariable('bgColor', e.target.value)}
                                className="w-10 h-10 rounded cursor-pointer border border-neutral-300"
                            />
                            <input
                                type="text"
                                value={editedVariables.bgColor}
                                onChange={(e) => updateCssVariable('bgColor', e.target.value)}
                                className="flex-1 px-2 py-1 text-sm border border-neutral-300 rounded font-mono"
                            />
                        </div>
                    </div>

                    {/* Text Color */}
                    <div className="p-4 border border-neutral-200 rounded-lg">
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Text Color
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={editedVariables.textColor}
                                onChange={(e) => updateCssVariable('textColor', e.target.value)}
                                className="w-10 h-10 rounded cursor-pointer border border-neutral-300"
                            />
                            <input
                                type="text"
                                value={editedVariables.textColor}
                                onChange={(e) => updateCssVariable('textColor', e.target.value)}
                                className="flex-1 px-2 py-1 text-sm border border-neutral-300 rounded font-mono"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Advanced CSS Tab */}
            {activeTab === 'advanced' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-neutral-700">
                            globals.css
                        </label>
                        <span className="text-xs text-neutral-500">
                            {editedGlobals.length.toLocaleString()} characters
                        </span>
                    </div>
                    <textarea
                        value={editedGlobals}
                        onChange={(e) => setEditedGlobals(e.target.value)}
                        className="w-full h-96 p-4 font-mono text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="/* Your CSS here... */"
                        spellCheck={false}
                    />
                    <p className="text-xs text-neutral-500">
                        Edit the full CSS file. Changes will be saved locally and deployed when you click &ldquo;Deploy&rdquo;.
                    </p>
                </div>
            )}

            {/* Version History */}
            {showVersions && versions.length > 0 && (
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                    <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-200">
                        <h4 className="font-medium text-sm">Version History</h4>
                    </div>
                    <div className="divide-y divide-neutral-100">
                        {versions.map((version) => (
                            <div
                                key={version.id}
                                className="px-4 py-3 flex items-center justify-between hover:bg-neutral-50"
                            >
                                <div>
                                    <div className="text-sm font-medium">
                                        {new Date(version.savedAt).toLocaleString()}
                                    </div>
                                    <div className="text-xs text-neutral-500 capitalize">
                                        {version.reason.replace('-', ' ')}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRestore(version.id)}
                                    disabled={saving}
                                    className="px-3 py-1 text-xs bg-neutral-100 text-neutral-700 rounded hover:bg-neutral-200 flex items-center gap-1"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    Restore
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* No versions yet */}
            {showVersions && versions.length === 0 && (
                <div className="text-center py-8 text-neutral-500 border border-neutral-200 rounded-lg">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No version history yet</p>
                    <p className="text-xs">Versions are created when you save changes</p>
                </div>
            )}
        </div>
    );
}
