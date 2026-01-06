# Ifrit V3 Function Logic & Code Quality Analysis

> **Focus:** What the app actually DOES, how to improve function design, code quality, and separation of concerns  
> **NOT:** Infrastructure, deployment, database schemas (those come LAST)  
> **Database:** Supabase (later)  
> **Auth:** Supabase Auth  
> **Testing:** Local only

---

## Part 1: Ifrit Feature Analysis - What Each Feature Actually Does

### 1.1 Hunt Feature - The Engine

**Purpose:** Hunt is where everything starts. It's about finding opportunities.

#### What Hunt Actually Does:

1. **Trend Scanning** - Find trending topics from multiple sources
2. **Keyword Research** - Discover and analyze keywords for niches
3. **Domain Acquisition** - Find, analyze, and queue expired domains
4. **Profile Generation** - Create content strategy profiles for domains
5. **Launch to Campaign** - Bridge from research to content production

#### Current Function Architecture Issues:

| Module | Issue | Enhancement Needed |
|--------|-------|-------------------|
| `trendStore` | Mixes data fetching with state management | Separate: `trendService.ts` (fetch) + `trendStore.ts` (state) |
| `keywordStore` | CSV import logic embedded in store | Extract: `csvParser.ts` for parsing logic |
| `domainAcquireStore` | Domain scoring embedded | Extract: `domainScorer.ts` as pure function |
| `huntHelpers.ts` | AI calls mixed with business logic | Separate: AI calls should go through `aiServices` only |

---

### 1.2 Campaigns Feature - The Production Line

**Purpose:** Campaigns automate content creation from Hunt data to WordPress publishing.

#### What Campaigns Actually Does:

1. **Content Pipeline** - Research → Generate → Humanize → SEO → Publish
2. **Translation** - Multi-language content from source sites
3. **Deduplication** - Prevent duplicate content across sites
4. **Scheduling** - When and how often to produce content
5. **Analytics Integration** - Track what content performs best

#### Current Function Logic Analysis:

##### `processor.ts` - The Pipeline Orchestrator

```
Current Flow:
shouldSkipTopic() → performResearch() → generateContent() → 
generateImages() → fetchExistingPosts() → findLinkOpportunities() → 
injectInternalLinks() → generateAllSchemas() → spinContent() → 
publishToWordPress() → recordGeneratedPost()
```

**Issues with Current Logic:**

1. **No Stage Isolation** - If `generateImages()` fails, we've already done research and content generation. No way to resume.
2. **Sequential Only** - Images and schema could run in parallel after content is generated
3. **Error Handling** - Errors bubble up but there's no retry mechanism per stage

**Proposed Enhanced Logic:**

```typescript
// processor.ts - ENHANCED DESIGN
interface PipelineStage {
    name: string;
    execute: (ctx: PipelineContext) => Promise<StageResult>;
    canRetry: boolean;
    dependsOn: string[];  // Which stages must complete first
}

const PIPELINE_STAGES: PipelineStage[] = [
    { name: 'dedup', execute: checkDedup, canRetry: false, dependsOn: [] },
    { name: 'research', execute: performResearch, canRetry: true, dependsOn: ['dedup'] },
    { name: 'content', execute: generateContent, canRetry: true, dependsOn: ['research'] },
    // These can run in parallel after content
    { name: 'images', execute: generateImages, canRetry: true, dependsOn: ['content'] },
    { name: 'links', execute: buildInternalLinks, canRetry: true, dependsOn: ['content'] },
    { name: 'schema', execute: generateSchemas, canRetry: true, dependsOn: ['content'] },
    // Final stages
    { name: 'spin', execute: spinContent, canRetry: true, dependsOn: ['images', 'links', 'schema'] },
    { name: 'publish', execute: publishToWP, canRetry: true, dependsOn: ['spin'] },
];
```

##### `generators.ts` - Content Creation

**Current Issues:**

1. `performResearch()` - Does too much (key retrieval + API call + parsing)
2. `generateContent()` - Mixes prompt building with execution
3. `publishToWordPress()` - Handles images, linking, AND posting

**Separation of Concerns Improvement:**

