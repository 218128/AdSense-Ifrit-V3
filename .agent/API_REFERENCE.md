# API Reference

## Website APIs

### GET /api/websites
List all websites.
```json
Response: { success: true, websites: Website[] }
```

### POST /api/websites
Create a website record.
```json
Body: { domain, name, niche, template, author, githubRepo, githubOwner }
Response: { success: true, website: Website }
```

### GET /api/websites/[domain]
Get website details with articles.
```json
Response: { success: true, website: Website, articles: Article[] }
```

### DELETE /api/websites/[domain]
Delete a website and all its data.

---

## Content APIs

### GET /api/websites/[domain]/content
List articles for a website.
```json
Response: { success: true, articles: Article[] }
```

### POST /api/websites/[domain]/content
Create an article.
```json
Body: { title, content, category?, tags?, status? }
Response: { success: true, article: Article }
```

### PATCH /api/websites/[domain]/content/[articleId]
Update an article.

### DELETE /api/websites/[domain]/content/[articleId]
Delete an article.

---

## Structural Pages API

### GET /api/websites/[domain]/pages
List structural pages (About, Contact, Privacy, Terms).
```json
Response: { success: true, pages: Article[], availableTypes: string[] }
```

### POST /api/websites/[domain]/pages
Create or update a structural page.
```json
Body: { pageType: 'about'|'contact'|'privacy'|'terms', title, content }
Body: { action: 'createDefaults' }  // Create all default pages
Response: { success: true, page: Article }
```

---

## Drafts API (Hot Folder Import)

### GET /api/websites/[domain]/drafts
Scan drafts folder for pending imports.
```json
Response: { success: true, pendingFiles: PendingFile[], history: ImportHistory[] }
```

### POST /api/websites/[domain]/drafts
Import draft files.
```json
Body: { files?: string[], importAll?: boolean }
Response: { success: true, imported: string[], failed: string[] }
```

---

## Site Builder API

### POST /api/site-builder
Start automated site building job.
```json
Body: { config: SiteConfig, providerKeys: ProviderKeys, githubConfig: GitHubConfig }
Response: { success: true, jobId: string }
```

### GET /api/site-builder
Get job status.
```json
Response: { success: true, job: SiteBuilderJob }
```

---

## Publishing API

### POST /api/publish
Push article to GitHub repository.
```json
Body: { articleSlug, domain, githubToken, repoOwner, repoName, branch? }
Response: { success: true, commitUrl: string, articleUrl: string }
```

---

## Integration APIs

### POST /api/github-setup
GitHub operations (validate, create-repo, push-template).
```json
Body: { action: 'validate'|'create-repo'|'push-template', token, repoName?, siteConfig? }
```

### POST /api/vercel-setup
Vercel operations (validate, create-project, add-domain).
```json
Body: { action: 'validate'|'create-project'|'add-domain', token, projectName?, domain? }
```

---

## Research API (Added Dec 2025)

### POST /api/research
MCP-powered research using Perplexity or Brave Search.
```json
Body: { query, perplexityKey?, braveKey? }
Response: { success: true, findings: string[], source: 'perplexity'|'brave' }
```

---

## Static Assets API (Added Dec 2025)

### GET /api/websites/[domain]/static/images/[...path]
Serves uploaded images from website's content/images folder.
```
Returns: Image file (PNG, JPG, GIF, WebP)
```

---

## Response Pattern

All APIs return:
```typescript
{
    success: boolean;
    data?: any;        // On success
    error?: string;    // On failure
    message?: string;  // Optional info
}
```

---

## ⚠️ Important Notes (Dec 2025)

1. **API Keys**: Pass `geminiKey` and `providerKeys` in request body for `/api/generate`
2. **GitHub User**: Always validate `githubUser` before operations (don't use hardcoded fallbacks)
3. **Research**: Use `/api/research` with Perplexity key from Settings store
