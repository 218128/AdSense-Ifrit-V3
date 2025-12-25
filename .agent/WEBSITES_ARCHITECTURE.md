# Websites Architecture

## Overview

The Websites system manages blog/content site creation, article generation, and deployment to GitHub/Vercel.

---

## Component Structure

### Main Views
| Component | Purpose |
|-----------|---------|
| `WebsitesView.tsx` | Dashboard showing all websites |
| `WebsiteDetail.tsx` | Single website management (65KB - largest component) |

### Setup Wizards
| Component | Purpose |
|-----------|---------|
| `AutoConfigureWizard.tsx` | Automated website setup (27KB) |
| `DomainSetup.tsx` | Custom domain configuration |
| `DNSConfigPanel.tsx` | DNS record guidance |
| `EmailSetup.tsx` | Email forwarding setup |

### Content Generation
| Component | Purpose |
|-----------|---------|
| `GenerateArticleModal.tsx` | AI article generation (21KB) |
| `RefineArticleModal.tsx` | Edit/improve existing articles |
| `ArticleEditor.tsx` | Markdown editor with preview |
| `BulkArticleQueue.tsx` | Batch article generation |

### Site Configuration
| Component | Purpose |
|-----------|---------|
| `SiteDecisionsPanel.tsx` | Niche/tone/audience decisions |
| `ThemeEditor.tsx` | Visual theme customization |
| `SiteGraphicsPanel.tsx` | Logo, favicon, OG images |

---

## API Routes (`/api/websites/`)

| Route | Purpose |
|-------|---------|
| `/create` | Create new website record |
| `/[domain]/decisions` | Site decisions (niche, tone) |
| `/[domain]/generate` | Generate articles |
| `/[domain]/publish` | Deploy to GitHub/Vercel |
| `/[domain]/sync` | Sync with remote repo |
| `/[domain]/theme` | Update theme config |

---

## AI Integration Points

### Where AI is Used

| Step | Capability | Current Handler | Perplexity MCP Could |
|------|------------|-----------------|---------------------|
| **Domain Research** | `research` | Gemini/DeepSeek | Use `perplexity_research` for deep analysis |
| **Site Decisions** | `generate` | Gemini | - |
| **Article Generation** | `generate` | Gemini/DeepSeek | Use `perplexity_ask` for fact-checking |
| **Keyword Discovery** | `keywords` | Gemini | Use `perplexity_search` for trend data |
| **Competitor Analysis** | `analyze` | Manual | Use `perplexity_research` + `playwright` |

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                   WEBSITES TAB                          │
├─────────────────────────────────────────────────────────┤
│  WebsitesView → WebsiteDetail → GenerateArticleModal   │
│                                        │                │
│                                        ▼                │
│                              POST /api/websites/        │
│                              [domain]/generate          │
└─────────────────────────────┬───────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                    AIServices                           │
│                                                         │
│  execute({ capability: 'generate', prompt, keys })     │
│           │                                            │
│           ▼                                            │
│  ┌─────────────────────────────────────────────┐       │
│  │ Handler Selection (from Settings)           │       │
│  │ 1. Check user's configured handler          │       │
│  │ 2. Get enabled provider with valid key      │       │
│  │ 3. Execute with fallback chain              │       │
│  └─────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

---

## Perplexity Integration Strategy

### Current: Perplexity as AI Provider
- Stored in `settingsStore.providerKeys.perplexity`
- Used via Sonar API for generation/chat
- Works like Gemini/DeepSeek

### Proposed: Perplexity MCP (Separate)
- Stored in `settingsStore.mcpServers.perplexity`
- Provides specialized tools:
  - `perplexity_ask` - Quick research
  - `perplexity_research` - Deep multi-source
  - `perplexity_reason` - Complex analysis
  - `perplexity_search` - Web search

### Why Both?
| Use Case | Best Option |
|----------|-------------|
| Direct chat/generation | AI Provider (Sonar API) |
| Research with citations | MCP (`perplexity_research`) |
| Fact-checking articles | MCP (`perplexity_ask`) |
| SEO keyword trends | MCP (`perplexity_search`) |

---

## Implementation Recommendation

1. **Add Perplexity MCP** to `lib/mcp/servers.ts`
2. **Update Capabilities** to allow MCP handlers for `research` capability
3. **Use in GenerateArticleModal** for research phase before generation
4. **Use in SiteDecisionsPanel** for domain/niche analysis
