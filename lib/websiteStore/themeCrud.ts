/**
 * Theme CRUD Operations
 * 
 * All theme-related storage operations extracted from websiteStore.ts
 */

import * as fs from 'fs';
import * as path from 'path';

import type { ThemeConfig, ThemeVersion } from './types';
import {
    getThemeDir,
    getThemeVersionsDir,
    ensureThemeDir
} from './paths';

// ============================================
// CONSTANTS
// ============================================

const MAX_THEME_VERSIONS = 10;

// ============================================
// INTERNAL HELPERS
// ============================================

/**
 * Parse CSS variables from globals.css content
 */
function parseCssVariables(css: string): ThemeConfig['variables'] {
    const defaults: ThemeConfig['variables'] = {
        primaryColor: '#2563eb',
        secondaryColor: '#10b981',
        bgColor: '#ffffff',
        textColor: '#1f2937',
        fontFamily: 'Inter, sans-serif'
    };

    const primaryMatch = css.match(/--color-primary:\s*([^;]+);/);
    const secondaryMatch = css.match(/--color-secondary:\s*([^;]+);/);
    const bgMatch = css.match(/--color-bg:\s*([^;]+);/);
    const textMatch = css.match(/--color-text:\s*([^;]+);/);
    const fontMatch = css.match(/--font-sans:\s*([^;]+);/);

    return {
        primaryColor: primaryMatch?.[1]?.trim() || defaults.primaryColor,
        secondaryColor: secondaryMatch?.[1]?.trim() || defaults.secondaryColor,
        bgColor: bgMatch?.[1]?.trim() || defaults.bgColor,
        textColor: textMatch?.[1]?.trim() || defaults.textColor,
        fontFamily: fontMatch?.[1]?.trim() || defaults.fontFamily
    };
}

// ============================================
// THEME CRUD
// ============================================

/**
 * Save theme configuration
 */
export function saveTheme(domain: string, theme: Partial<ThemeConfig>): void {
    ensureThemeDir(domain);
    const themeDir = getThemeDir(domain);

    // Get existing theme or create new
    const existing = getTheme(domain);
    const now = Date.now();

    const config: ThemeConfig = {
        globals: theme.globals ?? existing?.globals ?? '',
        variables: theme.variables ?? existing?.variables ?? parseCssVariables(theme.globals || ''),
        custom: theme.custom ?? existing?.custom,
        lastModifiedAt: now
    };

    // Save globals.css file
    if (config.globals) {
        fs.writeFileSync(path.join(themeDir, 'globals.css'), config.globals, 'utf-8');
    }

    // Save variables.json
    fs.writeFileSync(
        path.join(themeDir, 'variables.json'),
        JSON.stringify(config.variables, null, 2),
        'utf-8'
    );

    // Save custom.css if provided
    if (config.custom) {
        fs.writeFileSync(path.join(themeDir, 'custom.css'), config.custom, 'utf-8');
    }

    // Save metadata
    fs.writeFileSync(
        path.join(themeDir, 'theme.json'),
        JSON.stringify({ lastModifiedAt: config.lastModifiedAt }, null, 2),
        'utf-8'
    );
}

/**
 * Get theme configuration
 */
export function getTheme(domain: string): ThemeConfig | null {
    const themeDir = getThemeDir(domain);

    if (!fs.existsSync(themeDir)) {
        return null;
    }

    const globalsPath = path.join(themeDir, 'globals.css');
    const variablesPath = path.join(themeDir, 'variables.json');
    const customPath = path.join(themeDir, 'custom.css');
    const metaPath = path.join(themeDir, 'theme.json');

    let globals = '';
    let variables: ThemeConfig['variables'] = {
        primaryColor: '#2563eb',
        secondaryColor: '#10b981',
        bgColor: '#ffffff',
        textColor: '#1f2937'
    };
    let custom: string | undefined;
    let lastModifiedAt = Date.now();

    if (fs.existsSync(globalsPath)) {
        globals = fs.readFileSync(globalsPath, 'utf-8');
        variables = parseCssVariables(globals);
    }

    if (fs.existsSync(variablesPath)) {
        try {
            variables = JSON.parse(fs.readFileSync(variablesPath, 'utf-8'));
        } catch { /* use parsed */ }
    }

    if (fs.existsSync(customPath)) {
        custom = fs.readFileSync(customPath, 'utf-8');
    }

    if (fs.existsSync(metaPath)) {
        try {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            lastModifiedAt = meta.lastModifiedAt || lastModifiedAt;
        } catch { /* use default */ }
    }

    return { globals, variables, custom, lastModifiedAt };
}

/**
 * Save a version snapshot of the theme
 */
export function saveThemeVersion(
    domain: string,
    reason: ThemeVersion['reason'] = 'auto'
): ThemeVersion | null {
    const theme = getTheme(domain);
    if (!theme) return null;

    ensureThemeDir(domain);
    const versionsDir = getThemeVersionsDir(domain);

    const version: ThemeVersion = {
        id: `theme_v_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        globals: theme.globals,
        variables: theme.variables,
        savedAt: Date.now(),
        reason
    };

    // Save version file
    fs.writeFileSync(
        path.join(versionsDir, `${version.id}.json`),
        JSON.stringify(version, null, 2),
        'utf-8'
    );

    // Clean up old versions (keep MAX_THEME_VERSIONS)
    const versions = listThemeVersions(domain);
    if (versions.length > MAX_THEME_VERSIONS) {
        const toDelete = versions.slice(MAX_THEME_VERSIONS);
        for (const v of toDelete) {
            const vPath = path.join(versionsDir, `${v.id}.json`);
            if (fs.existsSync(vPath)) {
                fs.unlinkSync(vPath);
            }
        }
    }

    return version;
}

/**
 * List theme versions
 */
export function listThemeVersions(domain: string): ThemeVersion[] {
    const versionsDir = getThemeVersionsDir(domain);

    if (!fs.existsSync(versionsDir)) {
        return [];
    }

    const files = fs.readdirSync(versionsDir).filter(f => f.endsWith('.json'));
    const versions: ThemeVersion[] = [];

    for (const file of files) {
        try {
            const content = fs.readFileSync(path.join(versionsDir, file), 'utf-8');
            versions.push(JSON.parse(content));
        } catch { /* skip invalid */ }
    }

    // Sort by savedAt descending (newest first)
    return versions.sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * Restore theme to a previous version
 */
export function restoreThemeVersion(domain: string, versionId: string): boolean {
    const versions = listThemeVersions(domain);
    const version = versions.find(v => v.id === versionId);

    if (!version) {
        return false;
    }

    // Save current as backup before restore
    saveThemeVersion(domain, 'before-edit');

    // Restore
    saveTheme(domain, {
        globals: version.globals,
        variables: version.variables
    });

    return true;
}
