# WP Sites Feature Architecture

## Purpose
WordPress site management for Hostinger-hosted sites optimized for AdSense approval.

---

## FSD Structure

```
features/wordpress/
├── index.ts              # Barrel exports
├── api/
│   └── wordpressApi.ts   # WP REST API client
├── lib/
│   ├── wpContentPrompts.ts   # Content generation prompts
│   ├── adsenseChecker.ts     # AdSense readiness checks
│   └── recommendedStacks.ts  # Theme/plugin recommendations
├── model/
│   ├── wpSiteStore.ts    # Main Zustand store
│   ├── wpSiteTypes.ts    # Type definitions
│   └── types.ts          # API types
└── ui/
    ├── WPSitesDashboard.tsx
    ├── WPSiteCard.tsx
    ├── AddWPSiteModal.tsx
    └── AdSenseReadinessDashboard.tsx
```

---

## Key Types

```typescript
interface WPSite {
    id: string;
    url: string;
    niche: string;
    siteType: 'blog' | 'affiliate' | 'news' | 'ecommerce';
    
    // Credentials
    username: string;
    appPassword: string;
    
    // AdSense Tracking
    adsenseStatus: 'not-applied' | 'pending' | 'approved' | 'rejected';
    hasAboutPage: boolean;
    hasPrivacyPolicy: boolean;
    hasTermsOfService: boolean;
    
    // Hostinger
    provisionedVia?: 'hostinger-mcp' | 'manual';
}
```

---

## Data Flow

```mermaid
flowchart LR
    A[Hunt Domains] --> B[Hostinger Provision]
    B --> C[wpSiteStore]
    D[Campaigns] --> E[Content Generation]
    E --> F[/api/capabilities/generate]
    F --> G[WP REST API]
    G --> H[Published Post]
```

---

## API Routes

| Route | Purpose |
|-------|---------|
| `/api/wp-sites` | Health check, WP Sites info |
| `/api/hosting/provision` | Hostinger site creation |
| `/api/hosting/orders` | List Hostinger orders |
| `/api/capabilities/generate` | AI content (unified) |

---

## Content Generation

Uses dedicated prompt system in `wpContentPrompts.ts`:
- Pillar articles, How-To, Listicle, Review, Comparison, News
- Variable interpolation: `{{SITE_NAME}}`, `{{NICHE}}`, etc.
- Humanization config for natural content

---

## Import Patterns

```typescript
// Recommended: Feature barrel
import { 
    useWPSitesStore, 
    WPSitesDashboard,
    createPost 
} from '@/features/wordpress';

// Legacy adapter for Hunt integration
import { useWPSitesLegacy } from '@/features/wordpress';
```
