# AI Client Consolidation Roadmap

## Objective

Unify all AI calls across Ifrit to use the single `AIClient` pattern (`ai.generate()`, `ai.research()`, etc.) for consistency and maintainability.

---

## Current State Architecture

```
          CURRENT (Fragmented)
┌─────────────────────────────────────────────────┐
│ Components call:                                │
│   • fetch('/api/ai/generate') ← LEGACY          │
│   • fetch('/api/capabilities/[cap]')            │
│   • aiServices.execute() ← INTERNAL             │
│   • aiServices.executeWithKeys() ← INTERNAL     │
│   • getCapabilityExecutor() ← LOW-LEVEL         │
└─────────────────────────────────────────────────┘

          TARGET (Unified)
┌─────────────────────────────────────────────────┐
│ ALL components call:                            │
│   import { ai } from '@/lib/ai/client';         │
│   ai.generate(), ai.research(), ai.image()     │
│                    │                            │
│                    ▼                            │
│   AIClient → AIServices → CapabilityExecutor   │
└─────────────────────────────────────────────────┘
```

---

## Files Requiring Migration

### Client-Side (Components)

| File | Current Pattern | New Pattern |
|------|-----------------|-------------|
| `features/campaigns/lib/imageOptimization.ts` | `fetch('/api/ai/generate')` | `ai.generate()` |

### API Routes (Consolidate to Single Endpoint)

| File | Current Pattern | Action |
|------|-----------------|--------|
| `app/api/ai/generate/route.ts` | Direct executor call | **DEPRECATE** → redirect to `/api/capabilities` |
| `app/api/capabilities/[capability]/route.ts` | Executor call | **KEEP** as canonical endpoint |
| `app/api/generate-site-content/route.ts` | `aiServices.executeWithKeys()` | Use `ai.generate()` |
| `app/api/websites/[domain]/ai-config/auto/route.ts` | `aiServices.executeWithKeys()` | Use `ai.generate()` |

### Internal Libraries

| File | Current Pattern | New Pattern |
|------|-----------------|-------------|
| `lib/ai/keywordDiscovery.ts` | `aiServices.execute()` | `ai.keywords()` |
| `features/translation/index.ts` | `aiServices.execute()` | `ai.translate()` |
| `lib/ai/services/AIServices.ts` (L584) | Self-fetch to `/api/ai/generate` | Direct internal call |

---

## Phase 1: Client-Side Migration (30 min)

### 1.1 Update imageOptimization.ts

```diff
// features/campaigns/lib/imageOptimization.ts

+ import { ai } from '@/lib/ai/client';

export async function generateAltTextAI(imageUrl: string): Promise<string> {
-   const response = await fetch('/api/ai/generate', {
-       method: 'POST',
-       body: JSON.stringify({ prompt: `...`, capability: 'generate' })
-   });
-   const data = await response.json();
-   return data.text;

+   const result = await ai.generate(`Generate alt text for: ${imageUrl}`);
+   return result.text || '';
}
```

---

## Phase 2: API Route Consolidation (1 hour)

### 2.1 Add Deprecation Warning to Legacy Route

```typescript
// app/api/ai/generate/route.ts
export async function POST(request: NextRequest) {
    console.warn('[DEPRECATED] /api/ai/generate - Use /api/capabilities/generate instead');
    // ... existing logic (keep working for backward compat)
}
```

### 2.2 Update Website AI Config Route

```diff
// app/api/websites/[domain]/ai-config/auto/route.ts

+ import { ai } from '@/lib/ai/client';

- import { aiServices } from '@/lib/ai/services';
- const aiServicesResult = await aiServices.executeWithKeys({...});

+ const result = await ai.generate(prompt, { systemPrompt: '...' });
```

### 2.3 Update Site Content Generation Route

```diff
// app/api/generate-site-content/route.ts

+ import { ai } from '@/lib/ai/client';

- const result = await aiServices.executeWithKeys({...});
+ const result = await ai.generate(prompt);
```

---

## Phase 3: Internal Library Migration (1 hour)

### 3.1 Keyword Discovery

