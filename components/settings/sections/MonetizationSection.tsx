'use client';

import { DollarSign, Globe, Zap, FileText, CheckCircle, Rocket } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { PreApplicationWizard } from '@/components/adsense/PreApplicationWizard';

export function MonetizationSection() {
    const { adsenseConfig, setAdsenseConfig } = useSettingsStore();

    return (
        <div className="space-y-6">
            {/* Policy Guidance */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                    💡 AdSense Policy (Dec 2025)
                </h4>
                <ul className="text-sm text-green-800 space-y-1">
                    <li>• <strong>One account per person</strong> — Google allows only 1 AdSense account per individual</li>
                    <li>• <strong>Multiple sites allowed</strong> — You can monetize unlimited websites with the same Publisher ID</li>
                    <li>• <strong>These settings apply to all websites</strong> created in Ifrit (used during deploy)</li>
                </ul>
            </div>

            {/* Publisher ID */}
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Publisher ID
                </label>
                <input
                    type="text"
                    value={adsenseConfig.publisherId}
                    onChange={(e) => setAdsenseConfig({ publisherId: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="pub-1234567890123456"
                />
                <p className="text-xs text-neutral-500 mt-1">
                    Format: <code className="bg-neutral-100 px-1 rounded">pub-</code> followed by 16 digits.
                    Find in AdSense → Account → Account information
                </p>
            </div>

            {/* Ad Slots */}
            <div className="grid md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Leaderboard Ad Slot
                    </label>
                    <input
                        type="text"
                        value={adsenseConfig.leaderboardSlot}
                        onChange={(e) => setAdsenseConfig({ leaderboardSlot: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        placeholder="1234567890"
                    />
                    <p className="text-xs text-neutral-500 mt-1">728×90 banner at page top</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        In-Article Ad Slot
                    </label>
                    <input
                        type="text"
                        value={adsenseConfig.articleSlot}
                        onChange={(e) => setAdsenseConfig({ articleSlot: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        placeholder="0987654321"
                    />
                    <p className="text-xs text-neutral-500 mt-1">Responsive ad within content</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Multiplex Ad Slot
                    </label>
                    <input
                        type="text"
                        value={adsenseConfig.multiplexSlot}
                        onChange={(e) => setAdsenseConfig({ multiplexSlot: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        placeholder="1122334455"
                    />
                    <p className="text-xs text-neutral-500 mt-1">Grid-style ads at page bottom</p>
                </div>
            </div>

            <p className="text-xs text-neutral-500">
                Slot IDs are 10 digits. Create ad units in AdSense → Ads → By ad unit → Create new ad unit
            </p>

            {/* Quick Links */}
            <div className="flex gap-3 pt-2">
                <a
                    href="https://www.google.com/adsense/new/u/0/pub-selector"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                    📊 AdSense Dashboard
                </a>
                <a
                    href="https://support.google.com/adsense/answer/2659101"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                    📖 Ad Unit Setup Guide
                </a>
            </div>

            {/* Readiness Tools */}
            <div className="border-t border-neutral-200 pt-6">
                <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2 mb-4">
                    <Rocket className="w-4 h-4" />
                    AdSense Readiness Tools
                </h3>

                {/* Quick Tools Grid */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <a
                        href={`/api/ads-txt?publisherId=${adsenseConfig.publisherId}&format=raw`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 hover:shadow-md transition-shadow text-center"
                    >
                        <FileText className="w-6 h-6 text-green-600 mx-auto mb-2" />
                        <div className="font-medium text-green-900 text-sm">Download ads.txt</div>
                        <div className="text-xs text-green-600">For your website root</div>
                    </a>
                    <a
                        href="https://pagespeed.web.dev/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 hover:shadow-md transition-shadow text-center"
                    >
                        <Zap className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                        <div className="font-medium text-blue-900 text-sm">PageSpeed Test</div>
                        <div className="text-xs text-blue-600">Core Web Vitals</div>
                    </a>
                    <a
                        href="https://search.google.com/search-console"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-200 hover:shadow-md transition-shadow text-center"
                    >
                        <Globe className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                        <div className="font-medium text-purple-900 text-sm">Search Console</div>
                        <div className="text-xs text-purple-600">Index your site</div>
                    </a>
                </div>

                {/* Pre-Application Wizard */}
                <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
                    <h4 className="font-medium text-neutral-900 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-violet-500" />
                        Pre-Application Checklist
                    </h4>
                    <p className="text-sm text-neutral-600 mb-4">
                        Run through this checklist before applying to AdSense to maximize approval chances.
                    </p>
                    <PreApplicationWizard
                        publisherId={adsenseConfig.publisherId}
                        onComplete={(passed, results) => {
                            console.log('Pre-application check complete:', { passed, results });
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

export default MonetizationSection;
