# Hunt Feature Deep Architecture Audit

## Executive Summary

The Hunt feature has 3 subtabs (KeywordsNiches, DomainAcquire, FlipPipeline) using 4 Zustand stores. Critical issues found: Research results stored in local state (lost), CSV parser not smart, data passed between components loses rich attributes, duplicate stores.

---

## 1. TRENDSCANNER

### Data Acquired
```
TrendItem {
  topic: string        // ✅ Served
  context: string      // ✅ Served  
  source: string       // ❌ Lost when passed to DomainAcquire
  sourceType: string   // ❌ Lost
  cpcScore: number     // ❌ Lost
  niche: string        // ❌ Lost
  url: string          // ❌ Lost
}
```

### Data Flow
```
[Scan Trends] → POST /api/trends/multi-source
              → trendStore.trends[] (in memory during session)
              → UI displays TrendCard

[Research] → POST /api/research (Perplexity MCP)
           → keyFindings returned
           → useState researchResults ← ❌ LOST ON UNMOUNT
           → NO PERSISTENCE

[Analyze Selected] → onSelectKeywords([topic1, topic2])
                   → Passes to DomainAcquire tab
                   → Only string[] passed ← ❌ LOSES cpcScore, niche, url
```

### Storage
| What | Where | Persists |
|------|-------|----------|
| Scanned trends | `trendStore.trends` | ❌ No (ephemeral) |
| Research results | `useState` local | ❌ No (lost on unmount) |
| showTips preference | localStorage | ✅ Yes |

### Issues
1. **Research results lost** - stored in useState, not persisted
2. **Trend data lost** - only `topic` passed to DomainAcquire, not full TrendItem
3. **No scan history** - can't compare with previous scans
4. **Not using Capabilities system** - hardcoded Brave/Perplexity keys

---

## 2. KEYWORDHUNTER

### Data Acquired
```
KeywordItem {
  keyword: string      // ✅ Served
  source: string       // ❌ Lost after analysis
  niche?: string       // ✅ Served  
  context?: string     // ❌ Lost
  difficulty?: string  // ❌ Lost
  searchVolume?: string // ❌ Lost
}
```

### Data Flow
```
[CSV Import] → parseCSV(content)
             → keywordStore.csvKeywords[]
             → UI displays KeywordCard

[Analyze] → POST /api/keywords/analyze
          → keywordStore.analyzedKeywords[]
          → keywordStore.history[] ← ✅ PERSISTED
          → UI displays AnalysisResultCard

[Research] → POST /api/research
           → useState researchResults ← ❌ LOST

[Hunt Domains] → onNavigateToDomains([keyword1, keyword2])
              → Passes to DomainAcquire
              → Only string[] ← ❌ LOSES analysis data
```

### CSV Parser Issues
```typescript
// Current: Expects EXACT column order
keyword, niche, context, difficulty, searchVolume

// Problem: Not smart - rejects any other format
// Should: Auto-detect columns, handle various CSV exports
```

### Storage
| What | Where | Persists |
|------|-------|----------|
| CSV keywords | `keywordStore.csvKeywords` | ✅ Yes (localStorage) |
| Analyzed keywords | `keywordStore.analyzedKeywords` | ✅ Yes |
| Analysis history | `keywordStore.history` | ✅ Yes (last 10) |
| Research results | `useState` local | ❌ No |

### Issues
1. **Research results lost** - same as TrendScanner
2. **No manual entry UI** - component claims it but UI doesn't exist
3. **Hunt Domains loses analysis** - passes keywords, not analysis data
4. **CSV parser not smart** - fails on different column orders
5. **History doesn't save CSV imports** - can't recall previous uploads

---

## 3. CORRECT STORE ARCHITECTURE

### Intended Design
```
┌─────────────────────────────────────────────────────────────┐
│ HUNT TAB                                                    │
├─────────────────────────────────────────────────────────────┤
│  [KeywordsNiches]     [DomainAcquire]      [FlipPipeline]  │
│   ├─TrendScanner       ├─Find/Analyze      ├─FlipTools    │
│   │  → trendStore      │  → domainAcquire  │  → flipStore │
│   └─KeywordHunter      │     Store         │               │
│      → keywordStore    └─Purchase          │               │
│                                                             │
│  ↓ Finalized selections flow to aggregation layer          │
│                                                             │
│  [huntStore] ← Aggregates data for downstream consumers   │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ WP SITES → reads from huntStore (selectedDomains, etc)     │
│ CAMPAIGN → reads from wpSitesStore + huntStore             │
└─────────────────────────────────────────────────────────────┘
```

