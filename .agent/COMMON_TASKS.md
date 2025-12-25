# Common Tasks for AI Agents

## Adding a New API Endpoint

1. Create file: `app/api/{resource}/route.ts`
2. Import from websiteStore:
   ```typescript
   import { getWebsite, saveArticle } from '@/lib/websiteStore';
   ```
3. Export HTTP methods:
   ```typescript
   export async function GET(request: NextRequest) { ... }
   export async function POST(request: NextRequest) { ... }
   ```
4. For dynamic routes: `app/api/{resource}/[param]/route.ts`

---

## Adding a New Component

1. Create file: `components/{feature}/ComponentName.tsx`
2. Use `'use client';` for interactive components
3. Add to barrel export: `components/{feature}/index.ts`
4. Import in parent: `import ComponentName from '@/components/{feature}/ComponentName'`

---

## Adding a New Tab to WebsiteDetail

1. Update `TabId` type (line ~128):
   ```typescript
   type TabId = 'overview' | 'content' | 'pages' | 'NEW_TAB' | ...
   ```
2. Add to tabs array (line ~161):
   ```typescript
   { id: 'NEW_TAB', label: 'New Tab', icon: <Icon /> }
   ```
3. Add render conditional (line ~280+):
   ```typescript
   {activeTab === 'NEW_TAB' && <NewTabComponent />}
   ```

---

## Adding a New Content Field

1. Update `Article` interface in `lib/websiteStore.ts` (line ~108)
2. Add field to all Article creation locations:
   - `app/api/websites/[domain]/content/route.ts`
   - `app/api/websites/[domain]/sync-content/route.ts`
   - `lib/websiteStore.ts` (importExternalContent function)
3. Run `npm run build` to catch missing locations

---

## Creating a New Website Template

1. Create file: `lib/templates/newTemplate.ts`
2. Export `generateTemplateFiles(repoName, config)`
3. Return array of `{ path, content }` objects
4. Add to `lib/integrations/github.ts` template selection

---

## Testing Changes

```bash
# Type checking
npm run build

# Run dev server
npm run dev

# Check specific website data
cat websites/{domain}/metadata.json
```

---

## Key Files to Know

| When you need to... | Look at... |
|---------------------|------------|
| Store/retrieve data | `lib/websiteStore.ts` |
| Generate site files | `lib/templates/*.ts` |
| Push to GitHub | `lib/integrations/github.ts` |
| Deploy to Vercel | `lib/integrations/vercel.ts` |
| Generate AI content | `app/api/generate/route.ts` |
| Manage website UI | `components/websites/WebsiteDetail.tsx` |
| Settings/API keys | `stores/settingsStore.ts` (Zustand - ⚠️ NOT localStorage) |
| MCP Research | `app/api/research/route.ts` |

---

## Environment Variables

See `env.example` for required variables. Most API keys are stored in localStorage and passed via request body, not environment variables.

---

## Common Patterns

### Fetching website data
```typescript
const res = await fetch(`/api/websites/${domain}`);
const { website, articles } = await res.json();
```

### Saving an article
```typescript
await fetch(`/api/websites/${domain}/content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, status: 'draft' })
});
```

### Checking for errors
```typescript
const data = await res.json();
if (!data.success) {
    console.error(data.error);
}
```
