# Ifrit Extended Automation Roadmap
## Phase 6-10: WP Automatic Feature Parity

---

## 🔥 Critical Updates (User Feedback)

### 1. HTML Output Mode (vs Markdown)
Current prompts generate Markdown → WordPress often renders incorrectly.

**Solution:** Add HTML rendering mode with semantic tags:
```html
<article>
  <header><p>Introduction...</p></header>
  <section><h2>Topic</h2><p>Content...</p></section>
  <section class="faq"><h2>FAQ</h2>...</section>
  <footer>...</footer>
</article>
```

**Files to modify:**
- `features/campaigns/lib/prompts.ts` - Add HTML prompt templates
- `features/campaigns/lib/generators.ts` - HTML output option
- Add toggle in campaign wizard: "Output Format: HTML | Markdown"

### 2. Competitor Analysis (Mediavine Sites)
Scrape and analyze these monetized sites for inspiration:
- `extremecouponingmom.ca` (Couponing niche)
- `jamiechancetravels.com` (Travel niche)  
- `gloryofthesnow.com` (Lifestyle niche)
- `easysewingforbeginners.com` (Crafts niche)

### 3. Translation Providers
- **DeepL API** - Higher quality, 500K chars/mo free
- **Google Translate API** - Cheaper, good for volume

### 4. WP Automation Settings Tab
New dedicated Settings tab for all automation API keys:
- YouTube Data API key
- Twitter Bearer Token
- DeepL API key
- Google Translate API key
- Amazon Associates credentials
- RapidAPI key

---

## Existing Infrastructure ✅

| Component | Status | Location |
|-----------|--------|----------|
| **aiServices** | ✅ Ready | `lib/ai/services/` |
| **Capability: scrape** | ✅ Defined | Needs handler |
| **Capability: translate** | ✅ Defined | Needs handler |
| **Capability: images** | ✅ Ready | Has Gemini handler |
| **Multi-provider keys** | ✅ Ready | Settings → AI Keys |
| **MCP integration** | ✅ Ready | lib/mcp/ |

---

## Phase 6: Video Sources
**Goal:** Import content from YouTube, Dailymotion, Vimeo

### 6.1 YouTube API Client
```
features/sources/lib/youtubeApi.ts (~150 lines)
```
- [ ] Search videos by keyword/channel
- [ ] Extract: title, description, transcript, thumbnails
- [ ] Parse channel data (latest videos)
- [ ] Rate limit handling

### 6.2 Video Source Helper
```
features/sources/lib/videoSource.ts (~100 lines)
```
- [ ] Convert video metadata → SourceItem
- [ ] Transcript extraction for AI rewriting
- [ ] Thumbnail → featured image

### 6.3 UI Integration
```
features/campaigns/ui/EditorSteps.tsx (extend)
```
- [ ] Add "YouTube" source type in wizard
- [ ] Channel URL or search query input
- [ ] Video count limit option

### 6.4 Settings
- [ ] YouTube API key in Settings → API Keys
- [ ] Register video capability handler

**Files:** ~3 new files, ~400 lines total

---

## Phase 7: Social Media Sources
**Goal:** Import from Twitter/X, Instagram, Reddit

### 7.1 Platform Clients
```
features/sources/lib/twitterApi.ts (~120 lines)
features/sources/lib/redditApi.ts (~100 lines)
features/sources/lib/instagramApi.ts (~100 lines)
```
- [ ] Twitter: Trending topics, hashtag search
- [ ] Reddit: Subreddit hot/top posts
- [ ] Instagram: Hashtag posts (via unofficial or RapidAPI)

### 7.2 Social Source Helper
```
features/sources/lib/socialSource.ts (~80 lines)
```
- [ ] Unified interface for all platforms
- [ ] Extract: text, images, engagement metrics
- [ ] Convert → SourceItem

### 7.3 UI Integration
- [ ] Social media source types in wizard
- [ ] Platform selector (Twitter/Reddit/Instagram)
- [ ] Hashtag/subreddit/account input

### 7.4 Settings
- [ ] Twitter Bearer Token
- [ ] RapidAPI key (Instagram)
- [ ] Reddit client ID/secret (optional)

**Files:** ~4 new files, ~400 lines total

---

## Phase 8: Website Scraping
**Goal:** Scrape any website with CSS selectors

### 8.1 Scraper Engine
```
features/sources/lib/scraperEngine.ts (~200 lines)
```
- [ ] CSS selector-based content extraction
- [ ] Multi-page crawling (pagination)
- [ ] Image/media download
- [ ] HTML → Markdown conversion
- [ ] Respectful delays & user-agent

### 8.2 Scraper Templates
```
features/sources/lib/scraperTemplates.ts (~150 lines)
```
- [ ] Pre-built templates for common sites
- [ ] Template editor (save custom configs)
- [ ] Fields: title selector, content selector, image selector

### 8.3 Competitor Mirror
```
features/sources/lib/competitorMirror.ts (~120 lines)
```
- [ ] Analyze site structure automatically
- [ ] Extract all articles/posts
- [ ] Create "inspired" content (not copy)
- [ ] Link back (optional attribution)

### 8.4 Wire to aiServices
```
lib/ai/handlers/scrapeHandler.ts (~80 lines)
```
- [ ] Register handler for `scrape` capability
- [ ] Execute via scraperEngine
- [ ] Return structured content