```typescript
// CURRENT (generators.ts does everything)
export async function publishToWordPress(wpSite, campaign, ctx) {
    // 1. Upload cover image
    // 2. Upload inline images  
    // 3. Inject images into content
    // 4. Create WordPress post
}

// IMPROVED (separate responsibilities)
// wpMediaService.ts
export async function uploadCoverImage(wpSite: WPSite, imageData: ImageData): Promise<MediaResult>;
export async function uploadInlineImages(wpSite: WPSite, images: ImageData[]): Promise<MediaResult[]>;

// contentAssembler.ts
export function injectImagesIntoContent(html: string, mediaResults: MediaResult[]): string;
export function addFeaturedImageToPost(post: WPPostInput, mediaId: number): WPPostInput;

// wpPublisher.ts
export async function createPost(wpSite: WPSite, post: WPPostInput): Promise<PublishResult>;
```

---

### 1.3 WordPress Feature - Site Management

**Purpose:** Manage WordPress sites, track their health, prepare for AdSense.

#### What WordPress Actually Does:

1. **Site Registry** - Add/remove/configure WP sites
2. **Connection Testing** - Verify API access works
3. **Metadata Sync** - Categories, tags, authors from WP
4. **AdSense Readiness** - Check site has required pages
5. **Legal Pages Generation** - Privacy Policy, Terms, etc.
6. **Hunt Profile Integration** - Load niche data from Hunt

#### Current Function Logic Issues:

##### `wpSiteStore.ts` - Store Doing Too Much

**Issue:** The store has business logic that should be in services:

```typescript
// CURRENT - Store has async business logic
loadHuntProfile: async (siteId, domain) => {
    const { getOwnedDomains } = await import('@/features/hunt');
    const ownedDomains = getOwnedDomains();
    // ... complex logic ...
}
```

**Should Be:**

```typescript
// wpSiteService.ts - Business logic
export async function loadHuntProfileForSite(siteId: string, domain: string): Promise<ProfileData | null> {
    const { getOwnedDomains } = await import('@/features/hunt');
    const ownedDomains = getOwnedDomains();
    // ... logic ...
    return profileData;
}

// wpSiteStore.ts - Pure state management
setProfileData: (siteId: string, profile: ProfileData) => set((state) => ({
    sites: { ...state.sites, [siteId]: { ...state.sites[siteId], profileData: profile } }
}));
```

##### `adsenseChecker.ts` - Good SoC Example

This file is actually well-designed:
- `checkAdSenseReadiness()` - Single responsibility
- `getMissingEssentialPages()` - Pure function
- `getReadinessStatus()` - Pure function

**Keep this pattern.**

---

### 1.4 Hosting Feature - Site Provisioning

**Purpose:** Create new WordPress sites on Hostinger hosting.

#### What Hosting Actually Does:

1. **MCP Tool Execution** - Call Hostinger API via MCP
2. **Site Provisioning** - Create WP sites, configure DNS
3. **Plugin Deployment** - Install required plugins
4. **Integration** - Register provisioned sites in Ifrit

#### Current Function Logic - Pretty Good

`hostingerMcp.ts` and `siteProvision.ts` are **well-designed**:
- Clear separation between MCP execution and orchestration
- Step-by-step provisioning with status tracking
- Good error handling

**Minor Enhancement Needed:**

```typescript
// siteProvision.ts Line 111-130 - Uses localStorage directly
// Should use wpSiteStore instead for consistency

// CURRENT
localStorage.setItem('ifrit_wordpress_sites', JSON.stringify(sites));

// SHOULD BE
import { useWPSitesStore } from '@/features/wordpress';
// ... then use store's addSite method
```

---

## Part 2: Separation of Concerns - Refactoring Guide

### 2.1 The Problem: Stores Doing Business Logic

**Anti-Pattern Found Throughout:**

```typescript
// Store methods that fetch data, call APIs, do complex logic
const useXxxStore = create((set, get) => ({
    doComplexThing: async () => {
        const data = await fetch('/api/something');  // ❌ Store fetching
        const processed = complexProcessing(data);   // ❌ Store processing
        set({ result: processed });
    }
}));
```

**Correct Pattern:**

