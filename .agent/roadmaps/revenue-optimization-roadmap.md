# Revenue Optimization & Human-Like Content Roadmap

## Objective

Transform Ifrit into a premium content factory that produces human-like, reader-friendly, AdSense-approved sites through Hunt → WordPress pipeline.

---

## Phase 1: Human-Like Content Generation (4h)

### 1.1 Prompt Engineering Overhaul
- Natural sentence variation, conversational tone
- First-person voice with author persona
- Rhetorical questions, reader engagement

### 1.2 E-E-A-T Signals
- Author credentials + experience
- Citations from authoritative sources
- First-hand experience statements

### 1.3 Content Humanizer
**New:** `features/campaigns/lib/humanizer.ts`
- Remove AI-isms ("certainly", "in conclusion")
- Add contractions, anecdotes, opinions
- Vary sentence structure

---

## Phase 2: Reader-Friendly Structure (3h)

### 2.1 Formatting Engine
- H2 every 300 words, bullet lists
- Auto Table of Contents
- TL;DR + Key Takeaways boxes

### 2.2 Readability Optimization
**New:** `features/campaigns/lib/readability.ts`
- Flesch Score 60-70 targeting
- Max 4 sentences per paragraph
- Active voice conversion

### 2.3 Internal Linking Enhancement
- Contextual in-paragraph links
- Pillar-cluster auto-suggestion

---

## Phase 3: AdSense Optimization (2h)

### 3.1 Ad Placement Zones
**New:** `features/wordpress/lib/adPlacements.ts`
- Above-fold, in-content, below-content zones
- Smart spacing (every 300 words)

### 3.2 Content Quality for Approval
- Min 1,500 words for main articles
- >90% originality via humanizer
- Consistent 3-5 posts/week schedule

### 3.3 Policy Compliance
**New:** `features/campaigns/lib/adsenseCompliance.ts`
- Prohibited topic checker
- Affiliate disclosure injection
- Privacy policy verification

---

## Phase 4: Theme Enhancements (3h)

### 4.1 AdSense-Optimized Themes
- Ad zones in NicheAuthority, TopicalMagazine, ExpertHub
- Mobile-first responsive ads
- Sticky sidebar ads

### 4.2 Speed Optimization
- Lazy load images + ads
- Critical CSS inlining
- Core Web Vitals targeting

---

## Phase 5: WordPress Plugin (3h)

### 5.1 Ifrit WP Plugin Suite
- Content receiver from Ifrit
- Auto Schema/OG tags injection
- Smart internal linking
- AdSense placement automation

---

## Phase 6: Hunt Enhancements (2h)

### 6.1 Niche Profitability
- AdSense RPM estimates by niche
- Competition + opportunity scores

### 6.2 Keyword Intelligence
- Long-tail suggestions
- Question-based keywords

---

## Priority Matrix

| Phase | Effort | Impact |
|-------|--------|--------|
| 1. Human-Like | 4h | ⭐⭐⭐ HIGH |
| 2. Reader-Friendly | 3h | ⭐⭐⭐ HIGH |
| 3. AdSense | 2h | ⭐⭐⭐ HIGH |
| 4. Themes | 3h | ⭐⭐ MEDIUM |
| 5. WP Plugin | 3h | ⭐⭐ MEDIUM |
| 6. Hunt | 2h | ⭐⭐ MEDIUM |

**Total: ~17 hours**

---

## Tracking

- [x] Phase 1: Human-Like Content ✅
- [x] Phase 2: Reader-Friendly ✅
- [x] Phase 3: AdSense Optimization ✅
- [x] Phase 4: WP Integration (renamed from Themes) ✅
- [ ] Phase 5: WordPress Plugin (optional)
- [ ] Phase 6: Hunt Enhancements (optional)
