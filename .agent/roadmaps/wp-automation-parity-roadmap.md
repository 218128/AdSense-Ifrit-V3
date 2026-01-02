# WP Automation Parity Roadmap

## Objective
Close the feature gap with WP Automatic Plugin while leveraging Ifrit's AI-native advantages.

---

## Phase 11: Content Manipulation Engine ⏳

### Files
| File | Location | Lines | Purpose |
|------|----------|-------|---------|
| `spintaxEngine.ts` | `features/content/lib/` | ~200 | Parse & expand {word1\|word2} syntax |
| `searchReplace.ts` | `features/content/lib/` | ~200 | Regex-based find/replace rules |
| `contentVariations.ts` | `features/content/lib/` | ~200 | Generate content variations |
| `index.ts` | `features/content/` | ~50 | Barrel exports |

### Features
- [x] Spintax parser with recursive nesting
- [x] Random and sequential selection modes
- [x] Search/replace with regex support
- [ ] Content variation generator

---

## Phase 12: Advanced Campaign Filters ⏳

### Files
| File | Location | Lines | Purpose |
|------|----------|-------|---------|
| `filterEngine.ts` | `features/campaigns/lib/` | ~250 | Rule-based content filtering |
| `keywordRotation.ts` | `features/campaigns/lib/` | ~150 | Round-robin keyword selection |
| `deduplication.ts` | `features/campaigns/lib/` | ~200 | Smart duplicate detection |

### Features
- [ ] Filter by: word count, price, date, keywords
- [ ] Exclude by: keywords, domains, patterns
- [ ] Keyword rotation modes
- [ ] Cross-campaign dedup

---

## Phase 13: WooCommerce Integration

### Files
| File | Location | Lines | Purpose |
|------|----------|-------|---------|
| `wooApi.ts` | `features/woocommerce/lib/` | ~300 | WooCommerce REST API client |
| `productMapper.ts` | `features/woocommerce/lib/` | ~250 | Source → WC product mapping |

### Features
- [ ] Create simple/variable products
- [ ] Set prices, stock, SKU
- [ ] Product images from sources

---

## Phase 14: Additional Social Sources

### Files
| File | Location | Lines | Purpose |
|------|----------|-------|---------|
| `facebookApi.ts` | `features/sources/lib/` | ~250 | FB page/group scraping |
| `instagramApi.ts` | `features/sources/lib/` | ~250 | IG post metadata |
| `pinterestApi.ts` | `features/sources/lib/` | ~200 | Pinterest pin extraction |

---

## Phase 15: Campaign Templates

### Files
| File | Location | Lines | Purpose |
|------|----------|-------|---------|
| `templates/index.ts` | `features/campaigns/` | ~100 | Template registry |
| `templates/*.ts` | `features/campaigns/` | ~150 each | Pre-built campaign configs |

---

## Tracking Progress

- [x] Phase 11: Content Manipulation ✅
- [x] Phase 12: Advanced Filters ✅
- [x] Phase 13: WooCommerce ✅
- [x] Phase 14: Social Sources ✅
- [x] Phase 15: Campaign Templates ✅

**🎉 ALL PHASES COMPLETE!**
