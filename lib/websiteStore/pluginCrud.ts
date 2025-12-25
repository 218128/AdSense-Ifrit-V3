/**
 * Plugin CRUD Operations
 * 
 * All plugin-related storage operations extracted from websiteStore.ts
 */

import * as fs from 'fs';
import * as path from 'path';

import {
    getPluginsDir,
    ensurePluginsDir
} from './paths';

// ============================================
// TYPES
// ============================================

export interface Plugin {
    name: string;           // npm package name
    version: string;        // semver version
    installedAt: number;
    description?: string;
}

// ============================================
// PLUGIN CRUD
// ============================================

/**
 * Get installed plugins for a website
 */
export function getInstalledPlugins(domain: string): Plugin[] {
    const pluginsPath = path.join(getPluginsDir(domain), 'installed.json');

    if (!fs.existsSync(pluginsPath)) {
        return [];
    }

    try {
        const content = fs.readFileSync(pluginsPath, 'utf-8');
        return JSON.parse(content);
    } catch {
        return [];
    }
}

/**
 * Install a plugin (add to local registry)
 */
export function installPlugin(
    domain: string,
    name: string,
    version: string,
    description?: string
): Plugin {
    ensurePluginsDir(domain);

    const plugins = getInstalledPlugins(domain);

    // Check if already installed
    const existing = plugins.find(p => p.name === name);
    if (existing) {
        // Update version
        existing.version = version;
        existing.installedAt = Date.now();
        if (description) existing.description = description;
    } else {
        // Add new
        plugins.push({
            name,
            version,
            installedAt: Date.now(),
            description
        });
    }

    // Save
    const pluginsPath = path.join(getPluginsDir(domain), 'installed.json');
    fs.writeFileSync(pluginsPath, JSON.stringify(plugins, null, 2), 'utf-8');

    return plugins.find(p => p.name === name)!;
}

/**
 * Uninstall a plugin (remove from local registry)
 */
export function uninstallPlugin(domain: string, name: string): boolean {
    const plugins = getInstalledPlugins(domain);
    const index = plugins.findIndex(p => p.name === name);

    if (index === -1) {
        return false;
    }

    plugins.splice(index, 1);

    const pluginsPath = path.join(getPluginsDir(domain), 'installed.json');
    fs.writeFileSync(pluginsPath, JSON.stringify(plugins, null, 2), 'utf-8');

    return true;
}

/**
 * Get package.json with installed plugins merged
 * Used when deploying to include local plugins
 */
export function getMergedPackageJson(
    domain: string,
    basePackageJson: Record<string, unknown>
): Record<string, unknown> {
    const plugins = getInstalledPlugins(domain);

    if (plugins.length === 0) {
        return basePackageJson;
    }

    // Clone base
    const merged = JSON.parse(JSON.stringify(basePackageJson));

    // Ensure dependencies object exists
    if (!merged.dependencies) {
        merged.dependencies = {};
    }

    // Add plugins (additive only - never remove)
    for (const plugin of plugins) {
        merged.dependencies[plugin.name] = plugin.version;
    }

    return merged;
}
