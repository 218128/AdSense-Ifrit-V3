# WP Sites System Separation Roadmap

Separate WP Sites (WordPress/Hostinger) from Legacy Websites (GitHub/Vercel) with clean, professional data models.

## Status: ✅ COMPLETE

**Completion Date:** December 29, 2025

---

## Summary

This roadmap established a clean separation between:
- **WP Sites** (`features/wordpress/`) - WordPress/Hostinger based
- **Legacy Websites** (`components/websites/`) - GitHub/Vercel based

---

## Completed Items

### Phase 1: Clean WP Data Model ✅

Created `features/wordpress/model/wpSiteTypes.ts` with:

| Type | Fields | Purpose |
|------|--------|---------|
| WPSite | 35 | Full WordPress site entity with AdSense tracking |
| WPArticle | 30 | Article entity for WP publishing |
| HumanizationConfig | 12 | Making AI content human-like |
| WPSiteConfig | 15 | Site setup/provisioning config |
| AdSenseReadinessReport | 15 | AdSense approval checklist |
| HostingerProvisionRequest | 8 | Hostinger MCP provisioning |

### Phase 2: WP Content Prompts ✅

Created `features/wordpress/lib/wpContentPrompts.ts` with:

- **Exposed/editable prompt templates**
- 6 article types (pillar, how-to, listicle, review, comparison, news)
- 4 essential page types (about, contact, privacy, terms)
- Variable interpolation system
- Humanization integration

### Phase 3: Architecture Documentation ✅

Created `.agent/WP_SITES_ARCHITECTURE.md` documenting:

- Directory structure
- Key types and their purposes
- Hostinger integration flow
- AdSense readiness checks
- Campaigns integration
- Comparison with Legacy Websites

### Phase 4: Campaign Integration Verified ✅

Confirmed `features/campaigns/lib/processor.ts`:
- Imports `WPSite` from `features/wordpress`
- Uses correct fields: `status`, category, author
- Publishes via `wordpressApi.ts`

---

## New Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `features/wordpress/model/wpSiteTypes.ts` | 380+ | Clean WP type definitions |
| `features/wordpress/lib/wpContentPrompts.ts` | 350+ | Editable prompt templates |
| `.agent/WP_SITES_ARCHITECTURE.md` | 200+ | Architecture documentation |

---

## Architecture After Separation

```
features/wordpress/           ← WP SITES (EXPANDED)
├── model/
│   ├── wpSiteTypes.ts        ← NEW: Clean types
│   └── types.ts              ← Legacy (merge later)
├── lib/
│   ├── wpContentPrompts.ts   ← NEW: Editable prompts
│   └── recommendedStacks.ts  ← Theme/plugin recs
└── ui/

components/websites/          ← LEGACY WEBSITES (DEPRECATED)
└── [all files]               ← GitHub/Vercel only

features/campaigns/           ← USES WP SITES
└── Uses WPSite from features/wordpress ✅
```

---

## Future Work - ALL COMPLETE ✅

- [x] Create `wpSiteStore.ts` Zustand store using new types ✅
- [x] Implement `adsenseChecker.ts` for readiness validation ✅
- [x] Build AdSense Readiness Dashboard UI ✅
- [x] Migrate existing WP sites to new type system ✅
- [x] Mark legacy website files with `@legacy` comments ✅
- [x] Migrate all component usage to new store (9 files) ✅

**Migration Notes:**
- `wordpressStore.ts` → Use `wpSiteStore.ts` for new code
- `components/websites/` → Legacy GitHub/Vercel system
- Use `useWPSitesLegacy()` hook for backward-compatible API
