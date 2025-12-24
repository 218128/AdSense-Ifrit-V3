# Deprecated Hooks

> **⚠️ WARNING: Do not import from this folder!**

These hooks were replaced by Zustand stores during the enterprise refactor. They are kept for historical reference only and are excluded from TypeScript compilation.

## Migration Guide

| Deprecated Hook | Replacement |
|----------------|-------------|
| `useKeywordAnalysis` | `useKeywordStore().runAnalysis()` |
| `useKeywordImport` | `useKeywordStore().importCSVKeywords()` |
| `useKeywordSelection` | `useKeywordStore().toggleSelection()` |

## Stores

All keyword state is now managed by `stores/keywordStore.ts`.
All trend state is now managed by `stores/trendStore.ts`.

---

*Deprecated on: 2024-12*
