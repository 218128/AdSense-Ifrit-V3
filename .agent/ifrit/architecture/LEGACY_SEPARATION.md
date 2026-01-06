# Legacy Websites vs WP Sites - Module Boundaries

> ⚠️ **Important**: These are two completely separate systems. Do NOT mix imports.

## System Overview

| System | Purpose | Status |
|--------|---------|--------|
| **Legacy Websites** | GitHub + Vercel static sites | Deprecated (maintenance only) |
| **WP Sites** | Hostinger WordPress sites | Active development |

---

## Legacy Websites System

> **Deprecated** - Do not use for new features

### File Locations

```
lib/
├── websiteStore.ts          # Entry point (DEPRECATED)
└── websiteStore/
    ├── index.ts             # Public exports
    ├── types.ts             # Website type definitions
    ├── articleCrud.ts       # Article operations
    ├── pageCrud.ts          # Page operations
    ├── themeCrud.ts         # Theme management
    ├── pluginCrud.ts        # Plugin management
    ├── profileCrud.ts       # Site profile CRUD
    ├── versionControl.ts    # Git versioning
    ├── migration.ts         # Data migration
    ├── paths.ts             # File path utilities
    ├── selectiveDeploy.ts   # Partial deployment
    └── externalContent.ts   # External content fetching

websites/
└── [domain]/               # Per-site data storage
    ├── articles/           # Markdown articles
    ├── pages/              # Static pages
    └── profile.json        # Site configuration

app/api/websites/
├── route.ts                # List/Create endpoints
├── [domain]/               # Domain-specific routes
│   ├── route.ts            # GET/PUT/DELETE site
│   ├── articles/           # Article CRUD
│   ├── pages/              # Page CRUD
│   ├── deploy/             # Vercel deployment
│   ├── generate/           # Content generation
│   └── ...
├── create/                 # Site creation
└── migrate/                # Migration utilities

components/websites/
├── WebsitesView.tsx        # Main legacy view
└── WebsiteDetail.tsx       # Legacy site detail
```

### Key Features (LEGACY)
- GitHub repository creation
- Vercel project deployment
- Markdown file-based content
- Next.js theme templates
- Git version control

---

## WP Sites System (Modern)

> **Active** - Use for all new WordPress features

### File Locations

```
features/wordpress/
├── index.ts                # Public barrel exports
├── model/
│   ├── wpSiteStore.ts      # Zustand store (state only)
│   ├── wpSiteTypes.ts      # TypeScript types
│   └── types.ts            # Additional types
├── lib/
│   ├── wpSiteService.ts    # Business logic (NEW)
│   ├── wordpressApi.ts     # WP REST API client
│   ├── adsenseChecker.ts   # AdSense readiness
│   └── wpContentPrompts.ts # Content prompts
├── api/
│   └── wordpressApi.ts     # Direct WP API calls
└── ui/
    ├── WPSitesDashboard.tsx
    ├── WPSiteCard.tsx
    └── ...

features/hosting/
├── lib/
│   ├── hostingerMcp.ts     # Hostinger API
│   └── siteProvision.ts    # Site provisioning
└── ui/
    └── HostingerHealthDashboard.tsx

app/api/wp-sites/           # Minimal API routes
├── route.ts                # WP Sites list
└── [id]/                   # Site-specific routes

app/api/hosting/            # Hostinger routes
├── route.ts
└── provision/
```

### Key Features (MODERN)
- Hostinger WordPress hosting
- WordPress REST API integration
- Hunt data integration
- AdSense readiness scoring
- Campaign publishing

---

## Cross-Reference Prevention

### ❌ NEVER DO THIS

```typescript
// In features/wordpress files - WRONG!
import { listWebsites } from '@/lib/websiteStore';

// In lib/websiteStore files - WRONG!
import { useWPSitesStore } from '@/features/wordpress';
```

### ✅ CORRECT PATTERNS

```typescript
// WP Sites feature uses its own imports
import { useWPSitesStore } from '@/features/wordpress';
import { publishToWordPress } from '@/features/campaigns/lib/wpPublisher';

// Legacy uses its own imports
import { listWebsites, saveWebsite } from '@/lib/websiteStore';
```

---

## Route Ownership

| Route | Owner | Purpose |
|-------|-------|---------|
| `/api/websites/*` | Legacy | Static site management |
| `/api/wp-sites/*` | WP Sites | WordPress site management |
| `/api/hosting/*` | Hosting | Hostinger provisioning |
| `/api/capabilities/*` | Shared | AI capabilities |

---

## localStorage Keys

| Key | Owner | Purpose |
|-----|-------|---------|
| `ifrit_wordpress_sites` | WP Sites | WordPress sites state |
| `wp-sites-storage` | WP Sites | New wpSiteStore state |
| (file-based) | Legacy | Uses `websites/` directory |

---

## Migration Path

Legacy Websites → WP Sites migration is NOT automatic.

To migrate a legacy site:
1. Create new WP Site in features/wordpress
2. Export content from legacy markdown
3. Publish to WordPress via campaigns
4. Keep legacy for reference (do not delete)

---

## Summary

| Aspect | Legacy Websites | WP Sites |
|--------|-----------------|----------|
| **Store** | `lib/websiteStore/` | `features/wordpress/model/` |
| **Service** | None | `features/wordpress/lib/wpSiteService.ts` |
| **API** | `/api/websites/` | `/api/wp-sites/` |
| **Storage** | File system | localStorage/Supabase |
| **Status** | Deprecated | Active |
