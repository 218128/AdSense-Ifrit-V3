/**
 * useProfileGeneration Hook
 * 
 * Reusable hook for domain profile generation and saving.
 */

import { useState, useCallback } from 'react';

// ========== TYPES ==========

export interface ProfileData {
    domain: string;
    niche: string;
    keywords: string[];
    topics: string[];
    targetAudience?: string;
    monetizationStrategy?: string;
}

export interface UseProfileGenerationReturn {
    /** Whether profile is being saved */
    isSaving: boolean;
    /** Whether profile was saved */
    saved: boolean;
    /** Save profile to database */
    saveProfile: (domain: string) => Promise<boolean>;
    /** Reset saved state */
    resetSaved: () => void;
    /** Error message if any */
    error: string | null;
}

// ========== HOOK ==========

export function useProfileGeneration(): UseProfileGenerationReturn {
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const saveProfile = useCallback(async (domain: string): Promise<boolean> => {
        setIsSaving(true);
        setError(null);

        try {
            const response = await fetch('/api/domain-profiles/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    domain,
                    saveProfile: true,
                }),
            });

            if (response.ok) {
                setSaved(true);
                return true;
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save profile');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to save profile';
            setError(errorMessage);
            return false;
        } finally {
            setIsSaving(false);
        }
    }, []);

    const resetSaved = useCallback(() => {
        setSaved(false);
        setError(null);
    }, []);

    return {
        isSaving,
        saved,
        saveProfile,
        resetSaved,
        error,
    };
}
