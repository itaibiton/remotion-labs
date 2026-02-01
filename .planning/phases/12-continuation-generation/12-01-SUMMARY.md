---
phase: 12-continuation-generation
plan: 01
subsystem: api
tags: [anthropic, claude, remotion, llm, prompt-engineering, convex-action]

# Dependency graph
requires:
  - phase: 06-code-generation-safe-execution
    provides: generateAnimation.ts with generate/refine actions, validation pipeline, Anthropic SDK integration
  - phase: 09-app-shell-clip-library
    provides: clips.ts with getInternal internalQuery for fetching clip rawCode
provides:
  - CONTINUATION_SYSTEM_PROMPT const for LLM-based end-state analysis and continuation generation
  - generateContinuation Convex action accepting sourceClipId + optional prompt
affects: [12-02 continuation UI, future refinement of continuation prompts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "LLM-based code reading for animation end-state extraction (no static AST analysis)"
    - "Single-call continuation: analyze end state + generate new scene in one Claude call"

key-files:
  created: []
  modified:
    - convex/generateAnimation.ts

key-decisions:
  - "CONTINUATION_SYSTEM_PROMPT inlined as const in generateAnimation.ts, matching existing SYSTEM_PROMPT pattern"
  - "generateContinuation returns directly (no DB persist), matching refine action pattern"
  - "rawCode existence check added beyond null clip check for robustness"
  - "fps always 30 for continuation consistency (no FPS extraction from response)"

patterns-established:
  - "Continuation prompt three-step structure: analyze end state, document it, generate from it"
  - "Source clip fetched via internal.clips.getInternal (same pattern as startClipRender)"

# Metrics
duration: 2min
completed: 2026-02-01
---

# Phase 12 Plan 01: Continuation Generation Backend Summary

**Specialized Claude continuation system prompt + generateContinuation Convex action for LLM-based scene continuation from clip rawCode**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-01T12:14:58Z
- **Completed:** 2026-02-01T12:17:04Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- CONTINUATION_SYSTEM_PROMPT const with comprehensive three-step instructions for end-state analysis and continuation generation
- generateContinuation action that fetches source clip rawCode, sends to Claude, validates and transforms output
- Full reuse of existing validation pipeline (validateRemotionCode + transformJSX) with no new dependencies

## Task Commits

Each task was committed atomically:

1. **Task 1: Add CONTINUATION_SYSTEM_PROMPT const** - `90b2258` (feat)
2. **Task 2: Add generateContinuation action** - `ed50604` (feat)

## Files Created/Modified
- `convex/generateAnimation.ts` - Added CONTINUATION_SYSTEM_PROMPT const and generateContinuation action (87 + 114 lines added)

## Decisions Made
- Inlined CONTINUATION_SYSTEM_PROMPT as a const in generateAnimation.ts rather than a separate file, consistent with how SYSTEM_PROMPT and REFINEMENT_SYSTEM_PROMPT are defined
- generateContinuation does not persist to database (returns result directly like refine), because the caller (create page UI) manages state
- Added explicit rawCode existence check (`if (!sourceClip.rawCode)`) beyond the null clip check, since rawCode is theoretically optional on the clip schema
- Always force fps=30 in continuation output (ignoring any FPS comment in Claude's response) for cross-scene consistency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- generateContinuation action is ready for frontend consumption via `useAction(api.generateAnimation.generateContinuation)`
- Plan 12-02 (continuation UI) can now wire up the create page continuation flow, timeline "Generate next scene" buttons, and add-to-movie dialog
- No blockers for Phase 12 completion

---
*Phase: 12-continuation-generation*
*Completed: 2026-02-01*