```
┌─────────────────────────────────────────────────────────────┐
│  UI Components                                              │
│  - Display data from stores                                 │
│  - Call actions/services on user interaction                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Services (lib/services/ or feature/lib/)                   │
│  - Business logic                                           │
│  - API calls                                                │
│  - Data transformation                                      │
│  - Orchestration                                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Stores (model/)                                            │
│  - Pure state management                                    │
│  - Simple CRUD on state                                     │
│  - NO async operations                                      │
│  - NO business logic                                        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Files Needing SoC Refactoring

| File | Issue | Action |
|------|-------|--------|
| `huntStore.ts` | `purchaseAndGenerateProfile` has API calls | Extract to `huntService.ts` |
| `campaignStore.ts` | `getDueCampaigns` has scheduling logic | Extract to `campaignScheduler.ts` |
| `wpSiteStore.ts` | `loadHuntProfile` has cross-feature logic | Extract to `wpSiteService.ts` |
| `generators.ts` | Does too many things | Split into focused modules |
| `processor.ts` | Monolithic pipeline | Create `PipelineRunner` class |

---

## Part 3: Function Enhancement Proposals

### 3.1 Hunt Feature Enhancements

#### Enhancement 1: Trend Scanning Aggregation

**Current:** Each source scanned separately, results merged in UI

**Enhanced:** Add intelligent deduplication and scoring

```typescript
// features/hunt/lib/trendAggregator.ts
export interface AggregatedTrend {
    topic: string;
    sources: string[];           // Which sources found this
    combinedScore: number;       // Higher if multiple sources
    firstSeen: number;
    momentum: 'rising' | 'stable' | 'falling';
}

export function aggregateTrends(rawTrends: TrendItem[]): AggregatedTrend[] {
    // Group by similar topic (fuzzy matching)
    // Score based on source count and recency
    // Calculate momentum from timestamp patterns
}
```

#### Enhancement 2: Keyword Clustering

**Current:** Keywords listed flat

**Enhanced:** Cluster by intent and topic

```typescript
// features/hunt/lib/keywordClusterer.ts
export interface KeywordCluster {
    name: string;
    intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
    keywords: EnrichedKeyword[];
    avgCPC: number;
    totalVolume: number;
}

export function clusterKeywords(keywords: EnrichedKeyword[]): KeywordCluster[] {
    // Group by semantic similarity
    // Classify intent per cluster
    // Calculate cluster metrics
}
```

### 3.2 Campaign Feature Enhancements

#### Enhancement 1: Pipeline Checkpointing

**Current:** Pipeline fails = start over

**Enhanced:** Resume from last successful stage

```typescript
// features/campaigns/lib/pipelineCheckpoint.ts
export interface Checkpoint {
    runId: string;
    itemId: string;
    completedStages: string[];
    stageData: Record<string, unknown>;  // Output from each stage
    lastUpdated: number;
}

export function saveCheckpoint(checkpoint: Checkpoint): void;
export function loadCheckpoint(runId: string, itemId: string): Checkpoint | null;
export function resumeFromCheckpoint(checkpoint: Checkpoint): PipelineContext;
```

#### Enhancement 2: Content Quality Scoring

**Current:** Content generated and published without quality check

**Enhanced:** Score content before publishing

```typescript
// features/campaigns/lib/contentQualityScorer.ts
export interface QualityScore {
    overall: number;          // 0-100
    readability: number;      // Flesch-Kincaid
    uniqueness: number;       // Compared to what we've published before
    seoScore: number;         // Keyword density, headings, etc.
    humanness: number;        // AI detection likelihood
    issues: QualityIssue[];
}

export function scoreContent(html: string, targetKeywords: string[]): QualityScore {
    // Calculate readability metrics
    // Check SEO best practices
    // Run through humanness checks
    // Return actionable score
}

// In processor.ts
if (qualityScore.overall < campaign.minQualityScore) {
    // Regenerate or flag for review
}
```

#### Enhancement 3: Image Generation Resilience

**Current:** Sequential fallback on image failure

**Enhanced:** Parallel attempts with smart selection

```typescript
// features/campaigns/lib/imageGenerator.ts

export async function generateImageWithFallbacks(
    topic: string,
    options: ImageOptions
): Promise<ImageResult> {
    // Run all sources in parallel with timeout
    const results = await Promise.allSettled([
        generateWithGemini(topic, options),
        searchUnsplash(topic, options),
        searchPexels(topic, options),
    ]);
    
    // Score results by relevance and quality
    const bestResult = selectBestImage(results);
    
    return bestResult || { success: false, error: 'All sources failed' };
}
```

### 3.3 WordPress Feature Enhancements

#### Enhancement 1: Site Health Monitoring

**Current:** Manual connection test

**Enhanced:** Continuous health tracking

```typescript
// features/wordpress/lib/siteHealthMonitor.ts
export interface SiteHealth {
    siteId: string;
    lastCheck: number;
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
    issues: HealthIssue[];
    uptime7d: number;        // Percentage
    uptime30d: number;
}

