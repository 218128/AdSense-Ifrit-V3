'use client';

import { useState, useEffect } from 'react';
import { Settings, Lock } from 'lucide-react';

export default function SettingsModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [googleKey, setGoogleKey] = useState('');
    const [geminiKey, setGeminiKey] = useState('');
    const [adsenseId, setAdsenseId] = useState('');

    useEffect(() => {
        // Load from local storage on mount
        const gKey = localStorage.getItem('GOOGLE_API_KEY');
        const gemKey = localStorage.getItem('GEMINI_API_KEY');
        const adId = localStorage.getItem('NEXT_PUBLIC_ADSENSE_ID'); // Note: Env vars are read-only, this is for simulation/state

        if (gKey) setGoogleKey(gKey);
        if (gemKey) setGeminiKey(gemKey);
        if (adId) setAdsenseId(adId);
    }, []);

    const handleSave = () => {
        localStorage.setItem('GOOGLE_API_KEY', googleKey);
        localStorage.setItem('GEMINI_API_KEY', geminiKey);
        localStorage.setItem('NEXT_PUBLIC_ADSENSE_ID', adsenseId);
        setIsOpen(false);
        alert('Keys saved securely to your browser!');
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 p-3 bg-white rounded-full shadow-lg border border-neutral-200 hover:bg-neutral-50 transition-colors z-50"
                aria-label="Settings"
            >
                <Settings className="w-6 h-6 text-neutral-600" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl m-4">
                        <div className="flex items-center gap-2 mb-6 text-blue-600">
                            <Lock className="w-5 h-5" />
                            <h2 className="text-xl font-bold">Secure API Configuration</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Google Trends API Key (Optional)
                                </label>
                                <input
                                    type="password"
                                    value={googleKey}
                                    onChange={(e) => setGoogleKey(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Official API Key"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Gemini API Key (Required)
                                </label>
                                <input
                                    type="password"
                                    value={geminiKey}
                                    onChange={(e) => setGeminiKey(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="AI Studio Key for Gemini 2.5 Flash"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    AdSense Publisher ID
                                </label>
                                <input
                                    type="text"
                                    value={adsenseId}
                                    onChange={(e) => setAdsenseId(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="pub-XXXXXXXXXXXXXXXX"
                                />
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-4 py-2 text-neutral-500 hover:text-neutral-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                            >
                                Save Keys
                            </button>
                        </div>
                        <p className="mt-4 text-xs text-neutral-400 text-center">
                            Keys are stored locally in your browser.
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
