# 🛠️ Template Development Guide

This guide helps AI assistants (ChatGPT, Claude, Gemini, etc.) understand and upgrade Ifrit's website templates.

---

## 📁 Unified Directory Structure

All templates are now in a **single `templates/` folder** — self-contained and isolated from core app code.

```
templates/
├── TEMPLATE_GUIDE.md        ← This file (AI instruction guide)
├── index.ts                 ← Main exports
│
├── niche-authority-blog/    ← Template 1
│   ├── generator.ts         ← Main generator (870 lines)
│   ├── config.yaml          ← Default site config
│   └── styles.css           ← Base styles
│
├── topical-magazine/        ← Template 2
│   └── generator.ts
│
├── expert-hub/              ← Template 3
│   └── generator.ts
│
└── shared/                  ← Reusable components (all templates use)
    ├── index.ts             ← Component exports
    ├── articleTemplates.ts  ← Article type templates
    ├── mockData.ts          ← Test data
    │
    ├── components/          ← UI component generators
    │   ├── header.ts
    │   ├── footer.ts
    │   ├── articleCard.ts
    │   ├── adZone.ts        ← AdSense ad units
    │   ├── newsletter.ts
    │   ├── socialShare.ts
    │   ├── tableOfContents.ts
    │   ├── readingProgress.ts
    │   ├── trustBadges.ts
    │   ├── authorCard.ts
    │   ├── authorCredentials.ts
    │   ├── dateBadges.ts
    │   ├── relatedArticles.ts
    │   └── seoHead.ts
    │
    └── schema/              ← JSON-LD structured data
        ├── articleSchema.ts
        ├── breadcrumbs.ts
        └── faqSchema.ts
```

### Benefits of Unified Structure:
- ✅ **AI-Safe**: External AI can modify templates without touching core Ifrit code
- ✅ **Self-Contained**: Each template folder has everything it needs
- ✅ **Clear Separation**: `shared/` for reusable, `{template}/` for specific

---

## 🎨 Template Types

Ifrit currently has **3 template types**:

| Template | Folder | Purpose | Best For |
|----------|--------|---------|----------|
| **Niche Authority Blog** | `niche-authority-blog/` | Clean, focused niche site | Affiliate/AdSense sites |
| **Topical Magazine** | `topical-magazine/` | News/magazine style | Content-heavy sites |
| **Expert Hub** | `expert-hub/` | Expert-focused with credentials | Professional/consulting |

---

## 🔧 How Templates Generate Websites

When a website is created:

```
1. User clicks "Create Website" in Ifrit
                    ↓
2. API calls: generateTemplateFiles(repoName, siteConfig)
   Location: templates/{template}/generator.ts
                    ↓
3. Generator returns: { path: string, content: string }[]
                    ↓
4. Files pushed to GitHub repository
                    ↓
5. Vercel deploys the Next.js site
```

### Key Generator Functions (generator.ts)

| Function | Purpose | Output |
|----------|---------|--------|
| `generateTemplateFiles()` | Main entry point | Array of all files |
| `generateGlobalStyles()` | CSS with color variables | `app/globals.css` |
| `generateLayoutComponent()` | Root layout with AdSense | `app/layout.tsx` |
| `generateHomepage()` | Homepage component | `app/page.tsx` |
| `generateArticlePage()` | Article page template | `app/[slug]/page.tsx` |
| `generateAboutPage()` | About page | `app/about/page.tsx` |
| `generateContentLib()` | Content fetching utilities | `lib/content.ts` |

---

## 🎨 CSS Variables System

Templates use CSS custom properties for easy theming. Located in `generateGlobalStyles()`:

```css
:root {
  /* Primary Colors */
  --color-primary: #2563eb;
  --color-primary-dark: #1d4ed8;
  --color-secondary: #10b981;
  
  /* Neutrals */
  --color-bg: #ffffff;
  --color-bg-alt: #f8fafc;
  --color-text: #1f2937;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;
  
  /* Typography */
  --font-sans: 'Inter', -apple-system, sans-serif;
  
  /* Layout */
  --max-width: 1200px;
  --content-width: 720px;
}
```

### To Change Colors:

1. Modify `generateGlobalStyles()` in the generator file
2. Or update the config and regenerate

---

## 📦 Shared Components

All templates use these shared component generators from `templates/shared/components/`:

### Layout Components
| Component | File | Purpose |
|-----------|------|---------|
| Header | `header.ts` | Navigation bar |
| Footer | `footer.ts` | Site footer with links |

### Article Components
| Component | File | Purpose |
|-----------|------|---------|
| ArticleCard | `articleCard.ts` | Card for article listings |
| TableOfContents | `tableOfContents.ts` | Auto-generated TOC |
| ReadingProgress | `readingProgress.ts` | Progress bar |
| RelatedArticles | `relatedArticles.ts` | Related posts section |
| SocialShare | `socialShare.ts` | Share buttons |

### Trust/SEO Components
| Component | File | Purpose |
|-----------|------|---------|
| AuthorCard | `authorCard.ts` | Author bio box |
| AuthorCredentials | `authorCredentials.ts` | E-E-A-T signals |
| TrustBadges | `trustBadges.ts` | Trust indicators |
| DateBadges | `dateBadges.ts` | Published/updated dates |
| SeoHead | `seoHead.ts` | Meta tags generator |

### Monetization
| Component | File | Purpose |
|-----------|------|---------|
| AdZone | `adZone.ts` | AdSense ad placement |
| Newsletter | `newsletter.ts` | Email signup form |

