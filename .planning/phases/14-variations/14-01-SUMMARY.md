---
phase: 14-variations
plan: 01
subsystem: api
tags: [convex, anthropic, claude, parallel, promise-all, temperature, variations, batch]

# Dependency graph
requires:
  - phase: 13-generation-feed-settings
    provides: "Schema with batchId/variationIndex/variationCount fields, generations.store mutation accepting batch args"
provides:
  - "generateVariations action for 1-4 parallel Claude calls with batchId tracking"
  - "generateSingleVariation helper reusable by generate and generateVariations"
affects: [14-02 (variation grid UI wiring), create-page-client (action call site)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Helper function extraction for Convex action code reuse (not ctx.runAction)"
    - "Per-promise .catch() for partial failure resilience in Promise.all"
    - "Shared batchId with variationIndex for batch grouping"
    - "Optional temperature parameter with spread operator for conditional inclusion"

key-files:
  created: []
  modified:
    - "convex/generateAnimation.ts"

key-decisions:
  - "Helper function (not ctx.runAction) for code sharing between actions per Convex best practices"
  - "temperature parameter conditionally spread (omitted when undefined) to preserve default behavior for single generation"
  - "Consistent createdAt timestamp captured before Promise.all to keep variations adjacent in feed ordering"
  - "NonNullable type guard for filtering failed variations from return value"

patterns-established:
  - "generateSingleVariation helper: extract Claude call + validate + transform for reuse"
  - "Per-promise .catch() with null sentinel for partial failure handling"
  - "crypto.randomUUID() for server-side batch ID generation in Node.js runtime"

# Metrics
duration: 3min
completed: 2026-02-01
---

# Phase 14 Plan 01: Variations Backend Summary

**generateVariations action with parallel Claude API calls (temperature 0.9), shared batchId tracking, and generateSingleVariation helper extraction**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-01T16:59:59Z
- **Completed:** 2026-02-01T17:02:46Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Extracted core Claude call + validation + transformation into reusable `generateSingleVariation` helper
- Created `generateVariations` action with 1-4 parallel Claude API calls via `Promise.all`
- Per-promise error handling ensures partial failures preserve successful variations
- Existing `generate` action refactored to use helper with zero behavioral change

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract generateSingleVariation helper from generate action** - `aace169` (refactor)
2. **Task 2: Create generateVariations action with parallel orchestration** - `60cccb6` (feat)

## Files Created/Modified
- `convex/generateAnimation.ts` - Added `generateSingleVariation` helper function, `generateVariations` action export; refactored `generate` to use helper

## Decisions Made
- Used optional `temperature` parameter with spread operator (`...(temperature !== undefined ? { temperature } : {})`) so `generate` action omits temperature entirely (Claude default) while `generateVariations` passes 0.9
- Captured `Date.now()` once before `Promise.all` for consistent `createdAt` across all variations in a batch, keeping them adjacent in feed sort order
- Helper returns raw extracted FPS (clamped 15-60) while callers can override with `targetFps` as needed
- Used `NonNullable` type guard in `.filter()` for type-safe removal of null (failed) entries

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `generateVariations` action ready for client-side wiring in 14-02
- `generateSingleVariation` helper available for any future action needing Claude generation
- Schema already supports batchId/variationIndex/variationCount from Phase 13
- Feed grouping by batchId ready to implement in 14-02

---
*Phase: 14-variations*
*Completed: 2026-02-01*
