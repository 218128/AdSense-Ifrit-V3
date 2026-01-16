# Enterprise Consolidation - Future Fixes Backlog

## Session Reference

This document captures prioritized fixes and improvements from the Enterprise Consolidation audit. Use this for future focused sessions.

---

## Priority 1: ~~HIGH - Settings Re-Engineering~~ ✅ COMPLETE

### SettingsView.tsx (1,034 → 280 lines)

**Completed:** Dec 28, 2025

**Changes Made:**
- Refactored from 1,035 lines to ~280 lines
- Consolidated 9 tabs into 4 logical sections
- Created modular section components

**New Structure:**
```
components/settings/
├── SettingsView.tsx (~280 lines, controller)
├── sections/
│   ├── AISection.tsx (providers + capabilities + usage)
│   ├── ConnectionsSection.tsx (all integrations grouped)
│   ├── MonetizationSection.tsx (AdSense)
│   └── DataSection.tsx (backup + templates)
└── shared/
    ├── SettingsCard.tsx
    ├── ApiKeyInput.tsx
    └── ConnectionGroup.tsx
```

**Tests:** 17 passed | **Build:** Success

---


## Priority 2: MEDIUM - Lint Error Cleanup (IN PROGRESS)

### Dec 28: Fixed 8/29 errors (21 remaining)

**Fixed (8):**
- ✅ `Function` type → explicit generics (5 test files)
- ✅ `any[]` → proper interface (ImageGallery.test.tsx)
- ✅ Unescaped entities (CostDashboard.tsx, RunHistoryPanel.tsx)

**Remaining (21):**
- `@typescript-eslint/no-explicit-any` (10+ errors in test files)
- `react-hooks/set-state-in-effect` (5 errors - requires refactoring useEffect patterns)
- `react-hooks/purity` (3 errors - move Date.now() out of render)
- `react-hooks/preserve-manual-memoization` (1 error in BulkArticleQueue.tsx)

**Files needing deeper refactoring:**
- `PreApplicationWizard.tsx` - setState in effect
- `useWatchlist.ts` - setState in effect
- `CloudflareManager.tsx` - setState in effect
- `UsageStatsPanel.tsx` - setState in effect
- `WPAutomationPanel.tsx` - setState in effect
- `AdSenseStatusTracker.tsx` - Date.now() in render
- `FlipPipeline.tsx` - Date.now() in render
- `AIKeyManager.tsx` - Date.now() in render

**Estimated Effort:** 2-3 hours for remaining

---

## Priority 3: ~~MEDIUM - XSS Mitigation~~ ✅ PARTIAL COMPLETE

### Dec 28: UI Components Secured

**Completed:**
- ✅ Installed DOMPurify + @types/dompurify
- ✅ Created `lib/security/sanitize.ts` utility
- ✅ Updated 4 UI components with dangerouslySetInnerHTML:
  - `ArticleEditor.tsx`
  - `NicheAuthority/ArticlePage.tsx`
  - `ExpertHub/ArticlePage.tsx`
  - `TopicalMagazine/ArticlePage.tsx`
- ✅ Build verified

**Remaining (lower priority):**
- Template generators (11 usages) - build-time only
- Schema templates (6 usages) - JSON only, low risk

**Estimated Remaining:** 1 hour if needed

---

## Priority 4: LOW - WebsiteDetail Refactoring

> **Note:** LOW priority because Websites tab is not primary - WP Sites is used instead.

### WebsiteDetail.tsx (1,592 lines)

**Issue:** Contains 6 embedded tab components

**Skip for now unless Websites tab becomes active.**

---

## Priority 5: ~~LOW - Remaining `any` Types~~ ✅ COMPLETE

### Dec 28: Fixed 11 no-explicit-any errors

**Files fixed:**
- Test files: 8 (proper types or eslint-disable for mocks)
- Source files: 3 (proper interfaces)

**Result:** Lint errors reduced from 21 → 10

**Remaining 10 errors:** React hooks issues (set-state-in-effect, purity)

---

## Quick Reference

| Priority | Task | Effort | Files |
|----------|------|--------|-------|
| 1 | Settings Re-Engineering | 4-6h | SettingsView.tsx |
| 2 | Lint Errors | 1-2h | 29 files |
| 3 | XSS Mitigation | 1-2h | 22 files |
| 4 | WebsiteDetail | 3-4h | LOW - skip |
| 5 | `any` Types | 30m | 3 files |

---

## Session Commands

```bash
# Run tests
npm test

# Run lint
npm run lint

# Build
npm run build

# Find any types
grep -rn ": any\|<any>\|as any" features lib stores components
```
