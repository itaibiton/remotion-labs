---
phase: 12-continuation-generation
plan: 02
subsystem: ui
tags: [react, next.js, remotion, convex, continuation, dialog, timeline]

# Dependency graph
requires:
  - phase: 12-continuation-generation (plan 01)
    provides: generateContinuation Convex action for LLM-based scene continuation
  - phase: 10-movie-data-timeline-ui
    provides: timeline-scene component, movies.addScene mutation, movies.list query
  - phase: 09-app-shell-clip-library
    provides: clip-card component, save-clip-dialog, clips.get query
provides:
  - Create page continuation mode (sourceClipId param triggers generateContinuation flow)
  - AddToMovieDialog component for adding clips to movies from any surface
  - "Generate next scene" entry points on timeline scenes and clip cards
  - SaveClipDialog onSaved callback for chaining post-save actions
  - Contextual actions bar (Save / Add to Movie / Generate Next Scene) on create page
affects: [future clip workflow enhancements, movie assembly UX improvements]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "effectiveClipId pattern: clipId (from URL) ?? savedClipId (from onSaved callback) for conditional action visibility"
    - "Continuation mode detection via sourceClipId search param presence"
    - "AddToMovieDialog follows add-scene-panel pattern (lists movies, calls movies.addScene)"

key-files:
  created:
    - src/components/library/add-to-movie-dialog.tsx
  modified:
    - src/app/(app)/create/page.tsx
    - src/app/(app)/create/create-page-client.tsx
    - src/components/library/save-clip-dialog.tsx
    - src/components/movie/timeline-scene.tsx
    - src/components/library/clip-card.tsx

key-decisions:
  - "effectiveClipId = clipId ?? savedClipId for contextual action visibility after save"
  - "Continuation mode detected by sourceClipId presence in URL search params"
  - "AddToMovieDialog follows add-scene-panel pattern (lists movies, calls movies.addScene)"

patterns-established:
  - "Contextual actions bar pattern: actions appear conditionally based on clip save state"
  - "onSaved callback pattern on SaveClipDialog for post-save chaining"
  - "FastForward icon convention for 'Generate next scene' entry points"

# Metrics
duration: ~8min
completed: 2026-02-01
---

# Phase 12 Plan 02: Continuation Generation UI Summary

**Full continuation UI flow with "Generate next scene" buttons on timeline/clip-card, create page continuation mode, and contextual Save/AddToMovie/GenerateNext actions**

## Performance

- **Duration:** ~8 min (including human verification checkpoint)
- **Started:** 2026-02-01T12:19:00Z
- **Completed:** 2026-02-01T12:29:06Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 6

## Accomplishments
- AddToMovieDialog component created -- lists user's movies, adds clip as scene via movies.addScene mutation
- Create page continuation mode: sourceClipId param triggers continuation banner, specialized placeholder, and generateContinuation action call
- "Generate next scene" (FastForward) buttons added to timeline scene hover overlay and clip card action row
- SaveClipDialog enhanced with onSaved callback to capture new clip ID post-save
- Contextual actions bar: Save as Clip (always), Add to Movie and Generate Next Scene (after clip saved, via effectiveClipId pattern)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AddToMovieDialog, enhance SaveClipDialog, and add "Generate next scene" buttons** - `dac08a5` (feat)
2. **Task 2: Wire continuation mode into create page** - `f2e4396` (feat)
3. **Task 3: Verify continuation generation flow end-to-end** - human checkpoint (approved)

## Files Created/Modified
- `src/components/library/add-to-movie-dialog.tsx` (new) - Dialog listing user's movies to add a clip as a scene
- `src/app/(app)/create/page.tsx` - Added sourceClipId search param extraction and pass-through
- `src/app/(app)/create/create-page-client.tsx` - Continuation mode UI, generateContinuation call, contextual actions, AddToMovieDialog integration
- `src/components/library/save-clip-dialog.tsx` - Added onSaved callback prop to capture new clip ID
- `src/components/movie/timeline-scene.tsx` - Added FastForward hover button for "Generate next scene" navigation
- `src/components/library/clip-card.tsx` - Added FastForward button in actions row for "Generate next scene" navigation

## Decisions Made
- effectiveClipId pattern (`clipId ?? savedClipId`) to determine when to show contextual actions -- avoids requiring page reload after save
- Continuation mode detected purely by sourceClipId presence in URL search params, keeping the create page backward-compatible
- AddToMovieDialog follows the established add-scene-panel pattern (query movies.list, mutate movies.addScene)
- handleContinuationGenerate follows exact same structure as handleGenerate, calling continuationAction instead of generate
- handleUnifiedSubmit routes to continuation when sourceClipId present and no generation yet

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 12 (Continuation Generation) is fully complete -- backend and UI
- Full continuation workflow operational: trigger from timeline/library -> generate continuation -> preview -> save -> add to movie / chain next scene
- Milestone v2.0 (Scenes, Timeline & Movie Editor) is complete
- All 12 phases across 3 milestones delivered

---
*Phase: 12-continuation-generation*
*Completed: 2026-02-01*
