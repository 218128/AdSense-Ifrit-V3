'use client';

/**
 * AdSense Pre-Application Wizard
 * FSD: components/adsense/PreApplicationWizard.tsx
 * 
 * Step-by-step wizard to check site readiness before applying to AdSense.
 */

import { useState, useEffect } from 'react';
import {
    CheckCircle, XCircle, AlertTriangle, ArrowRight, ArrowLeft,
    FileText, Shield, Gauge, Globe, Layout, Settings, Rocket
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface CheckItem {
    id: string;
    label: string;
    description: string;
    passed: boolean | null; // null = not checked yet
    critical: boolean;
}

interface CheckCategory {
    id: string;
    title: string;
    icon: React.ReactNode;
    items: CheckItem[];
}

interface WizardProps {
    siteUrl?: string;
    publisherId?: string;
    onComplete?: (passed: boolean, results: CheckCategory[]) => void;
}

// ============================================================================
// Component
// ============================================================================

export function PreApplicationWizard({ siteUrl, publisherId, onComplete }: WizardProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [categories, setCategories] = useState<CheckCategory[]>([]);
    const [isChecking, setIsChecking] = useState(false);

    // Initialize categories
    useEffect(() => {
        setCategories([
            {
                id: 'content',
                title: 'Content Quality',
                icon: <FileText className="w-5 h-5" />,
                items: [
                    { id: 'post-count', label: '15+ Posts Published', description: 'Minimum content volume', passed: null, critical: true },
                    { id: 'word-count', label: '500+ Words Per Post', description: 'No thin content', passed: null, critical: true },
                    { id: 'unique', label: 'Original Content', description: 'No copied/duplicate content', passed: null, critical: true },
                    { id: 'images', label: 'Posts Have Images', description: 'Visual content included', passed: null, critical: false },
                ],
            },
            {
                id: 'legal',
                title: 'Legal Pages',
                icon: <Shield className="w-5 h-5" />,
                items: [
                    { id: 'privacy', label: 'Privacy Policy', description: 'Required by AdSense', passed: null, critical: true },
                    { id: 'terms', label: 'Terms of Service', description: 'Recommended', passed: null, critical: false },
                    { id: 'about', label: 'About Page', description: 'Establishes credibility', passed: null, critical: true },
                    { id: 'contact', label: 'Contact Page', description: 'Required for trust', passed: null, critical: true },
                ],
            },
            {
                id: 'technical',
                title: 'Technical Requirements',
                icon: <Gauge className="w-5 h-5" />,
                items: [
                    { id: 'ssl', label: 'HTTPS Enabled', description: 'SSL certificate active', passed: null, critical: true },
                    { id: 'mobile', label: 'Mobile Friendly', description: 'Responsive design', passed: null, critical: true },
                    { id: 'speed', label: 'Fast Load Time', description: 'PageSpeed 50+', passed: null, critical: false },
                    { id: 'sitemap', label: 'XML Sitemap', description: 'At /sitemap.xml', passed: null, critical: false },
                ],
            },
            {
                id: 'structure',
                title: 'Site Structure',
                icon: <Layout className="w-5 h-5" />,
                items: [
                    { id: 'navigation', label: 'Clear Navigation', description: 'Menu is accessible', passed: null, critical: true },
                    { id: 'categories', label: '3+ Categories', description: 'Content organized', passed: null, critical: false },
                    { id: 'homepage', label: 'Professional Homepage', description: 'Good first impression', passed: null, critical: false },
                ],
            },
            {
                id: 'branding',
                title: 'Branding & Trust',
                icon: <Globe className="w-5 h-5" />,
                items: [
                    { id: 'domain', label: 'Custom Domain', description: 'Not free subdomain', passed: null, critical: true },
                    { id: 'logo', label: 'Site Logo', description: 'Professional branding', passed: null, critical: false },
                    { id: 'age', label: 'Domain Age 30+ Days', description: 'Some regions require more', passed: null, critical: false },
                ],
            },
            {
                id: 'monetization',
                title: 'Monetization Setup',
                icon: <Settings className="w-5 h-5" />,
                items: [
                    { id: 'ads-txt', label: 'ads.txt Configured', description: 'At /ads.txt', passed: null, critical: true },
                    { id: 'publisher-id', label: 'Publisher ID Set', description: 'In app settings', passed: null, critical: true },
                ],
            },
        ]);
    }, []);

    const currentCategory = categories[currentStep];
    const totalSteps = categories.length;

    // Toggle check status (manual for now)
    const toggleCheck = (itemId: string) => {
        setCategories(prev => prev.map(cat => {
            if (cat.id === currentCategory?.id) {
                return {
                    ...cat,
                    items: cat.items.map(item =>
                        item.id === itemId
                            ? { ...item, passed: item.passed === true ? false : true }
                            : item
                    ),
                };
            }
            return cat;
        }));
    };

    const nextStep = () => {
        if (currentStep < totalSteps - 1) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const finishWizard = () => {
        const criticalPassed = categories.every(cat =>
            cat.items.filter(i => i.critical).every(i => i.passed === true)
        );
        onComplete?.(criticalPassed, categories);
    };

    // Calculate progress
    const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);
    const checkedItems = categories.reduce((sum, cat) =>
        sum + cat.items.filter(i => i.passed !== null).length, 0
    );
    const passedItems = categories.reduce((sum, cat) =>
        sum + cat.items.filter(i => i.passed === true).length, 0
    );
    const criticalItems = categories.reduce((sum, cat) =>
        sum + cat.items.filter(i => i.critical).length, 0
    );
    const criticalPassed = categories.reduce((sum, cat) =>
        sum + cat.items.filter(i => i.critical && i.passed === true).length, 0
    );

    if (!currentCategory) return null;

    return (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-lg max-w-2xl mx-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-100 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-t-2xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Rocket className="w-6 h-6 text-violet-600" />
                        <h2 className="text-lg font-bold text-neutral-900">AdSense Pre-Application Checklist</h2>
                    </div>
                    <span className="text-sm text-neutral-500">
                        Step {currentStep + 1} of {totalSteps}
                    </span>
                </div>
                {/* Progress Bar */}
                <div className="mt-3 h-2 bg-white rounded-full overflow-hidden">
                    <div
                        className="h-full bg-violet-500 rounded-full transition-all"
                        style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                    />
                </div>
            </div>

            {/* Step Content */}
            <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center text-violet-600">
                        {currentCategory.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-900">{currentCategory.title}</h3>
                </div>

                {/* Checklist Items */}
                <div className="space-y-3">
                    {currentCategory.items.map(item => (
                        <button
                            key={item.id}
                            onClick={() => toggleCheck(item.id)}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${item.passed === true
                                    ? 'border-green-300 bg-green-50'
                                    : item.passed === false
                                        ? 'border-red-300 bg-red-50'
                                        : 'border-neutral-200 bg-neutral-50 hover:border-violet-300'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {item.passed === true ? (
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                    ) : item.passed === false ? (
                                        <XCircle className="w-5 h-5 text-red-500" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full border-2 border-neutral-300" />
                                    )}
                                    <div>
                                        <span className="font-medium text-neutral-900">{item.label}</span>
                                        {item.critical && (
                                            <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                                                Required
                                            </span>
                                        )}
                                        <p className="text-sm text-neutral-500">{item.description}</p>
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 rounded-b-2xl">
                <div className="flex items-center justify-between">
                    <button
                        onClick={prevStep}
                        disabled={currentStep === 0}
                        className="flex items-center gap-2 px-4 py-2 text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>

                    <div className="text-sm text-neutral-500">
                        {passedItems}/{totalItems} passed • {criticalPassed}/{criticalItems} critical
                    </div>

                    {currentStep < totalSteps - 1 ? (
                        <button
                            onClick={nextStep}
                            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                        >
                            Next
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={finishWizard}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            <Rocket className="w-4 h-4" />
                            Complete Review
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
