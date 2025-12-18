'use client';

/**
 * Overview Dashboard Component
 * 
 * Main overview showing revenue stats, active websites, and quick actions.
 * This is the first thing users see - high-level portfolio view.
 */

import { useState, useEffect } from 'react';
import {
    TrendingUp,
    Globe,
    DollarSign,
    FileText,
    ArrowUpRight,
    ArrowDownRight,
    Target,
    Zap,
    ChevronRight,
    AlertCircle,
    CheckCircle,
    Clock,
    BarChart3
} from 'lucide-react';
import { AnalyticsPanel } from './AnalyticsPanel';

interface Website {
    id: string;
    domain: string;
    status: string;
    articlesCount: number;
    estimatedRevenue: number;
}

export default function OverviewDashboard() {
    const [websites, setWebsites] = useState<Website[]>([]);
    const [totalArticles, setTotalArticles] = useState(0);

    useEffect(() => {
        // Load websites from storage
        const savedWebsites = localStorage.getItem('ifrit_websites');
        if (savedWebsites) {
            try {
                const parsed = JSON.parse(savedWebsites);
                setWebsites(parsed);
            } catch {
                // Ignore
            }
        }

        // Count articles from storage
        const savedArticles = localStorage.getItem('ifrit_generated_articles');
        if (savedArticles) {
            try {
                const parsed = JSON.parse(savedArticles);
                setTotalArticles(Array.isArray(parsed) ? parsed.length : 0);
            } catch {
                // Ignore
            }
        }
    }, []);

    const totalRevenue = websites.reduce((sum, w) => sum + (w.estimatedRevenue || 0), 0);
    const liveWebsites = websites.filter(w => w.status === 'live').length;

    return (
        <div className="space-y-6">
            {/* Overview Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-8 h-8" />
                    <h2 className="text-2xl font-bold">📊 Dashboard</h2>
                </div>
                <p className="text-indigo-100">
                    Your complete revenue portfolio at a glance.
                </p>
            </div>

            {/* Revenue Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-5 border border-neutral-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <DollarSign className="w-8 h-8 text-green-500 p-1.5 bg-green-100 rounded-lg" />
                        <span className="flex items-center text-xs text-green-600">
                            <ArrowUpRight className="w-3 h-3" />
                            +12%
                        </span>
                    </div>
                    <div className="text-2xl font-bold text-neutral-900">${totalRevenue}</div>
                    <div className="text-sm text-neutral-500">Monthly Revenue (Est.)</div>
                </div>

                <div className="bg-white rounded-xl p-5 border border-neutral-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <Globe className="w-8 h-8 text-indigo-500 p-1.5 bg-indigo-100 rounded-lg" />
                    </div>
                    <div className="text-2xl font-bold text-neutral-900">{websites.length}</div>
                    <div className="text-sm text-neutral-500">Total Websites</div>
                </div>

                <div className="bg-white rounded-xl p-5 border border-neutral-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <CheckCircle className="w-8 h-8 text-emerald-500 p-1.5 bg-emerald-100 rounded-lg" />
                    </div>
                    <div className="text-2xl font-bold text-neutral-900">{liveWebsites}</div>
                    <div className="text-sm text-neutral-500">Live &amp; Earning</div>
                </div>

                <div className="bg-white rounded-xl p-5 border border-neutral-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <FileText className="w-8 h-8 text-purple-500 p-1.5 bg-purple-100 rounded-lg" />
                    </div>
                    <div className="text-2xl font-bold text-neutral-900">{totalArticles}</div>
                    <div className="text-sm text-neutral-500">Articles Created</div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-neutral-200">
                    <h3 className="font-semibold text-neutral-900">⚡ Quick Actions</h3>
                </div>
                <div className="grid grid-cols-3 divide-x divide-neutral-200">
                    <QuickAction
                        icon={<Target className="w-6 h-6 text-amber-500" />}
                        title="Hunt Keywords"
                        description="Discover HIGH-CPC opportunities"
                        color="amber"
                    />
                    <QuickAction
                        icon={<Globe className="w-6 h-6 text-emerald-500" />}
                        title="Find Domains"
                        description="Acquire expired domains"
                        color="emerald"
                    />
                    <QuickAction
                        icon={<Zap className="w-6 h-6 text-purple-500" />}
                        title="New Website"
                        description="Launch a new site"
                        color="purple"
                    />
                </div>
            </div>

            {/* Recent Activity / Pending Items */}
            <div className="grid grid-cols-2 gap-6">
                {/* Websites Status */}
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                        <h3 className="font-semibold text-neutral-900">🌐 Website Status</h3>
                        <span className="text-xs text-neutral-500">{websites.length} total</span>
                    </div>
                    {websites.length === 0 ? (
                        <div className="p-8 text-center text-neutral-400">
                            <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No websites yet.</p>
                            <p className="text-sm">Start hunting domains!</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-neutral-100">
                            {websites.slice(0, 5).map(website => (
                                <div key={website.id} className="p-3 flex items-center justify-between hover:bg-neutral-50">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${website.status === 'live' ? 'bg-green-500' :
                                            website.status === 'building' ? 'bg-amber-500' :
                                                'bg-neutral-300'
                                            }`} />
                                        <span className="font-medium text-sm">{website.domain}</span>
                                    </div>
                                    <span className="text-sm text-green-600">${website.estimatedRevenue}/mo</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pending Tasks */}
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-neutral-200">
                        <h3 className="font-semibold text-neutral-900">📋 Pending Tasks</h3>
                    </div>
                    <div className="p-4 space-y-3">
                        <PendingItem
                            icon={<AlertCircle className="w-5 h-5 text-amber-500" />}
                            title="Configure AdSense"
                            description="Set up monetization"
                        />
                        <PendingItem
                            icon={<Clock className="w-5 h-5 text-blue-500" />}
                            title="Hunt Keywords"
                            description="Find HIGH-CPC opportunities"
                        />
                        <PendingItem
                            icon={<Target className="w-5 h-5 text-purple-500" />}
                            title="Acquire Domain"
                            description="Build your asset portfolio"
                        />
                    </div>
                </div>
            </div>

            {/* Content Strategy Analytics */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden p-6">
                <AnalyticsPanel />
            </div>
        </div>
    );
}

function QuickAction({
    icon,
    title,
    description,
    color
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
}) {
    return (
        <button className="p-4 hover:bg-neutral-50 transition-colors text-left group">
            <div className="flex items-center gap-3 mb-2">
                {icon}
                <span className="font-medium text-neutral-900 group-hover:text-indigo-600 transition-colors">
                    {title}
                </span>
                <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all ml-auto" />
            </div>
            <p className="text-sm text-neutral-500">{description}</p>
        </button>
    );
}

function PendingItem({
    icon,
    title,
    description
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer">
            {icon}
            <div className="flex-1">
                <div className="font-medium text-sm text-neutral-900">{title}</div>
                <div className="text-xs text-neutral-500">{description}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-300" />
        </div>
    );
}
