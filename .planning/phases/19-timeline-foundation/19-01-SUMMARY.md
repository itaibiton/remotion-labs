---
phase: 19-timeline-foundation
plan: 01
subsystem: ui
tags: [timeline, remotion, proportional-layout, timecode]

# Dependency graph
requires:
  - phase: 18-pro-layout
    provides: Fixed flex layout with preview/timeline split
provides:
  - Proportional-width timeline clips based on duration
  - Timecode ruler with interval marks
  - formatTimecode utility for frame-to-timecode conversion
affects: [19-02-PLAN, timeline-scrubber, timeline-playhead]

# Tech tracking
tech-stack:
  added: []
  patterns: [proportional-width-calculation, timecode-formatting]

key-files:
  created:
    - src/lib/format-timecode.ts
    - src/components/movie/timeline-ruler.tsx
  modified:
    - src/components/movie/timeline.tsx
    - src/components/movie/timeline-scene.tsx
    - src/components/movie/movie-editor.tsx

key-decisions:
  - "5-second intervals for ruler when total > 30s, otherwise 1-second"
  - "80px minimum width to maintain scene visibility for short clips"
  - "Clips are adjacent with no gaps for continuous track appearance"

patterns-established:
  - "widthPercent prop pattern for proportional sizing"
  - "formatTimecode(frame, fps) returns MM:SS or SS.f based on duration"

# Metrics
duration: 2min
completed: 2026-02-03
---

# Phase 19 Plan 01: Proportional Timeline Summary

**Proportional-width timeline clips with timecode ruler using percentage-based layout**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-03T08:43:10Z
- **Completed:** 2026-02-03T08:45:03Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Timeline clips now display with widths proportional to their duration
- Timecode ruler shows marks at 1-second (or 5-second for longer movies) intervals
- formatTimecode utility handles both MM:SS and SS.f formats automatically
- Clips form a continuous track with no gaps between them

## Task Commits

Each task was committed atomically:

1. **Task 1: Create timecode formatter and ruler component** - `1dba5a5` (feat)
2. **Task 2: Update Timeline and TimelineScene for proportional widths** - `8759c18` (feat)

## Files Created/Modified
- `src/lib/format-timecode.ts` - Timecode formatting utility (frames to MM:SS or SS.f)
- `src/components/movie/timeline-ruler.tsx` - Ruler with tick marks at time intervals
- `src/components/movie/timeline.tsx` - Added ruler, width calculations, and new props
- `src/components/movie/timeline-scene.tsx` - Added widthPercent prop, removed fixed width
- `src/components/movie/movie-editor.tsx` - Passes totalDurationInFrames and fps to Timeline

## Decisions Made
- 5-second intervals for ruler when movie > 30s, 1-second intervals otherwise
- 80px minimum width for scenes to maintain visibility of short clips
- Removed gap-2 class to make clips adjacent (continuous track look)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Ruler has cursor-pointer class ready for click-to-seek implementation (Plan 02)
- TimelineRuler component accepts totalDurationInFrames and fps for scrubber integration
- Width calculation pattern established for consistent proportional layout

---
*Phase: 19-timeline-foundation*
*Completed: 2026-02-03*
