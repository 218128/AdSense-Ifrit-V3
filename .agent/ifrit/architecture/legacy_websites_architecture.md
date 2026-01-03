# Legacy Websites Architecture

> [!CAUTION]
> This system is **DEPRECATED**. Use WP Sites (`features/wordpress/`) for new development.

## Purpose
Custom Next.js websites deployed via GitHub + Vercel. Original system before WordPress/Hostinger integration.

---

## Location

```
components/websites/     # @legacy - UI components
├── WebsitesView.tsx     # Main dashboard
├── WebsiteDetail.tsx    # Per-site management (68KB!)
└── templates/           # Next.js site templates

lib/websiteStore.ts      # Filesystem-based data

/api/websites/           # @legacy - 24+ endpoints
├── route.ts
├── create/
├── migrate/
└── [domain]/...
```

---

## Data Model

```typescript
interface Website {
    domain: string;       // Primary key
    template: { id, version };
    deployment: { githubRepo, vercelProject, liveUrl };
    stats: { articlesCount, totalWords };
    status: 'setup' | 'building' | 'active' | 'error';
}
```

**Storage**: Local filesystem at `websites/{domain}/`

---

## When to Use

| Use Case | System |
|----------|--------|
| New AdSense sites | **WP Sites** |
| Hostinger hosting | **WP Sites** |
| Existing Legacy sites | Legacy (maintenance only) |
| GitHub template sites | Legacy |

---

## Migration Path

For future migration of Legacy sites to WP Sites:
1. Export content from Legacy storage
2. Create WP Site on Hostinger
3. Import articles via WP REST API
4. Update DNS to new host
