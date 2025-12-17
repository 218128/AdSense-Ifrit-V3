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
