/**
 * TipSection Component
 * 
 * Educational tips banner for TrendScanner.
 * Extracted from TrendScanner.tsx for single responsibility.
 */

'use client';

import { Lightbulb } from 'lucide-react';

interface TipSectionProps {
    onHide: () => void;
}

export function TipSection({ onHide }: TipSectionProps) {
    return (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                        <h4 className="font-semibold text-blue-900">How to Use Live Trends</h4>
                        <ul className="text-sm text-blue-700 mt-1 space-y-1">
                            <li>• <strong>High CPC trends</strong> = More AdSense revenue potential</li>
                            <li>• <strong>Select trending topics</strong> → Send to Analyze for domain hunting</li>
                            <li>• <strong>Breaking news</strong> = Write article FAST for first-mover advantage</li>
                            <li>• <strong>Multiple sources</strong> confirm trend = Higher confidence</li>
                        </ul>
                    </div>
                </div>
                <button
                    onClick={onHide}
                    className="text-blue-400 hover:text-blue-600 text-sm"
                >
                    Hide
                </button>
            </div>
        </div>
    );
}
