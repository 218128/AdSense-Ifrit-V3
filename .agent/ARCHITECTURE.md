# AdSense Ifrit - Architecture

## System Overview

**Ifrit** is a Next.js 16 application that acts as a "Factory" for generating and managing AdSense-optimized blog websites.

```
┌─────────────────────────────────────────────────────────────┐
│                      IFRIT APP (Factory)                     │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   Dashboard  │   Websites   │    Hunt      │   Settings     │
│   (Stats)    │   (CRUD)     │  (Domains)   │  (API Keys)    │
└──────────────┴──────────────┴──────────────┴────────────────┘
        │               │               │
        ▼               ▼               ▼
┌───────────────────────────────────────────────────────────┐
│                    lib/ (Business Logic)                   │
├───────────────┬─────────────────┬─────────────────────────┤
│ websiteStore  │    templates/   │    integrations/        │
│ (Data Layer)  │ (Site Generators)│ (GitHub, Vercel, etc.) │
└───────────────┴─────────────────┴─────────────────────────┘
        │                               │
        ▼                               ▼
┌─────────────────┐            ┌─────────────────────────┐
│ websites/{domain}│           │   External Services      │
│ (Local Storage)  │           │ GitHub, Vercel, Namecheap│
└─────────────────┘            └─────────────────────────┘
```

## Directory Structure

```
AdSense Ifrit V2/
├── app/                    # Next.js App Router
│   ├── api/                # API endpoints
│   │   ├── websites/       # Website CRUD APIs
│   │   ├── generate/       # AI content generation
│   │   ├── publish/        # GitHub publishing
│   │   └── site-builder/   # Automated site building
│   ├── page.tsx            # Dashboard (entry point)
│   └── layout.tsx          # Root layout
│
├── components/             # React UI components
│   ├── dashboard/          # Dashboard views
│   ├── websites/           # Website management UI
│   ├── hunt/               # Domain hunting tools
│   └── settings/           # Settings panel
│
├── lib/                    # Core business logic
│   ├── websiteStore.ts     # Filesystem data layer (CRITICAL)
│   ├── templates/          # Site generation templates
│   ├── integrations/       # External API clients
│   ├── siteBuilder/        # Content generation engine
│   └── seo/                # SEO utilities
│
├── websites/               # Per-website data storage
│   └── {domain}/
│       ├── metadata.json   # Website config
│       ├── content/
│       │   ├── articles/   # Blog articles (JSON)
│       │   └── pages/      # Structural pages (JSON)
│       └── versions/       # Template version history
│
└── .agent/                 # AI agent documentation
```

## Key Concepts

### 1. Website Lifecycle
```
Setup → Building → Active → Publishing
  │         │         │          │
  │         │         │          └─ Push to GitHub
  │         │         └─ Content management
  │         └─ AI generates initial content
  └─ Create on GitHub + Vercel
```

### 2. Content Types
- **Articles**: Blog posts (pageType: 'article')
- **Structural Pages**: About, Contact, Privacy (pageType: 'structural')
- **Homepage**: Main landing page (pageType: 'homepage')

### 3. Data Storage
All data is stored locally in `websites/{domain}/` folders:
- No database required
- JSON files for articles and metadata
- Git-friendly for version control

## Critical Files

| File | Purpose | Touch with Care |
|------|---------|-----------------|
| `lib/websiteStore.ts` | All data operations | ⚠️ High |
| `lib/templates/*.ts` | Site generators | ⚠️ High |
| `app/api/websites/create/route.ts` | Website creation orchestrator | ⚠️ High |
| `components/websites/WebsiteDetail.tsx` | Main website management UI | Medium |

## API Pattern

All APIs follow this pattern:
```typescript
// app/api/{resource}/route.ts
export async function GET(request: NextRequest) { ... }
export async function POST(request: NextRequest) { ... }

// Response format
{ success: boolean, data?: any, error?: string }
```

## Component Pattern

```typescript
// components/{feature}/ComponentName.tsx
'use client';
import { useState, useEffect } from 'react';

interface Props { ... }

export default function ComponentName({ ... }: Props) {
    // State
    // Effects
    // Handlers
    // Render
}
```

## State Management

The app uses **Zustand** for global state management:

| Store | Purpose | File |
|-------|---------|------|
| `settingsStore` | API keys, integrations, MCP config | `stores/settingsStore.ts` |
| `websiteStore` | Website metadata, articles | `stores/websiteStore.ts` |
| `trendStore` | Trend scanner state | `stores/trendStore.ts` |

> **Important**: Use Zustand stores instead of `localStorage` for consistency. See bug fixes C3, C9.

## Recent Updates (Dec 2025)

### Bug Fix Initiative
20 bugs fixed across 5 phases:
- **Phase 1**: MCP research format, API key detection, static images route
- **Phase 2**: Save refined articles, article settings, delete feedback
- **Phase 3**: Toggle CSS, editor z-index, publish buttons UX
- **Phase 4**: localStorage→Zustand migration, error UI, auto-clear messages
- **Phase 5**: Brave key store, publish confirmation

### Key Patterns Established
1. **API Keys**: Always get from `useSettingsStore`, not localStorage
2. **Error Feedback**: Use state (e.g., `syncMessage`) with auto-clear after 5s
3. **Bulk Actions**: Always show confirmation dialog (`confirm()`)
4. **Modals**: Use `z-[100]` for proper stacking above other content
5. **Props**: Pass website-level config (author, categories) to child components
