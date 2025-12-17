# Data Models

## Website

```typescript
interface Website {
    domain: string;           // Primary key (e.g., "example.com")
    name: string;             // Display name
    niche: string;            // Topic area
    template: {
        name: string;
        version: string;
        upgradeAvailable: boolean;
    };
    stats: {
        articlesCount: number;
        totalWords: number;
        lastPublishedAt?: number;
    };
    deployment: {
        githubRepo: string;
        githubOwner: string;
        vercelProject?: string;
        liveUrl: string;
        lastDeployedAt?: number;
        pendingChanges: number;
    };
    author: {
        name: string;
        role: string;
        bio?: string;
    };
    status: 'setup' | 'building' | 'active' | 'error';
    createdAt: number;
    updatedAt: number;
}
```

---

## Article

```typescript
interface Article {
    id: string;               // Unique ID (art_timestamp_random)
    slug: string;             // URL slug
    title: string;
    description: string;
    content: string;          // Markdown content

    category: string;
    tags: string[];

    // Content classification
    contentType: string;      // 'tofu', 'tactical', 'seasonal', 'external'
    pageType: 'article' | 'structural' | 'homepage';
    structuralType?: 'about' | 'contact' | 'privacy' | 'terms' | 'disclaimer';

    // Metrics
    wordCount: number;
    readingTime: number;      // Minutes

    // E-E-A-T signals
    eeatSignals: string[];
    aiOverviewBlocks: string[];

    // Generation tracking
    aiGeneration?: {
        provider: string;     // 'gemini', 'deepseek', etc.
        model?: string;
        generatedAt: number;
    };
    isExternal: boolean;
    source: 'ai-generated' | 'external' | 'github-sync' | 'manual';

    // Status
    status: 'draft' | 'ready' | 'published';
    publishedAt?: number;
    lastModifiedAt: number;

    // SEO
    metaTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
}
```

---

## SiteConfig

```typescript
interface SiteConfig {
    domain: string;
    siteName: string;
    siteTagline: string;
    niche: string;
    targetAudience: string;
    template?: 'niche-authority' | 'topical-magazine' | 'expert-hub';
    author: {
        name: string;
        role: string;
        experience: string;
        credentials?: string[];
        bio?: string;
    };
    pillars: string[];           // Main topic pillars
    clustersPerPillar: number;
    includeAbout: boolean;
    includeEssentialPages?: boolean;
    includeHomepage: boolean;
}
```

---

## ContentType (Queue Items)

```typescript
type ContentType =
    | 'about' | 'author' | 'homepage' | 'pillar' | 'cluster'
    | 'privacy' | 'terms' | 'contact' | 'disclaimer'
    | 'tofu' | 'tactical' | 'seasonal' | 'editorial_policy';
```

---

## Storage Paths

```
websites/{domain}/
├── metadata.json              # Website object
├── content/
│   ├── articles/
│   │   └── art_{id}.json      # Article objects
│   ├── pages/
│   │   ├── about.json
│   │   ├── contact.json
│   │   ├── privacy.json
│   │   └── terms.json
│   └── images/
├── versions/
│   └── v{n}.json              # Template version history
└── drafts/                    # Hot folder for imports
    └── *.md
```

---

## Key Functions (websiteStore.ts)

```typescript
// Website CRUD
getWebsite(domain: string): Website | null
saveWebsite(website: Website): void
deleteWebsite(domain: string): boolean
listWebsites(): Website[]

// Article CRUD
getArticle(domain: string, articleId: string): Article | null
saveArticle(domain: string, article: Article): void
updateArticle(domain: string, articleId: string, updates: Partial<Article>): Article | null
deleteArticle(domain: string, articleId: string): boolean
listArticles(domain: string): Article[]

// Structural Pages
getPage(domain: string, pageType: StructuralPageType): Article | null
savePage(domain: string, page: Article): void
updatePage(domain: string, pageType: StructuralPageType, updates: Partial<Article>): Article | null
listPages(domain: string): Article[]
createDefaultPages(domain: string, siteName: string, author: object): void

// External Import
importExternalContent(domain: string, content: object): Article
```