### Structured Data
| Component | File | Purpose |
|-----------|------|---------|
| ArticleSchema | `schema/articleSchema.ts` | Article JSON-LD |
| BreadcrumbSchema | `schema/breadcrumbs.ts` | Breadcrumb JSON-LD |
| FaqSchema | `schema/faqSchema.ts` | FAQ JSON-LD |

---

## ✏️ How to Modify an Existing Template

### Step 1: Locate the Template File
```
templates/niche-authority-blog/generator.ts   ← Niche Authority Blog
templates/topical-magazine/generator.ts       ← Topical Magazine
templates/expert-hub/generator.ts             ← Expert Hub
```

### Step 2: Find the Function to Modify
Each template has functions like:
- `generateHomepage()` - Modify homepage layout
- `generateArticlePage()` - Modify article layout
- `generateGlobalStyles()` - Modify colors/fonts

### Step 3: Edit the Template String
Templates use **tagged template literals** that return TSX code:

```typescript
function generateHomepage(siteName: string): string {
  return `
    export default function Home() {
      return (
        <main className="container">
          <h1>${siteName}</h1>
          {/* Add your changes here */}
        </main>
      );
    }
  `;
}
```

### Step 4: Test by Creating a New Website
Changes apply to **newly created** websites only.

---

## ➕ How to Add a New Component

### Step 1: Create Component File
Create `templates/shared/components/myComponent.ts`:

```typescript
export function generateMyComponent(): string {
  return `
    'use client';
    
    export default function MyComponent() {
      return (
        <div className="my-component">
          {/* Component content */}
        </div>
      );
    }
  `;
}
```

### Step 2: Export from Index
Add to `templates/shared/index.ts`:

```typescript
export { generateMyComponent } from './components/myComponent';
```

### Step 3: Import in Template Generator
In `templates/niche-authority-blog/generator.ts`:

```typescript
import { generateMyComponent } from '../shared';

function generateTemplateFiles(...) {
  return [
    // ... other files
    {
      path: 'components/MyComponent.tsx',
      content: generateMyComponent()
    }
  ];
}
```

---

## 🆕 How to Create a New Template

### Step 1: Create Template Folder
```
templates/my-new-template/
├── generator.ts
├── config.yaml
└── styles.css
```

### Step 2: Create Generator File
`templates/my-new-template/generator.ts`:

```typescript
export interface SiteConfig {
  siteName: string;
  domain: string;
  author: { name: string; role: string };
  colors: { primary: string; secondary: string };
}

export function generateTemplateFiles(
  repoName: string, 
  config: Partial<SiteConfig>
): { path: string; content: string }[] {
  
  const siteName = config.siteName || repoName;
  
  return [
    {
      path: 'package.json',
      content: generatePackageJson(siteName)
    },
    {
      path: 'app/layout.tsx',
      content: generateLayoutComponent(siteName)
    },
    {
      path: 'app/page.tsx',
      content: generateHomepage(siteName)
    },
    {
      path: 'app/globals.css',
      content: generateGlobalStyles()
    },
    // Add more files...
  ];
}
```

### Step 3: Export from templates/index.ts

```typescript
export { generateTemplateFiles as generateMyNewTemplate } from './my-new-template/generator';
```

### Step 4: Register in Website Creation API
Update `app/api/websites/create/route.ts` to include the new template option.

---

## ⚠️ Critical Rules for Template Development

### ❌ DO NOT:
- Use client-side hooks in Server Components
- Import Node.js modules in client components
- Hardcode domain-specific content
- Break Next.js App Router conventions
- Use deprecated React patterns
- Modify files outside `templates/` folder

### ✅ DO:
- Use `'use client'` directive for interactive components
- Pass config values as props/parameters
- Follow Next.js 14+ App Router patterns
- Include proper TypeScript types
- Add `/* eslint-disable */` if needed for generated code
- Use CSS variables for theming

---

## 📋 Template File Checklist

A complete template should generate:

### Required Files
- [ ] `package.json` with Next.js dependencies
- [ ] `next.config.js` or `next.config.mjs`
- [ ] `tsconfig.json`
- [ ] `app/layout.tsx` (root layout)
- [ ] `app/page.tsx` (homepage)
- [ ] `app/globals.css`
- [ ] `lib/content.ts` (content utilities)

### Recommended Files
- [ ] `app/[slug]/page.tsx` (article pages)
- [ ] `app/about/page.tsx`
- [ ] `app/contact/page.tsx`
- [ ] `app/privacy/page.tsx`
- [ ] `app/terms/page.tsx`
- [ ] `components/` directory with reusables
- [ ] `public/` directory for static assets

### AdSense Integration
- [ ] AdSense script in layout head
- [ ] Ad zone components
- [ ] Proper ad placement (above fold, in-content, sidebar)

---

## 🔄 Workflow for External AI

When asked to upgrade templates:

1. **Read this guide** to understand the architecture
2. **Identify the target template** (niche, magazine, or expert)
3. **Find the relevant function** in `templates/{template}/generator.ts`
4. **Make modifications** following the rules above
5. **Provide the complete updated function** (not just snippets)
6. **Test instructions** for the user to verify

### Example Prompt for AI:
```
"Look at templates/niche-authority-blog/generator.ts and upgrade the 
generateHomepage() function to add a featured articles carousel.
Follow the TEMPLATE_GUIDE.md rules."
```

---

*This guide is maintained by Ifrit. Last updated: 2025-12-19*
