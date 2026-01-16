'use client';

/**
 * Author Profile Editor
 * FSD: features/authors/components/AuthorProfileEditor.tsx
 * 
 * Comprehensive author profile editor with health score display,
 * checklist, and actionable recommendations.
 */

import React, { useState, useMemo } from 'react';
import {
    User,
    Camera,
    FileText,
    Award,
    Link2,
    Linkedin,
    Twitter,
    Globe,
    CheckCircle,
    XCircle,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Save,
    Plus,
    Trash2,
    ExternalLink,
    TrendingUp,
    Zap,
} from 'lucide-react';
import { useAuthorStore } from '../model/authorStore';
import { calculateAuthorHealthScore } from '../lib/healthScoreCalculator';
import type {
    AuthorProfile,
    AuthorCredential,
    SocialProfile,
    AuthorHealthCheckItem,
} from '../model/authorTypes';

// ============================================================================
// Health Score Display
// ============================================================================

function HealthScoreRing({ score, grade }: { score: number; grade: string }) {
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const gradeColors: Record<string, string> = {
        A: 'text-green-500',
        B: 'text-blue-500',
        C: 'text-yellow-500',
        D: 'text-orange-500',
        F: 'text-red-500',
    };

    const strokeColors: Record<string, string> = {
        A: 'stroke-green-500',
        B: 'stroke-blue-500',
        C: 'stroke-yellow-500',
        D: 'stroke-orange-500',
        F: 'stroke-red-500',
    };

    return (
        <div className="relative w-28 h-28">
            <svg className="w-28 h-28 transform -rotate-90">
                <circle
                    cx="56"
                    cy="56"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-neutral-200"
                />
                <circle
                    cx="56"
                    cy="56"
                    r="45"
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className={strokeColors[grade] || 'stroke-neutral-400'}
                    style={{
                        strokeDasharray: circumference,
                        strokeDashoffset,
                        transition: 'stroke-dashoffset 0.5s ease-in-out',
                    }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${gradeColors[grade]}`}>{grade}</span>
                <span className="text-sm text-neutral-500">{score}%</span>
            </div>
        </div>
    );
}

function HealthChecklist({ checklist }: { checklist: AuthorHealthCheckItem[] }) {
    const categories = ['identity', 'credentials', 'social', 'content'] as const;
    const categoryLabels = {
        identity: 'Identity',
        credentials: 'Credentials',
        social: 'Social Profiles',
        content: 'Content Record',
    };

    const categoryIcons = {
        identity: User,
        credentials: Award,
        social: Link2,
        content: FileText,
    };

    return (
        <div className="space-y-4">
            {categories.map(category => {
                const items = checklist.filter(c => c.category === category);
                const Icon = categoryIcons[category];
                const completed = items.filter(c => c.completed).length;

                return (
                    <div key={category} className="bg-neutral-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon className="w-4 h-4 text-neutral-500" />
                            <span className="font-medium text-neutral-700">
                                {categoryLabels[category]}
                            </span>
                            <span className="text-xs text-neutral-500 ml-auto">
                                {completed}/{items.length}
                            </span>
                        </div>
                        <div className="space-y-1">
                            {items.map(item => (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    {item.completed ? (
                                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                    ) : item.required ? (
                                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border-2 border-neutral-300 flex-shrink-0" />
                                    )}
                                    <span className={item.completed ? 'text-neutral-700' : 'text-neutral-500'}>
                                        {item.label}
                                        {item.required && !item.completed && (
                                            <span className="text-red-500 ml-1">*</span>
                                        )}
                                    </span>
                                    <span className="text-xs text-neutral-400 ml-auto">
                                        +{item.weight}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ============================================================================
// Form Sections
// ============================================================================

function IdentitySection({
    author,
    onChange
}: {
    author: Partial<AuthorProfile>;
    onChange: (updates: Partial<AuthorProfile>) => void;
}) {
    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-neutral-800 flex items-center gap-2">
                <User className="w-5 h-5" />
                Identity
            </h3>

            {/* Avatar Preview */}
            <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-neutral-200 overflow-hidden flex items-center justify-center">
                    {author.avatarUrl ? (
                        <img
                            src={author.avatarUrl}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <Camera className="w-8 h-8 text-neutral-400" />
                    )}
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Photo URL
                    </label>
                    <input
                        type="url"
                        value={author.avatarUrl || ''}
                        onChange={(e) => onChange({ avatarUrl: e.target.value })}
                        placeholder="https://example.com/photo.jpg"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Name & Headline */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={author.name || ''}
                        onChange={(e) => onChange({ name: e.target.value })}
                        placeholder="John Smith"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Professional Headline
                    </label>
                    <input
                        type="text"
                        value={author.headline || ''}
                        onChange={(e) => onChange({ headline: e.target.value })}
                        placeholder="Certified Financial Planner & Investor"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Bio */}
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Full Bio <span className="text-red-500">*</span>
                    <span className="text-xs text-neutral-500 ml-2">
                        ({(author.bio || '').split(/\s+/).filter(w => w).length}/100 words)
                    </span>
                </label>
                <textarea
                    value={author.bio || ''}
                    onChange={(e) => onChange({ bio: e.target.value })}
                    placeholder="Write a detailed bio (100+ words) establishing your expertise, experience, and credentials..."
                    rows={5}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Short Bio */}
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Short Bio (for bylines)
                </label>
                <textarea
                    value={author.shortBio || ''}
                    onChange={(e) => onChange({ shortBio: e.target.value })}
                    placeholder="1-2 sentences for article bylines"
                    rows={2}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
            </div>
        </div>
    );
}

function SocialProfilesSection({
    author,
    onChange
}: {
    author: Partial<AuthorProfile>;
    onChange: (updates: Partial<AuthorProfile>) => void;
}) {
    const [newPlatform, setNewPlatform] = useState<SocialProfile['platform']>('linkedin');
    const [newUrl, setNewUrl] = useState('');

    const socialProfiles = author.socialProfiles || [];

    const addProfile = () => {
        if (!newUrl) return;
        onChange({
            socialProfiles: [
                ...socialProfiles,
                { platform: newPlatform, url: newUrl }
            ]
        });
        setNewUrl('');
    };

    const removeProfile = (index: number) => {
        onChange({
            socialProfiles: socialProfiles.filter((_, i) => i !== index)
        });
    };

    const platformIcons: Record<string, React.ElementType> = {
        linkedin: Linkedin,
        twitter: Twitter,
        website: Globe,
        youtube: Globe,
        medium: Globe,
        github: Globe,
        other: Globe,
    };

    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-neutral-800 flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                Social Profiles
                <span className="text-xs text-neutral-500 ml-2">
                    (for E-E-A-T & auto-republishing)
                </span>
            </h3>

            {/* LinkedIn (highlighted) */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-blue-800 mb-1">
                    <Linkedin className="w-4 h-4 inline mr-1" />
                    LinkedIn Profile URL <span className="text-red-500">*</span>
                </label>
                <input
                    type="url"
                    value={author.linkedInUrl || ''}
                    onChange={(e) => onChange({ linkedInUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-blue-600 mt-1">
                    LinkedIn is essential for E-E-A-T and professional authority
                </p>
            </div>

            {/* Website */}
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Personal Website
                </label>
                <input
                    type="url"
                    value={author.websiteUrl || ''}
                    onChange={(e) => onChange({ websiteUrl: e.target.value })}
                    placeholder="https://yourwebsite.com"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Other Social Profiles */}
            <div className="space-y-2">
                {socialProfiles.map((profile, index) => {
                    const Icon = platformIcons[profile.platform] || Globe;
                    return (
                        <div key={index} className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-neutral-500" />
                            <span className="text-sm font-medium capitalize w-20">
                                {profile.platform}
                            </span>
                            <input
                                type="url"
                                value={profile.url}
                                readOnly
                                className="flex-1 px-3 py-1.5 bg-neutral-100 border border-neutral-200 rounded text-sm"
                            />
                            <button
                                onClick={() => removeProfile(index)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Add New */}
            <div className="flex items-center gap-2">
                <select
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value as SocialProfile['platform'])}
                    className="px-3 py-2 border border-neutral-300 rounded-lg"
                >
                    <option value="twitter">Twitter/X</option>
                    <option value="youtube">YouTube</option>
                    <option value="medium">Medium</option>
                    <option value="github">GitHub</option>
                    <option value="other">Other</option>
                </select>
                <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="Profile URL"
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg"
                />
                <button
                    onClick={addProfile}
                    disabled={!newUrl}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"
                >
                    <Plus className="w-4 h-4" />
                    Add
                </button>
            </div>
        </div>
    );
}

function CredentialsSection({
    author,
    onChange
}: {
    author: Partial<AuthorProfile>;
    onChange: (updates: Partial<AuthorProfile>) => void;
}) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newCredential, setNewCredential] = useState<Partial<AuthorCredential>>({
        type: 'certification',
    });

    const credentials = author.credentials || [];

    const addCredential = () => {
        if (!newCredential.title) return;
        const credential: AuthorCredential = {
            id: `cred_${Date.now()}`,
            type: newCredential.type || 'certification',
            title: newCredential.title,
            issuer: newCredential.issuer,
            year: newCredential.year,
            url: newCredential.url,
        };
        onChange({ credentials: [...credentials, credential] });
        setNewCredential({ type: 'certification' });
        setShowAddForm(false);
    };

    const removeCredential = (id: string) => {
        onChange({ credentials: credentials.filter(c => c.id !== id) });
    };

    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-neutral-800 flex items-center gap-2">
                <Award className="w-5 h-5" />
                Credentials & Qualifications
            </h3>

            {/* Existing Credentials */}
            <div className="space-y-2">
                {credentials.map(cred => (
                    <div
                        key={cred.id}
                        className="flex items-start gap-3 p-3 bg-neutral-50 rounded-lg"
                    >
                        <Award className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <div className="font-medium text-neutral-800">{cred.title}</div>
                            <div className="text-sm text-neutral-500">
                                {cred.issuer}{cred.year && ` • ${cred.year}`}
                            </div>
                            {cred.url && (
                                <a
                                    href={cred.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 flex items-center gap-1"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    Verify Credential
                                </a>
                            )}
                        </div>
                        <button
                            onClick={() => removeCredential(cred.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Add Form */}
            {showAddForm ? (
                <div className="border border-neutral-200 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-neutral-600 mb-1">Type</label>
                            <select
                                value={newCredential.type}
                                onChange={(e) => setNewCredential({
                                    ...newCredential,
                                    type: e.target.value as AuthorCredential['type']
                                })}
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                            >
                                <option value="degree">Degree</option>
                                <option value="certification">Certification</option>
                                <option value="license">License</option>
                                <option value="award">Award</option>
                                <option value="publication">Publication</option>
                                <option value="experience">Experience</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-neutral-600 mb-1">Year</label>
                            <input
                                type="number"
                                value={newCredential.year || ''}
                                onChange={(e) => setNewCredential({
                                    ...newCredential,
                                    year: parseInt(e.target.value)
                                })}
                                placeholder="2020"
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={newCredential.title || ''}
                            onChange={(e) => setNewCredential({ ...newCredential, title: e.target.value })}
                            placeholder="e.g., Certified Financial Planner (CFP)"
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">Issuer</label>
                        <input
                            type="text"
                            value={newCredential.issuer || ''}
                            onChange={(e) => setNewCredential({ ...newCredential, issuer: e.target.value })}
                            placeholder="e.g., CFP Board"
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                            Verification URL
                            <span className="text-neutral-400 ml-1">(for E-E-A-T)</span>
                        </label>
                        <input
                            type="url"
                            value={newCredential.url || ''}
                            onChange={(e) => setNewCredential({ ...newCredential, url: e.target.value })}
                            placeholder="https://cfp.net/verify/12345"
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={addCredential}
                            disabled={!newCredential.title}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-1 text-sm"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Save Credential
                        </button>
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full py-2 border-2 border-dashed border-neutral-300 rounded-lg text-neutral-500 hover:border-blue-300 hover:text-blue-600 flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Credential
                </button>
            )}
        </div>
    );
}

// ============================================================================
// Main Editor Component
// ============================================================================

interface AuthorProfileEditorProps {
    authorId?: string;                   // Edit existing or create new
    onSave?: (author: AuthorProfile) => void;
    onCancel?: () => void;
}

export function AuthorProfileEditor({ authorId, onSave, onCancel }: AuthorProfileEditorProps) {
    const { getAuthor, createAuthor, updateAuthor } = useAuthorStore();

    const existingAuthor = authorId ? getAuthor(authorId) : undefined;

    const [formData, setFormData] = useState<Partial<AuthorProfile>>(
        existingAuthor || {
            name: '',
            headline: '',
            bio: '',
            shortBio: '',
            primaryNiche: '',
            credentials: [],
            expertise: [],
            socialProfiles: [],
            eeatSignals: {
                firstHandPhrases: [],
                personalStories: [],
                yearsStatement: '',
                credentialMentions: [],
                technicalInsights: [],
                publicationLinks: [],
                socialProofPhrases: [],
                disclosures: [],
                updateCommitment: '',
            },
        }
    );

    // Calculate health score for preview
    const healthScore = useMemo(() => {
        if (!formData.name) return null;

        // Create a mock complete author for health calculation
        const mockAuthor: AuthorProfile = {
            id: authorId || 'preview',
            name: formData.name || '',
            slug: (formData.name || '').toLowerCase().replace(/\s+/g, '-'),
            headline: formData.headline || '',
            bio: formData.bio || '',
            shortBio: formData.shortBio || '',
            primaryNiche: formData.primaryNiche || '',
            avatarUrl: formData.avatarUrl,
            credentials: formData.credentials || [],
            expertise: formData.expertise || [],
            socialProfiles: formData.socialProfiles || [],
            websiteUrl: formData.websiteUrl,
            linkedInUrl: formData.linkedInUrl,
            eeatSignals: formData.eeatSignals || {
                firstHandPhrases: [],
                personalStories: [],
                yearsStatement: '',
                credentialMentions: [],
                technicalInsights: [],
                publicationLinks: [],
                socialProofPhrases: [],
                disclosures: [],
                updateCommitment: '',
            },
            assignedSiteIds: [],
            wpAuthorMappings: [],
            verificationStatus: 'unverified',
            articlesPublished: existingAuthor?.articlesPublished || 0,
            totalWordCount: existingAuthor?.totalWordCount || 0,
            averageEEATScore: existingAuthor?.averageEEATScore,
            createdAt: existingAuthor?.createdAt || Date.now(),
            updatedAt: Date.now(),
        };

        return calculateAuthorHealthScore(mockAuthor);
    }, [formData, authorId, existingAuthor]);

    const handleChange = (updates: Partial<AuthorProfile>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleSave = () => {
        if (!formData.name) return;

        if (authorId && existingAuthor) {
            updateAuthor(authorId, formData);
            onSave?.(getAuthor(authorId)!);
        } else {
            const newAuthor = createAuthor({
                name: formData.name,
                headline: formData.headline || '',
                bio: formData.bio || '',
                shortBio: formData.shortBio || '',
                primaryNiche: formData.primaryNiche || '',
                avatarUrl: formData.avatarUrl,
                websiteUrl: formData.websiteUrl,
                linkedInUrl: formData.linkedInUrl,
            });
            onSave?.(newAuthor);
        }
    };

    return (
        <div className="grid grid-cols-3 gap-6">
            {/* Main Form (2 columns) */}
            <div className="col-span-2 space-y-6">
                <IdentitySection author={formData} onChange={handleChange} />
                <SocialProfilesSection author={formData} onChange={handleChange} />
                <CredentialsSection author={formData} onChange={handleChange} />

                {/* Save Actions */}
                <div className="flex gap-3 pt-4 border-t">
                    <button
                        onClick={handleSave}
                        disabled={!formData.name}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {authorId ? 'Save Changes' : 'Create Author'}
                    </button>
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="px-6 py-2.5 border border-neutral-300 rounded-lg hover:bg-neutral-50"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>

            {/* Health Score Sidebar */}
            <div className="space-y-4">
                <div className="bg-white border border-neutral-200 rounded-xl p-4 sticky top-4">
                    <h3 className="font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Author Health Score
                    </h3>

                    {healthScore ? (
                        <>
                            <div className="flex justify-center mb-4">
                                <HealthScoreRing
                                    score={healthScore.score}
                                    grade={healthScore.grade}
                                />
                            </div>

                            {/* Status Flags */}
                            <div className="space-y-2 mb-4">
                                <div className={`flex items-center gap-2 text-sm ${healthScore.isMinimumViable ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {healthScore.isMinimumViable ? (
                                        <CheckCircle className="w-4 h-4" />
                                    ) : (
                                        <XCircle className="w-4 h-4" />
                                    )}
                                    Minimum Viable Author
                                </div>
                                <div className={`flex items-center gap-2 text-sm ${healthScore.isEEATReady ? 'text-green-600' : 'text-yellow-600'
                                    }`}>
                                    {healthScore.isEEATReady ? (
                                        <CheckCircle className="w-4 h-4" />
                                    ) : (
                                        <AlertTriangle className="w-4 h-4" />
                                    )}
                                    E-E-A-T Ready
                                </div>
                                <div className={`flex items-center gap-2 text-sm ${healthScore.isRepublishReady ? 'text-green-600' : 'text-neutral-500'
                                    }`}>
                                    {healthScore.isRepublishReady ? (
                                        <Zap className="w-4 h-4" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border-2 border-neutral-300" />
                                    )}
                                    Republish Ready
                                </div>
                            </div>

                            {/* Checklist */}
                            <HealthChecklist checklist={healthScore.checklist} />

                            {/* Top Recommendation */}
                            {healthScore.recommendations.length > 0 && (
                                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-xs font-medium text-blue-800 mb-1">
                                        Next Action
                                    </p>
                                    <p className="text-sm text-blue-700">
                                        {healthScore.recommendations[0].action}
                                    </p>
                                    <p className="text-xs text-blue-500 mt-1">
                                        {healthScore.recommendations[0].impact}
                                    </p>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-neutral-500 text-center py-8">
                            Enter author name to see health score
                        </p>
                    )}
                </div>

                {/* WP Site Sync Section */}
                {authorId && existingAuthor && (
                    <WPSiteSyncSection author={existingAuthor} />
                )}
            </div>
        </div>
    );
}

// ============================================================================
// WP Site Sync Section
// ============================================================================

function WPSiteSyncSection({ author }: { author: AuthorProfile }) {
    const [syncing, setSyncing] = React.useState<Record<string, boolean>>({});
    const [results, setResults] = React.useState<Record<string, { success: boolean; message: string }>>({});

    // Import WP sites from wordpress feature
    const [wpSites, setWpSites] = React.useState<{ id: string; name: string; url: string }[]>([]);

    React.useEffect(() => {
        // Dynamically import to avoid circular deps
        import('@/features/wordpress/model/wpSiteStore').then(({ useWPSitesStore }) => {
            const sites = Object.values(useWPSitesStore.getState().sites);
            setWpSites(sites.map(s => ({ id: s.id, name: s.name, url: s.url })));
        });
    }, []);

    const handleSync = async (siteId: string, siteName: string) => {
        setSyncing(prev => ({ ...prev, [siteId]: true }));

        try {
            const { syncAuthorToSite } = await import('../lib/wpAuthorSync');
            const { useWPSitesStore } = await import('@/features/wordpress/model/wpSiteStore');
            const site = useWPSitesStore.getState().sites[siteId];

            if (!site) {
                setResults(prev => ({ ...prev, [siteId]: { success: false, message: 'Site not found' } }));
                return;
            }

            const result = await syncAuthorToSite(author, site);
            setResults(prev => ({ ...prev, [siteId]: { success: result.success, message: result.message } }));
        } catch (error) {
            setResults(prev => ({ ...prev, [siteId]: { success: false, message: 'Sync failed' } }));
        } finally {
            setSyncing(prev => ({ ...prev, [siteId]: false }));
        }
    };

    // Check which sites are already synced
    const isSynced = (siteId: string) => {
        return author.wpAuthorMappings.some(m => m.siteId === siteId);
    };

    const getMapping = (siteId: string) => {
        return author.wpAuthorMappings.find(m => m.siteId === siteId);
    };

    if (wpSites.length === 0) {
        return null;
    }

    return (
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <h3 className="font-semibold text-neutral-800 mb-3 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Sync to WP Sites
            </h3>
            <p className="text-xs text-neutral-500 mb-3">
                Create WP users so posts show correct author
            </p>

            <div className="space-y-2">
                {wpSites.map(site => {
                    const synced = isSynced(site.id);
                    const mapping = getMapping(site.id);
                    const result = results[site.id];

                    return (
                        <div key={site.id} className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-neutral-700 truncate">
                                    {site.name}
                                </div>
                                {synced && mapping && (
                                    <div className="text-xs text-green-600 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        WP User ID: {mapping.wpUserId}
                                    </div>
                                )}
                                {result && !synced && (
                                    <div className={`text-xs ${result.success ? 'text-green-600' : 'text-red-500'}`}>
                                        {result.message}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => handleSync(site.id, site.name)}
                                disabled={syncing[site.id] || synced}
                                className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 ${synced
                                    ? 'bg-green-100 text-green-700 cursor-default'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                                    }`}
                            >
                                {syncing[site.id] ? (
                                    <>
                                        <span className="animate-spin">⟳</span>
                                        Syncing...
                                    </>
                                ) : synced ? (
                                    <>
                                        <CheckCircle className="w-3 h-3" />
                                        Synced
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-3 h-3" />
                                        Sync
                                    </>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
