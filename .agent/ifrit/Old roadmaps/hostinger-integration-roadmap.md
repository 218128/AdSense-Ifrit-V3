# Hostinger MCP + WordPress Integration Roadmap

## Overview

Integrate Hostinger MCP server with Ifrit for automated site provisioning from Hunt keywords and Domain Acquire. Full pipeline: keyword discovery → domain → WordPress site → content publishing.

---

## User Requirements
✅ Hostinger API access confirmed  
✅ MCP server available (`hostinger-api-mcp`)  
✅ Auto-create websites from Hunt → Domain Acquire  
✅ Prioritize MCP connection, then full Ifrit integration

---

## Phase 1: MCP Server Configuration

### 1.1 IDE Configuration Required

Add Hostinger MCP to your IDE's MCP configuration:

```json
{
  "mcpServers": {
    "hostinger-mcp": {
      "command": "npx",
      "args": ["hostinger-api-mcp@latest"],
      "env": {
        "API_TOKEN": "YOUR_HOSTINGER_API_TOKEN"
      }
    }
  }
}
```

**Location:** 
- VSCode/Cursor: `.cursor/mcp.json` or workspace settings
- Claude Code: `~/.claude/mcp_servers.json`

### 1.2 Expected MCP Tools
- Domain management
- Hosting/site creation
- WordPress installation
- SSL provisioning
- DNS configuration
- Backup management

---

## Phase 2: Hunt → Website Automation

### 2.1 Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Hunt Section                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Keywords ──► Niche Analysis ──► Domain Suggestions                 │
│                                        │                            │
│                                        ▼                            │
│                              Domain Acquire Tab                     │
│                              (expired domains)                      │
│                                        │                            │
│                                        ▼                            │
│                         ┌──────────────────────────┐                │
│                         │   "Create Website" CTA   │                │
│                         └──────────────────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Hostinger MCP Integration                         │
├─────────────────────────────────────────────────────────────────────┤
│  ⚠️ REQUIRED STEP ORDER (Updated from Hostinger docs):              │
│                                                                      │
│  1. **Fetch hosting orders** (hosting_listOrdersV1)                 │
│     └─ Get available hosting plans with order_id                    │
│                                                                      │
│  2. **Add domain to Hostinger** (manual in hPanel)                  │
│     └─ Required for external domains - UI shows guidance            │
│                                                                      │
│  3. **Verify domain ownership** (hosting_verifyDomainOwnershipV1)   │
│     └─ Checks if domain is accessible, provides TXT record if not   │
│                                                                      │
│  4. **Create website** (hosting_createWebsiteV1)                    │
│     └─ Requires: domain + order_id + datacenter_code (first site)   │
│                                                                      │
│  5. **Configure DNS** (DNS_updateDNSRecordsV1)                      │
│     └─ Point A record to Hostinger IP (optional)                    │
│                                                                      │
│  6. **Deploy plugins/themes** (hosting_deployWordpress*)            │
│     └─ Upload theme/plugin files directly via MCP                   │
│                                                                      │
│  7. **Publish content** (WordPress REST API)                        │
│     └─ Standard WP REST - not via Hostinger MCP                     │
└─────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Ifrit Content Pipeline                            │
├─────────────────────────────────────────────────────────────────────┤
│  • Campaign creation (pre-configured for niche)                     │
│  • AI content generation (keywords ready)                           │
│  • Multi-site publishing                                            │
│  • Theme/graphics generation                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Domain → Hostinger Flow

> [!IMPORTANT]
> Domains purchased externally (GoDaddy, Namecheap, etc.) must be added to Hostinger before websites can be created.

**Option A: Domain purchased at Hostinger**
- Already registered, can create website immediately

**Option B: Domain purchased elsewhere** 
1. Add domain to Hostinger via `domains_addDomain` or Hostinger dashboard
2. Update nameservers at registrar to Hostinger's:
   - `ns1.hostinger.com`
   - `ns2.hostinger.com`
3. Wait for propagation (up to 48hrs)
4. Verify ownership
5. Create website