export async function checkSiteHealth(site: WPSite): Promise<SiteHealth> {
    const start = Date.now();
    const result = await testConnection(site);
    const responseTime = Date.now() - start;
    
    return {
        siteId: site.id,
        lastCheck: Date.now(),
        status: result.connected ? (responseTime > 3000 ? 'degraded' : 'healthy') : 'down',
        responseTime,
        issues: identifyIssues(result, responseTime),
        // ...uptime from history
    };
}
```

#### Enhancement 2: Bulk Operations

**Current:** One site at a time

**Enhanced:** Batch operations across sites

```typescript
// features/wordpress/lib/bulkOperations.ts
export async function bulkPublish(
    posts: Array<{ siteId: string; content: WPPostInput }>
): Promise<BulkResult[]> {
    // Group by site
    // Execute in parallel per site (sequential within site to avoid rate limits)
    // Aggregate results
}

export async function bulkSyncMetadata(siteIds: string[]): Promise<SyncResult[]> {
    // Parallel metadata sync for all sites
}
```

---

## Part 4: Code Quality Improvements

### 4.1 Type Safety Issues

| File | Issue | Fix |
|------|-------|-----|
| `generators.ts:300` | `Buffer.from()` without type check | Add `ArrayBuffer | Uint8Array` union type |
| `processor.ts:80` | `any` types in error handling | Define `PipelineError` type |
| `campaignEnrichment.ts:79` | Loose `unknown` casting | Use proper generics |
| `huntStore.ts:454` | Type assertion `as Partial<HuntStore>` | Use Zod validation |

### 4.2 Error Handling Improvements

**Current Pattern (scattered):**

```typescript
try {
    const result = await someOperation();
} catch (error) {
    console.error('Failed:', error);  // Just logs
    return { success: false, error: 'Something went wrong' };  // Generic
}
```

**Enhanced Pattern:**

```typescript
// lib/errors/index.ts
export class IfritError extends Error {
    constructor(
        message: string,
        public code: ErrorCode,
        public context?: Record<string, unknown>,
        public recoverable: boolean = false
    ) {
        super(message);
    }
}

export class ContentGenerationError extends IfritError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'CONTENT_GENERATION_FAILED', context, true);
    }
}

// In generators.ts
try {
    const result = await generateContent(...);
} catch (error) {
    throw new ContentGenerationError(
        `Failed to generate content for "${topic}"`,
        { originalError: error, topic, campaign: campaign.id }
    );
}
```

### 4.3 Function Size Standards

Functions over 50 lines should be broken down:

| Function | Lines | Should Split Into |
|----------|-------|------------------|
| `publishToWordPress` | 120 | `uploadImages`, `injectMedia`, `createPost` |
| `purchaseAndGenerateProfile` | 80 | `createOwnedDomain`, `generateProfile`, `updateStore` |
| `runTranslationPipeline` | 180 | `fetchSourcePosts`, `translatePost`, `postProcess`, `publishTranslation` |

---

## Part 5: Immediate Priorities

### Priority 1: Separation of Concerns (Week 1)

1. Extract business logic from stores into services
2. Create clear service layer for each feature
3. Stores become pure state containers

### Priority 2: Function Enhancement (Week 2)

1. Add pipeline checkpointing
2. Implement content quality scoring
3. Add parallel image generation

### Priority 3: Code Quality (Week 3)

1. Fix type safety issues
2. Implement consistent error handling
3. Break down large functions

### Priority 4: Legacy Websites Separation (Week 4)

1. Audit all shared code between Websites and WP Sites
2. Create clear boundaries
3. Document which is which

### Priority 5: Supabase Integration (LAST)

1. Design schema based on finalized data models
2. Implement Supabase client
3. Add Supabase Auth
4. Migrate stores to Supabase

---

## Appendix: Files to Create

### New Service Files

```
features/
├── campaigns/
│   └── lib/
│       ├── campaignService.ts      # Business logic extracted from store
│       ├── pipelineRunner.ts       # Orchestrates pipeline stages
│       ├── pipelineCheckpoint.ts   # Save/resume pipeline state
│       ├── contentQualityScorer.ts # Score content before publish
│       └── imageGenerator.ts       # Parallel image generation
├── hunt/
│   └── lib/
│       ├── huntService.ts          # Business logic from store
│       ├── trendAggregator.ts      # Smart trend merging
│       └── keywordClusterer.ts     # Keyword grouping
├── wordpress/
│   └── lib/
│       ├── wpSiteService.ts        # Business logic from store
│       ├── siteHealthMonitor.ts    # Health checking
│       └── bulkOperations.ts       # Batch operations
└── lib/
    └── errors/
        └── index.ts                # Error types
```