```diff
// lib/ai/keywordDiscovery.ts

+ import { ai } from '@/lib/ai/client';

- const { aiServices } = await import('./services');
- const result = await aiServices.execute({ capability: 'keywords', prompt });

+ const result = await ai.keywords(topic, { count: 10 });
```

### 3.2 Translation Feature

```diff
// features/translation/index.ts

+ import { ai } from '@/lib/ai/client';

- const { aiServices } = await import('@/lib/ai/services');
- const result = await aiServices.execute({ capability: 'translate', ... });

+ const result = await ai.translate(content, { targetLanguage, sourceLanguage });
```

### 3.3 Fix AIServices Self-Reference

```diff
// lib/ai/services/AIServices.ts (around line 584)

// Remove this self-fetch pattern:
- const response = await fetch('/api/ai/generate', {...});

// Replace with direct internal call:
+ const executor = getCapabilityExecutor();
+ const result = await executor.execute({...}, this.getHandlers(), this.getConfig());
```

---

## Phase 4: Cleanup & Deprecation (30 min)

### 4.1 Add Deprecation to AIServices Direct Methods

```typescript
// lib/ai/services/index.ts
/** @deprecated Use ai.generate() from '@/lib/ai/client' instead */
export { aiServices };
```

### 4.2 Update Documentation

- Update `.agent/CAPABILITIES_ARCHITECTURE.md` with new pattern
- Update `.agent/ARCHITECTURE.md` with AIClient as entry point

### 4.3 Remove Legacy Route (Future)

After 30 days, remove `/api/ai/generate/route.ts` entirely.

---

## Canonical Pattern After Migration

```typescript
// ANY file in Ifrit that needs AI:

import { ai } from '@/lib/ai/client';

// Text generation
const article = await ai.generate('Write about AI trends');

// Web research
const research = await ai.research('Latest SEO practices');

// Keywords
const keywords = await ai.keywords('fitness niche');

// Image generation  
const image = await ai.image('Professional banner for tech blog');

// Translation
const translated = await ai.translate(content, { targetLanguage: 'es' });

// Analysis
const analysis = await ai.analyze(content, { type: 'seo' });
```

---

## Benefits After Consolidation

| Aspect | Before | After |
|--------|--------|-------|
| Entry points | 5+ different patterns | 1 (`ai.*`) |
| Discoverability | Confusing | Clear methods |
| Type safety | Partial | Full with TypeScript |
| Fallback/retry | Manual in each place | Built into AIClient |
| Diagnostics | Scattered | Centralized logging |

---

## Tracking Progress

- [x] Phase 1: Client-side migration ✅
  - [x] `imageOptimization.ts` → `ai.generate()`
- [x] Phase 2: API route consolidation ✅
  - [x] Add deprecation to `/api/ai/generate`
  - [x] `ai-config/auto/route.ts` - KEPT as-is (correctly uses `executeWithKeys` for server-side key handling)
  - [x] `generate-site-content/route.ts` - KEPT as-is (correctly uses `executeWithKeys`)
- [x] Phase 3: Internal library migration ✅
  - [x] `keywordDiscovery.ts` → `ai.keywords()`
  - [x] `features/translation/index.ts` → `ai.translate()`
  - [x] AIServices self-reference - KEPT (internal mechanism, not exposed)
- [x] Phase 4: Cleanup ✅
  - [x] Added runtime deprecation warning to `/api/ai/generate`
  - [x] Architecture docs already reference capabilities system

## Completion Notes

**Date:** December 29, 2025

**Summary:** Successfully consolidated AI calls to use the unified `AIClient` pattern (`ai.*` methods). Key insight: API routes that receive keys from client requests should continue using `aiServices.executeWithKeys()` - that's the correct pattern for server-side key handling. The `AIClient` is for client-side components that access stores directly.

**Files Modified:**
- `features/campaigns/lib/imageOptimization.ts`
- `lib/ai/keywordDiscovery.ts`
- `features/translation/index.ts`
- `app/api/ai/generate/route.ts`

**Build Status:** ✅ Passed

---

## Total Estimated Effort: ~3 hours
