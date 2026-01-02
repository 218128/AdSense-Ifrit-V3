# Keywords & Capabilities Architecture

## Overview

This document explains the unified capability system architecture used in Ifrit, focusing on the **snake_case normalization pattern** that solved AI response parsing issues. Use this as a reference when building new features that use AI capabilities.

---

## The snake_case Problem & Solution

### Problem
AI providers (Gemini, OpenAI, etc.) return field names in **snake_case**:
```json
{"estimated_cpc": "$5.50", "monetization_score": 8}
```

But TypeScript interfaces expect **camelCase**:
```typescript
interface Analysis {
  estimatedCPC: string;  // Not estimated_cpc!
  monetizationScore: number;
}
```

**Result:** Data appears empty/undefined in UI even though API succeeded.

### Solution Pattern
Always normalize AI responses in the infrastructure layer:

```typescript
// lib/infrastructure/api/keywordAPI.ts

function normalizeAIResponse(raw: Record<string, unknown>): AnalyzedKeyword {
  return {
    keyword: raw.keyword as string,
    analysis: {
      // Handle BOTH snake_case and camelCase
      estimatedCPC: (raw.estimated_cpc || raw.estimatedCPC || 'N/A') as string,
      score: Number(raw.monetization_score || raw.score || 0),
      competition: (raw.competition_level || raw.competition || 'Medium') as string,
      // ...
    }
  };
}
```

---

## Unified Capability System

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Components                         │
│   TrendScanner, KeywordHunter, DomainScorer, etc.           │
└─────────────────────────────────┬───────────────────────────┘
                                  │ calls
┌─────────────────────────────────▼───────────────────────────┐
│                    Zustand Stores                            │
│   keywordStore.runAnalysis(), trendStore.scanPage()         │
└─────────────────────────────────┬───────────────────────────┘
                                  │ calls
┌─────────────────────────────────▼───────────────────────────┐
│                Application Layer (Use Cases)                 │
│   analyzeKeywordsUseCase(), scanTrendsUseCase()             │
└─────────────────────────────────┬───────────────────────────┘
                                  │ calls
┌─────────────────────────────────▼───────────────────────────┐
│               Infrastructure Layer (API)                     │
│   keywordAPI.analyzeKeywords() ← NORMALIZE HERE             │
└─────────────────────────────────┬───────────────────────────┘
                                  │ calls
┌─────────────────────────────────▼───────────────────────────┐
│                     AIServices                               │
│   aiServices.execute({ capability, prompt })                 │
└─────────────────────────────────┬───────────────────────────┘
                                  │ routes to
┌─────────────────────────────────▼───────────────────────────┐
│                 /api/capabilities/[capability]               │
│   Server-side execution of handlers                          │
└─────────────────────────────────┬───────────────────────────┘
                                  │ uses
