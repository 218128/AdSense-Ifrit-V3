/**
 * Smart CSV Parser
 * 
 * Auto-detects column formats from various keyword tools:
 * - Keywords Everywhere, SEMrush, Ahrefs, Moz, Ubersuggest
 * - Also handles generic keyword lists (one per line)
 * 
 * Extracted from KeywordHunter for single responsibility.
 */

import type { KeywordItem } from '@/lib/keywords/types';

// ============ COLUMN MAPPINGS ============

const KEYWORD_COLUMNS = ['keyword', 'keywords', 'search term', 'query', 'term', 'phrase'];
const NICHE_COLUMNS = ['niche', 'category', 'topic', 'industry'];
const VOLUME_COLUMNS = ['search volume', 'volume', 'monthly searches', 'avg. monthly searches', 'searches'];
const CPC_COLUMNS = ['cpc', 'cost per click', 'avg. cpc', 'value'];
const DIFFICULTY_COLUMNS = ['difficulty', 'kd', 'keyword difficulty', 'competition', 'compete'];
const CONTEXT_COLUMNS = ['context', 'description', 'intent', 'notes'];

/**
 * Normalize column header for matching
 */
function normalizeHeader(header: string): string {
    return header.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
}

/**
 * Find column index by checking against possible names
 */
function findColumnIndex(headers: string[], possibleNames: string[]): number {
    const normalizedHeaders = headers.map(normalizeHeader);
    for (const name of possibleNames) {
        const idx = normalizedHeaders.indexOf(name);
        if (idx !== -1) return idx;
    }
    return -1;
}

/**
 * Detect if content is a simple list (one keyword per line)
 */
function isSimpleList(lines: string[]): boolean {
    // If no commas in most lines, it's a simple list
    const linesWithCommas = lines.filter(line => line.includes(',') || line.includes('\t'));
    return linesWithCommas.length / lines.length < 0.5;
}

/**
 * Parse a simple list (one keyword per line)
 */
function parseSimpleList(lines: string[]): KeywordItem[] {
    return lines
        .map(line => line.trim())
        .filter(line => line.length > 0 && line.length < 200) // Skip empty and suspiciously long lines
        .map(keyword => ({
            keyword,
            source: 'csv',
        }));
}

/**
 * Smart CSV Parser - auto-detects format
 * 
 * @param content - Raw CSV content
 * @returns Array of KeywordItem
 */
export function parseCSV(content: string): KeywordItem[] {
    const lines = content.split(/\r?\n/).filter(line => line.trim());

    if (lines.length === 0) return [];

    // Check if it's a simple list
    if (isSimpleList(lines)) {
        return parseSimpleList(lines);
    }

    // Detect delimiter (comma or tab)
    const delimiter = lines[0].includes('\t') ? '\t' : ',';

    // Parse header row
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));

    // Find column indices
    const keywordIdx = findColumnIndex(headers, KEYWORD_COLUMNS);
    const nicheIdx = findColumnIndex(headers, NICHE_COLUMNS);
    const volumeIdx = findColumnIndex(headers, VOLUME_COLUMNS);
    const cpcIdx = findColumnIndex(headers, CPC_COLUMNS);
    const difficultyIdx = findColumnIndex(headers, DIFFICULTY_COLUMNS);
    const contextIdx = findColumnIndex(headers, CONTEXT_COLUMNS);

    // If no keyword column found, assume first column is keyword
    const actualKeywordIdx = keywordIdx === -1 ? 0 : keywordIdx;

    // Parse data rows
    const items: KeywordItem[] = [];

    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));

        if (!parts[actualKeywordIdx]) continue;

        const keyword = parts[actualKeywordIdx];

        // Skip if looks like a header row that slipped through
        if (KEYWORD_COLUMNS.includes(normalizeHeader(keyword))) continue;

        items.push({
            keyword,
            source: 'csv',
            niche: nicheIdx !== -1 ? parts[nicheIdx] || undefined : undefined,
            searchVolume: volumeIdx !== -1 ? parts[volumeIdx] || undefined : undefined,
            cpc: cpcIdx !== -1 ? parts[cpcIdx] || undefined : undefined,
            difficulty: difficultyIdx !== -1 ? parts[difficultyIdx] || undefined : undefined,
            context: contextIdx !== -1 ? parts[contextIdx] || undefined : undefined,
        });
    }

    return items;
}

/**
 * Legacy parseCSV (original format for backwards compatibility)
 * Expected columns: keyword, niche, context, difficulty, searchVolume
 */
export function parseCSVLegacy(content: string): KeywordItem[] {
    const lines = content.split('\n').filter(line => line.trim());
    const items: KeywordItem[] = [];

    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim().replace(/"/g, ''));
        if (parts[0]) {
            items.push({
                keyword: parts[0],
                source: 'csv',
                niche: parts[1] || undefined,
                context: parts[2] || undefined,
                difficulty: parts[3] || undefined,
                searchVolume: parts[4] || undefined,
            });
        }
    }
    return items;
}
