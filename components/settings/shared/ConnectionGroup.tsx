'use client';

import { ReactNode, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface ConnectionGroupProps {
    title: string;
    icon?: ReactNode;
    description?: string;
    defaultOpen?: boolean;
    children: ReactNode;
}

export function ConnectionGroup({
    title,
    icon,
    description,
    defaultOpen = true,
    children,
}: ConnectionGroupProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 flex items-center gap-3 bg-neutral-50 hover:bg-neutral-100 transition-colors"
            >
                {icon && <span className="text-neutral-600">{icon}</span>}
                <div className="flex-1 text-left">
                    <h4 className="font-medium text-neutral-900">{title}</h4>
                    {description && (
                        <p className="text-xs text-neutral-500">{description}</p>
                    )}
                </div>
                {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-neutral-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-neutral-400" />
                )}
            </button>
            {isOpen && (
                <div className="p-4 space-y-4 bg-white">
                    {children}
                </div>
            )}
        </div>
    );
}

export default ConnectionGroup;
