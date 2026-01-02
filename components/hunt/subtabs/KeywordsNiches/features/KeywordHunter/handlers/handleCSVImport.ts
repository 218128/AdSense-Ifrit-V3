/**
 * handleCSVImport - Parse and import CSV file with keywords
 * 
 * Reads uploaded CSV file, parses content using parseCSV utility,
 * and saves keywords to store with filename for history tracking.
 * 
 * @module KeywordHunter/handlers
 */

import { parseCSV } from '../../../shared/utils';
import type { KeywordItem } from '@/lib/keywords/types';

/**
 * Parameters for handleCSVImport
 */
export interface HandleCSVImportParams {
    /** Function to add parsed keywords to store */
    addCSVKeywords: (keywords: KeywordItem[], filename?: string) => void;
}

/**
 * Creates handleCSVImport handler for file input onChange
 * 
 * @param params - Dependencies
 * @returns Event handler for file input
 * 
 * @example
 * <input type="file" onChange={createHandleCSVImport({ addCSVKeywords })} />
 */
export function createHandleCSVImport({
    addCSVKeywords,
}: HandleCSVImportParams): (event: React.ChangeEvent<HTMLInputElement>) => void {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        // Guard: No file selected
        if (!file) {
            console.warn('[handleCSVImport] No file selected');
            return;
        }

        const filename = file.name;
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;

                if (!content || content.trim().length === 0) {
                    console.error('[handleCSVImport] File is empty');
                    return;
                }

                const parsed = parseCSV(content);

                if (parsed.length === 0) {
                    console.warn('[handleCSVImport] No keywords found in CSV');
                    return;
                }

                addCSVKeywords(parsed, filename);
            } catch (error) {
                console.error('[handleCSVImport] Parse error:', error);
            }
        };

        reader.onerror = () => {
            console.error('[handleCSVImport] File read error');
        };

        reader.readAsText(file);

        // Reset input to allow re-importing same file
        if (event.target) {
            event.target.value = '';
        }
    };
}

/**
 * Direct handler function
 */
export function handleCSVImport(
    event: React.ChangeEvent<HTMLInputElement>,
    addCSVKeywords: (keywords: KeywordItem[], filename?: string) => void
): void {
    const handler = createHandleCSVImport({ addCSVKeywords });
    handler(event);
}
