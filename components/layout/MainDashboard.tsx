'use client';

/**
 * Main Dashboard Component - Redesigned
 * 
 * New navigation structure:
 * - Dashboard: Overview and revenue stats
 * - Hunt: Keywords + Domains (power-user mode)
 * - Websites: Site management + wizard (guided mode)
 * - Settings: API keys and integrations
 */

import { useState } from 'react';
import {
    LayoutDashboard,
    Search,
    Globe,
    Settings,
    Target,
    Rocket
} from 'lucide-react';

// Import dashboard components from new organized structure
import { DashboardView } from '@/components/dashboard';
import { HuntDashboard } from '@/components/hunt';
import { WebsitesView } from '@/components/websites';
import { SettingsView } from '@/components/settings';

// WordPress feature module
import { WPSitesDashboard } from '@/features/wordpress';

// Campaigns feature module
import { CampaignsDashboard } from '@/features/campaigns';

type TabId = 'dashboard' | 'hunt' | 'websites' | 'wpsites' | 'campaigns' | 'settings';

interface MainDashboardProps {
    articles?: Array<{ slug: string; title: string }>;
}

const TABS: { id: TabId; label: string; icon: React.ReactNode; badge?: string; gradient: string }[] = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard className="w-5 h-5" />,
        gradient: 'from-indigo-600 to-purple-600'
    },
    {
        id: 'hunt',
        label: 'Hunt',
        icon: <Search className="w-5 h-5" />,
        badge: 'Power',
        gradient: 'from-amber-500 to-orange-500'
    },
    {
        id: 'websites',
        label: 'Websites',
        icon: <Globe className="w-5 h-5" />,
        badge: 'Legacy',
        gradient: 'from-emerald-500 to-teal-500'
    },
    {
        id: 'wpsites',
        label: 'WP Sites',
        icon: <Rocket className="w-5 h-5" />,
        badge: 'NEW',
        gradient: 'from-blue-500 to-indigo-600'
    },
    {
        id: 'campaigns',
        label: 'Campaigns',
        icon: <Target className="w-5 h-5" />,
        badge: 'NEW',
        gradient: 'from-purple-500 to-pink-600'
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: <Settings className="w-5 h-5" />,
        gradient: 'from-neutral-600 to-neutral-700'
    },
];

export default function MainDashboard({ articles = [] }: MainDashboardProps) {
    const [activeTab, setActiveTab] = useState<TabId>('dashboard');

    const currentTab = TABS.find(t => t.id === activeTab);

    return (
        <div className="w-full max-w-6xl mx-auto">
            {/* Main Tab Navigation */}
            <div className="flex justify-center mb-6">
                <div className="inline-flex bg-white rounded-2xl shadow-lg border border-neutral-200 p-1.5 gap-1">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id
                                ? `bg-gradient-to-r ${tab.gradient} text-white shadow-md`
                                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                                }`}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                            {tab.badge && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.id
                                    ? 'bg-white/20'
                                    : tab.id === 'hunt'
                                        ? 'bg-amber-100 text-amber-700'
                                        : tab.id === 'websites'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-neutral-100 text-neutral-600'
                                    }`}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Description */}
            <div className="text-center mb-6">
                {activeTab === 'dashboard' && (
                    <p className="text-neutral-500">
                        Your revenue portfolio overview and quick actions
                    </p>
                )}
                {activeTab === 'hunt' && (
                    <p className="text-neutral-500">
                        <span className="text-amber-600 font-medium">Power User Mode:</span> Discover HIGH-CPC keywords and acquire valuable domains
                    </p>
                )}
                {activeTab === 'websites' && (
                    <p className="text-neutral-500">
                        <span className="text-emerald-600 font-medium">Legacy Mode:</span> Custom website templates and deployment
                    </p>
                )}
                {activeTab === 'wpsites' && (
                    <p className="text-neutral-500">
                        <span className="text-blue-600 font-medium">WordPress Mode:</span> Connect and manage your WordPress sites for AI publishing
                    </p>
                )}
                {activeTab === 'campaigns' && (
                    <p className="text-neutral-500">
                        <span className="text-purple-600 font-medium">Automation Mode:</span> Schedule AI content campaigns to your WordPress sites
                    </p>
                )}
                {activeTab === 'settings' && (
                    <p className="text-neutral-500">
                        Configure API keys, integrations, and preferences
                    </p>
                )}
            </div>

            {/* Tab Content */}
            <div className="bg-white/50 rounded-3xl p-6 md:p-8 border border-neutral-200/50 backdrop-blur-sm">
                {activeTab === 'dashboard' && <DashboardView />}
                {activeTab === 'hunt' && <HuntDashboard />}
                {activeTab === 'websites' && <WebsitesView articles={articles} />}
                {activeTab === 'wpsites' && <WPSitesDashboard />}
                {activeTab === 'campaigns' && <CampaignsDashboard />}
                {activeTab === 'settings' && <SettingsPanel />}
            </div>
        </div>
    );
}

/**
 * Settings Panel - Inline settings instead of modal
 */
function SettingsPanel() {
    return (
        <div className="space-y-6">
            {/* Settings Header */}
            <div className="bg-gradient-to-r from-neutral-600 to-neutral-700 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                    <Settings className="w-8 h-8" />
                    <h2 className="text-2xl font-bold">⚙️ Settings</h2>
                </div>
                <p className="text-neutral-300">
                    Configure your API keys, integrations, and preferences.
                </p>
            </div>

            {/* Settings Modal Component (reused) */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
                <SettingsView inline={true} />
            </div>
        </div>
    );
}
