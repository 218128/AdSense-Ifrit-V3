# Hunt Data Architecture

## Data Categories

| Category | Store | Storage | Lifecycle |
|----------|-------|---------|-----------|
| Trends | `trendStore` | localStorage `ifrit_trend_store` | Ephemeral (only tips persist) |
| Keywords | `keywordStore` | localStorage `ifrit_keyword_store` | Session |
| Domains | `huntStore` | localStorage via `STORAGE_KEYS.HUNT_ANALYZE_QUEUE` | Session |
| Research Profiles | `websiteStore` | **FILE** `/websites/profiles/[domain].json` | Permanent |

---

## 1. TRENDS (KeywordsNiches/TrendScanner)

### Acquisition
```
User clicks [Scan Trends]
    → POST /api/trends/multi-source
    → Returns: TrendItem[] { topic, source, heat, timestamp }
```

### Processing
```
trendStore.scanTrends()
    → API call
    → set({ trends, sources, lastScanTime })
```

### Storing
```
localStorage: 'ifrit_trend_store'
Persisted: showTips (boolean only)
NOT persisted: trends, sources, selection
```

### Serving
```
UI reads: useTrendStore().trends
Selection: selectedTrends Set
```

---

## 2. KEYWORDS (KeywordsNiches/KeywordHunter)

### Acquisition
```
A) CSV Import → addCSVKeywords()
B) Manual entry
C) Evergreen list (hardcoded)
```

### Processing
```
runAnalysis(keywords[])
    → POST /api/keywords/analyze
    → Returns: { cpc, volume, competition, score }
    → addToHistory()
```

### Storing
```
localStorage: 'ifrit_keyword_store'
Persisted: csvKeywords, analyzedKeywords, history
NOT persisted: isAnalyzing, selection
```

### Serving
```
UI reads: useKeywordStore().analyzedKeywords
History: history[]
```

---

## 3. DOMAINS (DomainAcquire)

### Acquisition
```
A) SpamZilla CSV import → domainAcquireStore.addSpamzillaDomains()
B) Manual entry → addManualDomains()
C) Free sources → addFreeDomains()
```

### Processing
```
QuickAnalyzer:
    → POST /api/capabilities/analyze
    → Returns: { score, recommendation, estimatedValue }
    → huntStore.addToAnalyze()
```

### Storing
```
huntStore (localStorage via STORAGE_KEYS.HUNT_ANALYZE_QUEUE):
├── analyzeQueue: AnalyzeCandidate[]
├── purchaseQueue: QueuedDomain[]
└── watchlist: WatchlistDomain[]

domainAcquireStore (localStorage 'ifrit_domain_acquire_store'):
├── manualDomains, freeDomains, spamzillaDomains
├── filters
├── analyzeQueue (duplicate!)
└── purchaseQueue (duplicate!)
```

### Serving
```
UI reads from BOTH stores (inconsistent)
```

> ⚠️ **PROBLEM**: Two stores track same data

---

## 4. RESEARCH PROFILES (SaveResearchButton)

### Acquisition
```
User clicks [Save Research]
    → Opens modal with domain, niche, keywords
```

### Processing
```
handleSave():
    → POST /api/domain-profiles
    → Builds DomainProfile object
```

### Storing
```
FILE: /websites/profiles/[domain].json
DomainProfile {
    domain, niche, purchaseType, purchasedAt,
    deepAnalysis: { score, recommendation, estimatedValue },
    keywordAnalysis: { primary, secondary, question },
    aiNiche: { suggestedTopics, targetAudience },
    transferredToWebsite: boolean
}
```

### Serving
```
getDomainProfile(domain) → reads file
listDomainProfiles() → lists all
markProfileTransferred(domain) → marks when site created
```

---

## Architecture Problems

| Problem | Location | Impact |
|---------|----------|--------|
| **Duplicate stores** | `huntStore` + `domainAcquireStore` | Same queues in two places |
| **Wrong storage location** | Profiles in `/websites/` | Hunt data in Website feature |
| **Data not linked** | Profile → WPSite | `getDomainProfile` not called on site creation |
| **Inconsistent lifecycles** | Trends ephemeral, Keywords session, Profiles permanent | User confusion |

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HUNT FEATURE                                                                │
│                                                                             │
│ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│ │ TrendScanner     │  │ KeywordHunter    │  │ DomainAcquire    │           │
│ │                  │  │                  │  │                  │           │
│ │ ACQUIRE:         │  │ ACQUIRE:         │  │ ACQUIRE:         │           │
│ │ /api/trends      │  │ CSV, manual      │  │ SpamZilla CSV    │           │
│ │                  │  │                  │  │                  │           │
│ │ STORE:           │  │ STORE:           │  │ STORE:           │           │
│ │ trendStore       │  │ keywordStore     │  │ huntStore +      │           │
│ │ (localStorage)   │  │ (localStorage)   │  │ domainAcquire    │           │
│ │ EPHEMERAL        │  │ SESSION          │  │ (DUPLICATE!)     │           │
│ └──────────────────┘  └──────────────────┘  └────────┬─────────┘           │
│                                                      │                      │
│                                                      ▼                      │
│                                             [Save Research]                 │
│                                                      │                      │
│                                                      ▼                      │
│                                    POST /api/domain-profiles                │
│                                                      │                      │
│                                                      ▼                      │
│                              FILE: /websites/profiles/[domain].json         │
│                              ↑                                              │
│                              │ WRONG LOCATION!                              │
│                              │ Should be: /hunt/profiles/                   │
└─────────────────────────────────────────────────────────────────────────────┘
```
