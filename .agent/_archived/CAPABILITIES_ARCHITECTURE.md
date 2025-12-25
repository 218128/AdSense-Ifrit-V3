# Capabilities Architecture

## Overview

The Capabilities system provides a **provider-agnostic** interface for AI tasks. The app manages logic (retry, validation, errors), while users choose which provider handles each capability.

---

## Core Concepts

### 1. Capability
A type of AI task the app can perform.

| Capability | Description |
|------------|-------------|
| `generate` | Text generation |
| `research` | Web research with sources |
| `keywords` | SEO keyword discovery |
| `analyze` | Content analysis (E-E-A-T, SEO) |
| `images` | Image generation/search |
| `summarize` | Text summarization |
| `scrape` | Web page extraction |
| `translate` | Language translation |
| `reasoning` | Complex planning |
| `code` | Code generation |

### 2. Handler
A data provider that fulfills a capability.

| Source | Examples |
|--------|----------|
| `ai-provider` | Gemini, DeepSeek, OpenRouter |
| `mcp` | Brave Search, GitHub |
| `integration` | Unsplash, Pexels |

### 3. CapabilityExecutor
App logic that manages execution:
- Gets user's selected handler from Settings
- Calls handler as black box
- Handles retry/validation/errors
- Returns processed result

---

## Architecture Layers

```
┌────────────────────────────────────────────────────────┐
│  LAYER 1: SETTINGS                                     │
│  • User configures keys (AI, MCP, Integrations)        │
│  • User assigns handler per capability                 │
│  • User sets fallback chain                            │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│  LAYER 2: CAPABILITY EXECUTOR                          │
│  • Retry logic (max retries configurable)              │
│  • Response validation                                 │
│  • Error handling & logging                            │
│  • Verbosity for diagnostics                           │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│  LAYER 3: DATA PROVIDERS                               │
│  • All implement DataProvider interface                │
│  • Replaceable at any time                             │
│  • User can switch without code changes                │
└────────────────────────────────────────────────────────┘
```

---

## DataProvider Interface

```typescript
interface DataProvider {
  id: string;
  name: string;
  supportedCapabilities: string[];
  
  execute(request: CapabilityRequest): Promise<DataResult>;
}

interface CapabilityRequest {
  prompt: string;
  context?: Record<string, unknown>;
  options?: {
    model?: string;      // User-selected model
    maxTokens?: number;
    temperature?: number;
  };
}

interface DataResult {
  success: boolean;
  data: unknown;
  error?: string;
  diagnostics?: ProviderDiagnostics;
}
```

---

## Verbosity & Diagnostics

Each provider call returns diagnostics for fine-tuning:

```typescript
interface ProviderDiagnostics {
  providerId: string;
  model: string;
  requestTime: number;      // When request sent
  responseTime: number;     // When response received
  latencyMs: number;        // Total time
  tokensUsed?: number;
  tokensInput?: number;
  tokensOutput?: number;
  retryCount: number;
  rawResponse?: string;     // For debugging (if verbose mode)
  errors?: string[];        // Any errors encountered
}
```

### Logging Levels

| Level | Shows |
|-------|-------|
| `none` | No logs |
| `basic` | Provider used, success/fail |
| `standard` | + latency, tokens |
| `verbose` | + raw responses, full errors |

User configures in Settings → Capabilities → Verbosity.

---

## Separation of Concerns

| App Responsibility | Provider Responsibility |
|-------------------|------------------------|
| Choose handler from Settings | Execute request |
| Retry on failure | Return raw data |
| Validate response format | - |
| Handle errors gracefully | Report errors |
| Log diagnostics | Provide metrics |
| Cache results (optional) | - |

---

## Adding New Providers

1. Implement `DataProvider` interface
2. Register in provider registry
3. User enables in Settings → done

**No code changes needed in capabilities or features.**

---

## Adding New Capabilities

1. Define capability in `DEFAULT_CAPABILITIES`
2. Add validation logic in `CapabilityExecutor`
3. Wire to features that need it

**User configures handler in Settings.**
