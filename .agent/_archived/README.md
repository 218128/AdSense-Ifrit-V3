# Archived Documentation

> ⚠️ These documents are kept for historical reference but may contain **outdated patterns**.

## Files

| File | Notes |
|------|-------|
| `CAPABILITIES_ARCHITECTURE.md` | Conceptual design, not fully implemented |

## What's Outdated

1. **localStorage references** - Now use Zustand stores (`useSettingsStore`)
2. **AIServices layer** - Conceptual, direct API calls are used instead
3. **CapabilityExecutor** - Not implemented, features call providers directly

## Current Patterns

See the main `.agent/` folder for current documentation:
- `README.md` - Entry point with correct patterns
- `SETTINGS_ARCHITECTURE.md` - Zustand store usage
- `ARCHITECTURE.md` - System overview with Dec 2025 updates
