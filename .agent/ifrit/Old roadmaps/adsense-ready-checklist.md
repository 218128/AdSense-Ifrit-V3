# AdSense-Ready Launch Checklist

A comprehensive checklist to ensure websites created with Ifrit meet Google AdSense approval requirements and are ready for monetization.

---

## Status Overview

| Category | Status | Priority |
|----------|--------|----------|
| Content Quality | 🔲 TODO | Critical |
| Legal Pages | 🔲 TODO | Critical |
| Technical Requirements | 🔲 TODO | High |
| Site Structure | 🔲 TODO | High |
| Branding & Trust | 🔲 TODO | Medium |
| Monetization Setup | 🔲 TODO | Medium |
| Launch Verification | 🔲 TODO | High |

---

## Phase 1: Content Quality (Critical)

AdSense requires original, high-quality content. Minimum 10-30 posts before applying.

### 1.1 Content Volume
- [ ] **Minimum 15 posts** published before AdSense application
- [ ] Each post **1000+ words** for pillar content
- [ ] Mix of article types (guides, reviews, listicles)

### 1.2 Content Quality Checks
- [ ] No thin content (500+ words minimum)
- [ ] No duplicate/copied content
- [ ] Proper grammar and spelling
- [ ] Images with alt text
- [ ] Internal links between posts

### 1.3 Content Freshness
- [ ] Posts spread over 2-4 weeks (not all at once)
- [ ] Regular publishing schedule established

**Ifrit Features:** Content Spinner, Schema Markup, Internal Linking

---

## Phase 2: Legal Pages (Critical)

Required pages for AdSense approval. Missing = automatic rejection.

### 2.1 Privacy Policy
- [ ] Page exists at `/privacy` or `/privacy-policy`
- [ ] Mentions Google AdSense and data collection
- [ ] Mentions cookies and analytics
- [ ] Contact information included

### 2.2 Terms of Service
- [ ] Page exists at `/terms` or `/terms-of-service`
- [ ] Covers site usage rights
- [ ] Disclaimers for content accuracy

### 2.3 About Page
- [ ] Page exists at `/about`
- [ ] Explains site purpose and niche
- [ ] Author/team information
- [ ] Establishes credibility

### 2.4 Contact Page
- [ ] Page exists at `/contact`
- [ ] Working contact form or email
- [ ] Physical address (optional but recommended)

**Implementation:** Generate legal pages from templates during site creation

---

## Phase 3: Technical Requirements (High)

Google crawls and verifies these technical aspects.

### 3.1 Core Web Vitals
- [ ] LCP (Largest Contentful Paint) < 2.5s
- [ ] FID (First Input Delay) < 100ms
- [ ] CLS (Cumulative Layout Shift) < 0.1
- [ ] Mobile-friendly responsive design

### 3.2 SEO Basics
- [ ] Meta titles on all pages
- [ ] Meta descriptions on all pages
- [ ] Proper heading hierarchy (H1 → H2 → H3)
- [ ] XML sitemap at `/sitemap.xml`
- [ ] robots.txt properly configured

### 3.3 SSL & Security
- [ ] HTTPS enabled (SSL certificate active)
- [ ] No mixed content warnings
- [ ] No malware or security issues

### 3.4 Navigation
- [ ] Clear menu structure
- [ ] Categories organized logically
- [ ] Search functionality (recommended)

**Ifrit Features:** Templates include sitemap, meta tags, responsive design

---

## Phase 4: Site Structure (High)

Organized structure helps both users and AdSense reviewers.

### 4.1 Homepage
- [ ] Clear value proposition
- [ ] Featured/recent posts visible
- [ ] Easy navigation to content
- [ ] Professional design

### 4.2 Category Pages
- [ ] At least 3 content categories
- [ ] Each category has 3+ posts
- [ ] Category descriptions present

### 4.3 Post Structure
- [ ] Featured images on all posts
- [ ] Author attribution
- [ ] Publication dates visible
- [ ] Related posts suggestions
- [ ] Social sharing buttons (optional)

