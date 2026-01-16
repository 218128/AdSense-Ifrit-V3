'use client';

/**
 * Author Manager Component
 * FSD: features/authors/components/AuthorManager.tsx
 * 
 * Full CRUD interface for managing author profiles.
 * Includes credential management and expertise configuration.
 */

import React, { useState } from 'react';
import {
    Plus,
    Edit,
    Trash2,
    User,
    Award,
    BookOpen,
    Check,
    X,
    ExternalLink,
    Shield,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { useAuthorStore } from '../model/authorStore';
import type {
    AuthorProfile,
    CreateAuthorInput,
    AuthorCredential,
    AuthorExpertise,
    ExpertiseLevel
} from '../model/authorTypes';

// ============================================================================
// Author Form
// ============================================================================

interface AuthorFormProps {
    author?: AuthorProfile;
    onSave: (data: CreateAuthorInput) => void;
    onCancel: () => void;
}

function AuthorForm({ author, onSave, onCancel }: AuthorFormProps) {
    const [formData, setFormData] = useState<CreateAuthorInput>({
        name: author?.name || '',
        headline: author?.headline || '',
        bio: author?.bio || '',
        shortBio: author?.shortBio || '',
        primaryNiche: author?.primaryNiche || '',
        avatarUrl: author?.avatarUrl || '',
        email: author?.email || '',
        websiteUrl: author?.websiteUrl || '',
        linkedInUrl: author?.linkedInUrl || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Name *
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                        required
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="John Smith"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Primary Niche *
                    </label>
                    <input
                        type="text"
                        value={formData.primaryNiche}
                        onChange={e => setFormData(d => ({ ...d, primaryNiche: e.target.value }))}
                        required
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Technology"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Headline *
                </label>
                <input
                    type="text"
                    value={formData.headline}
                    onChange={e => setFormData(d => ({ ...d, headline: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Senior Software Engineer & AI Expert"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Short Bio (for bylines) *
                </label>
                <textarea
                    value={formData.shortBio}
                    onChange={e => setFormData(d => ({ ...d, shortBio: e.target.value }))}
                    required
                    rows={2}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="John is a senior software engineer with 10+ years of experience in AI and machine learning."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Full Bio
                </label>
                <textarea
                    value={formData.bio}
                    onChange={e => setFormData(d => ({ ...d, bio: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Detailed biography for author page..."
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Avatar URL
                    </label>
                    <input
                        type="url"
                        value={formData.avatarUrl}
                        onChange={e => setFormData(d => ({ ...d, avatarUrl: e.target.value }))}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://example.com/avatar.jpg"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Email (for Gravatar)
                    </label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData(d => ({ ...d, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="john@example.com"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Website URL
                    </label>
                    <input
                        type="url"
                        value={formData.websiteUrl}
                        onChange={e => setFormData(d => ({ ...d, websiteUrl: e.target.value }))}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://johnsmith.com"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        LinkedIn URL
                    </label>
                    <input
                        type="url"
                        value={formData.linkedInUrl}
                        onChange={e => setFormData(d => ({ ...d, linkedInUrl: e.target.value }))}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://linkedin.com/in/johnsmith"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    {author ? 'Update Author' : 'Create Author'}
                </button>
            </div>
        </form>
    );
}

// ============================================================================
// Credential Form
// ============================================================================

interface CredentialFormProps {
    onAdd: (credential: Omit<AuthorCredential, 'id'>) => void;
    onCancel: () => void;
    initialData?: Omit<AuthorCredential, 'id'>;
}

function CredentialForm({ onAdd, onCancel, initialData }: CredentialFormProps) {
    const [data, setData] = useState<Omit<AuthorCredential, 'id'>>(initialData || {
        type: 'experience',
        title: '',
        issuer: '',
        year: undefined,
        url: '',
        description: '',
    });

    return (
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Type</label>
                    <select
                        value={data.type}
                        onChange={e => setData(d => ({ ...d, type: e.target.value as AuthorCredential['type'] }))}
                        className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded"
                    >
                        <option value="degree">Degree</option>
                        <option value="certification">Certification</option>
                        <option value="experience">Experience</option>
                        <option value="publication">Publication</option>
                        <option value="award">Award</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Year</label>
                    <input
                        type="number"
                        value={data.year || ''}
                        onChange={e => setData(d => ({ ...d, year: parseInt(e.target.value) || undefined }))}
                        className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded"
                        placeholder="2020"
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Title *</label>
                <input
                    type="text"
                    value={data.title}
                    onChange={e => setData(d => ({ ...d, title: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded"
                    placeholder="Bachelor of Science in Computer Science"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Issuer/Institution</label>
                <input
                    type="text"
                    value={data.issuer}
                    onChange={e => setData(d => ({ ...d, issuer: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded"
                    placeholder="MIT"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                    Verification URL <span className="text-neutral-400">(for E-E-A-T)</span>
                </label>
                <input
                    type="url"
                    value={data.url || ''}
                    onChange={e => setData(d => ({ ...d, url: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded"
                    placeholder="https://linkedin.com/in/yourprofile/details/education"
                />
            </div>
            <div className="flex gap-2">
                <button
                    onClick={onCancel}
                    className="px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-200 rounded"
                >
                    Cancel
                </button>
                <button
                    onClick={() => data.title && onAdd(data)}
                    disabled={!data.title}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                    {initialData ? 'Update' : 'Add'}
                </button>
            </div>
        </div>
    );
}

// ============================================================================
// Expertise Form
// ============================================================================

interface ExpertiseFormProps {
    onAdd: (expertise: AuthorExpertise) => void;
    onCancel: () => void;
}

function ExpertiseForm({ onAdd, onCancel }: ExpertiseFormProps) {
    const [data, setData] = useState<AuthorExpertise>({
        niche: '',
        level: 'intermediate',
        yearsExperience: 3,
        credentials: [],
        topics: [],
    });
    const [topicsInput, setTopicsInput] = useState('');

    const handleAdd = () => {
        const topics = topicsInput.split(',').map(t => t.trim()).filter(Boolean);
        onAdd({ ...data, topics });
    };

    return (
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Niche *</label>
                    <input
                        type="text"
                        value={data.niche}
                        onChange={e => setData(d => ({ ...d, niche: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded"
                        placeholder="Technology"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Level</label>
                    <select
                        value={data.level}
                        onChange={e => setData(d => ({ ...d, level: e.target.value as ExpertiseLevel }))}
                        className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded"
                    >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                        <option value="expert">Expert</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Years</label>
                    <input
                        type="number"
                        value={data.yearsExperience}
                        onChange={e => setData(d => ({ ...d, yearsExperience: parseInt(e.target.value) || 0 }))}
                        className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded"
                        min={0}
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Topics (comma-separated)</label>
                <input
                    type="text"
                    value={topicsInput}
                    onChange={e => setTopicsInput(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded"
                    placeholder="AI, Machine Learning, Python"
                />
            </div>
            <div className="flex gap-2">
                <button onClick={onCancel} className="px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-200 rounded">
                    Cancel
                </button>
                <button
                    onClick={handleAdd}
                    disabled={!data.niche}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                    Add
                </button>
            </div>
        </div>
    );
}

// ============================================================================
// Author Card
// ============================================================================

interface AuthorCardProps {
    author: AuthorProfile;
    onEdit: () => void;
    onDelete: () => void;
    expanded?: boolean;
    onToggleExpand?: () => void;
}

function AuthorCard({ author, onEdit, onDelete, expanded, onToggleExpand }: AuthorCardProps) {
    const store = useAuthorStore();
    const [showCredentialForm, setShowCredentialForm] = useState(false);
    const [editingCredential, setEditingCredential] = useState<AuthorCredential | null>(null);
    const [showExpertiseForm, setShowExpertiseForm] = useState(false);

    return (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 flex items-start gap-4">
                <div className="flex-shrink-0">
                    {author.avatarUrl ? (
                        <img
                            src={author.avatarUrl}
                            alt={author.name}
                            className="w-14 h-14 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                            {author.name.charAt(0)}
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-neutral-900 truncate">{author.name}</h3>
                        {author.verificationStatus === 'verified' && (
                            <span title="Verified"><Shield className="w-4 h-4 text-blue-500" /></span>
                        )}
                    </div>
                    <p className="text-sm text-neutral-600">{author.headline}</p>
                    <p className="text-xs text-neutral-500 mt-1">
                        {author.articlesPublished} articles • {author.primaryNiche}
                        {author.averageEEATScore && ` • E-E-A-T: ${author.averageEEATScore}`}
                    </p>
                </div>

                <div className="flex-shrink-0 flex items-center gap-1">
                    <button
                        onClick={onEdit}
                        className="p-2 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit author"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete author"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onToggleExpand}
                        className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                    >
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-neutral-100 pt-4">
                    {/* Bio */}
                    <div>
                        <p className="text-sm text-neutral-600">{author.shortBio}</p>
                    </div>

                    {/* Credentials */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                                <Award className="w-4 h-4" /> Credentials
                            </h4>
                            <button
                                onClick={() => setShowCredentialForm(true)}
                                className="text-xs text-blue-600 hover:text-blue-700"
                            >
                                + Add
                            </button>
                        </div>
                        {(showCredentialForm || editingCredential) && (
                            <CredentialForm
                                initialData={editingCredential || undefined}
                                onAdd={cred => {
                                    if (editingCredential) {
                                        store.removeCredential(author.id, editingCredential.id);
                                    }
                                    store.addCredential(author.id, cred);
                                    setShowCredentialForm(false);
                                    setEditingCredential(null);
                                }}
                                onCancel={() => { setShowCredentialForm(false); setEditingCredential(null); }}
                            />
                        )}
                        {author.credentials.length > 0 ? (
                            <div className="space-y-1">
                                {author.credentials.map(cred => (
                                    <div
                                        key={cred.id}
                                        className="flex items-center justify-between text-sm py-1 px-2 bg-neutral-50 rounded"
                                    >
                                        <span>
                                            <span className="font-medium">{cred.title}</span>
                                            {cred.issuer && <span className="text-neutral-500"> • {cred.issuer}</span>}
                                            {cred.year && <span className="text-neutral-400"> ({cred.year})</span>}
                                            {cred.url && <a href={cred.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-xs ml-2">✓ verified</a>}
                                        </span>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => setEditingCredential(cred)}
                                                className="text-blue-500 hover:text-blue-700 p-1"
                                                title="Edit"
                                            >
                                                <Edit className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => store.removeCredential(author.id, cred.id)}
                                                className="text-red-500 hover:text-red-700 p-1"
                                                title="Delete"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : !showCredentialForm && (
                            <p className="text-xs text-neutral-400">No credentials added yet</p>
                        )}
                    </div>

                    {/* Expertise */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                                <BookOpen className="w-4 h-4" /> Expertise
                            </h4>
                            <button
                                onClick={() => setShowExpertiseForm(true)}
                                className="text-xs text-blue-600 hover:text-blue-700"
                            >
                                + Add
                            </button>
                        </div>
                        {showExpertiseForm && (
                            <ExpertiseForm
                                onAdd={exp => {
                                    store.addExpertise(author.id, exp);
                                    setShowExpertiseForm(false);
                                }}
                                onCancel={() => setShowExpertiseForm(false)}
                            />
                        )}
                        {author.expertise.length > 0 ? (
                            <div className="space-y-1">
                                {author.expertise.map(exp => (
                                    <div
                                        key={exp.niche}
                                        className="flex items-center justify-between text-sm py-1 px-2 bg-neutral-50 rounded"
                                    >
                                        <span>
                                            <span className="font-medium">{exp.niche}</span>
                                            <span className="text-neutral-500"> • {exp.level} • {exp.yearsExperience}y</span>
                                            {exp.topics.length > 0 && (
                                                <span className="text-neutral-400 text-xs ml-2">
                                                    ({exp.topics.slice(0, 3).join(', ')})
                                                </span>
                                            )}
                                        </span>
                                        <button
                                            onClick={() => store.removeExpertise(author.id, exp.niche)}
                                            className="text-red-500 hover:text-red-700 p-1"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : !showExpertiseForm && (
                            <p className="text-xs text-neutral-400">No expertise areas added yet</p>
                        )}
                    </div>

                    {/* Links */}
                    {
                        (author.websiteUrl || author.linkedInUrl) && (
                            <div className="flex gap-3 pt-2">
                                {author.websiteUrl && (
                                    <a
                                        href={author.websiteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                    >
                                        Website <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                                {author.linkedInUrl && (
                                    <a
                                        href={author.linkedInUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                    >
                                        LinkedIn <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>
                        )
                    }
                </div >
            )
            }
        </div >
    );
}

// ============================================================================
// Main Component
// ============================================================================

export function AuthorManager() {
    const { authors, createAuthor, updateAuthor, deleteAuthor } = useAuthorStore();
    const [showForm, setShowForm] = useState(false);
    const [editingAuthor, setEditingAuthor] = useState<AuthorProfile | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleSave = (data: CreateAuthorInput) => {
        if (editingAuthor) {
            updateAuthor(editingAuthor.id, data);
        } else {
            createAuthor(data);
        }
        setShowForm(false);
        setEditingAuthor(null);
    };

    const handleEdit = (author: AuthorProfile) => {
        setEditingAuthor(author);
        setShowForm(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this author?')) {
            deleteAuthor(id);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-neutral-900">Author Profiles</h2>
                    <p className="text-sm text-neutral-500">
                        Manage author identities for E-E-A-T compliance
                    </p>
                </div>
                <button
                    onClick={() => { setEditingAuthor(null); setShowForm(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Author
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                        <h3 className="text-lg font-semibold mb-4">
                            {editingAuthor ? 'Edit Author' : 'Create New Author'}
                        </h3>
                        <AuthorForm
                            author={editingAuthor || undefined}
                            onSave={handleSave}
                            onCancel={() => { setShowForm(false); setEditingAuthor(null); }}
                        />
                    </div>
                </div>
            )}

            {/* Authors List */}
            {authors.length > 0 ? (
                <div className="space-y-3">
                    {authors.map(author => (
                        <AuthorCard
                            key={author.id}
                            author={author}
                            onEdit={() => handleEdit(author)}
                            onDelete={() => handleDelete(author.id)}
                            expanded={expandedId === author.id}
                            onToggleExpand={() => setExpandedId(
                                expandedId === author.id ? null : author.id
                            )}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-neutral-50 rounded-xl border-2 border-dashed border-neutral-200">
                    <User className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
                    <h3 className="font-medium text-neutral-600 mb-1">No Authors Yet</h3>
                    <p className="text-sm text-neutral-400 mb-4">
                        Create author profiles to build E-E-A-T authority
                    </p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Create First Author
                    </button>
                </div>
            )}
        </div>
    );
}
