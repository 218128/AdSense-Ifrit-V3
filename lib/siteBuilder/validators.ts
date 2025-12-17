/**
 * Site Builder Validators
 * 
 * Pre-flight checks to ensure everything is ready before starting a site build.
 * Validates config, API keys, and GitHub access.
 */

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export interface PreFlightReport {
    overall: boolean;
    config: ValidationResult;
    providers: ValidationResult;
    github: ValidationResult;
    summary: string;
}

/**
 * Validate site configuration
 */
export function validateSiteConfig(config: {
    domain?: string;
    siteName?: string;
    niche?: string;
    pillars?: string[];
    author?: { name?: string; role?: string };
    clustersPerPillar?: number;
}): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!config.domain || config.domain.trim().length === 0) {
        errors.push('Domain is required');
    } else if (!/^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$/.test(config.domain)) {
        errors.push('Invalid domain format');
    }

    if (!config.siteName || config.siteName.trim().length === 0) {
        errors.push('Site name is required');
    } else if (config.siteName.length > 100) {
        warnings.push('Site name is very long (>100 chars)');
    }

    if (!config.niche || config.niche.trim().length === 0) {
        errors.push('Niche is required');
    }

    // Pillars validation
    if (!config.pillars || config.pillars.length === 0) {
        errors.push('At least one pillar topic is required');
    } else {
        const emptyPillars = config.pillars.filter(p => !p || p.trim().length === 0);
        if (emptyPillars.length > 0) {
            errors.push(`${emptyPillars.length} pillar(s) are empty`);
        }

        const duplicates = config.pillars.filter((p, i, arr) =>
            arr.findIndex(x => x.toLowerCase().trim() === p.toLowerCase().trim()) !== i
        );
        if (duplicates.length > 0) {
            warnings.push('Duplicate pillar topics found');
        }

        if (config.pillars.length > 10) {
            warnings.push('More than 10 pillars may take a very long time');
        }
    }

    // Author validation
    if (!config.author?.name || config.author.name.trim().length === 0) {
        errors.push('Author name is required');
    }
    if (!config.author?.role || config.author.role.trim().length === 0) {
        warnings.push('Author role is recommended for E-E-A-T');
    }

    // Clusters validation
    if (config.clustersPerPillar !== undefined) {
        if (config.clustersPerPillar < 1) {
            errors.push('Clusters per pillar must be at least 1');
        } else if (config.clustersPerPillar > 10) {
            warnings.push('More than 10 clusters per pillar may take a very long time');
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validate AI provider keys
 */
export function validateProviderKeys(keys: Record<string, string[]>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const providers = Object.keys(keys);
    const validProviders = providers.filter(p => keys[p] && keys[p].length > 0);

    if (validProviders.length === 0) {
        errors.push('At least one AI provider key is required');
    }

    // Check for at least 2 providers for failover
    if (validProviders.length === 1) {
        warnings.push('Only 1 provider configured. Recommend adding backup provider for failover.');
    }

    // Validate key formats
    for (const provider of validProviders) {
        const providerKeys = keys[provider];
        for (const key of providerKeys) {
            if (!key || key.trim().length < 10) {
                errors.push(`Invalid key format for ${provider}`);
            }
        }
    }

    // Check for preferred providers
    const preferredProviders = ['perplexity', 'gemini'];
    const hasPreferred = preferredProviders.some(p => validProviders.includes(p));
    if (!hasPreferred) {
        warnings.push('Perplexity or Gemini recommended for best content quality');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validate GitHub configuration and access
 */
export async function validateGitHubConfig(config: {
    token?: string;
    owner?: string;
    repo?: string;
    branch?: string;
}): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!config.token || config.token.trim().length === 0) {
        errors.push('GitHub token is required');
        return { valid: false, errors, warnings };
    }

    if (!config.owner || config.owner.trim().length === 0) {
        errors.push('GitHub owner/organization is required');
    }

    if (!config.repo || config.repo.trim().length === 0) {
        errors.push('GitHub repository name is required');
    }

    if (errors.length > 0) {
        return { valid: false, errors, warnings };
    }

    // Test GitHub access
    try {
        const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}`, {
            headers: {
                'Authorization': `Bearer ${config.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'AdSense-Ifrit'
            }
        });

        if (response.status === 401) {
            errors.push('GitHub token is invalid or expired');
        } else if (response.status === 403) {
            errors.push('GitHub token lacks permission to access this repository');
        } else if (response.status === 404) {
            errors.push(`Repository ${config.owner}/${config.repo} not found`);
        } else if (!response.ok) {
            errors.push(`GitHub API error: ${response.status}`);
        } else {
            const data = await response.json();

            // Check permissions
            if (!data.permissions?.push) {
                errors.push('GitHub token lacks push permission to this repository');
            }

            // Check if repo is archived
            if (data.archived) {
                errors.push('Repository is archived and cannot be modified');
            }

            // Check branch exists
            if (config.branch && config.branch !== 'main' && config.branch !== 'master') {
                const branchRes = await fetch(
                    `https://api.github.com/repos/${config.owner}/${config.repo}/branches/${config.branch}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${config.token}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'User-Agent': 'AdSense-Ifrit'
                        }
                    }
                );

                if (branchRes.status === 404) {
                    warnings.push(`Branch '${config.branch}' not found, will be created`);
                }
            }
        }
    } catch (error) {
        errors.push(`Failed to connect to GitHub: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { valid: errors.length === 0, errors, warnings };
}

/**
 * Run complete pre-flight checks
 */
export async function runPreFlightChecks(
    siteConfig: Parameters<typeof validateSiteConfig>[0],
    providerKeys: Record<string, string[]>,
    githubConfig: Parameters<typeof validateGitHubConfig>[0]
): Promise<PreFlightReport> {
    const configResult = validateSiteConfig(siteConfig);
    const providerResult = validateProviderKeys(providerKeys);
    const githubResult = await validateGitHubConfig(githubConfig);

    const allErrors = [
        ...configResult.errors.map(e => `Config: ${e}`),
        ...providerResult.errors.map(e => `Provider: ${e}`),
        ...githubResult.errors.map(e => `GitHub: ${e}`)
    ];

    const allWarnings = [
        ...configResult.warnings,
        ...providerResult.warnings,
        ...githubResult.warnings
    ];

    const overall = configResult.valid && providerResult.valid && githubResult.valid;

    let summary: string;
    if (overall) {
        if (allWarnings.length === 0) {
            summary = '✅ All pre-flight checks passed. Ready to build!';
        } else {
            summary = `⚠️ Ready to build with ${allWarnings.length} warning(s)`;
        }
    } else {
        summary = `❌ ${allErrors.length} error(s) must be fixed before building`;
    }

    return {
        overall,
        config: configResult,
        providers: providerResult,
        github: githubResult,
        summary
    };
}
