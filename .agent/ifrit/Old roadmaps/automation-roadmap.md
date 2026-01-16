# Ifrit Automation Roadmap
## WP Automatic-like Content Automation

---

## Current Status ✅

| Component | Status |
|-----------|--------|
| WordPress Connections | ✅ Done |
| Campaign Wizard | ✅ Done |
| AI Content Pipeline | ✅ Done |
| Deduplication | ✅ Done |
| Manual Run | ✅ Done |
| Tests (34 tests) | ✅ Done |

---

## Phase 1: Scheduler (True Automation)
**Goal:** Campaigns run automatically without manual trigger

### 1.1 Cron API Endpoint
- [ ] Create `/api/campaigns/cron/route.ts`
- [ ] Check for due campaigns (`schedule.nextRunAt < now`)
- [ ] Execute `runPipeline` for each due campaign
- [ ] Update `nextRunAt` after successful run
- [ ] Log errors to run history

### 1.2 Scheduler Logic
- [ ] Add `updateNextRun(campaignId)` to campaignStore
- [ ] Handle interval-based scheduling
- [ ] Add pause-on-error behavior

### 1.3 UI Updates
- [ ] Show "Last Run" timestamp in CampaignCard
- [ ] Show "Next Run" countdown for scheduled campaigns
- [ ] Add run status indicator (running/idle)

### 1.4 Local Testing
- [ ] Create `/api/campaigns/trigger/route.ts` for manual cron trigger
- [ ] Test with local WordPress
- [ ] Verify run history updates

**Estimated:** 1 day

---

## Phase 2: RSS Feed Source
**Goal:** Auto-generate content from RSS feeds

### 2.1 RSS Parser
- [ ] Create `features/campaigns/lib/rssParser.ts`
- [ ] Parse RSS/Atom feeds (use `fast-xml-parser`)
- [ ] Extract title, link, excerpt, published date
- [ ] Dedupe against existing topics

### 2.2 Source Integration
- [ ] Update `RSSSourceConfig` type
- [ ] Add RSS feed URL field in CampaignEditor
- [ ] Fetch and cache feed items
- [ ] Map feed items to `SourceItem`

### 2.3 Content Spinning
- [ ] Use AI to rewrite/expand RSS excerpts
- [ ] Link to original source
- [ ] Add custom context from campaign config

### 2.4 Tests
- [ ] Test RSS parsing
- [ ] Test duplicate detection
- [ ] Test content generation from RSS

**Estimated:** 1-2 days

---

## Phase 3: Google Trends Source
**Goal:** Auto-generate trending content

### 3.1 Trends API
- [ ] Create `features/campaigns/lib/trendsApi.ts`
- [ ] Integrate with Google Trends (unofficial API or SerpAPI)
- [ ] Filter by country/category
- [ ] Cache trending topics

### 3.2 Source Integration
- [ ] Update `TrendsSourceConfig` type
- [ ] Add trends config in CampaignEditor
- [ ] Auto-refresh trending topics on schedule
- [ ] Map trends to `SourceItem`

### 3.3 Smart Filtering
- [ ] Filter by relevance to campaign topic
- [ ] Score trends by volume
- [ ] Avoid duplicate/similar topics

**Estimated:** 1-2 days

---

## Phase 4: Content Enhancement
**Goal:** Higher quality, more unique content

### 4.1 Multiple Image Support
- [ ] Add inline images (not just cover)
- [ ] Image placement options (after H2, after intro)
- [ ] Alt text generation

### 4.2 Internal Linking
- [ ] Fetch existing posts from WP site
- [ ] Suggest internal links during generation
- [ ] Auto-link to related posts

### 4.3 Schema Markup
- [ ] Generate Article schema
- [ ] FAQ schema for FAQ sections
- [ ] HowTo schema for how-to articles

### 4.4 Content Templates
- [ ] User-defined article templates
- [ ] Template variables (topic, date, site name)
- [ ] Different templates per article type

**Estimated:** 2-3 days

---

## Phase 5: Multi-Site & Advanced
**Goal:** Scale to multiple sites

### 5.1 Multi-Site Publishing
- [ ] Publish same content to multiple sites
- [ ] Site-specific customization
- [ ] Staggered publishing (avoid duplicate content flags)

### 5.2 Content Spinning
- [ ] Spin content for each site
- [ ] Synonym replacement
- [ ] Sentence restructuring

### 5.3 Analytics Integration
- [ ] Track published post performance
- [ ] Show traffic/engagement in campaign stats
- [ ] Auto-suggest high-performing topics

### 5.4 A/B Testing
- [ ] Test different titles/excerpts
- [ ] Track click-through rates
- [ ] Auto-select winning versions

**Estimated:** 3-5 days

---

## Priority Order

```
Phase 1 (Scheduler) → Phase 2 (RSS) → Phase 3 (Trends) → Phase 4 (Enhancement) → Phase 5 (Advanced)
```

---

## Quick Start: Phase 1

To begin Phase 1, start with:
```
.agent/workflows/implement-scheduler.md
```

---

## Tracking Progress

Update this file as phases complete:
- [x] Phase 1: Scheduler ✅
- [x] Phase 2: RSS Feed Source ✅
- [x] Phase 3: Google Trends Source ✅
- [x] Phase 4: Content Enhancement ✅
- [x] Phase 5: Multi-Site & Advanced ✅