### 2.3 Implementation Files

| File | Purpose | Status |
|------|---------|--------|
| `app/api/hosting/orders/route.ts` | Fetch available hosting plans | ✅ Created |
| `features/hosting/lib/hostingerMcp.ts` | MCP tool wrapper | ✅ Created |
| `features/hosting/lib/siteProvision.ts` | Site creation orchestrator | ✅ Created |
| `app/api/hosting/provision/route.ts` | API endpoint | ✅ Created |
| `components/hunt/CreateSiteButton.tsx` | UI component | ✅ Created |
| `features/hosting/lib/domainRegistration.ts` | Domain → Hostinger flow | 🔲 TODO |

---

## Phase 3: Feature Integration Matrix

| Ifrit Feature | Hostinger Integration |
|---------------|----------------------|
| **Hunt Keywords** | → Niche-optimized site config |
| **Domain Acquire** | → Add domain + Create hosting + WordPress |
| **Campaigns** | → Per-site campaigns (1 site = 1 campaign scope) |
| **Theme Generation** | → Deploy via WP REST API |
| **Graphics** | → Upload to WP media library |
| **Translation** | → Multi-language content variants |
| **Competitor Analysis** | → Future: sellers.json parsing + content rewriting |

### Site-Centric Architecture (Future Vision)

> [!IMPORTANT]
> Each WordPress site becomes its own "universe" with dedicated:
> - Campaign management
> - Content automation
> - Competitor tracking
> - Settings & credentials

```
WP Sites Tab
├── site1.com (click to open site dashboard)
│   ├── Overview
│   ├── Campaigns (for this site only)
│   ├── Content Sources
│   │   ├── Keywords (from Hunt)
│   │   ├── Competitors (future: sellers.json)
│   │   └── RSS Feeds
│   └── Settings
├── site2.com
│   └── ... (same structure)
```

---

## Phase 4: Automatic Site Configuration

When creating a site from Hunt, auto-configure:

### WordPress Setup
- Install theme (based on niche)
- Install plugins: LiteSpeed Cache, Rank Math, Wordfence
- Configure Rank Math for target keywords
- Set up AdSense/Mediavine placeholders

### Ifrit Registration
- Add to WordPress sites list
- Create Application Password
- Create initial campaign with keywords
- Schedule content generation

---

## Phase 5: Health Monitoring Dashboard

### Site Status Panel
- Uptime monitoring
- SSL status
- Storage usage
- Backup schedule
- WordPress/plugin updates

### Integration with Hostinger AI
- Leverage Hostinger's AI Troubleshooter
- Use AI Optimizer for performance
- Sync with Kodee for management

---

## Implementation Priority

| Order | Feature | Effort | Impact | Status |
|-------|---------|--------|--------|--------|
| 1 | MCP Server Config | 10 min | Required | ✅ Done |
| 2 | Hunt UI "Create Site" | 2 hrs | High | ✅ Done |
| 3 | Site Provisioning API | 4 hrs | High | ✅ Done |
| 4 | Domain Verification | 30 min | Required | ✅ Done |
| 5 | **Auto-Registration** | 1 hr | High | ✅ Done |
| 6 | Campaign Auto-Setup | 30 min | Medium | ✅ Done |
| 7 | Health Dashboard | 2 hrs | Medium | ✅ Done |

**Current Blocker:** Domains purchased outside Hostinger must be added to Hostinger account before websites can be created.

---

## Next Steps

1. ~~Configure MCP~~ ✅
2. ~~Test MCP Tools~~ ✅ (118 tools available)
3. ~~Build Hunt UI~~ ✅ ("Create Website" button added)
4. **Implement Domain Registration Flow** - Add domain to Hostinger before website creation
   - Use `domains_getDomainListV1` to check if domain exists
   - If not, guide user through nameserver update OR use `domains_purchaseNewDomainV1`
   - Verify domain ownership
   - THEN create website
5. **Implement Pipeline** - Domain → Site → Campaign

