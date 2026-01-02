# Hunt Feature - Architecture

## Overview

The Hunt feature enables domain discovery and analysis for AdSense-optimized websites.

```
┌─────────────────────────────────────────────────────────────────┐
│                         HUNT DASHBOARD                          │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  KeywordsNiches │  DomainAcquire  │      FlipPipeline          │
│  (Research)     │  (Find/Buy)     │      (Flip Workflow)       │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

## Subtabs

### 1. KeywordsNiches
- **TrendScanner**: Real-time trend detection (HN, Google News, etc.)
- **KeywordHunter**: CSV import + keyword analysis
- **Output**: Selected keywords → Domain search

### 2. DomainAcquire  
- **ExpiredDomainFinder**: SpamZilla imports
- **QuickAnalyzer**: Domain scoring with AI
- **PurchaseQueue**: Watchlist management
- **Output**: Analyzed domains → Profile generation

### 3. FlipPipeline
- Purchased domains workflow
- Development tracking
- Flip readiness scoring

## AI Integration Pattern

**IMPORTANT:** Features are AGNOSTIC to AI providers.

```
┌─────────────────────────────────────────────────────────────────┐
│ HUNT FEATURE                                                    │
│                                                                 │
│  ► Prepares INPUT only (prompt, config)                        │
│  ► Calls /api/capabilities/[capability]                        │
│  ► Does NOT know which AI provider executes                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ CAPABILITIES SYSTEM                                             │
│                                                                 │
│  ► Reads user's handler preferences (from Settings)            │
│  ► Manages API keys (from store)                               │
│  ► Handles retry logic + fallbacks                             │
│  ► Returns result to feature                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Key API Endpoints

| Endpoint | Purpose | Capability Used |
|----------|---------|-----------------|
| `/api/domain-profiles/generate` | Generate domain profile | `generate` |
| `/api/capabilities/generate` | Generic AI generation | - |
| `/api/capabilities/research` | Research with citations | - |
| `/api/capabilities/analyze` | Domain/niche analysis | - |

## Data Flow

```
Keyword Selection
       │
       ▼
Domain Search (external: SpamZilla, auctions)
       │
       ▼
AI Analysis ──► /api/capabilities/analyze
       │
       ▼
Domain Profile (saved to store)
       │
       ▼
Website Creation (WP Sites)
```

## Critical Files

| File | Purpose |
|------|---------|
| `components/hunt/HuntDashboard.tsx` | Main container |
| `components/hunt/subtabs/KeywordsNiches/` | Keyword research |
| `components/hunt/subtabs/DomainAcquire/` | Domain finding |
| `components/hunt/subtabs/FlipPipeline/` | Flip workflow |
| `app/api/domain-profiles/generate/route.ts` | AI profile generation |

## Hooks

| Hook | Purpose |
|------|---------|
| `useDomainAnalysis` | Analyze single domain |
| `useProfileGeneration` | Save domain profile |
| `useWatchlist` | Domain watchlist |

## Store

Hunt uses `lib/domainProfileStore.ts` for persisting:
- Analyzed domains
- Generated profiles
- Watchlist items
