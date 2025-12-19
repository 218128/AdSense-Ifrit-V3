# 🛠️ Template Development Guide

This guide helps AI assistants (ChatGPT, Claude, Gemini, etc.) understand and upgrade Ifrit's website templates.

---

## 📁 Directory Structure Overview

Ifrit uses **two template directories** with different purposes:

### 1. `lib/templates/` - TypeScript Generators (DYNAMIC)

These are **code generators** that create Next.js files programmatically.

```
lib/templates/
├── index.ts                  ← Exports all template functions
├── nicheAuthorityBlog.ts     ← Niche Authority Blog generator (870 lines)
├── topicalMagazine.ts        ← Topical Magazine generator
├── expertHub.ts              ← Expert Hub generator
├── articleTemplates.ts       ← Article page templates
├── mockData.ts               ← Sample data for testing
└── shared/                   ← Reusable component generators
    ├── header.ts
    ├── footer.ts
    ├── articleCard.ts
    ├── adZone.ts             ← AdSense ad units
    ├── newsletter.ts
    ├── socialShare.ts
    ├── tableOfContents.ts
    ├── readingProgress.ts
    ├── trustBadges.ts
    ├── authorCard.ts
    ├── authorCredentials.ts
    ├── dateBadges.ts
    ├── relatedArticles.ts
    ├── seoHead.ts
    └── schema/               ← JSON-LD structured data
        ├── articleSchema.ts
        ├── authorSchema.ts
        ├── breadcrumbSchema.ts
        └── faqSchema.ts
```

### 2. `templates/` - Static Assets (STATIC)

These are **pre-configured files** that can be copied directly.

```
templates/
└── niche-authority-blog/
    ├── site-config.yaml      ← Site configuration (colors, author, SEO)
    └── styles.css            ← Global CSS styles
```

---

## 🎨 Template Types

Ifrit currently has **3 template types**:

| Template | File | Purpose | Best For |
|----------|------|---------|----------|
| **Niche Authority Blog** | `nicheAuthorityBlog.ts` | Clean, focused niche site | Affiliate/AdSense sites |
| **Topical Magazine** | `topicalMagazine.ts` | News/magazine style | Content-heavy sites |
| **Expert Hub** | `expertHub.ts` | Expert-focused with credentials | Professional/consulting |

---

## 🔧 How Templates Generate Websites

When a website is created:

```
1. User clicks "Create Website" in Ifrit
                    ↓
2. API calls: generateTemplateFiles(repoName, siteConfig)
                    ↓
3. Template generator returns: { path: string, content: string }[]
                    ↓
4. Files pushed to GitHub repository
                    ↓
5. Vercel deploys the Next.js site
```

### Key Generator Functions (nicheAuthorityBlog.ts)

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
  --primary: #2563eb;
  --primary-light: #3b82f6;
  --primary-dark: #1d4ed8;
  
  /* Secondary Colors */
  --secondary: #10b981;
  --secondary-light: #34d399;
  
  /* Neutrals */
  --background: #ffffff;
  --foreground: #0a0a0a;
  --muted: #f5f5f5;
  --muted-foreground: #737373;
  --border: #e5e5e5;
  
  /* Semantic */
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  
  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-serif: 'Merriweather', Georgia, serif;
  
  /* Spacing */
  --content-width: 800px;
  --container-width: 1200px;
}
```

### To Change Colors:

1. Modify `generateGlobalStyles()` in the template file
2. Or update `site-config.yaml` and regenerate

---

## 📦 Shared Components

All templates can use these shared component generators from `lib/templates/shared/`:

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
| AuthorSchema | `schema/authorSchema.ts` | Person JSON-LD |
| BreadcrumbSchema | `schema/breadcrumbSchema.ts` | Breadcrumb JSON-LD |
| FaqSchema | `schema/faqSchema.ts` | FAQ JSON-LD |

---

## ✏️ How to Modify an Existing Template

### Step 1: Locate the Template File
```
lib/templates/nicheAuthorityBlog.ts   ← For Niche Authority Blog
lib/templates/topicalMagazine.ts      ← For Topical Magazine
lib/templates/expertHub.ts            ← For Expert Hub
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
Create `lib/templates/shared/myComponent.ts`:

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
Add to `lib/templates/shared/index.ts`:

```typescript
export { generateMyComponent } from './myComponent';
```

### Step 3: Import in Template
In `nicheAuthorityBlog.ts`:

```typescript
import { generateMyComponent } from './shared';

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

### Step 1: Create Template File
Create `lib/templates/myNewTemplate.ts`:

```typescript
interface SiteConfig {
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

### Step 2: Export from Index
Add to `lib/templates/index.ts`:

```typescript
export * from './myNewTemplate';
```

### Step 3: Register in Website Creation API
Update `app/api/websites/create/route.ts` to include the new template option.

---

## ⚠️ Critical Rules for Template Development

### ❌ DO NOT:
- Use client-side hooks in Server Components
- Import Node.js modules in client components
- Hardcode domain-specific content
- Break Next.js App Router conventions
- Use deprecated React patterns

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
3. **Find the relevant function** in the template file
4. **Make modifications** following the rules above
5. **Provide the complete updated function** (not just snippets)
6. **Test instructions** for the user to verify

### Example Prompt for AI:
```
"Look at lib/templates/nicheAuthorityBlog.ts and upgrade the 
generateHomepage() function to add a featured articles carousel.
Follow the TEMPLATE_GUIDE.md rules."
```

---

*This guide is maintained by Ifrit. Last updated: ${new Date().toISOString().split('T')[0]}*
