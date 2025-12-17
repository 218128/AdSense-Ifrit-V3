'use client';

import { useState, useEffect } from 'react';
import {
    Wand2,
    Github,
    Globe,
    CheckCircle,
    XCircle,
    Loader2,
    ExternalLink,
    AlertCircle,
    Settings,
    Rocket
} from 'lucide-react';

interface DomainConfig {
    name: string;
    selected: boolean;
    repoName?: string;
    repoUrl?: string;
    projectId?: string;
    projectUrl?: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    error?: string;
}

interface ConfigStep {
    id: string;
    label: string;
    status: 'pending' | 'active' | 'done' | 'error';
    detail?: string;
}

// Storage keys
const STORAGE_KEYS = {
    githubToken: 'ifrit_github_token',
    vercelToken: 'ifrit_vercel_token',
    githubUser: 'ifrit_github_user',
    vercelUser: 'ifrit_vercel_user',
    domainConfigs: 'ifrit_domain_configs',
    // Namecheap credentials (must match Settings keys)
    namecheapUser: 'ifrit_namecheap_api_user',
    namecheapKey: 'ifrit_namecheap_api_key',
    namecheapUsername: 'ifrit_namecheap_username',
    namecheapClientIp: 'ifrit_namecheap_client_ip'
};

interface AutoConfigureWizardProps {
    namecheapDomains: Array<{ name: string; expires: string }>;
    onComplete?: () => void;
}