### 8.5 UI Integration
- [ ] "Website" source type
- [ ] URL input + CSS selector configurator
- [ ] Live preview of extracted content

**Files:** ~4 new files, ~550 lines total

---

## Phase 9: Translation & Localization
**Goal:** Translate and republish content in multiple languages

### 9.1 Translation Providers
```
features/translation/lib/translationApi.ts (~150 lines)
```
- [ ] Google Translate API
- [ ] DeepL API (higher quality)
- [ ] AI-based translation (Gemini/GPT)
- [ ] Fallback chain

### 9.2 Translation Handler
```
lib/ai/handlers/translateHandler.ts (~80 lines)
```
- [ ] Register handler for `translate` capability
- [ ] Auto-detect source language
- [ ] Preserve formatting (HTML/Markdown)

### 9.3 Multi-Language Campaign
```
features/campaigns/lib/multiLangPublisher.ts (~120 lines)
```
- [ ] Clone content to multiple languages
- [ ] Target different WP sites per language
- [ ] URL slug localization

### 9.4 UI Integration
- [ ] Language selector in campaign wizard
- [ ] Target languages (multi-select)
- [ ] Translation provider preference

### 9.5 Settings
- [ ] Google Translate API key
- [ ] DeepL API key
- [ ] Default translation provider

**Files:** ~3 new files, ~350 lines total

---

## Phase 10: E-Commerce & Affiliate
**Goal:** Import products from Amazon, eBay for affiliate content

### 10.1 Amazon Product API
```
features/sources/lib/amazonApi.ts (~150 lines)
```
- [ ] Product search by keyword/ASIN
- [ ] Extract: title, price, images, description
- [ ] Affiliate link generation
- [ ] Product comparison lists

### 10.2 eBay API
```
features/sources/lib/ebayApi.ts (~100 lines)
```
- [ ] Product search
- [ ] Price monitoring
- [ ] Affiliate links

### 10.3 Affiliate Content Generator
```
features/campaigns/lib/affiliateContent.ts (~150 lines)
```
- [ ] Product review templates
- [ ] Comparison tables
- [ ] Price widgets (auto-update)
- [ ] Disclosure injection

### 10.4 WooCommerce Integration
```
features/wordpress/lib/wooCommerceApi.ts (~120 lines)
```
- [ ] Create WooCommerce products
- [ ] Sync inventory/prices
- [ ] Affiliate product type

### 10.5 Settings
- [ ] Amazon Associates credentials
- [ ] eBay Partner Network ID
- [ ] Default affiliate disclosure text

**Files:** ~4 new files, ~520 lines total

---

## FSD Structure

```
features/
├── sources/           # NEW FEATURE MODULE
│   ├── lib/
│   │   ├── youtubeApi.ts
│   │   ├── twitterApi.ts
│   │   ├── redditApi.ts
│   │   ├── instagramApi.ts
│   │   ├── socialSource.ts
│   │   ├── videoSource.ts
│   │   ├── scraperEngine.ts
│   │   ├── scraperTemplates.ts
│   │   ├── competitorMirror.ts
│   │   ├── amazonApi.ts
│   │   └── ebayApi.ts
│   └── index.ts
├── translation/       # NEW FEATURE MODULE
│   ├── lib/
│   │   └── translationApi.ts
│   └── index.ts
├── campaigns/         # EXTEND
│   └── lib/
│       ├── multiLangPublisher.ts
│       └── affiliateContent.ts
├── wordpress/         # EXTEND
│   └── lib/
│       └── wooCommerceApi.ts
lib/
└── ai/
    └── handlers/      # NEW
        ├── scrapeHandler.ts
        └── translateHandler.ts
```

---

## Priority Order

```
Phase 8 (Scraping) → Phase 9 (Translation) → Phase 6 (Video) → Phase 7 (Social) → Phase 10 (E-commerce)
```

User priority: Scraping first (competitor mirroring), then translation.

---

## Estimated Effort

| Phase | Files | Lines | Days |
|-------|-------|-------|------|
| 6. Video | 3 | ~400 | 1-2 |
| 7. Social | 4 | ~400 | 1-2 |
| 8. Scraping | 4 | ~550 | 2-3 |
| 9. Translation | 3 | ~350 | 1-2 |
| 10. E-commerce | 4 | ~520 | 2-3 |
| **Total** | **18** | **~2,220** | **7-12** |

---

## API Keys Required

| Phase | API | Free Tier |
|-------|-----|-----------|
| 6 | YouTube Data API v3 | 10K/day |
| 7 | Twitter API v2 | 1500 tweets/mo |
| 7 | RapidAPI (Instagram) | Limited |
| 9 | Google Translate | $20 free |
| 9 | DeepL API | 500K chars/mo |
| 10 | Amazon PA-API | Requires sales |
| 10 | eBay Browse API | Free |

---

## Tracking Progress

- [x] Phase 6: Video Sources ✅
- [x] Phase 7: Social Media Sources ✅
- [x] Phase 8: Website Scraping ✅
- [x] Phase 9: Translation ✅
- [x] Phase 10: E-Commerce ✅

🎉 **ALL PHASES COMPLETE!**
