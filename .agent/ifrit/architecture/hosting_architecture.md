# Hosting Feature Architecture

## Purpose
Hostinger integration for automated WordPress site provisioning from Hunt domains.

---

## FSD Structure

```
features/hosting/
├── index.ts              # Barrel exports
└── lib/
    ├── hostingerMcp.ts   # Hostinger MCP integration
    └── siteProvision.ts  # Provisioning logic
```

---

## API Routes

```
/api/hosting/
├── provision/route.ts    # Create new WP site
├── orders/route.ts       # List hosting orders
└── health/route.ts       # Hostinger connectivity check
```

---

## Provisioning Flow

```mermaid
flowchart LR
    A[Hunt Domain] --> B[CreateSiteButton]
    B --> C[/api/hosting/provision]
    C --> D[Hostinger MCP]
    D --> E[WP Site Created]
    E --> F[wpSiteStore.addSite]
```

---

## Key Types

```typescript
interface HostingerProvisionRequest {
    domain: string;
    niche?: string;
    siteType?: WPSiteType;
}

interface HostingerProvisionResult {
    success: boolean;
    siteId?: string;
    orderId?: string;
    error?: string;
}

interface HostingerOrder {
    orderId: string;
    domain: string;
    status: 'pending' | 'active' | 'failed';
    createdAt: number;
}
```

---

## MCP Integration

Uses Hostinger MCP server (when configured):
- `hostinger-wordpress-hosting-create` - Provision site
- `hostinger-order-list` - List orders
- `hostinger-health-check` - Connectivity test

---

## Integration Points

- **Input**: Hunt domains via `CreateSiteButton.tsx`
- **Output**: New `WPSite` entries in `wpSiteStore`
- **Credentials**: Stored in site record for WP REST API access
