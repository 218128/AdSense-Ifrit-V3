'use client';

import { useState } from 'react';
import { Zap, Loader2, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import SettingsModal, { getUserSettings, getEnabledProviderKeys } from '@/components/settings/SettingsView';

export default function Dashboard() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [statusType, setStatusType] = useState<'info' | 'success' | 'error' | 'warning'>('info');

    const handleGenerate = async () => {
        setIsGenerating(true);
        setStatus('Initializing Ifrit Engine...');
        setStatusType('info');

        // Get all user settings from localStorage
        const settings = getUserSettings();

        if (!settings.geminiKey) {
            setStatus('Error: No Gemini API Key found. Please open Settings and add your key.');
            setStatusType('error');
            setIsGenerating(false);
            return;
        }

        try {
            setStatus('Scanning for trends...');

            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    geminiKey: settings.geminiKey,
                    blogUrl: settings.blogUrl,
                    providerKeys: getEnabledProviderKeys(),
                    adsenseConfig: settings.adsensePublisherId ? {
                        publisherId: settings.adsensePublisherId,
                        leaderboardSlot: settings.adsenseLeaderboardSlot,
                        articleSlot: settings.adsenseArticleSlot,
                        multiplexSlot: settings.adsenseMultiplexSlot,
                    } : undefined
                })
            });

            const data = await res.json();

            if (res.ok) {
                if (data.warning) {
                    setStatus(`${data.message} (${data.article || 'New Content'}). Note: ${data.warning}`);
                    setStatusType('warning');
                } else {
                    setStatus(`Success: ${data.message} (${data.article || 'New Content'})`);
                    setStatusType('success');
                }
                // Reload page to show new article
                setTimeout(() => window.location.reload(), 2500);
            } else {
                setStatus(`Error: ${data.error || 'Unknown error'}`);
                setStatusType('error');
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Unknown error occurred';
            setStatus(`System Failure: ${message}`);
            setStatusType('error');
        } finally {
            setIsGenerating(false);
        }
    };

    const getStatusIcon = () => {
        switch (statusType) {
            case 'error':
                return <AlertCircle className="w-4 h-4" />;
            case 'success':
                return <CheckCircle className="w-4 h-4" />;
            case 'warning':
                return <AlertTriangle className="w-4 h-4" />;
            default:
                return null;
        }
    };

    const getStatusClass = () => {
        switch (statusType) {
            case 'error':
                return 'bg-red-100 text-red-700';
            case 'success':
                return 'bg-green-100 text-green-700';
            case 'warning':
                return 'bg-yellow-100 text-yellow-700';
            default:
                return 'bg-blue-50 text-blue-600';
        }
    };

    return (
        <>
            <SettingsModal />
            <div className="flex flex-col items-center gap-4 mb-12">
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className={`flex items-center gap-2 px-8 py-4 rounded-full text-lg font-bold shadow-lg transition-all ${isGenerating
                        ? 'bg-neutral-200 text-neutral-500 cursor-wait'
                        : 'bg-black text-white hover:bg-neutral-800 hover:scale-105 active:scale-95'
                        }`}
                >
                    {isGenerating ? <Loader2 className="animate-spin" /> : <Zap className="fill-current" />}
                    {isGenerating ? 'Ifrit is Thinking...' : 'Trigger Ifrit Autonomy'}
                </button>

                {status && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium max-w-xl text-center ${getStatusClass()}`}>
                        {getStatusIcon()}
                        <span>{status}</span>
                    </div>
                )}
            </div>
        </>
    );
}
