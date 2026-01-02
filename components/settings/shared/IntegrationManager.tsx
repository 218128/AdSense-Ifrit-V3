'use client';

import { useState } from 'react';
import { Github, Cloud, RefreshCw, Unlink, ExternalLink, Globe, AlertTriangle } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';

interface GitHubRepo {
    name: string;
    fullName: string;
    url: string;
    private: boolean;
}

interface VercelProject {
    name: string;
    id: string;
    domains: Array<{ name: string; verified: boolean }>;
}

export function IntegrationManager() {
    const { integrations } = useSettingsStore();

    // GitHub state
    const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
    const [loadingGithub, setLoadingGithub] = useState(false);

    // Vercel state
    const [vercelProjects, setVercelProjects] = useState<VercelProject[]>([]);
    const [loadingVercel, setLoadingVercel] = useState(false);

    // Action states
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // =========================================================================
    // GitHub Functions
    // =========================================================================

    const handleFetchGithubRepos = async () => {
        if (!integrations.githubToken) {
            alert('Please configure GitHub token first');
            return;
        }

        setLoadingGithub(true);
        try {
            // Direct GitHub API call (works client-side)
            const response = await fetch('https://api.github.com/user/repos?per_page=50&sort=updated', {
                headers: {
                    'Authorization': `Bearer ${integrations.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                alert('Failed to fetch repositories');
                return;
            }

            const data = await response.json();
            const repos = data.map((repo: { name: string; full_name: string; html_url: string; private: boolean }) => ({
                name: repo.name,
                fullName: repo.full_name,
                url: repo.html_url,
                private: repo.private
            }));
            setGithubRepos(repos);
        } finally {
            setLoadingGithub(false);
        }
    };

    // =========================================================================
    // Vercel Functions  
    // =========================================================================

    const handleFetchVercelProjects = async () => {
        if (!integrations.vercelToken) {
            alert('Please configure Vercel token first');
            return;
        }

        setLoadingVercel(true);
        try {
            // Direct Vercel API call (works client-side)
            const response = await fetch('https://api.vercel.com/v9/projects?limit=20', {
                headers: { 'Authorization': `Bearer ${integrations.vercelToken}` }
            });

            if (!response.ok) {
                alert('Failed to fetch Vercel projects');
                setLoadingVercel(false);
                return;
            }

            const data = await response.json();
            const projects: VercelProject[] = [];

            // Get domains for each project
            for (const proj of data.projects || []) {
                const domainsResponse = await fetch(
                    `https://api.vercel.com/v9/projects/${proj.id}/domains`,
                    { headers: { 'Authorization': `Bearer ${integrations.vercelToken}` } }
                );

                let domains: Array<{ name: string; verified: boolean }> = [];
                if (domainsResponse.ok) {
                    const domainsData = await domainsResponse.json();
                    domains = domainsData.domains?.map((d: { name: string; verified: boolean }) => ({
                        name: d.name,
                        verified: d.verified
                    })) || [];
                }

                projects.push({
                    name: proj.name,
                    id: proj.id,
                    domains
                });
            }

            setVercelProjects(projects);
        } catch (error) {
            alert('Error fetching Vercel projects');
        } finally {
            setLoadingVercel(false);
        }
    };

    const handleRemoveVercelDomain = async (projectId: string, domain: string) => {
        // More reassuring confirm message
        if (!confirm(`Unlink domain "${domain}" from Vercel?\n\n⚠️ This only removes the domain routing.\n✅ Project files remain intact.\n✅ No data will be deleted.`)) return;

        setActionLoading(`vercel-${domain}`);
        try {
            // Direct Vercel API call (works client-side)
            const response = await fetch(
                `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}`,
                {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${integrations.vercelToken}` }
                }
            );

            if (response.ok || response.status === 404) {
                // Refresh the list
                await handleFetchVercelProjects();
                alert('Domain unlinked successfully. Project files are preserved.');
            } else {
                const error = await response.json().catch(() => ({}));
                alert(error.error?.message || 'Failed to unlink domain');
            }
        } finally {
            setActionLoading(null);
        }
    };

    // =========================================================================
    // Render
    // =========================================================================

    return (
        <div className="space-y-6 mt-4 border-t border-neutral-700 pt-4">
            <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-neutral-300">Resource Manager</h4>
                <span className="text-xs text-neutral-500">(view only, no deletions)</span>
            </div>

            {/* GitHub Repositories */}
            <div className="bg-neutral-900 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Github className="w-4 h-4 text-white" />
                        <span className="font-medium text-white text-sm">GitHub Repositories</span>
                    </div>
                    <button
                        onClick={handleFetchGithubRepos}
                        disabled={loadingGithub || !integrations.githubToken}
                        className="flex items-center gap-1 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 rounded text-xs text-white"
                    >
                        <RefreshCw className={`w-3 h-3 ${loadingGithub ? 'animate-spin' : ''}`} />
                        {loadingGithub ? 'Loading...' : 'Fetch Repos'}
                    </button>
                </div>

                {githubRepos.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto space-y-1">
                        {githubRepos.map((repo) => (
                            <div key={repo.fullName} className="flex items-center justify-between p-2 bg-neutral-800 rounded text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-neutral-300">{repo.name}</span>
                                    {repo.private && (
                                        <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 rounded">Private</span>
                                    )}
                                </div>
                                <a
                                    href={repo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-neutral-400 hover:text-white"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-neutral-500">Click "Fetch Repos" to load your repositories</p>
                )}
            </div>

            {/* Vercel Projects & Domains */}
            <div className="bg-neutral-900 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Cloud className="w-4 h-4 text-white" />
                        <span className="font-medium text-white text-sm">Vercel Projects & Domains</span>
                    </div>
                    <button
                        onClick={handleFetchVercelProjects}
                        disabled={loadingVercel || !integrations.vercelToken}
                        className="flex items-center gap-1 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 rounded text-xs text-white"
                    >
                        <RefreshCw className={`w-3 h-3 ${loadingVercel ? 'animate-spin' : ''}`} />
                        {loadingVercel ? 'Loading...' : 'Fetch Projects'}
                    </button>
                </div>

                {vercelProjects.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto space-y-3">
                        {vercelProjects.map((project) => (
                            <div key={project.id} className="bg-neutral-800 rounded p-3">
                                <div className="font-medium text-white text-sm mb-2">{project.name}</div>
                                {project.domains.length > 0 ? (
                                    <div className="space-y-1">
                                        {project.domains.map((domain) => (
                                            <div key={domain.name} className="flex items-center justify-between p-2 bg-neutral-700 rounded text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Globe className="w-3.5 h-3.5 text-neutral-400" />
                                                    <span className="text-neutral-300">{domain.name}</span>
                                                    {domain.verified ? (
                                                        <span className="text-xs bg-green-500/20 text-green-400 px-1.5 rounded">Verified</span>
                                                    ) : (
                                                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 rounded">Pending</span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveVercelDomain(project.id, domain.name)}
                                                    disabled={actionLoading === `vercel-${domain.name}`}
                                                    className="flex items-center gap-1 text-amber-400 hover:text-amber-300 disabled:opacity-50 px-2 py-1 text-xs"
                                                    title="Unlink domain (does NOT delete project or files)"
                                                >
                                                    <Unlink className="w-3.5 h-3.5" />
                                                    <span>Unlink</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-neutral-500">No custom domains</p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-neutral-500">Click "Fetch Projects" to load your Vercel projects and domains</p>
                )}
            </div>
        </div>
    );
}

export default IntegrationManager;
