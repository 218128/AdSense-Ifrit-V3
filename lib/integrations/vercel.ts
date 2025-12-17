export interface VercelUser {
    username: string;
    name: string;
    email: string;
}

export interface CreateProjectResponse {
    success: boolean;
    projectId?: string;
    projectName?: string;
    projectUrl?: string;
    needsGitLink?: boolean;
    error?: string;
    message?: string;
}

/**
 * Validate Vercel token
 */
export async function validateVercelToken(token: string): Promise<{ success: boolean; user?: VercelUser; error?: string }> {
    try {
        const response = await fetch('https://api.vercel.com/v2/user', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            return {
                success: false,
                error: error.error?.message || 'Invalid token'
            };
        }

        const data = await response.json();
        return {
            success: true,
            user: {
                username: data.user.username,
                name: data.user.name,
                email: data.user.email
            }
        };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

/**
 * Create Vercel project linked to GitHub
 */
export async function createVercelProject(
    token: string,
    projectName: string,
    repoFullName: string
): Promise<CreateProjectResponse> {
    if (!token || !projectName || !repoFullName) {
        return { success: false, error: 'Missing requirements' };
    }

    try {
        // Check existing
        const checkResponse = await fetch(`https://api.vercel.com/v9/projects/${projectName}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        if (checkResponse.ok) {
            const existing = await checkResponse.json();
            return {
                success: true,
                projectId: existing.id,
                projectName: existing.name,
                projectUrl: `https://${existing.name}.vercel.app`,
                message: 'Project already exists'
            };
        }

        // Create new
        const createResponse = await fetch('https://api.vercel.com/v10/projects', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: projectName,
                framework: 'nextjs',
                gitRepository: { type: 'github', repo: repoFullName },
                buildCommand: 'npm run build',
                outputDirectory: '.next',
                installCommand: 'npm install'
            })
        });

        if (!createResponse.ok) {
            const error = await createResponse.json().catch(() => ({}));

            // Fallback: Create without repo if linking fails (e.g., auth issues)
            if (error.error?.code === 'repo_not_found') {
                const simpleResponse = await fetch('https://api.vercel.com/v10/projects', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: projectName, framework: 'nextjs' })
                });

                if (simpleResponse.ok) {
                    const project = await simpleResponse.json();
                    return {
                        success: true,
                        projectId: project.id,
                        projectName: project.name,
                        projectUrl: `https://${project.name}.vercel.app`,
                        needsGitLink: true,
                        message: 'Project created. Link GitHub manually.'
                    };
                }
            }

            return {
                success: false,
                error: error.error?.message || 'Failed to create project'
            };
        }

        const project = await createResponse.json();
        return {
            success: true,
            projectId: project.id,
            projectName: project.name,
            projectUrl: `https://${project.name}.vercel.app`
        };

    } catch (error) {
        return { success: false, error: String(error) };
    }
}

/**
 * Add custom domain to Vercel project
 */
export async function addVercelDomain(
    token: string,
    projectId: string,
    domain: string
): Promise<{ success: boolean; domain?: string; verified?: boolean; dnsRecords?: Array<{ type: string; name: string; value: string }>; error?: string; message?: string }> {
    try {
        const response = await fetch(`https://api.vercel.com/v10/projects/${projectId}/domains`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: domain })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            if (error.error?.code === 'domain_already_in_use') {
                return { success: true, domain, message: 'Domain already configured' };
            }
            return {
                success: false,
                error: error.error?.message || 'Failed to add domain'
            };
        }

        const result = await response.json();
        let dnsRecords: Array<{ type: string; name: string; value: string }> = [];

        if (!result.verified) {
            const configResponse = await fetch(`https://api.vercel.com/v6/domains/${domain}/config`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            if (configResponse.ok) {
                const config = await configResponse.json();
                if (config.misconfigured) {
                    dnsRecords = [
                        { type: 'A', name: '@', value: '76.76.21.21' },
                        { type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com' }
                    ];
                }
            }
        }

        return {
            success: true,
            domain,
            verified: result.verified,
            dnsRecords: dnsRecords.length > 0 ? dnsRecords : undefined,
            message: result.verified ? 'Verified' : 'DNS Config Required'
        };

    } catch (error) {
        return { success: false, error: String(error) };
    }
}
