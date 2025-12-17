# File Index

Quick reference for key files in AdSense Ifrit.

## Core Files

| File | Lines | Purpose |
|------|-------|---------|
| `lib/websiteStore.ts` | ~1100 | Data layer - all CRUD operations |
| `components/websites/WebsiteDetail.tsx` | ~1100 | Main website management UI |
| `app/api/websites/create/route.ts` | ~150 | Website creation orchestrator |

## Components

| Path | Purpose |
|------|---------|
| `components/dashboard/DashboardView.tsx` | Main dashboard with stats |
| `components/websites/WebsitesView.tsx` | Website list page |
| `components/websites/WebsiteDetail.tsx` | Website detail tabs |
| `components/websites/PagesTab.tsx` | Structural pages management |
| `components/websites/PendingImports.tsx` | Drafts folder import UI |
| `components/websites/SmartDropZone.tsx` | Drag-and-drop article upload |
| `components/hunt/HuntDashboard.tsx` | Domain hunting tools |
| `components/settings/SettingsView.tsx` | Settings panel |

## APIs

| Path | Methods | Purpose |
|------|---------|---------|
| `app/api/websites/route.ts` | GET, POST | List/create websites |
| `app/api/websites/[domain]/route.ts` | GET, DELETE | Get/delete website |
| `app/api/websites/[domain]/content/route.ts` | GET, POST | Articles CRUD |
| `app/api/websites/[domain]/pages/route.ts` | GET, POST | Structural pages |
| `app/api/websites/[domain]/drafts/route.ts` | GET, POST | Hot folder imports |
| `app/api/publish/route.ts` | POST | Push to GitHub |
| `app/api/site-builder/route.ts` | GET, POST, PATCH, DELETE | Site building jobs |
| `app/api/generate-site-content/route.ts` | GET, POST | AI content generation |

## Templates

| File | Purpose |
|------|---------|
| `lib/templates/nicheAuthorityBlog.ts` | Default blog template |
| `lib/templates/topicalMagazine.ts` | Magazine-style template |
| `lib/templates/expertHub.ts` | Expert/authority template |

## Integrations

| File | Purpose |
|------|---------|
| `lib/integrations/github.ts` | GitHub API client |
| `lib/integrations/vercel.ts` | Vercel API client |
| `lib/integrations/namecheap.ts` | Namecheap domain API |
| `lib/integrations/devto.ts` | Dev.to syndication |

## Utilities

| File | Purpose |
|------|---------|
| `lib/essentialPages.ts` | Generate About/Contact/Privacy |
| `lib/siteBuilder/processor.ts` | Content queue processor |
| `lib/siteBuilder/types.ts` | Type definitions |
| `lib/seo/trafficAcquisition.ts` | SEO utilities |
| `lib/formatting/schemaOrg.ts` | Schema.org markup |

## Config Files

| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js configuration |
| `tsconfig.json` | TypeScript config |
| `package.json` | Dependencies |
| `CONTRIBUTING.md` | Coding guidelines |
