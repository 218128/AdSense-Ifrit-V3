---
description: Implement campaign scheduler for automatic content generation
---

# Implement Scheduler (Phase 1)

## Overview
Create the scheduler API and logic to automatically run due campaigns.

## Steps

### 1. Create Cron API Endpoint
Create `app/api/campaigns/cron/route.ts`:
```typescript
// GET /api/campaigns/cron
// Called by external cron service (or manually for local dev)
// Returns list of campaigns executed
```

### 2. Create Trigger API (Local Dev)
Create `app/api/campaigns/trigger/route.ts`:
```typescript
// POST /api/campaigns/trigger
// Body: { campaignId: string }
// Manually trigger a specific campaign
```

### 3. Update Campaign Store
Add to `campaignStore.ts`:
- `updateNextRun(campaignId: string): void`
- Calculate next run based on `schedule.intervalHours`

### 4. Update Campaign Card UI
In `CampaignCard.tsx`:
- Show "Last Run: X ago"
- Show "Next Run: in X hours" for interval campaigns

### 5. Test with Local WordPress
1. Start local WordPress (LocalWP/Docker)
2. Add WP site connection
3. Create campaign with interval schedule
4. Call `/api/campaigns/trigger` to test
5. Verify post appears in WordPress

### 6. Add Tests
Create `__tests__/features/campaigns/scheduler.test.ts`:
- Test due campaign detection
- Test nextRunAt calculation
- Test error handling

## Files to Create/Modify
- `app/api/campaigns/cron/route.ts` [NEW]
- `app/api/campaigns/trigger/route.ts` [NEW]
- `features/campaigns/model/campaignStore.ts` [MODIFY]
- `features/campaigns/ui/CampaignCard.tsx` [MODIFY]
- `__tests__/features/campaigns/scheduler.test.ts` [NEW]

## Verification
// turbo-all
```bash
npm test -- --testPathPatterns="scheduler"
curl -X POST http://localhost:3000/api/campaigns/trigger -d '{"campaignId":"camp_xxx"}'
```
