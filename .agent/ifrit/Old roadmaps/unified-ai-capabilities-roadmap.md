# Unified AI Capabilities System - Evolution Roadmap

## Objective

Evolve from the legacy `MultiProviderAI` pattern to a unified **Capabilities-Based AI System** that leverages existing `CapabilityExecutor` and `AIServices` components.

---

## Current State vs Target State

```
CURRENT (Legacy):
generators.ts → /api/ai/generate → MultiProviderAI → Direct Provider Calls

TARGET (Unified):
generators.ts → ai.client → CapabilityExecutor → Handler Registry → All Providers
```

---

## Phase 1: Foundation Layer (1 hour)

### 1.1 Create Unified AI Client

**File:** `lib/ai/client.ts` [NEW]

```typescript
// Usage:
import { ai } from '@/lib/ai/client';

const result = await ai.generate('Write an article about...', { maxTokens: 2000 });
const research = await ai.research('Latest trends in...', { sources: true });
const image = await ai.image('A professional banner for...', { size: '1024x1024' });
```

### 1.2 Wire CapabilityExecutor to Settings

- Read `capabilitiesConfig` from `settingsStore` automatically
- Read `providerKeys` for handler availability

---

## Phase 2: API Unification (2 hours)

### 2.1 Create Capability API Routes

```
app/api/capabilities/
├── [capability]/route.ts   # Unified capability endpoint
└── route.ts                # List available capabilities
```

### 2.2 Backward Compatibility

Keep `/api/ai/generate` delegating to new system.

---

## Phase 3: WP Sites Integration (2 hours)

### 3.1 Update generators.ts

| Function | Current | New |
|----------|---------|-----|
| `performResearch()` | `fetch('/api/ai/generate')` | `ai.research()` |
| `generateContent()` | `fetch('/api/ai/generate')` | `ai.generate()` |
| `generateImages()` | `fetch('/api/ai/image')` | `ai.image()` |

### 3.2 Add Diagnostics

- Retry attempts visible in UI
- Handler used per request
- Latency metrics

---

## Phase 4: Handler Wiring (2 hours)

### 4.1 Register External Handlers

| Handler | Capability |
|---------|------------|
| twitterHandler | `scrape`, `research` |
| youtubeHandler | `research`, `scrape` |
| amazonHandler | `research` |
| deeplHandler | `translate` |
| googleTranslateHandler | `translate` |

### 4.2 Register AI Providers

| Provider | Capabilities |
|----------|-------------|
| Gemini | `generate`, `images`, `analyze`, `code` |
| DeepSeek | `generate`, `code`, `reasoning` |
| OpenRouter | `generate`, `research` |
| Perplexity | `research`, `keywords` |

---

## Phase 5: Cleanup (1 hour)

- Add deprecation warnings
- Update architecture docs
- Create migration guide

---

## Files Summary

| File | Action | Lines |
|------|--------|-------|
| `lib/ai/client.ts` | CREATE | ~150 |
| `app/api/capabilities/[capability]/route.ts` | CREATE | ~100 |
| `features/campaigns/lib/generators.ts` | MODIFY | ~30 |
| `lib/ai/handlers/*.ts` | MODIFY | ~60 total |

---

## Tracking Progress

- [x] Phase 1: Foundation Layer ✅
- [x] Phase 2: API Unification ✅
- [x] Phase 3: WP Sites Integration ✅
- [x] Phase 4: Handler Wiring ✅
- [x] Phase 5: Cleanup ✅

**🎉 ALL PHASES COMPLETE!**
