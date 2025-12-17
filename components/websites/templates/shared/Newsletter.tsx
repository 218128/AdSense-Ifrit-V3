/**
 * Newsletter Component
 * 
 * Email subscription form for building audience.
 * Supports both inline and popup variants.
 */

'use client';

import React, { useState } from 'react';

interface NewsletterProps {
    title?: string;
    description?: string;
    placeholder?: string;
    buttonText?: string;
    variant?: 'inline' | 'card' | 'banner';
    primaryColor?: string;
    onSubscribe?: (email: string) => Promise<void>;
    className?: string;
}

export default function Newsletter({
    title = 'Stay Updated',
    description = 'Get the latest articles delivered straight to your inbox.',
    placeholder = 'Enter your email',
    buttonText = 'Subscribe',
    variant = 'card',
    primaryColor = '#2563eb',
    onSubscribe,
    className = ''
}: NewsletterProps) {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !email.includes('@')) {
            setStatus('error');
            setMessage('Please enter a valid email');
            return;
        }

        setStatus('loading');

        try {
            if (onSubscribe) {
                await onSubscribe(email);
            } else {
                // Simulate subscription
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            setStatus('success');
            setMessage('Thanks for subscribing! 🎉');
            setEmail('');
        } catch (err) {
            setStatus('error');
            setMessage('Something went wrong. Please try again.');
        }
    };

    // Banner variant - full width
    if (variant === 'banner') {
        return (
            <div
                className={`py-8 px-4 ${className}`}
                style={{ backgroundColor: primaryColor }}
            >
                <div className="max-w-4xl mx-auto text-center text-white">
                    <h3 className="text-xl font-bold mb-2">{title}</h3>
                    <p className="text-white/80 mb-4">{description}</p>

                    {status === 'success' ? (
                        <div className="text-lg font-medium">{message}</div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder={placeholder}
                                className="flex-1 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500"
                                disabled={status === 'loading'}
                            />
                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="px-6 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                                {status === 'loading' ? '...' : buttonText}
                            </button>
                        </form>
                    )}

                    {status === 'error' && (
                        <div className="mt-2 text-red-200 text-sm">{message}</div>
                    )}
                </div>
            </div>
        );
    }

    // Inline variant - simple form
    if (variant === 'inline') {
        return (
            <div className={className}>
                {status === 'success' ? (
                    <div className="text-green-600 font-medium">{message}</div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder={placeholder}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            disabled={status === 'loading'}
                        />
                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {status === 'loading' ? '...' : buttonText}
                        </button>
                    </form>
                )}
            </div>
        );
    }

    // Card variant - boxed with icon
    return (
        <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 ${className}`}>
            <div className="text-center">
                <div className="text-4xl mb-3">📧</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 mb-4">{description}</p>

                {status === 'success' ? (
                    <div className="text-green-600 font-medium py-2">{message}</div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder={placeholder}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-center"
                            disabled={status === 'loading'}
                        />
                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full py-3 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {status === 'loading' ? 'Subscribing...' : buttonText}
                        </button>
                    </form>
                )}

                {status === 'error' && (
                    <div className="mt-2 text-red-600 text-sm">{message}</div>
                )}

                <p className="text-xs text-gray-500 mt-3">
                    No spam, unsubscribe anytime.
                </p>
            </div>
        </div>
    );
}
