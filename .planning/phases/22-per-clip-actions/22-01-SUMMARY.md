---
phase: 22-per-clip-actions
plan: 01
subsystem: ui, api
tags: [convex, mutations, dropdown-menu, timeline, clip-actions]

# Dependency graph
requires:
  - phase: 21-blade-split
    provides: timeline with trim and split capabilities
provides:
  - clips.update mutation for patching existing clip code/metadata
  - movies.insertScene mutation for positional scene insertion
  - TimelineSceneActions dropdown component
  - Timeline action handler prop passthrough
affects: [22-02, edit-panel, generation-workflows]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-clip action dropdown with pointer event isolation"
    - "Mutation for partial clip updates (code/rawCode/name/duration/fps)"
    - "Positional scene insertion with afterIndex/beforeIndex"

key-files:
  created:
    - src/components/movie/timeline-scene-actions.tsx
  modified:
    - convex/clips.ts
    - convex/movies.ts
    - src/components/movie/timeline-scene.tsx
    - src/components/movie/timeline.tsx

key-decisions:
  - "Dropdown replaces standalone FastForward button for better action consolidation"
  - "Actions dropdown renders only when all 4 handlers are provided (graceful fallback)"
  - "stopPropagation on both onClick and onPointerDown to prevent drag interference"

patterns-established:
  - "Action dropdown with pointer event isolation pattern for sortable items"

# Metrics
duration: 3min
completed: 2026-02-03
---

# Phase 22 Plan 01: Per-Clip Actions - Backend & UI Foundation Summary

**Backend mutations for clip updates and scene insertion, plus TimelineSceneActions dropdown component for per-clip actions**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-03T21:57:39Z
- **Completed:** 2026-02-03T22:00:32Z
- **Tasks:** 4
- **Files modified:** 5

## Accomplishments

- Added `clips.update` mutation for patching existing clip code/metadata (enables regenerate and edit save)
- Added `movies.insertScene` mutation for inserting scenes at specific positions (enables Generate Next/Previous)
- Created TimelineSceneActions dropdown with 4 action items (Generate Next, Generate Previous, Re-generate, Edit)
- Wired TimelineSceneActions into TimelineScene with proper pointer event isolation to prevent drag interference

## Task Commits

Each task was committed atomically:

1. **Task 1: Add clips.update mutation** - `64f08d7` (feat)
2. **Task 2: Add movies.insertScene mutation** - `a097cf8` (feat)
3. **Task 3: Create TimelineSceneActions dropdown component** - `ede5adf` (feat)
4. **Task 4: Wire TimelineSceneActions into TimelineScene and Timeline** - `03d4649` (feat)

## Files Created/Modified

- `convex/clips.ts` - Added `update` mutation for patching clip fields
- `convex/movies.ts` - Added `insertScene` mutation for positional scene insertion
- `src/components/movie/timeline-scene-actions.tsx` - New dropdown component with 4 action items
- `src/components/movie/timeline-scene.tsx` - Renders actions dropdown, removed old FastForward button
- `src/components/movie/timeline.tsx` - Passes action handler props through to TimelineScene

## Decisions Made

- **Dropdown replaces standalone button:** Consolidated all per-clip actions into a single dropdown menu for cleaner UI and easier extension
- **Conditional rendering:** Actions dropdown only renders when all 4 handlers are provided, allowing graceful fallback when MovieEditor doesn't pass handlers
- **Pointer event isolation:** Used both onClick and onPointerDown stopPropagation to prevent dropdown interactions from triggering drag-and-drop

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Backend mutations ready for use by MovieEditor
- UI component ready for action handler wiring
- Ready for Plan 22-02: Wire handlers in MovieEditor to connect dropdown actions to mutations

---
*Phase: 22-per-clip-actions*
*Completed: 2026-02-03*
