# Deprecated Keyword Hooks

## Archived: December 2024

These hooks were deprecated and replaced by the new architecture using:
- **KeywordHunter component** (`components/hunt/subtabs/KeywordsNiches/features/KeywordHunter/`)
- **Zustand store** (`stores/keywordStore.ts`)

## Contents

| File | Purpose | Replacement |
|------|---------|-------------|
| `useKeywordSelection.ts` | Keyword selection state | `keywordStore.selectedKeywords`, `toggleSelect()`, `isSelected()` |
| `useKeywordAnalysis.ts` | AI keyword analysis | `keywordStore.runAnalysis()`, `analyzedKeywords` |
| `useKeywordImport.ts` | CSV import handling | `keywordStore.addCSVKeywords()`, `csvKeywords` |
| `index.ts` | Barrel exports | N/A (hooks no longer exported) |

## Why Deprecated?

1. **State fragmentation**: Multiple hooks created disconnected state pieces
2. **Prop drilling**: Required passing state through component tree
3. **No persistence**: State lost on component unmount
4. **Testing complexity**: Hard to mock multiple hooks

## New Architecture Benefits

- **Single source of truth**: Zustand store centralizes all keyword state
- **Persistence**: History stored in localStorage
- **Simpler testing**: One store to mock
- **Better DX**: Actions and computed values in one place

## Tests

- Original hook tests: Removed (obsolete)
- New tests: `__tests__/components/hunt/KeywordHunter.test.tsx`
