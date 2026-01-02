'use client';

import { useState, InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface ApiKeyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label?: string;
    hint?: string;
    variant?: 'light' | 'dark';
}

export function ApiKeyInput({
    label,
    hint,
    variant = 'light',
    className = '',
    ...props
}: ApiKeyInputProps) {
    const [showKey, setShowKey] = useState(false);

    const baseClasses = variant === 'dark'
        ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-400'
        : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400';

    return (
        <div className="space-y-1">
            {label && (
                <label className={`block text-xs ${variant === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    type={showKey ? 'text' : 'password'}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${baseClasses} ${className}`}
                    {...props}
                />
                <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded ${variant === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-neutral-400 hover:text-neutral-600'
                        }`}
                    tabIndex={-1}
                >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
            {hint && (
                <p className={`text-xs ${variant === 'dark' ? 'text-neutral-500' : 'text-neutral-400'}`}>
                    {hint}
                </p>
            )}
        </div>
    );
}

export default ApiKeyInput;
