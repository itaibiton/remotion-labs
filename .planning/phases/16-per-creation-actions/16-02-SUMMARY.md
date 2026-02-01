---
phase: 16-per-creation-actions
plan: 02
subsystem: ui
tags: [continuation, extend-next, dropdown-menu, clip-save, navigation, lucide-react]

# Dependency graph
requires:
  - phase: 16-per-creation-actions/01
    provides: GenerationRowActions dropdown with save, delete, rerun infrastructure
  - phase: 12-continuation-generation
    provides: Continuation mode (/create?sourceClipId=) and generateContinuation action
provides:
  - "Extend Next" menu item in generation dropdown (save-then-navigate to continuation mode)
  - handleExtendNextGeneration callback wired from create page through feed to actions
affects: [17-prequel-generation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Save-then-navigate pattern: auto-save as clip before navigating to continuation mode"

key-files:
  created: []
  modified:
    - src/components/generation/generation-row-actions.tsx
    - src/components/generation/generation-row.tsx
    - src/components/generation/variation-grid.tsx
    - src/components/generation/generation-feed.tsx
    - src/app/(app)/create/create-page-client.tsx

key-decisions:
  - "Extend Next auto-saves generation as clip before navigation (reuses clips.save mutation from 16-01)"
  - "No Extend Previous button -- deferred to Phase 17 when prequel backend exists"
  - "FastForward icon for Extend Next consistent with Generate Next Scene button"

patterns-established:
  - "Save-then-navigate: auto-save as clip, toast feedback, router.push to continuation URL"

# Metrics
duration: 2min
completed: 2026-02-01
---

# Phase 16 Plan 02: Extend-Next Action Wiring Summary

**"Extend Next" dropdown action auto-saves generation as clip and navigates to continuation mode via /create?sourceClipId=**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-01T21:49:21Z
- **Completed:** 2026-02-01T21:51:21Z
- **Tasks:** 5
- **Files modified:** 5

## Accomplishments
- Added "Extend Next" menu item to GenerationRowActions dropdown between Save to Library and Rerun
- Implemented save-then-navigate handler: auto-saves generation as clip, then navigates to continuation mode
- Wired callback through full component chain: create-page-client -> GenerationFeed -> GenerationRow/VariationGrid -> GenerationRowActions
- Disabled on failed generations or those without code (matching Save to Library behavior)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Extend Next to GenerationRowActions** - `df8dc3e` (feat)
2. **Task 2: Pass onExtendNext through GenerationRow** - `b1f18ec` (feat)
3. **Task 3: Pass onExtendNext through VariationGrid** - `ce3938d` (feat)
4. **Task 4: Pass onExtendNextGeneration through GenerationFeed** - `e5c9fc5` (feat)
5. **Task 5: Implement extend-next handler in create page** - `191f3d2` (feat)

## Files Created/Modified
- `src/components/generation/generation-row-actions.tsx` - Added FastForward icon, onExtendNext prop, "Extend Next" menu item
- `src/components/generation/generation-row.tsx` - Added onExtendNext prop passthrough to GenerationRowActions
- `src/components/generation/variation-grid.tsx` - Added onExtendNext prop passthrough to both batch-level and per-variation actions
- `src/components/generation/generation-feed.tsx` - Added onExtendNextGeneration prop, forwarded to GenerationRow and VariationGrid
- `src/app/(app)/create/create-page-client.tsx` - Implemented handleExtendNextGeneration handler (save + navigate), wired to GenerationFeed

## Decisions Made
- Reused existing `saveClip` mutation (already available from 16-01) for auto-save before navigation
- No "Extend Previous" added -- Phase 17 builds the prequel backend, button will be added there
- FastForward icon matches the existing "Generate Next Scene" button in the contextual actions bar

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 16 complete: all per-creation actions (save, delete, rerun, extend-next) wired
- Phase 17 (prequel generation) can add "Extend Previous" to the same dropdown when backend is ready
- The save-then-navigate pattern established here can be reused for "Extend Previous" in Phase 17

---
*Phase: 16-per-creation-actions*
*Completed: 2026-02-01*
