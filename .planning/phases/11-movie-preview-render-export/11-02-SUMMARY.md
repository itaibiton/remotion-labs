---
phase: 11-movie-preview-render-export
plan: 02
subsystem: api
tags: [convex, remotion-lambda, render-pipeline, movie-render, clip-render]

# Dependency graph
requires:
  - phase: 05-render-download
    provides: Lambda render pipeline (startRender, pollProgress, renders table)
  - phase: 10-movie-data-timeline-ui
    provides: Movie schema with scenes array, clips table, MovieComposition
provides:
  - Updated renders schema supporting movie/clip/generation renders
  - MOVIE_RENDER_LIMITS with 120s max duration, 240s Lambda timeout
  - startMovieRender action for multi-scene Lambda rendering
  - startClipRender action for individual DynamicCode Lambda rendering
  - getByMovie query for UI movie render status tracking
  - getWithClipsInternal and getInternal internal queries for actions
affects: [11-01-movie-preview-player, 11-03-movie-export, frontend-render-buttons]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional foreign keys on renders table (generationId/movieId/clipId) for polymorphic render tracking"
    - "MOVIE_RENDER_LIMITS separate from RENDER_LIMITS for multi-scene duration/timeout caps"
    - "Internal queries (internalQuery) pattern for action-to-query data fetching"

key-files:
  created: []
  modified:
    - convex/schema.ts
    - convex/lib/renderLimits.ts
    - convex/renders.ts
    - convex/triggerRender.ts
    - convex/movies.ts
    - convex/clips.ts

key-decisions:
  - "Optional generationId/movieId/clipId on renders table (not discriminated union) for backward compatibility"
  - "MOVIE_RENDER_LIMITS: 120s video, 240s Lambda timeout, 20 scene max, 3s poll interval"
  - "startClipRender uses DynamicCode composition; startMovieRender uses MovieComposition"
  - "Null clip filtering in startMovieRender to handle deleted clips gracefully"

patterns-established:
  - "internalQuery pattern for action data access (getWithClipsInternal, getInternal)"
  - "Polymorphic render records with optional foreign keys instead of separate tables"

# Metrics
duration: 2min
completed: 2026-02-01
---

# Phase 11 Plan 02: Movie Render Pipeline Summary

**startMovieRender + startClipRender Lambda actions with MOVIE_RENDER_LIMITS (120s/20 scenes) and polymorphic renders schema**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-01T11:09:32Z
- **Completed:** 2026-02-01T11:11:27Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Renders schema now supports three render types: generation renders, movie renders, and clip renders via optional foreign keys
- MOVIE_RENDER_LIMITS exported with 120s max duration, 240s Lambda timeout, 20 scene cap
- startMovieRender action fetches movie scenes, validates limits, renders MovieComposition on Lambda with progress polling
- startClipRender action renders individual DynamicCode clips on Lambda for library/create page export
- Internal queries (getWithClipsInternal, getInternal) enable actions to fetch data without auth checks

## Task Commits

Each task was committed atomically:

1. **Task 1: Update schema, render limits, renders CRUD, and internal movie query** - `ff807d4` (feat)
2. **Task 2: Create startMovieRender and startClipRender actions** - `6fa078b` (feat)

## Files Created/Modified
- `convex/schema.ts` - Renders table: optional generationId/movieId/clipId, by_movie index
- `convex/lib/renderLimits.ts` - Added MOVIE_RENDER_LIMITS export (120s, 240s timeout, 20 scenes)
- `convex/renders.ts` - Updated create mutation args, added getByMovie query
- `convex/movies.ts` - Added getWithClipsInternal internalQuery for action use
- `convex/clips.ts` - Added getInternal internalQuery for action use
- `convex/triggerRender.ts` - Added startMovieRender and startClipRender actions

## Decisions Made
- Used optional foreign keys (generationId/movieId/clipId) on renders table rather than a discriminated union or separate tables. This preserves backward compatibility with existing render records and keeps the schema simple.
- MOVIE_RENDER_LIMITS set to 120s max video duration, 240s Lambda timeout (Lambda renders in parallel chunks), 3s poll interval (longer than clip 2s), 20 scene maximum.
- startClipRender renders DynamicCode composition (same as preview); startMovieRender renders MovieComposition (Series-based).
- Null clips are filtered out in startMovieRender to gracefully handle deleted clips in movie scenes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Lambda infrastructure was already configured in Phase 5.

## Next Phase Readiness
- Movie render pipeline is complete. Frontend components (movie render button, progress UI) can now call `api.triggerRender.startMovieRender` and `api.triggerRender.startClipRender`.
- `getByMovie` query enables reactive render status tracking in UI.
- pollProgress works unchanged for all render types (movie, clip, generation).
- Lambda bundle must register MovieComposition and DynamicCode compositions for rendering to work end-to-end (deployment concern, not code concern).

---
*Phase: 11-movie-preview-render-export*
*Completed: 2026-02-01*
