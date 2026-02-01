---
phase: 10-movie-data-timeline-ui
plan: 01
subsystem: data-layer
tags: [convex, movies, schema, mutations, queries]
dependency_graph:
  requires: [09-02]
  provides: [movies-table, movie-crud, movie-queries]
  affects: [10-02, 10-03, 11-01]
tech_stack:
  added: []
  patterns: [inline-scenes-array, cached-total-duration, uniform-fps-enforcement]
key_files:
  created:
    - convex/movies.ts
  modified:
    - convex/schema.ts
decisions:
  - id: movies-inline-scenes
    decision: "Inline scenes array on movie document (not a join table)"
    rationale: "2-20 scenes per movie, always read/written with parent, single-user editing"
  - id: movies-fps-enforcement
    decision: "Uniform fps enforced at addScene time, default 30fps"
    rationale: "Mixed fps creates irreconcilable timing issues in Remotion Series"
  - id: movies-get-no-auth
    decision: "movies.get has no auth check (matches clips.get pattern)"
    rationale: "Loaded by ID from URL params, consistent with existing pattern"
metrics:
  duration: ~1.5 min
  completed: 2026-02-01
---

# Phase 10 Plan 01: Movie Backend Data Layer Summary

Convex movies table with inline scenes array, 7 CRUD functions (create, list, get, getWithClips, addScene, removeScene, reorderScenes) with auth/ownership enforcement and cached totalDurationInFrames.

## What Was Done

### Task 1: Add movies table to Convex schema
Added `movies` table definition to `convex/schema.ts` after the `clips` table. The table stores userId, name, an ordered scenes array (clipId + optional durationOverride), cached totalDurationInFrames, fps, and timestamps. Two indexes: `by_user` for ownership checks and `by_user_updated` for sorted listing.

**Commit:** `9016adc`

### Task 2: Create movies.ts with all mutations and queries
Created `convex/movies.ts` with 7 exported functions:

1. **create** (mutation) - Inserts empty movie with name, default fps 30, returns ID
2. **list** (query) - Returns user's movies ordered by updatedAt desc, graceful empty array for unauthenticated
3. **get** (query) - Returns single movie by ID, no auth check (URL-param loading pattern)
4. **getWithClips** (query) - Returns movie with populated sceneClips array, filters out deleted clips
5. **addScene** (mutation) - Appends clip to scenes, enforces uniform fps, recomputes total duration
6. **removeScene** (mutation) - Removes scene by index, recomputes total duration
7. **reorderScenes** (mutation) - Replaces entire scenes array, recomputes total duration

Internal `computeTotalDuration` helper resolves clip durations respecting durationOverride.

**Commit:** `e361ae7`

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Inline scenes array (not join table) | 2-20 scenes, always read/written with parent, single-user editing | Simpler mutations, atomic reorder |
| Uniform fps enforcement at addScene | Mixed fps breaks Remotion Series timing | All clips must match movie fps |
| movies.get no auth check | Matches clips.get pattern for URL-param loading | Consistent API, simpler client code |
| Default fps: 30 on create | All generated clips use 30fps | Updated to clip's fps when first scene added |
| Cached totalDurationInFrames | Avoids recomputing on every read | Must recompute on every scene mutation |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npx convex dev --once` deployed successfully with movies table and all 7 functions
- `npx tsc --noEmit` passed with zero errors
- Schema shows movies table with scenes array, fps, totalDurationInFrames, indexes
- All mutations enforce auth via `ctx.auth.getUserIdentity()` and ownership via `userId === identity.tokenIdentifier`

## Next Phase Readiness

Plan 10-02 (Movie List Page & Timeline UI) can proceed. The data layer is complete:
- Movies table is live in Convex
- All CRUD operations are deployed and available via `api.movies.*`
- The `getWithClips` query provides everything the timeline editor needs in one subscription
