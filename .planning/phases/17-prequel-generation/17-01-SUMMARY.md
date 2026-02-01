---
phase: 17-prequel-generation
plan: 01
subsystem: api
tags: [anthropic, claude, remotion, prequel, llm, code-generation, convex-action]

# Dependency graph
requires:
  - phase: 12-continuation-generation
    provides: CONTINUATION_SYSTEM_PROMPT pattern, generateContinuation action, validation/transformation pipeline
provides:
  - PREQUEL_SYSTEM_PROMPT constant for frame-0 state extraction
  - generatePrequel exported Convex action
affects: [17-02 prequel UI wiring, future prequel quality improvements]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prequel prompt mirrors continuation prompt with reversed direction (frame 0 vs final frame)"
    - "generatePrequel action follows identical pattern to generateContinuation"

key-files:
  created: []
  modified:
    - convex/generateAnimation.ts

key-decisions:
  - "PREQUEL_SYSTEM_PROMPT as separate constant (not parameterized shared prompt with continuation)"
  - "generatePrequel as standalone action mirroring generateContinuation (not shared action with mode flag)"
  - "TARGET SCENE CODE framing in user message (vs PREVIOUS SCENE CODE for continuation)"

patterns-established:
  - "Prequel prompt three-step structure: analyze frame 0, document start state, generate composition ending at that state"

# Metrics
duration: 2min
completed: 2026-02-01
---

# Phase 17 Plan 01: Prequel Generation Backend Summary

**PREQUEL_SYSTEM_PROMPT for frame-0 state extraction and generatePrequel Convex action mirroring continuation architecture**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-01T22:14:55Z
- **Completed:** 2026-02-01T22:16:43Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Added PREQUEL_SYSTEM_PROMPT with three-step frame-0 analysis structure (analyze initial state, document start state, generate prequel ending at that state)
- Added generatePrequel exported action accepting sourceClipId + optional prompt, using identical post-processing pipeline as generateContinuation
- TypeScript compilation passes cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Add PREQUEL_SYSTEM_PROMPT constant** - `ecde72a` (feat)
2. **Task 2: Add generatePrequel action** - `6c21681` (feat)

## Files Created/Modified
- `convex/generateAnimation.ts` - Added PREQUEL_SYSTEM_PROMPT constant (82 lines) and generatePrequel action (114 lines)

## Decisions Made
- Kept PREQUEL_SYSTEM_PROMPT as a separate constant rather than parameterizing a shared prompt with CONTINUATION_SYSTEM_PROMPT -- the analysis direction is fundamentally different (frame 0 vs final frame) and separate prompts allow independent optimization
- Used "TARGET SCENE CODE" framing in user messages (vs "PREVIOUS SCENE CODE" for continuation) to match the semantic direction
- Same model (claude-sonnet-4-5-20250929) and max_tokens (4096) as continuation for consistency

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None -- no external service configuration required.

## Next Phase Readiness
- generatePrequel action is ready to be called from the frontend
- Plan 17-02 can wire the "Extend Previous" UI button and prequel mode in the create page
- No blockers

---
*Phase: 17-prequel-generation*
*Completed: 2026-02-01*