┌─────────────────────────────────▼───────────────────────────┐
│                     AI Provider                              │
│   Gemini, OpenAI, Anthropic, etc.                           │
└─────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/ai/services/AIServices.ts` | Handler registration, capability routing |
| `lib/ai/services/handlers/` | Provider-specific handlers |
| `app/api/capabilities/[capability]/route.ts` | Server-side API route |
| `lib/infrastructure/api/*.ts` | API calls + **normalization** |
| `lib/prompts/*.ts` | Prompt templates |

---

## Adding a New Capability

### 1. Register Handler (AIServices.ts)
```typescript
this.registerHandler({
  id: 'my-new-handler',
  name: 'My Handler',
  providerId: 'gemini',
  capabilities: ['my-capability'],
  isAvailable: () => true,
  execute: async (prompt, context) => {
    // Call AI and return result
  }
});
```

### 2. Create Prompt Template (lib/prompts/)
```typescript
// lib/prompts/myFeature/myPrompt.ts
export function buildMyPrompt(data: MyData, options?: MyOptions): string {
  return `Analyze: ${data.items.join(', ')}
  
  Return JSON: { "results": [...] }`;
}
```

### 3. Create Infrastructure API (lib/infrastructure/api/)
```typescript
// lib/infrastructure/api/myFeatureAPI.ts
export async function executeMyFeature(data: MyData): Promise<MyResult> {
  const { aiServices } = await import('@/lib/ai/services');
  
  const result = await aiServices.execute({
    capability: 'my-capability',
    prompt: buildMyPrompt(data),
  });

  // ⚠️ CRITICAL: Parse and normalize the response!
  return normalizeResponse(result);
}

function normalizeResponse(result: AIResult): MyResult {
  // Handle result.text when result.data is empty
  let parsed;
  if (result.data) {
    parsed = result.data;
  } else if (result.text) {
    // Extract JSON from text
    const jsonMatch = result.text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  }
  
  // Normalize snake_case → camelCase
  return {
    myField: parsed.my_field || parsed.myField || 'default',
  };
}
```

### 4. Create Use Case (lib/application/)
```typescript
// lib/application/myFeature/myUseCase.ts
export async function myUseCase(
  data: MyData,
  onProgress: (status: ActionStatus) => void
): Promise<MyResult> {
  onProgress(ActionStatusFactory.running('Processing...'));
  
  const result = await executeMyFeature(data);
  
  onProgress(ActionStatusFactory.success('Done!'));
  return result;
}
```

### 5. Wire to Store
```typescript
// stores/myStore.ts
runMyFeature: async (data) => {
  const result = await myUseCase(data, (status) => set({ actionStatus: status }));
  set({ results: result });
}
```

---

## Response Parsing Checklist

When AI returns data, always check:

- [ ] **result.success** is true
- [ ] **result.data** has content, OR
- [ ] **result.text** has JSON to extract
- [ ] **snake_case** fields mapped to camelCase
- [ ] **Missing fields** have fallback defaults
- [ ] **Console logging** for debugging

### Example Parser Template
```typescript
function parseAIResponse(result: AIResult): MyData[] {
  if (!result.success) {
    console.error('[MyFeature] AI failed:', result.error);
    return [];
  }

  let rawData;
  
  // Priority 1: Structured data
  if (result.data && Array.isArray(result.data)) {
    rawData = result.data;
  }
  // Priority 2: Parse JSON from text
  else if (result.text) {
    try {
      const match = result.text.match(/\[[\s\S]*?\]/);
      rawData = match ? JSON.parse(match[0]) : null;
    } catch (e) {
      console.error('[MyFeature] JSON parse failed:', e);
    }
  }

  if (!rawData) {
    console.warn('[MyFeature] No data found');
    return [];
  }

  // Normalize each item
  return rawData.map((item: Record<string, unknown>) => ({
    // snake_case OR camelCase
    myField: String(item.my_field || item.myField || 'N/A'),
    score: Number(item.score || item.monetization_score || 0),
  }));
}
```

---

## Research Context Pattern

To pass context from one capability to another:

```typescript
// Store research results keyed by identifier
researchResults: Record<string, { findings: string[] }>

// When analyzing, gather context
const researchContext: Record<string, string[]> = {};
for (const item of items) {
  const research = store.researchResults[item.keyword];
  if (research) researchContext[item.keyword] = research.findings;
}

// Pass to prompt builder
const prompt = buildPrompt(items, { researchData: researchContext });
```

Prompt template uses context:
```typescript
if (options.researchData) {
  prompt += '\n\n**Research Context:**\n';
  for (const [key, findings] of Object.entries(options.researchData)) {
    prompt += `- ${key}: ${findings.slice(0, 3).join('; ')}\n`;
  }
}
```

---

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| UI shows "N/A" or empty | Check snake_case normalization |
| API returns 200 but no data | Parse `result.text` as fallback |
| Research not found for analyze | Keys must match exactly |
| Handler not available | Check `aiServices.initialize()` called |
| Client-side execution fails | Ensure handler has `execute` function |

---

## Related Files

- `lib/ai/services/AIServices.ts` - Core service
- `lib/ai/services/types.ts` - Type definitions
- `lib/infrastructure/api/keywordAPI.ts` - Example with normalization
- `lib/prompts/analysis/keywordAnalysisPrompt.ts` - Prompt with context
- `stores/keywordStore.ts` - Store integration example
