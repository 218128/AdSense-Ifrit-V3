'use client';

import { useState } from 'react';
import { Download, Upload, Layout, Database } from 'lucide-react';
import TemplatesPanel from '../TemplatesPanel';
import {
    downloadSettingsBackup,
    importSettingsFromFile,
    syncToServer
} from '@/lib/backup/settingsBackup';

type DataSubsection = 'backup' | 'templates';

const subsections: { id: DataSubsection; label: string; icon: React.ReactNode }[] = [
    { id: 'backup', label: 'Backup & Restore', icon: <Database className="w-4 h-4" /> },
    { id: 'templates', label: 'Templates', icon: <Layout className="w-4 h-4" /> },
];

export function DataSection() {
    const [activeSubsection, setActiveSubsection] = useState<DataSubsection>('backup');

    const handleExportSettings = () => {
        try {
            downloadSettingsBackup();
        } catch (error) {
            alert('No settings to export. Please configure some API keys first.');
        }
    };

    const handleImportSettings = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            try {
                const result = await importSettingsFromFile(file);
                if (result.success) {
                    await syncToServer();
                    alert(`Restored ${result.restored} settings! Please refresh the page.`);
                    window.location.reload();
                } else {
                    alert('Invalid settings file format');
                }
            } catch (err) {
                console.error('Import failed:', err);
                alert('Failed to import settings. Invalid file format.');
            }
        };
        input.click();
    };

    return (
        <div className="space-y-4">
            {/* Subsection tabs */}
            <div className="flex gap-1 border-b border-neutral-200 pb-2">
                {subsections.map((sub) => (
                    <button
                        key={sub.id}
                        onClick={() => setActiveSubsection(sub.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeSubsection === sub.id
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-neutral-600 hover:bg-neutral-100'
                            }`}
                    >
                        {sub.icon}
                        {sub.label}
                    </button>
                ))}
            </div>

            {/* Backup & Restore */}
            {activeSubsection === 'backup' && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-100">
                        <h3 className="font-medium text-indigo-900 mb-2">Export & Import Settings</h3>
                        <p className="text-sm text-indigo-700">
                            Backup all your API keys, tokens, and configuration to a JSON file.
                            Use this to transfer settings to another machine or create a backup.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Export Section */}
                        <div className="border border-neutral-200 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <Download className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-neutral-900">Export Settings</h4>
                                    <p className="text-xs text-neutral-500">Download all settings as JSON</p>
                                </div>
                            </div>
                            <ul className="text-xs text-neutral-600 space-y-1 mb-4">
                                <li>✓ AI Provider Keys (Gemini, DeepSeek, OpenRouter, Perplexity)</li>
                                <li>✓ GitHub & Vercel Deployment Tokens</li>
                                <li>✓ AdSense Configuration (Publisher ID, Slots)</li>
                                <li>✓ Domain APIs (Namecheap, Spamzilla, Cloudflare)</li>
                                <li>✓ Stock Images (Unsplash, Pexels)</li>
                                <li>✓ Analytics & Publishing (Umami, Dev.to)</li>
                                <li>✓ MCP Server Configuration</li>
                                <li>✓ Capabilities & Handler Settings</li>
                            </ul>
                            <button
                                onClick={handleExportSettings}
                                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                            >
                                Download Backup File
                            </button>
                        </div>

                        {/* Import Section */}
                        <div className="border border-neutral-200 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Upload className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-neutral-900">Import Settings</h4>
                                    <p className="text-xs text-neutral-500">Restore from backup file</p>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-600 mb-4">
                                Upload a previously exported settings file to restore all your API keys and configuration.
                                The page will reload after importing.
                            </p>
                            <button
                                onClick={handleImportSettings}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Upload Backup File
                            </button>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm text-amber-800">
                            <strong>⚠️ Security Note:</strong> The exported file contains sensitive API keys.
                            Store it securely and don&apos;t share it publicly.
                        </p>
                    </div>
                </div>
            )}

            {/* Templates */}
            {activeSubsection === 'templates' && (
                <div>
                    <p className="text-sm text-neutral-500 mb-4">
                        Manage website and article templates.
                    </p>
                    <TemplatesPanel />
                </div>
            )}
        </div>
    );
}

export default DataSection;
