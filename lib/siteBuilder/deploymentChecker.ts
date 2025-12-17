/**
 * Deployment Checker
 * 
 * Verifies published content is accessible and properly deployed.
 * Checks URL status, content rendering, and SEO elements.
 */

export interface PageCheck {
    url: string;
    accessible: boolean;
    statusCode: number;
    responseTime: number;
    hasContent: boolean;
    contentLength?: number;
    seo: {
        hasTitle: boolean;
        hasDescription: boolean;
        hasCanonical: boolean;
        title?: string;
    };
    error?: string;
}

export interface SiteHealthReport {
    domain: string;
    checkedAt: number;
    overall: 'healthy' | 'issues' | 'critical';
    pages: PageCheck[];
    summary: {
        total: number;
        accessible: number;
        withIssues: number;
        failed: number;
    };
    recommendations: string[];
}

/**
 * Check if a URL is accessible and get basic info
 */
export async function checkPageDeployment(url: string, timeout: number = 10000): Promise<PageCheck> {
    const startTime = Date.now();

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'User-Agent': 'AdSense-Ifrit-DeployChecker/1.0'
            }
        });

        clearTimeout(timeoutId);

        const responseTime = Date.now() - startTime;
        const statusCode = response.status;
        const accessible = statusCode >= 200 && statusCode < 400;

        if (!accessible) {
            return {
                url,
                accessible: false,
                statusCode,
                responseTime,
                hasContent: false,
                seo: { hasTitle: false, hasDescription: false, hasCanonical: false },
                error: `HTTP ${statusCode}`
            };
        }

        const text = await response.text();
        const hasContent = text.length > 100;

        // Parse basic SEO elements
        const titleMatch = text.match(/<title>([^<]+)<\/title>/i);
        const descMatch = text.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
        const canonicalMatch = text.match(/<link\s+rel=["']canonical["']/i);

        return {
            url,
            accessible: true,
            statusCode,
            responseTime,
            hasContent,
            contentLength: text.length,
            seo: {
                hasTitle: !!titleMatch,
                hasDescription: !!descMatch,
                hasCanonical: !!canonicalMatch,
                title: titleMatch?.[1]
            }
        };
    } catch (error) {
        return {
            url,
            accessible: false,
            statusCode: 0,
            responseTime: Date.now() - startTime,
            hasContent: false,
            seo: { hasTitle: false, hasDescription: false, hasCanonical: false },
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Check multiple pages and generate health report
 */
export async function checkSiteHealth(
    domain: string,
    slugs: string[],
    concurrency: number = 3
): Promise<SiteHealthReport> {
    const pages: PageCheck[] = [];
    const recommendations: string[] = [];

    // Check homepage first
    const homepageUrl = `https://${domain}`;
    const homepageCheck = await checkPageDeployment(homepageUrl);
    pages.push(homepageCheck);

    if (!homepageCheck.accessible) {
        recommendations.push('Homepage is not accessible - check DNS and hosting');
    }

    // Check pages in batches
    for (let i = 0; i < slugs.length; i += concurrency) {
        const batch = slugs.slice(i, i + concurrency);
        const checks = await Promise.all(
            batch.map(slug => checkPageDeployment(`https://${domain}/${slug}`))
        );
        pages.push(...checks);
    }

    // Check essential files
    const robotsCheck = await checkPageDeployment(`https://${domain}/robots.txt`);
    const sitemapCheck = await checkPageDeployment(`https://${domain}/sitemap.xml`);

    if (!robotsCheck.accessible) {
        recommendations.push('robots.txt not found - create for SEO');
    }

    if (!sitemapCheck.accessible) {
        recommendations.push('sitemap.xml not found - create for SEO');
    }

    // Calculate summary
    const accessible = pages.filter(p => p.accessible).length;
    const withIssues = pages.filter(p => p.accessible && (!p.seo.hasTitle || !p.seo.hasDescription)).length;
    const failed = pages.filter(p => !p.accessible).length;

    // Add SEO recommendations
    if (withIssues > 0) {
        recommendations.push(`${withIssues} page(s) missing title or description`);
    }

    // Determine overall health
    let overall: 'healthy' | 'issues' | 'critical';
    if (failed === 0 && withIssues === 0) {
        overall = 'healthy';
    } else if (failed > pages.length * 0.3 || !homepageCheck.accessible) {
        overall = 'critical';
    } else {
        overall = 'issues';
    }

    return {
        domain,
        checkedAt: Date.now(),
        overall,
        pages,
        summary: {
            total: pages.length,
            accessible,
            withIssues,
            failed
        },
        recommendations
    };
}

/**
 * Wait for deployment to complete (check repeatedly)
 */
export async function waitForDeployment(
    url: string,
    options: {
        maxAttempts?: number;
        delayMs?: number;
        timeout?: number;
    } = {}
): Promise<{ success: boolean; attempts: number; finalCheck: PageCheck }> {
    const { maxAttempts = 10, delayMs = 5000, timeout = 10000 } = options;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const check = await checkPageDeployment(url, timeout);

        if (check.accessible && check.hasContent) {
            return { success: true, attempts: attempt, finalCheck: check };
        }

        if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    const finalCheck = await checkPageDeployment(url, timeout);
    return { success: false, attempts: maxAttempts, finalCheck };
}

/**
 * Verify GitHub publish was successful
 */
export async function verifyGitHubPublish(
    owner: string,
    repo: string,
    path: string,
    token: string
): Promise<{ success: boolean; sha?: string; error?: string }> {
    try {
        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'AdSense-Ifrit'
                }
            }
        );

        if (response.ok) {
            const data = await response.json();
            return { success: true, sha: data.sha };
        } else if (response.status === 404) {
            return { success: false, error: 'File not found in repository' };
        } else {
            return { success: false, error: `GitHub API error: ${response.status}` };
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
