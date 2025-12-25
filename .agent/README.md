# AdSense Ifrit - AI Agent Documentation

> **Last Updated**: December 2025

This folder contains structured documentation to help AI coding agents understand and work effectively on this project.

## 📚 Documentation Index

| Doc | Purpose | Priority |
|-----|---------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System overview, patterns, recent updates | ⭐ Read First |
| [SETTINGS_ARCHITECTURE.md](./SETTINGS_ARCHITECTURE.md) | Zustand store, API keys, capabilities | ⭐ Critical |
| [WEBSITES_ARCHITECTURE.md](./WEBSITES_ARCHITECTURE.md) | Content generation, deployment | Important |
| [DATA_MODELS.md](./DATA_MODELS.md) | TypeScript interfaces | Reference |
| [API_REFERENCE.md](./API_REFERENCE.md) | Endpoint documentation | Reference |

## ⚠️ Critical Rules

1. **ALWAYS use Zustand stores** - Never access `localStorage` directly for API keys
2. **Pass keys through API body** - Server cannot access client storage
3. **Check `enabledProviders`** - Users may disable certain providers
4. **Use `useSettingsStore`** - Single source of truth for configuration

```typescript
// ✅ CORRECT
const apiKey = useSettingsStore(state => state.integrations.geminiKey);

// ❌ WRONG - Will cause bugs
const apiKey = localStorage.getItem('ifrit_gemini_key');
```

## 🗂️ Key Entry Points

| Area | Path | Description |
|------|------|-------------|
| App Routes | `app/` | Next.js 16 App Router |
| Components | `components/` | React UI (websites/, hunt/, settings/) |
| State | `stores/` | Zustand stores (settingsStore, websiteStore) |
| Libraries | `lib/` | Business logic, templates, integrations |
| Websites | `websites/{domain}/` | Per-website data storage |

## 🔧 Common Patterns

### Fetching data
```typescript
const res = await fetch(`/api/websites/${domain}`);
const { website, articles } = await res.json();
```

### Getting API keys (correct way)
```typescript
const geminiKey = useSettingsStore(state => state.integrations.geminiKey);
const devtoKey = useSettingsStore(state => state.integrations.devtoKey);
const perplexityKey = useSettingsStore(state => 
    state.mcpServers.apiKeys?.['perplexity-ask'] ||
    state.providerKeys?.perplexity?.[0]?.key
);
```

### Error feedback
```typescript
// Set message
setSyncMessage('❌ Operation failed');
// Auto-clear after 5s
useEffect(() => {
    if (syncMessage) {
        const timer = setTimeout(() => setSyncMessage(null), 5000);
        return () => clearTimeout(timer);
    }
}, [syncMessage]);
```

## 📁 Archived Docs

The following docs are kept for historical context but may contain outdated patterns:
- `COMMON_TASKS.md` - Some patterns outdated (localStorage references)
- `FILE_INDEX.md` - May not include recent additions
- `CAPABILITIES_ARCHITECTURE.md` - Conceptual, not fully implemented
