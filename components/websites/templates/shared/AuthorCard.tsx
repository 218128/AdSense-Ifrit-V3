/**
 * AuthorCard Component
 * 
 * Displays author information with photo, bio, and credentials.
 * Essential for E-E-A-T compliance.
 */

import React from 'react';

export interface Author {
    name: string;
    role: string;
    bio: string;
    avatar?: string;
    credentials?: string[];
    experience?: string;
    socialLinks?: {
        twitter?: string;
        linkedin?: string;
        website?: string;
    };
}

// Support both object pattern and spread pattern
interface AuthorCardPropsWithObject {
    author: Author;
    variant?: 'full' | 'compact' | 'inline';
    showSocial?: boolean;
    className?: string;
}

interface AuthorCardPropsSpread {
    name: string;
    role: string;
    bio?: string;
    avatar?: string;
    credentials?: string[];
    experience?: string;
    variant?: 'full' | 'compact' | 'inline';
    showSocial?: boolean;
    className?: string;
}

type AuthorCardProps = AuthorCardPropsWithObject | AuthorCardPropsSpread;

function isObjectProps(props: AuthorCardProps): props is AuthorCardPropsWithObject {
    return 'author' in props && props.author !== undefined;
}

export default function AuthorCard(props: AuthorCardProps) {
    // Normalize props - support both patterns
    const {
        variant = 'full',
        showSocial = true,
        className = ''
    } = props;

    // Extract author data from either pattern
    let author: Author;
    if (isObjectProps(props)) {
        author = props.author;
    } else {
        author = {
            name: props.name,
            role: props.role,
            bio: props.bio || '',
            avatar: props.avatar,
            credentials: props.credentials,
            experience: props.experience
        };
    }

    const initials = author.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase();

    // Inline variant for bylines
    if (variant === 'inline') {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                    {author.avatar ? (
                        <img src={author.avatar} alt={author.name} className="w-full h-full rounded-full object-cover" />
                    ) : initials}
                </div>
                <div>
                    <span className="font-medium text-gray-900">{author.name}</span>
                    <span className="text-gray-500 text-sm ml-1">• {author.role}</span>
                </div>
            </div>
        );
    }

    // Compact variant for sidebars
    if (variant === 'compact') {
        return (
            <div className={`flex items-start gap-3 p-3 bg-gray-50 rounded-lg ${className}`}>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0">
                    {author.avatar ? (
                        <img src={author.avatar} alt={author.name} className="w-full h-full rounded-full object-cover" />
                    ) : initials}
                </div>
                <div>
                    <div className="font-semibold text-gray-900">{author.name}</div>
                    <div className="text-sm text-gray-600">{author.role}</div>
                    {author.experience && (
                        <div className="text-xs text-gray-500 mt-1">{author.experience}</div>
                    )}
                </div>
            </div>
        );
    }

    // Full variant for author pages
    return (
        <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-20" />
            <div className="px-6 pb-6">
                <div className="flex items-end gap-4 -mt-10">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg">
                        {author.avatar ? (
                            <img src={author.avatar} alt={author.name} className="w-full h-full rounded-full object-cover" />
                        ) : initials}
                    </div>
                    <div className="pb-2">
                        <h3 className="text-xl font-bold text-gray-900">{author.name}</h3>
                        <p className="text-gray-600">{author.role}</p>
                    </div>
                </div>

                <p className="mt-4 text-gray-700 leading-relaxed">{author.bio}</p>

                {author.credentials && author.credentials.length > 0 && (
                    <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Credentials
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {author.credentials.map((cred, idx) => (
                                <span
                                    key={idx}
                                    className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
                                >
                                    ✓ {cred}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {author.experience && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                        <span>📅</span>
                        <span>{author.experience}</span>
                    </div>
                )}

                {showSocial && author.socialLinks && (
                    <div className="mt-4 flex gap-3">
                        {author.socialLinks.twitter && (
                            <a href={author.socialLinks.twitter} target="_blank" rel="noopener noreferrer"
                                className="text-gray-400 hover:text-blue-500 transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </a>
                        )}
                        {author.socialLinks.linkedin && (
                            <a href={author.socialLinks.linkedin} target="_blank" rel="noopener noreferrer"
                                className="text-gray-400 hover:text-blue-700 transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                            </a>
                        )}
                        {author.socialLinks.website && (
                            <a href={author.socialLinks.website} target="_blank" rel="noopener noreferrer"
                                className="text-gray-400 hover:text-green-600 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Byline variant for articles
export function AuthorByline({
    author,
    date,
    readTime
}: {
    author: Author;
    date?: string;
    readTime?: string;
}) {
    const initials = author.name.split(' ').map(n => n[0]).join('').toUpperCase();

    return (
        <div className="flex items-center gap-3 py-4 border-y border-gray-100">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                {author.avatar ? (
                    <img src={author.avatar} alt={author.name} className="w-full h-full rounded-full object-cover" />
                ) : initials}
            </div>
            <div>
                <div className="font-medium text-gray-900">{author.name}</div>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                    {date && <span>{date}</span>}
                    {date && readTime && <span>•</span>}
                    {readTime && <span>{readTime}</span>}
                </div>
            </div>
        </div>
    );
}
