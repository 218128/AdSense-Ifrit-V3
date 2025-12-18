'use client';

/**
 * Social Share Modal
 * 
 * Quick sharing to Twitter and LinkedIn with pre-filled content.
 * Uses Web Share API where available, falls back to share URLs.
 */

import { useState } from 'react';
import { X, Twitter, Linkedin, Link2, Check, Share2, Copy } from 'lucide-react';

interface SocialShareModalProps {
    articleTitle: string;
    articleUrl: string;
    articleExcerpt?: string;
    onClose: () => void;
}

export default function SocialShareModal({
    articleTitle,
    articleUrl,
    articleExcerpt = '',
    onClose
}: SocialShareModalProps) {
    const [copied, setCopied] = useState(false);

    const shareText = articleExcerpt
        ? `${articleTitle}\n\n${articleExcerpt.slice(0, 200)}...`
        : articleTitle;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(articleUrl)}`;

    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(articleUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: articleTitle,
                    text: articleExcerpt,
                    url: articleUrl
                });
            } catch (err) {
                // User cancelled or error
                console.log('Share cancelled or failed:', err);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <div className="flex items-center gap-2">
                        <Share2 className="w-5 h-5" />
                        <h2 className="text-lg font-semibold">Share Article</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Article Preview */}
                    <div className="bg-neutral-50 rounded-lg p-3">
                        <h4 className="font-medium text-neutral-800 line-clamp-2">{articleTitle}</h4>
                        <p className="text-xs text-neutral-500 mt-1 truncate">{articleUrl}</p>
                    </div>

                    {/* Share Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        <a
                            href={twitterUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-xl hover:bg-neutral-800 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                            X / Twitter
                        </a>
                        <a
                            href={linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0077B5] text-white rounded-xl hover:bg-[#006699] transition-colors"
                        >
                            <Linkedin className="w-5 h-5" />
                            LinkedIn
                        </a>
                    </div>

                    {/* Copy Link */}
                    <button
                        onClick={handleCopyLink}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
                    >
                        {copied ? (
                            <>
                                <Check className="w-5 h-5 text-green-600" />
                                <span className="text-green-600">Copied!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-5 h-5" />
                                Copy Link
                            </>
                        )}
                    </button>

                    {/* Native Share (if available) */}
                    {typeof navigator !== 'undefined' && 'share' in navigator && (
                        <button
                            onClick={handleNativeShare}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neutral-100 rounded-xl hover:bg-neutral-200 transition-colors"
                        >
                            <Share2 className="w-5 h-5" />
                            More Options...
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
