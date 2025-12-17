import { generateTemplateFiles as generateNiche, SiteConfig } from '@/lib/templates/nicheAuthorityBlog';
import { generateTemplateFiles as generateMagazine } from '@/lib/templates/topicalMagazine';
import { generateTemplateFiles as generateExpert } from '@/lib/templates/expertHub';

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
 * Push blog template files to repository
 */
export async function pushTemplateFiles(
    token: string,
    repoName: string,
    siteConfig?: Partial<SiteConfig>
): Promise<{ success: boolean; files?: Array<{ path: string; success: boolean; error?: string }>; repoFullName?: string; error?: string }> {
    try {
        const userRes = await validateGitHubToken(token);
        if (!userRes.success || !userRes.user) {
            return { success: false, error: userRes.error };
        }

        const repoFullName = `${userRes.user.username}/${repoName}`;

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
        const results = [];

        for (const file of templateFiles) {
            try {
                // Check sha if file exists
                const checkUrl = `https://api.github.com/repos/${repoFullName}/contents/${file.path}`;
                const checkResponse = await fetch(checkUrl, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'AdSense-Ifrit'
                    }
                });

                let sha: string | undefined;
                if (checkResponse.ok) {
                    const existing = await checkResponse.json();
                    sha = existing.sha;
                }

                // Create/Update
                const createResponse = await fetch(checkUrl, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json',
                        'User-Agent': 'AdSense-Ifrit'
                    },
                    body: JSON.stringify({
                        message: `Add ${file.path} - AdSense Ifrit setup`,
                        content: Buffer.from(file.content).toString('base64'),
                        ...(sha ? { sha } : {})
                    })
                });

                results.push({ path: file.path, success: createResponse.ok });
            } catch (err) {
                results.push({ path: file.path, success: false, error: String(err) });
            }
        }

        return {
            success: results.every(r => r.success),
            files: results,
            repoFullName
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
