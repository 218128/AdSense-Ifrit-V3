# Feature Automation Wiring Roadmap

> Complete the automation pipeline by wiring implemented features to UI and pipeline.

## Status Overview

| Feature | Implementation | Wiring | Priority |
|---------|---------------|--------|----------|
| Schema Markup | ✅ Done | ✅ Done | High |
| Internal Linking | ✅ Done | ✅ Done | High |
| RSS Source | ✅ Done | ✅ Done | Medium |
| Trends Source | ✅ Done | ✅ Done | Medium |
| Multi-Site Publishing | ✅ Done | ⏸️ UI Ready | Low |
| Content Spinner | ✅ Done | ✅ Done | Low |
| A/B Testing | ✅ Done | ⏸️ Partial | Low |
| Analytics | ✅ Done | ✅ Done | Low |

---

## Phase 1: Pipeline Enhancement (High Priority)

### 1.1 Schema Markup Integration
**Goal:** Auto-inject schema markup into published content

**Files to modify:**
- `features/campaigns/lib/generators.ts` - Add schema generation call
- `features/campaigns/model/types.ts` - Add `includeSchema` flag (already exists)

**Changes:**
```typescript
// In generateContent() or before publish:
import { generateAllSchemas } from './schemaMarkup';

// Inject at end of content if aiConfig.includeSchema is true
if (campaign.aiConfig.includeSchema) {
    const schemas = generateAllSchemas(title, description, content, {...});
    content = content + '\n' + schemas;
}
```

**Estimated:** 30 min

---

### 1.2 Internal Linking Integration
**Goal:** Auto-add internal links to related posts

**Files to modify:**
- `features/campaigns/lib/processor.ts` - Add linking step before publish

**Changes:**
```typescript
// After generateContent, before publishToWordPress:
import { fetchExistingPosts, findLinkOpportunities, injectInternalLinks } from './internalLinking';

if (campaign.aiConfig.optimizeForSEO) {
    const existingPosts = await fetchExistingPosts(wpSite);
    const suggestions = findLinkOpportunities(ctx.content.body, existingPosts);
    const result = injectInternalLinks(ctx.content.body, suggestions);
    ctx.content.body = result.content;
}
```

**Estimated:** 30 min

---

## Phase 2: Source UI Integration (Medium Priority)

### 2.1 RSS Feed Source UI
**Goal:** Allow users to add RSS feeds in Campaign Editor

**Files to modify:**
- `features/campaigns/ui/CampaignEditor.tsx` - Add RSS tab/section

**UI Elements:**
- [ ] Feed URL input field
- [ ] "Add Feed" button
- [ ] List of configured feeds
- [ ] "Test Feed" to validate parsing
- [ ] Toggle for AI rewrite

**Estimated:** 1-2 hrs

---

### 2.2 Google Trends Source UI
**Goal:** Configure trends-based content generation

**Files to modify:**
- `features/campaigns/ui/CampaignEditor.tsx` - Add Trends section

**UI Elements:**
- [ ] Region dropdown (US, UK, etc.)
- [ ] Category filter (optional)
- [ ] SerpAPI key field (optional, for reliable fetching)
- [ ] Preview button to see current trends

**Estimated:** 1-2 hrs

---

## Phase 3: Advanced Features (Low Priority)

### 3.1 Multi-Site Publishing UI
**Goal:** Publish to multiple WordPress sites

**Files to modify:**
- `features/campaigns/ui/CampaignEditor.tsx` - Add multi-site target selection
- `features/campaigns/lib/processor.ts` - Use multiSitePublishing

**UI Elements:**
- [ ] Site multi-select dropdown
- [ ] Per-site customization (optional)
- [ ] Stagger delay setting
- [ ] Spin content toggle

**Estimated:** 2-3 hrs

---

### 3.2 Content Spinner Toggle
**Goal:** Enable AI-powered content spinning

**Files to modify:**
- `features/campaigns/ui/CampaignEditor.tsx` - Add spinner settings
- `features/campaigns/model/types.ts` - Add spinner config to AIConfig

**UI Elements:**
- [ ] Enable spinning toggle
- [ ] Mode: light / moderate / heavy
- [ ] Preview spun content

**Estimated:** 1 hr

---

### 3.3 A/B Testing Integration
**Goal:** Test different titles/versions

**Files to modify:**
- `features/campaigns/lib/processor.ts` - Create variants
- `features/campaigns/ui/CampaignCard.tsx` - Show variant stats

**Estimated:** 2-3 hrs

---

### 3.4 Analytics Dashboard
**Goal:** Show post performance from WordPress

**Files to modify:**
- `features/campaigns/ui/CampaignDetail.tsx` - Add analytics tab
- `features/campaigns/lib/analytics.ts` - Wire fetch functions

**Estimated:** 2-3 hrs

---

## Implementation Order

```
Phase 1 (Quick Wins - 1 hr total)
├── 1.1 Schema Markup → processor.ts
└── 1.2 Internal Linking → processor.ts

Phase 2 (Source UI - 2-4 hrs)
├── 2.1 RSS Feed UI → CampaignEditor.tsx
└── 2.2 Trends UI → CampaignEditor.tsx

Phase 3 (Advanced - 6-10 hrs)
├── 3.1 Multi-Site UI
├── 3.2 Content Spinner UI  
├── 3.3 A/B Testing
└── 3.4 Analytics Dashboard
```

---

## Tracking Progress

- [x] Phase 1.1: Schema Markup wired ✅
- [x] Phase 1.2: Internal Linking wired ✅
- [x] Phase 2.1: RSS Feed wired ✅
- [x] Phase 2.2: Trends wired ✅
- [x] Phase 3.1: Multi-Site (config ready, UI prepared) ✅
- [x] Phase 3.2: Content Spinner wired ✅
- [x] Phase 3.3: A/B Testing (partial - lib exists) ✅
- [x] Phase 3.4: Analytics API + Umami wired ✅

---

## Total Estimated Effort

| Phase | Time |
|-------|------|
| Phase 1 | 1 hr |
| Phase 2 | 2-4 hrs |
| Phase 3 | 6-10 hrs |
| **Total** | **9-15 hrs** |
