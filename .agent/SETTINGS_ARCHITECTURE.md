# Settings & AI Capabilities Architecture

## Core Principle

**Settings is the single source of truth for all configurations.** No feature directly accesses external APIs - everything goes through Settings → AIServices.

---

## 1. Settings Store (`stores/settingsStore.ts`)

### Key Access Pattern

```typescript
// CORRECT - All components use this:
const providerKeys = useSettingsStore(state => state.providerKeys);
const enabledProviders = useSettingsStore(state => state.enabledProviders);
const selectedModels = useSettingsStore(state => state.selectedModels);
```

### Data Structure

```typescript
interface SettingsStore {
  // AI Providers (multi-key support)
  providerKeys: {
    gemini: StoredKey[],    // Multiple keys per provider
    deepseek: StoredKey[],
    openrouter: StoredKey[],
    vercel: StoredKey[],
    perplexity: StoredKey[],
  };
  enabledProviders: ProviderId[];   // Which providers are active
  selectedModels: Record<ProviderId, string>;  // Default model per provider
  
  // Capabilities config (for AIServices)
  capabilitiesConfig: CapabilitiesConfig;
  
  // Other configs...
}

interface StoredKey {
  key: string;
  label?: string;
  validated?: boolean;
  validatedAt?: number;
}
```

---

## 2. Capabilities System (`lib/ai/services/types.ts`)

### What Is a Capability?

A **capability** is a type of AI task the app can perform:

| Capability | Description | Best Handler |
|------------|-------------|--------------|
| `generate` | Text generation | Gemini, DeepSeek |
| `research` | Web research | Perplexity, Brave Search MCP |
| `keywords` | SEO keyword discovery | Gemini |
| `analyze` | Content analysis | Gemini |
| `reasoning` | Complex planning | DeepSeek R1 |
| `summarize` | Summarization | Any |
| `images` | Image generation | Gemini |

### What Is a Handler?

A **handler** fulfills a capability. Types:

| Source | Example | How Registered |
|--------|---------|----------------|
| `ai-provider` | Gemini, DeepSeek | Auto-registered from Settings keys |
| `mcp` | Brave Search, GitHub | Enabled in MCP Tools panel |
| `local` | Custom functions | Code |

### Handler Selection Logic

```
1. Get capability (e.g., 'research')
2. Find handlers that support it
3. Filter by: enabled + has valid key
4. Sort by priority
5. Execute with fallback chain
```

---

## 3. How Components Access AI

### Step 1: Read Keys from Settings

```typescript
// In component
const providerKeys = useSettingsStore(state => state.providerKeys);
const enabledProviders = useSettingsStore(state => state.enabledProviders);

// Format for API
const getProviderKeys = () => {
  const result: Record<string, string[]> = {};
  for (const provider of ['gemini', 'deepseek', ...]) {
    if (enabledProviders.includes(provider)) {
      result[provider] = providerKeys[provider].map(k => k.key);
    }
  }
  return result;
};
```

### Step 2: Pass Keys to API

```typescript
const response = await fetch('/api/generate', {
  method: 'POST',
  body: JSON.stringify({
    providerKeys: getProviderKeys(),
    // ... other params
  })
});
```

### Step 3: API Uses AIServices (Ideal Flow)

```typescript
// In API route
const result = await aiServices.execute({
  capability: 'generate',
  prompt: '...',
  providerKeys,  // Passed from client
});
```

---

## 4. Website Creation Process

Each step maps to a capability:

| Step | Capability | Handler | Output |
|------|------------|---------|--------|
| Domain Research | `research` | Perplexity / Brave MCP | Domain profile |
| Site Decisions | `generate` | Gemini | decisions.json |
| Theme Generation | `generate` | Gemini | ThemeConfig |
| Article Generation | `generate` | Gemini / DeepSeek | Markdown |
| Image Generation | `images` | Gemini | Cover images |
| SEO Metadata | `analyze` | Gemini | Meta tags |

---

## 5. Configuration Flow

```
┌─────────────────────────────────────────────────┐
│                   SETTINGS                       │
├──────────────┬──────────────┬───────────────────┤
│  AI Keys     │  Capabilities │    MCP Tools     │
│  (validated) │  (handlers)   │   (connections)  │
└──────┬───────┴───────┬──────┴────────┬──────────┘
       │               │               │
       ▼               ▼               ▼
┌──────────────────────────────────────────────────┐
│                  AIServices                       │
│  • Registers handlers from settings              │
│  • Maps capabilities to handlers                 │
│  • Executes with fallback chain                  │
└──────────────────────┬───────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Hunt    │    │ Websites │    │ Content  │
│  Tab     │    │   Tab    │    │  Tab     │
└──────────┘    └──────────┘    └──────────┘
```

---

## 6. Rules for All Features

1. **Never access localStorage directly for keys** - Use `useSettingsStore`
2. **Never hardcode API URLs** - Use provider adapters
3. **Always check `enabledProviders`** - User may disable providers
4. **Always pass keys through request body** - Server can't access localStorage
5. **Use Capabilities, not direct provider calls** - Allows handler substitution
