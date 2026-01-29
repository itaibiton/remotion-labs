---
phase: 07-editing-iteration
plan: 01
subsystem: api, ui
tags: [remotion, jsx, sucrase, acorn, validation, code-generation, editor]

# Dependency graph
requires:
  - phase: 06-code-generation-safe-execution
    provides: "AST validation pipeline, sucrase transformation, generation action"
provides:
  - "Generation returns rawCode (original JSX) alongside transformed code"
  - "Schema stores rawCode for editor display"
  - "Validator produces actionable suggestions referencing Remotion APIs"
affects: [07-02 (editor editing), 07-03 (chat refinement), 07-04 (unified input)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual code storage: rawCode (JSX for editor) + code (transformed JS for execution)"
    - "Suggestion-enhanced validation: errors carry actionable fix suggestions"

key-files:
  modified:
    - "convex/generateAnimation.ts"
    - "convex/schema.ts"
    - "convex/generations.ts"
    - "src/lib/code-validator.ts"

key-decisions:
  - "rawCode field is optional for backwards compatibility with existing data"
  - "All 38 blocked patterns have corresponding Remotion-specific suggestions"
  - "Suggestion lookup uses identifier string mapping (not regex)"

patterns-established:
  - "Dual code pattern: rawCode for display, code for execution"
  - "Suggestion mapping: getSuggestionForBlockedPattern() maps identifiers to fix text"

# Metrics
duration: 3min
completed: 2026-01-29
---

# Phase 7 Plan 1: Generation Pipeline & Validator Enhancement Summary

**Generation action returns rawCode (original JSX) alongside transformed code; validator errors include actionable Remotion-specific fix suggestions for all 38 blocked patterns**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-29T12:29:03Z
- **Completed:** 2026-01-29T12:32:08Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Generation action returns both `rawCode` (original JSX for editor) and `code` (transformed JS for execution)
- Schema and store mutation updated with backwards-compatible `rawCode` field
- Validator errors now include actionable `suggestion` field with Remotion-specific fix guidance
- All 38 blocked patterns mapped to human-readable suggestions referencing actual Remotion APIs

## Task Commits

Each task was committed atomically:

1. **Task 1: Return raw JSX from generation and update schema** - `9087034` (feat)
2. **Task 2: Add actionable error suggestions to code validator** - `4aa2a2d` (feat)

## Files Created/Modified
- `convex/schema.ts` - Added `rawCode: v.optional(v.string())` field to generations table
- `convex/generations.ts` - Added `rawCode` to store mutation args and db insert
- `convex/generateAnimation.ts` - Save rawCode before transformation, return it alongside code
- `src/lib/code-validator.ts` - Added suggestion field, getSuggestionForBlockedPattern(), updated all addError callers

## Decisions Made
- rawCode field is optional (`v.optional(v.string())`) for backwards compatibility with existing generation records that lack it
- Suggestions use a simple identifier-to-string mapping rather than regex patterns -- straightforward and covers all 38 blocked patterns
- The inlined validator copy in `generateAnimation.ts` (Convex server-side) was NOT updated with suggestions -- suggestions are only needed client-side for editor display, and the server-side copy uses generic error messages for security

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- rawCode available for editor display in Plan 02 (editable Monaco editor)
- Suggestion field ready for Monaco inline error display in Plan 02
- All existing functionality continues to work (backwards compatible)

---
*Phase: 07-editing-iteration*
*Completed: 2026-01-29*
