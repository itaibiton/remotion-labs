---
phase: 13-generation-feed-settings
plan: 01
subsystem: database, api
tags: [convex, schema, pagination, aspect-ratio, generation-settings]

# Dependency graph
requires:
  - phase: 12-continuation-generation
    provides: "Generation and continuation actions, generations table"
provides:
  - "Updated generations table with batch/variation/settings fields"
  - "Paginated query (listPaginated) for feed UI"
  - "Generate action accepting aspectRatio, durationInSeconds, fps"
  - "ASPECT_RATIO_MAP constant for dimension resolution"
affects:
  - 13-02 (settings panel UI needs generate action args)
  - 13-03 (feed UI needs listPaginated query)
  - 14 (variations need batchId, variationIndex, variationCount)
  - 15 (image upload needs referenceImageIds field)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cursor-based pagination with paginationOptsValidator"
    - "Enhanced system prompt injection for generation settings"
    - "Optional schema fields for backward-compatible evolution"

key-files:
  created: []
  modified:
    - convex/schema.ts
    - convex/generations.ts
    - convex/generateAnimation.ts

key-decisions:
  - "All new schema fields are v.optional() for zero-migration backward compatibility"
  - "ASPECT_RATIO_MAP uses standard resolutions (1920x1080, 1080x1080, 1080x1920)"
  - "Settings injected as system prompt appendix rather than user message"

patterns-established:
  - "Schema evolution via optional fields: add v.optional() fields, no migration needed"
  - "Settings resolution pattern: args ?? defaults with ASPECT_RATIO_MAP lookup"

# Metrics
duration: 2min
completed: 2026-02-01
---

# Phase 13 Plan 01: Schema & Settings Foundation Summary

**Backward-compatible schema fields for batch/variation/settings tracking, paginated feed query, and dimension-aware generate action with ASPECT_RATIO_MAP**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-01T16:18:47Z
- **Completed:** 2026-02-01T16:20:59Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added 7 optional fields to generations table (batchId, variationIndex, variationCount, aspectRatio, durationInSeconds, referenceImageIds, continuationType)
- Created listPaginated query with cursor-based pagination for the feed UI
- Updated generate action to accept and inject aspectRatio, durationInSeconds, fps into Claude system prompt
- Store mutation now persists aspectRatio and durationInSeconds per generation

## Task Commits

Each task was committed atomically:

1. **Task 1: Add schema fields and paginated query** - `bdcbb69` (feat)
2. **Task 2: Update generate action with settings args and dimension injection** - `5510fc4` (feat)

## Files Created/Modified
- `convex/schema.ts` - Added 7 optional fields and by_batchId index to generations table
- `convex/generations.ts` - Updated store mutation args, added listPaginated query
- `convex/generateAnimation.ts` - Added ASPECT_RATIO_MAP, settings args, enhanced prompt injection

## Decisions Made
- All new schema fields are v.optional() for zero-migration backward compatibility with existing documents
- ASPECT_RATIO_MAP uses standard resolutions: 16:9 = 1920x1080, 1:1 = 1080x1080, 9:16 = 1080x1920
- Settings injected as system prompt appendix (not user message) to keep them as AI instructions
- targetFps replaces hardcoded `30` in generate action, enabling future FPS flexibility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Schema foundation ready for settings panel UI (13-02)
- listPaginated query ready for feed component (13-03)
- Generate action ready to receive settings from UI controls
- Existing callers (create page, continuation) continue working without changes

---
*Phase: 13-generation-feed-settings*
*Completed: 2026-02-01*
