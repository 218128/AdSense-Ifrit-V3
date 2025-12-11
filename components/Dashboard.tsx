'use client';

import { useState } from 'react';
import { Zap, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import SettingsModal from './SettingsModal';

export default function Dashboard() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setStatus('Initializing Ifrit Engine...');

        const geminiKey = localStorage.getItem('GEMINI_API_KEY');

        if (!geminiKey) {
            setStatus('Error: No API Key found. Please open Settings.');
            setIsGenerating(false);
            return;
        }

        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ geminiKey })
            });

            const data = await res.json();

            if (res.ok) {
                setStatus(`Success: ${data.message} (${data.article || 'New Content'})`);
                // Reload page to show new article
                setTimeout(() => window.location.reload(), 2000);
            } else {
                setStatus(`Error: ${data.error || 'Unknown error'}`);
            }
        } catch (e: any) {
            setStatus(`System Failure: ${e.message}`);
        } finally {
            setIsGenerating(false);
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
                    <div className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${status.startsWith('Error') ? 'bg-red-100 text-red-700' :
                            status.startsWith('Success') ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'
                        }`}>
                        {status.startsWith('Error') ? <AlertCircle className="w-4 h-4" /> :
                            status.startsWith('Success') ? <CheckCircle className="w-4 h-4" /> : null}
                        {status}
                    </div>
                )}
            </div>
        </>
    );
}
