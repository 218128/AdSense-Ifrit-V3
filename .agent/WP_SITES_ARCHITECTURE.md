# WP Sites Architecture

WordPress Sites feature architecture - separate from Legacy Websites (GitHub/Vercel).

---

## Overview

WP Sites is the WordPress-based site management feature designed for AdSense monetization.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           WP Sites System                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │
│  │   Hostinger │    │   WordPress │    │   Campaigns │                  │
│  │     MCP     │───▶│    REST API │◀───│   Feature   │                  │
│  └─────────────┘    └──────┬──────┘    └─────────────┘                  │
│         │                  │                   │                         │
│         │    Provisions    │    Publishes      │    Generates            │
│         ▼                  ▼                   ▼                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        WPSite Entity                             │    │
│  │  • AdSense readiness tracking                                    │    │
│  │  • Essential pages status                                        │    │
│  │  • Plugin/theme recommendations                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
features/wordpress/
├── model/
│   ├── wpSiteTypes.ts       # Type definitions (WPSite, WPArticle, etc.)
│   ├── types.ts             # Legacy types (being merged)
│   └── wordpressStore.ts    # Zustand store (being replaced)
├── lib/
│   ├── wpContentPrompts.ts  # Editable prompt templates
│   ├── recommendedStacks.ts # Theme/plugin recommendations
│   └── [future] adsenseChecker.ts
├── api/
│   └── wordpressApi.ts      # WP REST API calls
└── ui/
    ├── WPSitesDashboard.tsx # Main dashboard
    ├── WPSiteCard.tsx       # Site card component
    └── AddWPSiteModal.tsx   # Add site modal

features/hosting/
├── lib/
│   ├── hostingerMcp.ts      # Hostinger MCP integration
│   └── siteProvision.ts     # Site provisioning logic
└── ui/
    └── HostingerHealthDashboard.tsx
```

---

## Key Types

### WPSite

Main entity representing a connected WordPress site.

| Category | Fields |
|----------|--------|
| Identity | id, name, url, niche, siteType |
| Credentials | username, appPassword |
| Status | status, lastError, lastCheckedAt |
| AdSense | adsenseStatus, adsensePublisherId, adsTxtConfigured, sslEnabled |
| Stats | articleCount, publishedArticleCount, totalWordCount |
| Essential Pages | hasAboutPage, hasContactPage, hasPrivacyPolicy, hasTermsOfService |
| Theme/Plugins | activeTheme, installedPlugins, seoPluginActive, adsPluginActive |
| Hostinger | hostingProvider, hostingerAccountId, provisionedVia |

### WPArticle

Content entity for articles published to WP sites.

| Category | Fields |
|----------|--------|
| Identity | id, siteId, wpPostId, wpPostUrl |
| Content | title, content, excerpt, slug |
| Taxonomy | categoryId, tagIds, authorId |
| SEO | metaTitle, metaDescription, focusKeyword, schemaType |
| Generation | source, aiProvider, wordCount, humanizationApplied |
| Status | localStatus, wpStatus, publishedAt |

### HumanizationConfig

Settings for making AI content more human-like.

```typescript
interface HumanizationConfig {
    removeAIPatterns: boolean;     // Remove "Certainly", "Indeed"
    addContractions: boolean;      // "It is" → "It's"
    addConversationalHooks: boolean;
    varySentenceLength: boolean;
    injectOpinions: boolean;
    intensityLevel: 'light' | 'moderate' | 'heavy';
    addEEATSignals: boolean;
    addFirstHandExperience: boolean;
}
```

---

## Prompt System

Prompts are **exposed and editable** - users can customize templates.

### Available Variables

| Variable | Description |
|----------|-------------|
| `{{SITE_NAME}}` | Site display name |
| `{{NICHE}}` | Topic area |
| `{{TARGET_AUDIENCE}}` | Audience description |
| `{{AUTHOR_NAME}}` | Author name |
| `{{AUTHOR_ROLE}}` | Author role |
| `{{TOPIC}}` | Article topic |
| `{{KEYWORDS}}` | Target keywords |
| `{{WORD_COUNT}}` | Target word count |

### Template Types

- **pillar** - Comprehensive guides (3000-5000 words)
- **how-to** - Step-by-step tutorials (1500-2500 words)
- **listicle** - List articles (1500-2000 words)
- **review** - Product reviews (2000-3000 words)
- **comparison** - A vs B articles (2000-2500 words)
- **news** - News articles (800-1200 words)

---

## Hostinger Integration

### Provisioning Flow

```
1. User selects domain from Hunt
          │
          ▼
2. Fetch Hostinger orders via MCP
   POST /api/hosting/orders
          │
          ▼
3. Provision WordPress site
   POST /api/hosting/provision
   • Install WordPress
   • Configure admin user
   • Auto-install plugins (RankMath, Ad Inserter)
   • Auto-install theme
          │
          ▼
4. Add to WP Sites
   • Create WPSite entity
   • Set provisionedVia: 'hostinger-mcp'
          │
          ▼
5. Ready for content
```

### API Routes

| Endpoint | Purpose |
|----------|---------|
| `GET /api/hosting/orders` | List Hostinger hosting plans |
| `POST /api/hosting/provision` | Provision new WP site |
| `GET /api/hosting/health` | Check site health |

---

## AdSense Readiness

Automated checks for AdSense approval:

### Required (Must Pass)
- ≥15 published articles
- Average word count ≥500
- About page exists
- Privacy policy exists
- Terms of service exists
- Contact page exists
- SSL enabled

### Recommended
- SEO plugin active (Rank Math/Yoast)
- Ads plugin installed
- Cache plugin for speed
- Mobile responsive theme

---

## Campaigns Integration

Campaigns publish to WP Sites via:

```typescript
campaign.targetSiteId → WPSite.id
campaign.targetCategoryId → WPCategory.id
campaign.postStatus → WPPostStatus
```

Campaign pipeline calls:
1. `features/wordpress/api/wordpressApi.ts` → `createPost()`
2. `uploadMedia()` for images
3. Update article status on success

---

## Comparison: WP Sites vs Legacy Websites

| Aspect | WP Sites | Legacy Websites |
|--------|----------|-----------------|
| Platform | WordPress/Hostinger | GitHub/Vercel |
| CMS | WordPress REST API | Static files |
| Deployment | Hostinger MCP | Vercel API |
| Themes | WP themes | Custom Next.js templates |
| Location | `features/wordpress/` | `components/websites/` |
| Status | Active development | Deprecated |
