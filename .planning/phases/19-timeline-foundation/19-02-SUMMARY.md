---
phase: 19-timeline-foundation
plan: 02
subsystem: ui
tags: [timeline, remotion, playhead, scrubber, pointer-events, bidirectional-sync]

# Dependency graph
requires:
  - phase: 19-timeline-foundation
    plan: 01
    provides: Proportional timeline clips with timecode ruler
provides:
  - Draggable playhead synced bidirectionally with Remotion Player
  - Click-to-seek on timeline ruler and background
  - Lifted playerRef pattern for shared player control
affects: [trim-split-editing, timeline-interactions, keyboard-shortcuts]

# Tech tracking
tech-stack:
  added: []
  patterns: [lifted-playerRef, pointer-capture-drag, bidirectional-sync]

key-files:
  created:
    - src/components/movie/timeline-playhead.tsx
  modified:
    - src/components/movie/movie-editor.tsx
    - src/components/movie/movie-preview-player.tsx
    - src/components/movie/timeline.tsx

key-decisions:
  - "Lifted playerRef to MovieEditor for shared access between player and timeline"
  - "Pointer capture for smooth cross-boundary dragging"
  - "12px invisible hit zone around 2px playhead line for easier grabbing"
  - "Pause during drag, resume previous play state on release"

patterns-established:
  - "playerRef passed from parent to both preview player and timeline"
  - "useCurrentPlayerFrame hook for reactive frame updates"
  - "Pointer capture drag pattern for timeline scrubbing"

# Metrics
duration: 12min
completed: 2026-02-03
---

# Phase 19 Plan 02: Timeline Playhead Summary

**Bidirectional playhead sync with drag-to-seek and click-to-seek using pointer capture events**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-03T09:15:00Z
- **Completed:** 2026-02-03T09:27:00Z
- **Tasks:** 3 (including 1 fix)
- **Files modified:** 4

## Accomplishments
- Playhead indicator syncs bidirectionally with Remotion Player
- Dragging playhead smoothly seeks the video preview
- Clicking anywhere on ruler or background jumps to that position
- playerRef lifted to MovieEditor for shared access pattern
- Visual playhead with line and triangle indicator

## Task Commits

Each task was committed atomically:

1. **Task 1: Lift playerRef to MovieEditor and update components** - `b57fa8b` (feat)
2. **Task 2: Create TimelinePlayhead and wire click-to-seek** - `62a254f` (feat)
3. **Task 2.1: Fix playhead dragging with proper pointer events** - `c5614b3` (fix)

## Files Created/Modified
- `src/components/movie/timeline-playhead.tsx` - New draggable playhead with pointer capture events
- `src/components/movie/movie-editor.tsx` - Lifted playerRef creation, passed to children
- `src/components/movie/movie-preview-player.tsx` - Accepts playerRef from parent instead of internal ref
- `src/components/movie/timeline.tsx` - Integrated playhead, click-to-seek handler, container ref

## Decisions Made
- Lifted playerRef to MovieEditor so both preview player and timeline can access it
- Used pointer capture API for smooth drag handling across boundaries
- 12px invisible hit zone around 2px playhead line for easier grabbing
- Pause playback during drag, restore previous play state on release
- z-index 20 for playhead to ensure visibility above clips

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed playhead dragging not responding**
- **Found during:** Task 2 verification
- **Issue:** Playhead was not responding to drag events - pointer events were blocked by parent z-index stacking
- **Fix:** Added proper z-index hierarchy and ensured pointer-events propagation through the component tree
- **Files modified:** src/components/movie/timeline-playhead.tsx, src/components/movie/timeline.tsx
- **Verification:** Drag-to-seek working smoothly
- **Committed in:** `c5614b3`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Bug fix was essential for core functionality. No scope creep.

## Issues Encountered

- Playhead pointer events initially blocked by parent elements - resolved by fixing z-index and pointer-events CSS

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- playerRef pattern established for future timeline interactions
- Timeline ready for trim/split editing features
- Playhead position tracking available via useCurrentPlayerFrame hook
- Click-to-seek pattern can be extended for trim handle interactions

---
*Phase: 19-timeline-foundation*
*Completed: 2026-02-03*
