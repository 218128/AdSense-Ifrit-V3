// Shared types for website components
// Extracted from WebsiteDetail.tsx

export interface Website {
    id: string;
    domain: string;
    name: string;
    niche: string;
    template: {
        id: string;
        version: string;
        installedAt: number;
        upgradeAvailable?: string;
    };
    fingerprint: {
        providers: string[];
        contentStrategy: string;
        eeatEnabled: boolean;
        aiOverviewOptimized: boolean;
        generatedAt: number;
        articleTemplatesUsed: string[];
    };
    deployment: {
        githubRepo: string;
        githubOwner: string;
        vercelProject: string;
        liveUrl: string;
        lastDeployAt?: number;
        lastDeployCommit?: string;
        pendingChanges: number;
    };
    stats: {
        articlesCount: number;
        totalWords: number;
        lastPublishedAt?: number;
        estimatedMonthlyRevenue: number;
    };
    versions: {
        version: string;
        templateVersion: string;
        deployedAt: number;
        commitSha: string;
        changes: string[];
        canRollback: boolean;
    }[];
    author: {
        name: string;
        role: string;
        experience?: string;
        bio?: string;
    };
    status: string;
    createdAt: number;
    updatedAt: number;
}

export interface Article {
    id: string;
    slug: string;
    title: string;
    description: string;
    content: string;
    category: string;
    tags: string[];
    contentType: string;
    wordCount: number;
    readingTime: number;
    eeatSignals: string[];
    aiOverviewBlocks: string[];
    generatedBy?: string;
    generatedAt?: number;
    isExternal: boolean;
    status: 'draft' | 'ready' | 'published';
    publishedAt?: number;
    lastModifiedAt: number;
}

export type TabId = 'overview' | 'content' | 'versions' | 'upgrades' | 'settings';
