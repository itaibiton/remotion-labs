---
phase: 11-movie-preview-render-export
plan: 01
subsystem: ui
tags: [remotion, player, useSyncExternalStore, preview, timeline, frame-tracking]

# Dependency graph
requires:
  - phase: 10-movie-data-timeline-ui
    provides: MovieComposition, Timeline, TimelineScene, movie-editor page
provides:
  - useCurrentPlayerFrame hook for efficient Remotion Player frame tracking
  - MoviePreviewPlayer component wrapping MovieComposition in Player
  - Active scene index computation from frame position and scene timings
  - Timeline scene highlighting during playback/scrub
affects: [11-02-render-export, 11-03-render-status]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useSyncExternalStore for Remotion Player frame tracking (no useState polling)"
    - "Scene timing accumulation for frame-to-scene index mapping"

key-files:
  created:
    - src/hooks/use-current-player-frame.ts
    - src/components/movie/movie-preview-player.tsx
  modified:
    - src/components/movie/movie-editor.tsx
    - src/components/movie/timeline.tsx
    - src/components/movie/timeline-scene.tsx

key-decisions:
  - "useSyncExternalStore over useState+setInterval for frame tracking -- avoids unnecessary re-renders"
  - "Filter null clips from validScenes to handle partially-loaded movies gracefully"
  - "JSON.stringify dependency for useMemo on scenesWithClips array (matches existing timeline pattern)"

patterns-established:
  - "useCurrentPlayerFrame: subscribe to frameupdate, read frame via getSnapshot, SSR-safe with getServerSnapshot returning 0"
  - "Scene timing accumulation: cumulative startFrame/endFrame offsets for frame-to-scene mapping"

# Metrics
duration: 3min
completed: 2026-02-01
---

# Phase 11 Plan 01: Movie Preview Player Summary

**Remotion Player wrapping MovieComposition with useSyncExternalStore frame tracking and timeline scene highlighting ring**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-01T11:08:44Z
- **Completed:** 2026-02-01T11:11:36Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- useCurrentPlayerFrame hook using useSyncExternalStore for efficient, non-polling frame tracking from Remotion Player
- MoviePreviewPlayer component rendering all movie scenes in sequence with controls and loop
- Active scene index computed from frame position via cumulative scene timing offsets
- Timeline scene blocks highlight with ring-2 ring-primary during playback/scrub

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useCurrentPlayerFrame hook and MoviePreviewPlayer component** - `0e3cbc4` (feat)
2. **Task 2: Wire preview into movie-editor and add timeline scene highlighting** - `002e3af` (feat)

## Files Created/Modified
- `src/hooks/use-current-player-frame.ts` - useSyncExternalStore hook subscribing to Player frameupdate events
- `src/components/movie/movie-preview-player.tsx` - Player wrapping MovieComposition with scene timing and active scene callback
- `src/components/movie/movie-editor.tsx` - Added MoviePreviewPlayer above timeline, activeSceneIndex state, validScenes computation
- `src/components/movie/timeline.tsx` - Added activeSceneIndex prop, passes isActive to TimelineScene
- `src/components/movie/timeline-scene.tsx` - Added isActive prop with ring-2 ring-primary highlight

## Decisions Made
- Used `useSyncExternalStore` instead of `useState` + `setInterval` for frame tracking -- avoids polling and unnecessary re-renders, follows React 18 best practices
- Filter null clips from `validScenes` to handle partially-loaded movies gracefully (clips still loading from Convex)
- Used `JSON.stringify` dependency for `useMemo` on `scenesWithClips` array, consistent with existing timeline pattern
- SSR guard with `isMounted` state and loading placeholder, matching existing PreviewPlayer pattern
- `component` prop cast via `as any` to satisfy Player generic type constraint, matching existing PreviewPlayer pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- MoviePreviewPlayer is ready; plays all scenes in sequence with frame-synced timeline highlighting
- Movie rendering (11-02) can reuse the same MovieComposition with Lambda
- Active scene index infrastructure could support future features like click-to-seek on timeline scenes

---
*Phase: 11-movie-preview-render-export*
*Completed: 2026-02-01*