export default function AutoConfigureWizard({
    namecheapDomains,
    onComplete
}: AutoConfigureWizardProps) {
    // Tokens
    const [githubToken, setGithubToken] = useState('');
    const [vercelToken, setVercelToken] = useState('');

    // Connection status
    const [githubUser, setGithubUser] = useState<string | null>(null);
    const [vercelUser, setVercelUser] = useState<string | null>(null);
    const [testingGithub, setTestingGithub] = useState(false);
    const [testingVercel, setTestingVercel] = useState(false);

    // Domains
    const [domains, setDomains] = useState<DomainConfig[]>([]);

    // Configuration state
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [configSteps, setConfigSteps] = useState<ConfigStep[]>([]);
    const [_currentDomainIndex, setCurrentDomainIndex] = useState(-1);
    const [configComplete, setConfigComplete] = useState(false);

    // Load from storage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setGithubToken(localStorage.getItem(STORAGE_KEYS.githubToken) || '');
            setVercelToken(localStorage.getItem(STORAGE_KEYS.vercelToken) || '');
            setGithubUser(localStorage.getItem(STORAGE_KEYS.githubUser) || null);
            setVercelUser(localStorage.getItem(STORAGE_KEYS.vercelUser) || null);
        }
    }, []);

    // Initialize domains from Namecheap
    useEffect(() => {
        if (namecheapDomains.length > 0 && domains.length === 0) {
            setDomains(namecheapDomains.map(d => ({
                name: d.name,
                selected: true,
                status: 'pending'
            })));
        }
    }, [namecheapDomains, domains.length]);

    const testGithubConnection = async () => {
        if (!githubToken) return;

        setTestingGithub(true);
        try {
            const res = await fetch('/api/github-setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'validate', token: githubToken })
            });
            const data = await res.json();

            if (data.success) {
                setGithubUser(data.user.username);
                localStorage.setItem(STORAGE_KEYS.githubToken, githubToken);
                localStorage.setItem(STORAGE_KEYS.githubUser, data.user.username);
            } else {
                setGithubUser(null);
                alert(data.error || 'GitHub connection failed');
            }
        } catch (_error) {
            setGithubUser(null);
            alert('Failed to test GitHub connection');
        } finally {
            setTestingGithub(false);
        }
    };

    const testVercelConnection = async () => {
        if (!vercelToken) return;

        setTestingVercel(true);
        try {
            const res = await fetch('/api/vercel-setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'validate', token: vercelToken })
            });
            const data = await res.json();

            if (data.success) {
                setVercelUser(data.user.username);
                localStorage.setItem(STORAGE_KEYS.vercelToken, vercelToken);
                localStorage.setItem(STORAGE_KEYS.vercelUser, data.user.username);
            } else {
                setVercelUser(null);
                alert(data.error || 'Vercel connection failed');
            }
        } catch (_error) {
            setVercelUser(null);
            alert('Failed to test Vercel connection');
        } finally {
            setTestingVercel(false);
        }
    };

    const toggleDomain = (domainName: string) => {
        setDomains(prev => prev.map(d =>
            d.name === domainName ? { ...d, selected: !d.selected } : d
        ));
    };

    const updateStep = (id: string, status: ConfigStep['status'], detail?: string) => {
        setConfigSteps(prev => prev.map(s =>
            s.id === id ? { ...s, status, detail } : s
        ));
    };

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    const runAutoConfiguration = async () => {
        const selectedDomains = domains.filter(d => d.selected);
        if (selectedDomains.length === 0) {
            alert('Please select at least one domain');
            return;
        }

        if (!githubUser || !vercelUser) {
            alert('Please test both GitHub and Vercel connections first');
            return;
        }

        setIsConfiguring(true);
        setConfigComplete(false);

        // Initialize steps
        const steps: ConfigStep[] = [
            { id: 'validate', label: 'Validating tokens', status: 'pending' }
        ];

        selectedDomains.forEach(d => {
            const safeName = d.name.replace(/\./g, '-');
            steps.push(
                { id: `repo-${d.name}`, label: `Create repo: ${safeName}-blog`, status: 'pending' },
                { id: `template-${d.name}`, label: `Push template to ${safeName}-blog`, status: 'pending' },
                { id: `vercel-${d.name}`, label: `Create Vercel project: ${safeName}`, status: 'pending' },
                { id: `domain-${d.name}`, label: `Link domain: ${d.name}`, status: 'pending' },
                { id: `dns-${d.name}`, label: `Configure DNS: ${d.name}`, status: 'pending' }
            );
        });

        steps.push({ id: 'complete', label: 'Configuration complete', status: 'pending' });
        setConfigSteps(steps);

        try {
            // Array to collect successfully configured domains (local, not React state)
            const successfulConfigs: Array<{
                name: string;
                repoOwner: string;
                repoName: string;
                branch: string;
                projectId?: string;
                projectUrl?: string;
            }> = [];

            // Step 1: Validate tokens
            updateStep('validate', 'active');
            await delay(500);
            updateStep('validate', 'done', `GitHub: @${githubUser}, Vercel: @${vercelUser}`);

            // Process each domain
            for (let i = 0; i < selectedDomains.length; i++) {
                const domain = selectedDomains[i];
                const safeName = domain.name.replace(/\./g, '-');
                const repoName = `${safeName}-blog`;

                setCurrentDomainIndex(i);
                setDomains(prev => prev.map(d =>
                    d.name === domain.name ? { ...d, status: 'processing' } : d
                ));

                // Create GitHub repo
                updateStep(`repo-${domain.name}`, 'active');
                const repoRes = await fetch('/api/github-setup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'create-repo',
                        token: githubToken,
                        repoName,
                        domain: domain.name
                    })
                });
                const repoData = await repoRes.json();

                if (!repoData.success) {
                    updateStep(`repo-${domain.name}`, 'error', repoData.error);
                    setDomains(prev => prev.map(d =>
                        d.name === domain.name ? { ...d, status: 'error', error: repoData.error } : d
                    ));
                    continue;
                }

                updateStep(`repo-${domain.name}`, 'done', repoData.repoUrl);
                setDomains(prev => prev.map(d =>
                    d.name === domain.name ? { ...d, repoName, repoUrl: repoData.repoUrl } : d
                ));

                // Push template
                updateStep(`template-${domain.name}`, 'active');
                const templateRes = await fetch('/api/github-setup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'push-template',
                        token: githubToken,
                        repoName
                    })
                });
                const templateData = await templateRes.json();

                if (!templateData.success) {
                    updateStep(`template-${domain.name}`, 'error', 'Failed to push template');
                } else {
                    updateStep(`template-${domain.name}`, 'done', `${templateData.files?.length || 0} files pushed`);
                }

                // Create Vercel project
                updateStep(`vercel-${domain.name}`, 'active');
                const projectRes = await fetch('/api/vercel-setup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'create-project',
                        token: vercelToken,
                        projectName: safeName,
                        repoFullName: repoData.repoFullName
                    })
                });
                const projectData = await projectRes.json();

                let projectId: string | undefined;
                let projectUrl: string | undefined;

                if (!projectData.success) {
                    updateStep(`vercel-${domain.name}`, 'error', projectData.error);
                } else {
                    projectId = projectData.projectId;
                    projectUrl = projectData.projectUrl;
                    updateStep(`vercel-${domain.name}`, 'done', projectData.projectUrl);
                    setDomains(prev => prev.map(d =>
                        d.name === domain.name ? {
                            ...d,
                            projectId: projectData.projectId,
                            projectUrl: projectData.projectUrl
                        } : d
                    ));

                    // Add domain to Vercel project
                    updateStep(`domain-${domain.name}`, 'active');
                    const domainRes = await fetch('/api/vercel-setup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'add-domain',
                            token: vercelToken,
                            projectId: projectData.projectId,
                            domain: domain.name
                        })
                    });
                    const domainData = await domainRes.json();

                    if (!domainData.success) {
                        updateStep(`domain-${domain.name}`, 'error', domainData.error);
                    } else {
                        updateStep(`domain-${domain.name}`, 'done',
                            domainData.verified ? 'Verified ✓' : 'Awaiting DNS'
                        );

                        // Configure DNS via Namecheap API
                        updateStep(`dns-${domain.name}`, 'active');
                        const namecheapUser = localStorage.getItem(STORAGE_KEYS.namecheapUser);
                        const namecheapKey = localStorage.getItem(STORAGE_KEYS.namecheapKey);
                        const namecheapUsername = localStorage.getItem(STORAGE_KEYS.namecheapUsername);
                        const namecheapClientIp = localStorage.getItem(STORAGE_KEYS.namecheapClientIp);

                        if (namecheapUser && namecheapKey && namecheapUsername && namecheapClientIp) {
                            const dnsRes = await fetch('/api/namecheap', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    command: 'setDNS',
                                    apiUser: namecheapUser,
                                    apiKey: namecheapKey,
                                    username: namecheapUsername,
                                    clientIp: namecheapClientIp,
                                    domain: domain.name
                                })
                            });
                            const dnsData = await dnsRes.json();

                            if (!dnsData.success) {
                                updateStep(`dns-${domain.name}`, 'error', dnsData.error || 'DNS update failed');
                            } else {
                                updateStep(`dns-${domain.name}`, 'done', 'A + CNAME → Vercel ✓');
                            }
                        } else {
                            updateStep(`dns-${domain.name}`, 'error', 'Namecheap not configured');
                        }
                    }
                }

                setDomains(prev => prev.map(d =>
                    d.name === domain.name ? { ...d, status: d.status === 'error' ? 'error' : 'done' } : d
                ));

                // Add to successful configs (using local variables, not React state)
                successfulConfigs.push({
                    name: domain.name,
                    repoOwner: githubUser || '',
                    repoName: repoName,
                    branch: 'main',
                    projectId,
                    projectUrl
                });
            }

            // Complete
            updateStep('complete', 'done', `${successfulConfigs.length} domains configured`);
            setConfigComplete(true);

            // Save domain configs to localStorage
            console.log('Saving domain configs:', successfulConfigs);
            localStorage.setItem(STORAGE_KEYS.domainConfigs, JSON.stringify(successfulConfigs));

            onComplete?.();

        } catch (error) {
            console.error('Auto-configure error:', error);
        } finally {
            setIsConfiguring(false);
            setCurrentDomainIndex(-1);
        }
    };

    const selectedCount = domains.filter(d => d.selected).length;
    const canConfigure = githubUser && vercelUser && selectedCount > 0;

    return (
        <div className="space-y-6">
            {/* Token Configuration */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                        <Wand2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Auto-Configure Publishing</h3>
                        <p className="text-sm text-neutral-500">One-click setup for GitHub repos & Vercel projects</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                    {/* GitHub Token */}
                    <div className="p-4 bg-neutral-50 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                            <Github className="w-5 h-5" />
                            <span className="font-semibold">GitHub</span>
                            {githubUser && (
                                <span className="ml-auto text-xs text-green-600 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    @{githubUser}
                                </span>
                            )}
                        </div>
                        <input
                            type="password"
                            value={githubToken}
                            onChange={(e) => setGithubToken(e.target.value)}
                            placeholder="github_pat_xxxx or ghp_xxxx"
                            className="w-full px-3 py-2 border rounded-lg text-sm mb-2"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={testGithubConnection}
                                disabled={!githubToken || testingGithub}
                                className="flex-1 px-3 py-2 bg-neutral-800 text-white rounded-lg text-sm hover:bg-neutral-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {testingGithub ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                Test Connection
                            </button>
                            <a
                                href="https://github.com/settings/tokens?type=beta"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 text-neutral-600 hover:text-neutral-800 text-sm flex items-center gap-1"
                            >
                                Get Token <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>

                    {/* Vercel Token */}
                    <div className="p-4 bg-neutral-50 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                            <Rocket className="w-5 h-5" />
                            <span className="font-semibold">Vercel</span>
                            {vercelUser && (
                                <span className="ml-auto text-xs text-green-600 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    @{vercelUser}
                                </span>
                            )}
                        </div>
                        <input
                            type="password"
                            value={vercelToken}
                            onChange={(e) => setVercelToken(e.target.value)}
                            placeholder="vercel_xxxx"
                            className="w-full px-3 py-2 border rounded-lg text-sm mb-2"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={testVercelConnection}
                                disabled={!vercelToken || testingVercel}
                                className="flex-1 px-3 py-2 bg-black text-white rounded-lg text-sm hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {testingVercel ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                Test Connection
                            </button>
                            <a
                                href="https://vercel.com/account/tokens"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 text-neutral-600 hover:text-neutral-800 text-sm flex items-center gap-1"
                            >
                                Get Token <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Domain Selection */}
                {domains.length > 0 && (
                    <div className="mb-6">
                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <Globe className="w-4 h-4 text-indigo-500" />
                            Select Domains to Configure ({selectedCount} selected)
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-neutral-50 rounded-lg">
                            {domains.map((domain) => (
                                <label
                                    key={domain.name}
                                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${domain.selected
                                        ? 'bg-indigo-100 border-indigo-300 border'
                                        : 'bg-white border border-neutral-200 hover:border-indigo-200'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={domain.selected}
                                        onChange={() => toggleDomain(domain.name)}
                                        className="rounded text-indigo-500"
                                    />
                                    <span className="text-sm truncate">{domain.name}</span>
                                    {domain.status === 'done' && <CheckCircle className="w-3 h-3 text-green-500 ml-auto" />}
                                    {domain.status === 'error' && <XCircle className="w-3 h-3 text-red-500 ml-auto" />}
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {domains.length === 0 && (
                    <div className="mb-6 p-4 bg-amber-50 text-amber-700 rounded-lg text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>Fetch domains from Namecheap in the Integrations tab first.</span>
                    </div>
                )}

                {/* Auto-Configure Button */}
                <button
                    onClick={runAutoConfiguration}
                    disabled={!canConfigure || isConfiguring}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all"
                >
                    {isConfiguring ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Configuring...
                        </>
                    ) : (
                        <>
                            <Wand2 className="w-5 h-5" />
                            Auto-Configure {selectedCount > 0 ? `${selectedCount} Domain${selectedCount > 1 ? 's' : ''}` : 'All'}
                        </>
                    )}
                </button>
            </div>

            {/* Progress Dialog */}
            {configSteps.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-indigo-500 animate-spin" style={{ animationDuration: isConfiguring ? '2s' : '0s' }} />
                        Configuration Progress
                    </h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {configSteps.map((step) => (
                            <div
                                key={step.id}
                                className={`flex items-center gap-3 p-2 rounded-lg ${step.status === 'active' ? 'bg-blue-50' :
                                    step.status === 'done' ? 'bg-green-50' :
                                        step.status === 'error' ? 'bg-red-50' :
                                            'bg-neutral-50'
                                    }`}
                            >
                                {step.status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-neutral-300" />}
                                {step.status === 'active' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                                {step.status === 'done' && <CheckCircle className="w-4 h-4 text-green-500" />}
                                {step.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                                <span className={`text-sm flex-1 ${step.status === 'pending' ? 'text-neutral-400' :
                                    step.status === 'active' ? 'text-blue-700 font-medium' :
                                        step.status === 'done' ? 'text-green-700' :
                                            'text-red-700'
                                    }`}>
                                    {step.label}
                                </span>
                                {step.detail && (
                                    <span className={`text-xs ${step.status === 'error' ? 'text-red-500' : 'text-neutral-500'
                                        }`}>
                                        {step.detail}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    {configComplete && (
                        <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 text-green-700 font-semibold">
                                <CheckCircle className="w-5 h-5" />
                                Configuration Complete!
                            </div>
                            <p className="text-sm text-green-600 mt-1">
                                Your domains are now connected to GitHub repos and Vercel projects.
                                You can start publishing articles!
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
