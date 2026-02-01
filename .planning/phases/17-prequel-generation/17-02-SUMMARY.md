---
phase: 17-prequel-generation
plan: 02
subsystem: ui
tags: [prequel, extend-previous, dropdown-menu, clip-save, navigation, mode-param, lucide-react, rewind]

# Dependency graph
requires:
  - phase: 17-prequel-generation/01
    provides: PREQUEL_SYSTEM_PROMPT and generatePrequel Convex action
  - phase: 16-per-creation-actions/02
    provides: Extend-next wiring pattern (save-then-navigate through 5-file component chain)
provides:
  - "Extend Previous" menu item in generation dropdown (save-then-navigate to prequel mode)
  - handleExtendPreviousGeneration callback wired from create page through feed to actions
  - Prequel mode in create page (mode=prequel URL param, mode-aware banner/placeholder/submit routing)
affects: [future prequel quality improvements, timeline integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mode-aware create page: URL param switches between continuation and prequel behavior"
    - "Identical save-then-navigate pattern for both Extend Next and Extend Previous"

key-files:
  created: []
  modified:
    - src/components/generation/generation-row-actions.tsx
    - src/components/generation/generation-row.tsx
    - src/components/generation/variation-grid.tsx
    - src/components/generation/generation-feed.tsx
    - src/app/(app)/create/page.tsx
    - src/app/(app)/create/create-page-client.tsx

key-decisions:
  - "Rewind icon for Extend Previous (mirrors FastForward icon for Extend Next)"
  - "mode=prequel URL param to differentiate prequel from continuation in create page"
  - "Prequel-specific banner and placeholder text for clear user context"

patterns-established:
  - "Mode param pattern: sourceClipId + mode=prequel enables prequel mode, sourceClipId alone defaults to continuation"
  - "Parallel action handlers: handlePrequelGenerate mirrors handleContinuationGenerate with prequel-specific wording"

# Metrics
duration: 3min
completed: 2026-02-01
---

# Phase 17 Plan 02: Prequel UI Wiring Summary

**"Extend Previous" dropdown action with Rewind icon, save-then-navigate to /create?mode=prequel, and mode-aware create page with prequel banner/placeholder/submit routing**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-01T22:19:15Z
- **Completed:** 2026-02-01T22:22:20Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added "Extend Previous" menu item with Rewind icon to GenerationRowActions dropdown (after Extend Next, before Rerun)
- Threaded onExtendPrevious callback through full 5-file component chain: create-page-client -> GenerationFeed -> GenerationRow/VariationGrid -> GenerationRowActions
- Implemented prequel mode in create page: mode URL param, prequelAction hook, handlePrequelGenerate callback, mode-aware submit routing, mode-aware context banner and placeholder text
- Implemented handleExtendPreviousGeneration: auto-saves as clip, navigates to /create?sourceClipId=X&mode=prequel

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Extend Previous to dropdown and thread callback through component chain** - `176af3e` (feat)
2. **Task 2: Add mode param to create page and implement prequel mode with extend-previous handler** - `b5c0736` (feat)

## Files Created/Modified
- `src/components/generation/generation-row-actions.tsx` - Added Rewind icon, onExtendPrevious prop, "Extend Previous" menu item
- `src/components/generation/generation-row.tsx` - Added onExtendPrevious prop passthrough to GenerationRowActions
- `src/components/generation/variation-grid.tsx` - Added onExtendPrevious prop passthrough to both batch-level and per-variation actions
- `src/components/generation/generation-feed.tsx` - Added onExtendPreviousGeneration prop, forwarded to GenerationRow and VariationGrid
- `src/app/(app)/create/page.tsx` - Added mode to searchParams type, passed to CreatePageClient
- `src/app/(app)/create/create-page-client.tsx` - Added mode prop, prequelAction, handlePrequelGenerate, handleExtendPreviousGeneration, mode-aware submit/banner/placeholder

## Decisions Made
- Rewind icon from lucide-react for "Extend Previous" (semantic pairing with FastForward for "Extend Next")
- URL param `mode=prequel` to differentiate prequel from continuation mode -- lightweight, no state management needed
- Prequel-specific banner text: "Generating prequel for: {name}" with subtitle "The new scene will lead into this clip's opening frame"
- handlePrequelGenerate uses `id: "prequel"` and `lastPrompt: "Prequel leading into target scene"` as defaults

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None -- no external service configuration required.

## Next Phase Readiness
- Phase 17 complete: full prequel generation flow wired end-to-end
- User can click "Extend Previous" on any generation -> auto-save as clip -> navigate to prequel mode -> generate prequel -> preview, edit, save
- No blockers for future phases

---
*Phase: 17-prequel-generation*
*Completed: 2026-02-01*
