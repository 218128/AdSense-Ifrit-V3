# Hunt Migration to Capabilities System

## Status: ✅ Complete

## Completed Tasks

### Phase 1: Migrate domain-profiles/generate ✅
- Replaced direct Gemini API call with `/api/capabilities/generate`
- Feature is now AI-agnostic
- Removed `apiKey` parameter - capabilities handles keys

### Phase 2: Capability Registration ✅
- 'analyze' and 'keywords' capabilities already exist
- No changes needed

### Phase 3: Hunt AI Helpers ✅
- Created `features/hunt/lib/huntHelpers.ts`
  - `analyzeNiche()` - Niche profitability analysis
  - `expandKeywords()` - Keyword expansion
  - `scoreDomain()` - Domain scoring
- Created barrel export `features/hunt/index.ts`

## Architecture Principle

```
┌─────────────────────────────────────────┐
│ HUNT FEATURE                            │
│  ► Prepares INPUT only                  │
│  ► Calls /api/capabilities/[capability] │
│  ► Does NOT know which AI handles it    │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ CAPABILITIES SYSTEM                     │
│  ► Handler selection                    │
│  ► Key management                       │
│  ► Retry + fallback                     │
└─────────────────────────────────────────┘
```

## Files Created/Modified

| File | Change |
|------|--------|
| `app/api/domain-profiles/generate/route.ts` | Migrated to capabilities |
| `features/hunt/lib/huntHelpers.ts` | NEW - AI helpers |
| `features/hunt/index.ts` | NEW - Barrel export |
| `.agent/HUNT_ARCHITECTURE.md` | NEW - Documentation |

## Tracking

- [x] All phases complete
- [x] Build passing
