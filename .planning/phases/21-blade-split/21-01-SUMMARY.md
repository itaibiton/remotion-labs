# Summary: 21-01 Blade Foundation

## What Was Built
- Installed tinykeys (650B keyboard shortcut library)
- Created `useBladeMode` hook with keyboard shortcuts:
  - B: Toggle blade mode
  - Escape/V/A: Exit blade mode (common NLE conventions)
  - Cmd/Ctrl+B: Split at playhead (optional callback)
- Added `splitScene` mutation to Convex movies module:
  - Validates split position (must be within visible portion)
  - Creates two scenes from one with complementary trim ranges
  - Both scenes share same clipId (non-destructive virtual split)
  - Recomputes total duration after split

## Key Decisions
- Used @ts-expect-error for tinykeys import (moduleResolution issue, works at runtime)
- Input field guards prevent shortcuts from triggering when typing

## Files Modified
- `package.json` - Added tinykeys dependency
- `src/hooks/use-blade-mode.ts` - New hook for blade mode state + keyboard shortcuts
- `convex/movies.ts` - Added splitScene mutation

## Commits
- `3caac9f` - feat(21-01): add blade mode hook and splitScene mutation

## Verification
- TypeScript compilation passes
- tinykeys installed: `npm ls tinykeys` shows `tinykeys@3.0.0`