---

## Phase 5: Branding & Trust (Medium)

Professional appearance builds trust with users and Google.

### 5.1 Site Identity
- [ ] Custom domain (not free subdomain)
- [ ] Professional logo
- [ ] Consistent color scheme
- [ ] Favicon set

### 5.2 Contact & Social
- [ ] Working email address
- [ ] Social media links (if applicable)
- [ ] Newsletter signup (optional)

### 5.3 Domain Age
- [ ] Domain registered for 30+ days (some regions require 6 months)
- [ ] Content published for 2+ weeks

---

## Phase 6: Monetization Setup (Medium)

Configure AdSense integration in the application.

### 6.1 AdSense Account
- [ ] Google AdSense account created
- [ ] Site added to AdSense
- [ ] ads.txt file configured

### 6.2 Ifrit Configuration
- [ ] Publisher ID set in Settings → AdSense
- [ ] Ad slots created in AdSense dashboard
- [ ] Leaderboard slot configured
- [ ] In-Article slot configured
- [ ] Multiplex slot configured (optional)

### 6.3 Ad Placement
- [ ] Ads placed in non-intrusive locations
- [ ] No more than 3 ads per page initially
- [ ] Ads don't interfere with navigation
- [ ] Mobile ad experience is good

---

## Phase 7: Launch Verification (High)

Final checks before applying to AdSense.

### 7.1 Content Audit
- [ ] Run through all posts for quality
- [ ] Check all images load correctly
- [ ] Verify all links work (no 404s)
- [ ] Test on mobile devices

### 7.2 Speed Test
- [ ] Google PageSpeed score 80+
- [ ] Mobile score acceptable
- [ ] No major performance issues

### 7.3 Google Tools
- [ ] Site submitted to Google Search Console
- [ ] Sitemap submitted
- [ ] No crawl errors
- [ ] No security issues flagged

### 7.4 Apply for AdSense
- [ ] All above checks passed
- [ ] Submit application
- [ ] Wait 1-2 weeks for review
- [ ] Address any rejection reasons if applicable

---

## Quick Launch Checklist (TL;DR)

For a fast approval, ensure at minimum:

1. ✅ **15+ original posts** (1000+ words each)
2. ✅ **Privacy Policy** at `/privacy`
3. ✅ **About Page** at `/about`
4. ✅ **Contact Page** with working form
5. ✅ **Custom domain** with SSL
6. ✅ **Mobile-friendly** design
7. ✅ **XML sitemap** submitted to Search Console
8. ✅ **ads.txt** file in root
9. ✅ **Content spread** over 2+ weeks

---

## Implementation Tasks for Ifrit

### High Priority
- [x] Add legal page templates (Privacy, Terms, About, Contact) ✅
- [x] AI-powered legal page generation ✅
- [x] WordPress Pages API integration ✅
- [x] Auto-generate ads.txt for AdSense ✅

### Medium Priority
- [x] LegalPagesManager UI component ✅
- [x] Content quality scoring in campaign dashboard ✅
- [x] PageSpeed integration to monitor Core Web Vitals ✅

### Low Priority
- [x] Pre-application checklist wizard ✅
- [x] AdSense status tracking after approval ✅

---

## Resources

- [AdSense Program Policies](https://support.google.com/adsense/answer/48182)
- [AdSense Eligibility Requirements](https://support.google.com/adsense/answer/9724)
- [Google Search Console](https://search.google.com/search-console)
- [PageSpeed Insights](https://pagespeed.web.dev/)

---

## Tracking Progress

- [ ] Phase 1: Content Quality
- [ ] Phase 2: Legal Pages (templates)
- [ ] Phase 3: Technical Requirements
- [ ] Phase 4: Site Structure
- [ ] Phase 5: Branding & Trust
- [ ] Phase 6: Monetization Setup
- [ ] Phase 7: Launch Verification
