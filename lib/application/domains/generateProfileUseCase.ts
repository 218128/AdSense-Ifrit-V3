/**
 * Generate Domain Profile Use Case
 * 
 * Application layer following keywords_capabilities_architecture.md pattern.
 * Orchestrates profile generation with progress callbacks.
 */

import type { ActionStatus } from '@/lib/shared/types/actionStatus';
import { ActionStatusFactory } from '@/lib/shared/types';
import type { DomainProfile } from '@/lib/domains/types';
import {
    generateDomainProfile,
    type GenerateProfileOptions
} from '@/lib/infrastructure/api/domainProfileAPI';

// ============================================
// Use Case Types
// ============================================

export interface GenerateProfileUseCaseOptions {
    /** Domain to analyze */
    domain: string;
    /** Session ID for SSE status streaming */
    sessionId?: string;
    /** SpamZilla data if available */
    spamzillaData?: GenerateProfileOptions['spamzillaData'];
    /** Keyword context from previous research */
    keywordContext?: GenerateProfileOptions['keywordContext'];
    /** Domain score from analysis */
    domainScore?: GenerateProfileOptions['domainScore'];
}

export interface GenerateProfileUseCaseResult {
    success: boolean;
    profile?: DomainProfile;
    error?: string;
}

// ============================================
// Use Case Implementation
// ============================================

/**
 * Generate a domain profile with progress tracking
 * 
 * @param options - Domain and configuration
 * @param onProgress - Progress callback for UI updates
 * @returns Generated profile or error
 */
export async function generateProfileUseCase(
    options: GenerateProfileUseCaseOptions,
    onProgress: (status: ActionStatus) => void
): Promise<GenerateProfileUseCaseResult> {
    const { domain, sessionId, spamzillaData, keywordContext, domainScore } = options;

    // Step 1: Start
    onProgress(ActionStatusFactory.running(`Generating profile for ${domain}...`));

    try {
        // Minimum time to show status (so user can see it)
        const startTime = Date.now();
        const MIN_DISPLAY_MS = 1500; // 1.5 seconds minimum

        // Step 2: Call infrastructure API (no apiKey - capability system handles)
        // sessionId enables SSE status streaming for real-time UI updates
        const result = await generateDomainProfile(domain, {
            sessionId,
            spamzillaData,
            keywordContext,
            domainScore,
        });

        // Ensure minimum display time
        const elapsed = Date.now() - startTime;
        if (elapsed < MIN_DISPLAY_MS) {
            await new Promise(resolve => setTimeout(resolve, MIN_DISPLAY_MS - elapsed));
        }

        // Step 3: Handle result
        if (!result.success || !result.profile) {
            const errorMsg = result.error || 'Profile generation failed';
            onProgress(ActionStatusFactory.error('Profile generation failed', errorMsg));
            return { success: false, error: errorMsg };
        }

        // Step 4: Success
        onProgress(ActionStatusFactory.success(`Profile generated for ${domain}`));

        return {
            success: true,
            profile: result.profile,
        };

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        onProgress(ActionStatusFactory.error('Profile generation error', errorMsg));
        return { success: false, error: errorMsg };
    }
}
