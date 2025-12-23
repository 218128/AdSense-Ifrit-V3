# AI Providers Development Guide

> **Last Updated**: December 2025  
> **SDK Versions**: @google/genai, DeepSeek V3.2, Perplexity Sonar, OpenRouter

This guide documents how to add or modify AI providers in the Ifrit system.

---

## Architecture Overview

```
lib/ai/providers/
├── base.ts          # ProviderAdapter interface + types
├── gemini.ts        # Google Gemini (uses @google/genai SDK)
├── deepseek.ts      # DeepSeek (OpenAI-compatible)
├── openrouter.ts    # OpenRouter aggregator (300+ models)
├── perplexity.ts    # Perplexity Sonar (web search)
├── vercel.ts        # Vercel AI Gateway
└── README.md        # This file
```

---

## Core Principles

### 1. NO HARDCODED MODEL LISTS

Every provider must fetch real models from the API:

```typescript
// ❌ WRONG - Hardcoded
const models = ['gemini-2.5-pro', 'gemini-2.5-flash'];

// ✅ CORRECT - Fetch from API
async testKey(apiKey: string): Promise<KeyTestResult> {
    const response = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` }
    });
    const data = await response.json();
    return { valid: true, models: data.models };
}
```

### 2. User Controls Everything

The user decides:
- Which API key to use
- Which model to select (from real API dropdown)
- Whether to enable/disable each provider
- Which model for each website generation task

### 3. Mode-Specific Methods

Different models support different modes:

| Mode | Description | Example Models |
|------|-------------|----------------|
| `chat` | Standard completion | All models |
| `stream` | Streaming response | Most models |
| `reason` | Chain-of-thought | DeepSeek-R1, Gemini Deep Think |
| `code` | Code generation | DeepSeek-Coder |
| `search` | Web-grounded | Perplexity Sonar |
| `image` | Image input | Gemini 2.5 Pro |

---

## Provider API Reference (Dec 2025)

### Google Gemini

**SDK**: `@google/genai` (replaces deprecated `@google/generative-ai`)

```typescript
import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI({ apiKey });
const models = await genai.models.list();

// Current models (Dec 2025):
// - gemini-3-pro, gemini-3-flash
// - gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite
// - Deprecated: gemini-1.5-* (retired April 2025)
```

**List Models Endpoint**:
```
GET https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}
```

### DeepSeek

**API**: OpenAI-compatible

```typescript
// Models (Dec 2025):
// - deepseek-chat (V3.2-Exp) - Chat/conversation
// - deepseek-reasoner (R1) - Chain-of-thought reasoning
// - deepseek-coder (V2) - Code generation
```

**List Models Endpoint**:
```
GET https://api.deepseek.com/v1/models
Authorization: Bearer {API_KEY}
```

**Reasoning Mode** (for R1):
```typescript
const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    body: JSON.stringify({
        model: 'deepseek-reasoner',
        messages: [{ role: 'user', content: prompt }]
    })
});
// Response includes reasoning_content field
```

### Perplexity (Sonar)

**Models (Dec 2025)**:
- `sonar` - Default, built on Llama 3.3 70B
- `sonar-pro` - Advanced reasoning
- `sonar-reasoning-pro` - Multi-step analysis

**API Key Prefix**: Keys start with `pplx-`

**List Models Endpoint**:
```
GET https://api.perplexity.ai/models
Authorization: Bearer {API_KEY}
```

### OpenRouter

**Aggregator**: 300+ models from all providers

**List Models Endpoint**:
```
GET https://openrouter.ai/api/v1/models
```

Returns comprehensive metadata:
- `context_length`
- `pricing`
- `supported_parameters`

### Vercel AI Gateway

**Endpoint**: `https://ai-gateway.vercel.sh/v1`

**Features**:
- Unified routing to multiple providers
- Auto-failover
- Caching
- Rate limiting
- Analytics

---

## Implementing a New Provider

1. Create file: `lib/ai/providers/{provider}.ts`

2. Import base types:
```typescript
import { 
    ProviderAdapter, 
    ProviderMeta, 
    ModelInfo,
    KeyTestResult,
    GenerateOptions,
    GenerateResult
} from './base';
```

3. Implement the interface:
```typescript
export class MyProvider implements ProviderAdapter {
    readonly meta: ProviderMeta = {
        id: 'myprovider',
        name: 'My Provider',
        description: 'Description here',
        signupUrl: 'https://...',
        docsUrl: 'https://...'
    };
    
    async testKey(apiKey: string): Promise<KeyTestResult> {
        // Fetch REAL models from API
    }
    
    async chat(apiKey: string, options: GenerateOptions): Promise<GenerateResult> {
        // Implement chat completion
    }
}
```

4. Register in `providerRegistry.ts`

---

## Rate Limits & Best Practices

| Provider | Free Tier | Cooldown |
|----------|-----------|----------|
| Gemini | 15 RPM, 1500/day | 4s |
| DeepSeek | 60 RPM | 1s |
| OpenRouter | 50/day | 3s |
| Perplexity | Pro required | 20s |
| Vercel | $5 credit/month | 1s |

**Key Rotation**: The system automatically rotates between multiple keys to maximize usage.

---

## Troubleshooting

### "No models returned"
- API key may be invalid
- Check key prefix (Perplexity requires `pplx-`)
- Some endpoints require authentication header

### Rate limit errors (429)
- Automatic cooldown applied
- Keys are not disabled for rate limits
- System rotates to next available key

### Model not found
- Model may be deprecated
- Re-test key to get fresh model list
- Check provider changelog for updates