### Feature Stores (Local State)
| Store | Feature | Purpose |
|-------|---------|---------|
| `trendStore` | TrendScanner | Trends, scan history, research results |
| `keywordStore` | KeywordHunter | Keywords, CSV imports, analysis history |
| `domainAcquireStore` | DomainAcquire | Domain lists, filters, local queues |
| `flipStore` | FlipPipeline | Domains user owns, flip analytics |

### Aggregation Store (Cross-Feature Data)
| Store | Purpose |
|-------|---------|
| `huntStore` | Receives FINALIZED selections from all feature stores |
|             | Provides unified interface for WP Sites & Campaign |

### Current Problem ❌
```
huntStore and domainAcquireStore BOTH have:
  - analyzeQueue[]
  - purchaseQueue[]

This is WRONG - causes data duplication and sync issues
```

### Correct Solution ✅
```
domainAcquireStore:
  - Local workflow queues (Find → Analyze → Purchase workflow)
  
huntStore:
  - Receives FINALIZED purchased domains from domainAcquireStore
  - Receives selected keywords from keywordStore
  - Receives selected trends from trendStore
  - Provides unified data for WP Sites creation

Data Flow:
  domainAcquireStore.markPurchased(domain) 
    → triggers huntStore.addPurchasedDomain(domainData)
```

---

## 4. RESEARCH BUTTON ANALYSIS

### TrendScanner Research
```
handleResearchTrends()
  → Uses aiServices.research() (Capabilities system) ✅
  → Response: { keyFindings: string[] }
  → Saves to trendStore.addResearchResult() ✅
```

### KeywordHunter Research
```
handleResearchTrends()
  → Uses aiServices.research() (Capabilities system) ✅
  → Saves to keywordStore.addResearchResult() ✅
```

---

## 5. CAPABILITIES INTEGRATION ✅ IMPLEMENTED

### Current State
- TrendScanner/KeywordHunter use `aiServices.research()`
- trendStore.scanTrends() uses `aiServices.scanTrends()`
- Handlers registered for: HN, GoogleNews, ProductHunt, Brave, SpamZilla, Wayback

---

## 6. FIXES NEEDED

### Priority 1: Persist Research Results ✅ IMPLEMENTED
```
trendStore.ts: researchResults, addResearchResult(), getResearchForTopic()
keywordStore.ts: researchResults, addResearchResult(), getResearchForKeyword()
```

### Priority 2: Smart CSV Parser ✅ IMPLEMENTED
```
shared/utils/csvParser.ts:
  - Auto-detects Keywords Everywhere, SEMrush, Ahrefs, Moz, Ubersuggest
  - Handles tab/comma delimiters
  - Falls back to first column if no keyword column found
```

### Priority 3: Pass Rich Data to DomainAcquire ✅ IMPLEMENTED
```
trendStore.ts: getSelectedTrendItems() returns full TrendItem[]
TrendScanner: Uses getSelectedTrendItems() for rich data
```

### Priority 4: Store Architecture Fix ✅ IMPLEMENTED
```
huntStore now has DUAL PURPOSE:
1. Workflow state (analyzeQueue, purchaseQueue) for Domain Acquire
2. Aggregation layer for WP Sites & Campaign:
   - purchasedDomains[] 
   - selectedKeywords[]
   - selectedTrends[]
   - addPurchasedDomain(), addSelectedKeywords(), addSelectedTrends()
```

### Priority 5: History Enhancement ✅ IMPLEMENTED
```
TrendScanner: scanHistory with date/time (trendStore.ts lines 31-36, 182-188)
KeywordHunter: csvImportHistory with filename/date (keywordStore.ts lines 31-37, 108-127)
```

### Priority 6: Connect to Capabilities ✅ IMPLEMENTED
```
Created lib/ai/handlers/trendHandlers.ts:
  - hackerNewsHandler (free)
  - googleNewsHandler (free)
  - productHuntHandler (free)
  - braveSearchHandler (API key)

Created lib/ai/handlers/domainHandlers.ts:
  - spamzillaHandler (API key)
  - waybackHandler (free)
  - dnsBlacklistHandler (free)
  - expiredDomainsIOHandler (free)

Added to lib/ai/services/types.ts:
  - trend-scan, domain-search, domain-analyze, wayback-lookup

Added to AIServices.ts:
  - scanTrends(), searchDomains(), analyzeDomain(), waybackLookup()
```

---

## 7. FILES TO MODIFY

| File | Changes |
|------|---------|
| `stores/trendStore.ts` | Add researchResults, persist trends until refresh |
| `stores/keywordStore.ts` | Add researchResults, CSV import history |
| `TrendScanner.tsx` | Save research to store, pass rich data |
| `KeywordHunter.tsx` | Save research to store, pass rich data |
| `csvParser.ts` | Smart column detection |
| `stores/domainAcquireStore.ts` | Mark for deprecation |
