# Contributing to AdSense Ifrit

Guidelines for AI-friendly, maintainable code.

## File Size Limits

| Type | Target | Hard Limit |
|------|--------|------------|
| Components | <500 lines | 800 lines |
| API Routes | <200 lines | 300 lines |
| Lib Utilities | <300 lines | 500 lines |

**If a file exceeds the limit**, split it into smaller focused modules.

## Folder Structure

```
components/feature-name/
├── FeatureName.tsx       # Main component
├── FeatureNameUtils.ts   # Helpers (optional)
├── index.ts              # Barrel export (REQUIRED)
└── _archive/             # Dead code (never delete)
```

### Barrel Exports (Required)

Every component folder **must** have an `index.ts`:

```typescript
// components/settings/index.ts
export { default as SettingsView } from './SettingsView';
export { AIKeyManager } from './AIKeyManager';
```

## Naming Conventions

### Functions
```typescript
// ✅ GOOD: Action + Subject + Context
const handleSaveSettings = async () => { ... }
const fetchDomainAnalysis = async (domain: string) => { ... }
const validateGitHubToken = (token: string) => { ... }

// ❌ BAD: Vague names
const save = () => { ... }
const getData = async () => { ... }
```

### Components
```typescript
// ✅ GOOD: PascalCase, descriptive
export default function WebsiteDetailPanel() { ... }
export function DomainScorerCard() { ... }

// ❌ BAD: Generic names
export default function Panel() { ... }
```

### Files
- Components: `PascalCase.tsx` (e.g., `WebsiteDetail.tsx`)
- Utilities: `camelCase.ts` (e.g., `domainUtils.ts`)
- API Routes: `route.ts` in folder structure

## Comments

### JSDoc for Functions
```typescript
/**
 * Backs up settings to server for cross-browser persistence.
 * @param settings - User settings object
 * @returns Timestamp of backup
 */
async function backupSettings(settings: Settings): Promise<number> { ... }
```

### Section Comments in Large Files
```typescript
// ============================================
// STATE MANAGEMENT
// ============================================

// ============================================
// API HANDLERS
// ============================================

// ============================================
// RENDER FUNCTIONS
// ============================================
```

## Code Patterns

### Shared Render Functions
Avoid duplicating JSX. Extract to functions:

```typescript
// ✅ GOOD: Single source of truth
const renderTabContent = () => ( ... );

// Use in multiple places
{renderTabContent()}
```

### State Initialization
```typescript
// ✅ GOOD: Safe localStorage access
const [value, setValue] = useState(() => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('key') || '';
    }
    return '';
});
```

## Archive Policy

**Never delete code** - move to `_archive/` folder:

```bash
# Instead of deleting
rm components/old/OldComponent.tsx

# Move to archive
mv components/old/OldComponent.tsx components/old/_archive/
```

Update barrel exports to note archived items:
```typescript
// Archived: OldComponent (moved to _archive/)
```

## Type Safety

- ❌ Never use `@ts-ignore`
- ⚠️ Minimize `any` - use proper types
- ✅ Define interfaces for all props and state

```typescript
interface WebsiteDetailProps {
    domain: string;
    onSync?: () => void;
}
```

## Testing

Run before committing:
```bash
npm run build
```
