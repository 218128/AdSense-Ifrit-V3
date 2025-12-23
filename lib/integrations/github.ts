import { generateTemplateFiles as generateNiche, SiteConfig } from '@/templates/niche-authority-blog/generator';
import { generateTemplateFiles as generateMagazine } from '@/templates/topical-magazine/generator';
import { generateTemplateFiles as generateExpert } from '@/templates/expert-hub/generator';
import { getInstalledPlugins, getTheme } from '@/lib/websiteStore';
import { generateDefaultThemeCSS } from '@/templates/shared/themeGenerator';

export interface GitHubUser {
    login: string;
    name: string;
    avatar_url: string;
}

export interface CreateRepoResponse {
    success: boolean;
    repoUrl?: string;
    repoFullName?: string;
    error?: string;
    message?: string;
}

// ... existing code ...

/**
 * Validates GitHub token...
 */
export async function validateGitHubToken(token: string): Promise<{ success: boolean; user?: { username: string; name: string; avatar: string }; error?: string }> {
    try {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'AdSense-Ifrit'
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            return {
                success: false,
                error: error.message || 'Invalid token or insufficient permissions'
            };
        }

        const user: GitHubUser = await response.json();

        return {
            success: true,
            user: {
                username: user.login,
                name: user.name,
                avatar: user.avatar_url
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Create a new repository for a domain
 */
export async function createGitHubRepo(
    token: string,
    repoName: string,
    domain: string
): Promise<CreateRepoResponse> {
    if (!token || !repoName) {
        return { success: false, error: 'Token and repo name required' };
    }

    try {
        // Authenticate
        const userRes = await validateGitHubToken(token);
        if (!userRes.success || !userRes.user) {
            return { success: false, error: userRes.error };
        }

        const username = userRes.user.username;

        // Check if repo exists
        const checkResponse = await fetch(`https://api.github.com/repos/${username}/${repoName}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'AdSense-Ifrit'
            }
        });

        if (checkResponse.ok) {
            const existingRepo = await checkResponse.json();
            return {
                success: true,
                repoUrl: existingRepo.html_url,
                repoFullName: existingRepo.full_name,
                message: 'Repository already exists'
            };
        }

        // Create repo
        const createResponse = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'AdSense-Ifrit'
            },
            body: JSON.stringify({
                name: repoName,
                description: `Blog for ${domain} - Created by AdSense Ifrit`,
                private: false,
                auto_init: true // Creates README
            })
        });

        if (!createResponse.ok) {
            const error = await createResponse.json().catch(() => ({}));
            return {
                success: false,
                error: error.message || 'Failed to create repository'
            };
        }

        const repo = await createResponse.json();
        return {
            success: true,
            repoUrl: repo.html_url,
            repoFullName: repo.full_name
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Push blog template files to repository using a SINGLE COMMIT
 * Uses GitHub Trees API to batch all files together
 */
export async function pushTemplateFiles(
    token: string,
    repoName: string,
    siteConfig?: Partial<SiteConfig>,
    extraFiles?: Record<string, string>,  // Additional files like essential pages
    options?: {
        preserveContent?: boolean;  // Don't overwrite content/ folder
        preserveStyles?: boolean;   // Don't overwrite globals.css (for existing sites)
        mergePlugins?: string;      // Domain to merge plugins from (additive package.json)
    }
): Promise<{ success: boolean; files?: Array<{ path: string; success: boolean; error?: string }>; repoFullName?: string; commitSha?: string; error?: string }> {
    try {
        const userRes = await validateGitHubToken(token);
        if (!userRes.success || !userRes.user) {
            return { success: false, error: userRes.error };
        }

        const repoFullName = `${userRes.user.username}/${repoName}`;
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'AdSense-Ifrit'
        };

        // Select template generator
        let templateFiles;
        switch (siteConfig?.template) {
            case 'magazine':
                templateFiles = generateMagazine(repoName, siteConfig);
                break;
            case 'expert':
                templateFiles = generateExpert(repoName, siteConfig);
                break;
            case 'niche':
            default:
                templateFiles = generateNiche(repoName, siteConfig);
                break;
        }

        // Filter out content/ folder if preserveContent is true (for upgrades)
        if (options?.preserveContent) {
            templateFiles = templateFiles.filter(f => !f.path.startsWith('content/'));
        }

        // Filter out globals.css if preserveStyles is true (for existing sites)
        // This prevents overwriting customized CSS during upgrades/deploys
        if (options?.preserveStyles) {
            templateFiles = templateFiles.filter(f =>
                f.path !== 'app/globals.css' &&
                f.path !== 'globals.css' &&
                !f.path.endsWith('/globals.css')
            );
        }

        // Merge local plugins into package.json (additive only)
        if (options?.mergePlugins) {
            const plugins = getInstalledPlugins(options.mergePlugins);
            if (plugins.length > 0) {
                const pkgIndex = templateFiles.findIndex(f => f.path === 'package.json');
                if (pkgIndex !== -1) {
                    try {
                        const pkgJson = JSON.parse(templateFiles[pkgIndex].content);
                        if (!pkgJson.dependencies) pkgJson.dependencies = {};
                        for (const plugin of plugins) {
                            pkgJson.dependencies[plugin.name] = plugin.version;
                        }
                        templateFiles[pkgIndex].content = JSON.stringify(pkgJson, null, 2);
                        console.log(`[GitHub] Merged ${plugins.length} plugins into package.json`);
                    } catch (e) {
                        console.error('[GitHub] Failed to merge plugins:', e);
                    }
                }
            }
        }

        // THEME LAYER: Merge local theme CSS if available
        // This enables true template-theme separation
        if (options?.mergePlugins) {  // Using same option as it contains domain
            const domain = options.mergePlugins;
            const localTheme = getTheme(domain);

            if (localTheme && localTheme.globals) {
                // Find globals.css in template files
                const cssIndex = templateFiles.findIndex(f =>
                    f.path === 'app/globals.css' || f.path === 'globals.css'
                );

                if (cssIndex !== -1) {
                    // Prepend local theme CSS (overrides CSS variables)
                    const baseCSS = templateFiles[cssIndex].content;
                    const themeCSS = localTheme.globals;

                    // Theme layer goes first (defines CSS variables)
                    // Base CSS uses var(--color-*) references
                    templateFiles[cssIndex].content = `
/* ==== THEME LAYER (customizable) ==== */
${themeCSS}

/* ==== BASE LAYER (template structure) ==== */
${baseCSS}
`;
                    console.log(`[GitHub] Applied local theme for ${domain}`);
                } else if (!options.preserveStyles) {
                    // No globals.css in template, create one from local theme
                    templateFiles.push({
                        path: 'app/globals.css',
                        content: localTheme.globals
                    });
                    console.log(`[GitHub] Created globals.css from local theme for ${domain}`);
                }
            }
        }

        // Add extra files (like essential pages)
        if (extraFiles) {
            for (const [filePath, content] of Object.entries(extraFiles)) {
                // Also respect preserveContent for extra files
                if (options?.preserveContent && filePath.startsWith('content/')) {
                    continue;
                }
                templateFiles.push({ path: filePath, content });
            }
        }

        // Step 1: Get the current commit SHA (HEAD of main branch)
        const refResponse = await fetch(
            `https://api.github.com/repos/${repoFullName}/git/ref/heads/main`,
            { headers }
        );

        if (!refResponse.ok) {
            return { success: false, error: 'Failed to get branch ref' };
        }
        const refData = await refResponse.json();
        const latestCommitSha = refData.object.sha;

        // Step 2: Get the tree SHA of the current commit
        const commitResponse = await fetch(
            `https://api.github.com/repos/${repoFullName}/git/commits/${latestCommitSha}`,
            { headers }
        );
        if (!commitResponse.ok) {
            return { success: false, error: 'Failed to get commit' };
        }
        const commitData = await commitResponse.json();
        const baseTreeSha = commitData.tree.sha;

        // Step 3: Create blobs for each file and build tree
        const treeItems = [];
        const results = [];

        for (const file of templateFiles) {
            try {
                // Create blob for file content
                const blobResponse = await fetch(
                    `https://api.github.com/repos/${repoFullName}/git/blobs`,
                    {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            content: Buffer.from(file.content).toString('base64'),
                            encoding: 'base64'
                        })
                    }
                );

                if (!blobResponse.ok) {
                    results.push({ path: file.path, success: false, error: 'Failed to create blob' });
                    continue;
                }

                const blobData = await blobResponse.json();
                treeItems.push({
                    path: file.path,
                    mode: '100644',
                    type: 'blob',
                    sha: blobData.sha
                });
                results.push({ path: file.path, success: true });
            } catch (err) {
                results.push({ path: file.path, success: false, error: String(err) });
            }
        }

        // Step 4: Create new tree with all files
        const treeResponse = await fetch(
            `https://api.github.com/repos/${repoFullName}/git/trees`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    base_tree: baseTreeSha,
                    tree: treeItems
                })
            }
        );

        if (!treeResponse.ok) {
            return { success: false, error: 'Failed to create tree', files: results };
        }
        const treeData = await treeResponse.json();

        // Step 5: Create commit with the new tree
        const newCommitResponse = await fetch(
            `https://api.github.com/repos/${repoFullName}/git/commits`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    message: `Template upgrade - ${results.filter(r => r.success).length} files updated via AdSense Ifrit`,
                    tree: treeData.sha,
                    parents: [latestCommitSha]
                })
            }
        );

        if (!newCommitResponse.ok) {
            return { success: false, error: 'Failed to create commit', files: results };
        }
        const newCommitData = await newCommitResponse.json();

        // Step 6: Update ref to point to new commit
        const updateRefResponse = await fetch(
            `https://api.github.com/repos/${repoFullName}/git/refs/heads/main`,
            {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    sha: newCommitData.sha,
                    force: false
                })
            }
        );

        if (!updateRefResponse.ok) {
            return { success: false, error: 'Failed to update branch ref', files: results };
        }

        return {
            success: results.every(r => r.success),
            files: results,
            repoFullName,
            commitSha: newCommitData.sha
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
