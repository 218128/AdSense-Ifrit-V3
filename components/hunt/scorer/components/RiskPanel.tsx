/**
 * RiskPanel Component
 * 
 * Displays risk analysis for a domain.
 * Pure presentational component.
 */

'use client';

import {
    AlertTriangle,
    AlertOctagon,
    Info,
    CheckCircle
} from 'lucide-react';

// ============ PROPS ============

export interface Risk {
    type: string;
    severity: string;
    description: string;
}

export interface RiskPanelProps {
    /** Risk level */
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    /** List of risks */
    risks: Risk[];
}

// ============ HELPERS ============

const riskStyles = {
    low: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: CheckCircle },
    medium: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: Info },
    high: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: AlertTriangle },
    critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: AlertOctagon },
};

function getSeverityIcon(severity: string) {
    switch (severity.toLowerCase()) {
        case 'critical':
            return <AlertOctagon className="w-4 h-4 text-red-500" />;
        case 'high':
            return <AlertTriangle className="w-4 h-4 text-orange-500" />;
        case 'medium':
            return <Info className="w-4 h-4 text-yellow-500" />;
        default:
            return <Info className="w-4 h-4 text-blue-500" />;
    }
}

// ============ COMPONENT ============

export function RiskPanel({ riskLevel, risks }: RiskPanelProps) {
    const style = riskStyles[riskLevel];
    const Icon = style.icon;

    return (
        <div className={`p-4 ${style.bg} border ${style.border} rounded-xl`}>
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-5 h-5 ${style.text}`} />
                <span className={`font-semibold ${style.text}`}>
                    Risk Level: {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
                </span>
            </div>

            {/* Risks list */}
            {risks.length > 0 ? (
                <div className="space-y-2">
                    {risks.map((risk, i) => (
                        <div
                            key={i}
                            className="flex items-start gap-2 text-sm"
                        >
                            {getSeverityIcon(risk.severity)}
                            <div>
                                <span className="font-medium">{risk.type}:</span>{' '}
                                <span className="text-neutral-600">{risk.description}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-neutral-600">No significant risks detected.</p>
            )}
        </div>
    );
}
