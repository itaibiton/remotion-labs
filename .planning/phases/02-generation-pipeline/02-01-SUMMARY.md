---
phase: 02-generation-pipeline
plan: 01
subsystem: api
tags: [convex, anthropic, claude, zod, validation]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: Clerk auth integration, Convex setup, users table
provides:
  - generations table for storing animation generation history
  - textAnimationSchema Zod validation for animation props
  - generateAnimation action for Claude API integration
  - generations mutations for CRUD operations
affects: [02-02-generation-ui, 03-preview-system, 05-polish]

# Tech tracking
tech-stack:
  added: [@anthropic-ai/sdk]
  patterns: [Node.js actions for external APIs, Zod validation before storage, internal mutations for action use]

key-files:
  created:
    - convex/lib/validation.ts
    - convex/generations.ts
    - convex/generateAnimation.ts
  modified:
    - convex/schema.ts

key-decisions:
  - "Zod 4.x for validation (already in project via eslint-plugin-react-hooks)"
  - "Claude claude-sonnet-4-5-20250929 model for animation generation"
  - "System prompt enforces JSON-only output with schema guidance"
  - "Internal mutation pattern for action-to-mutation calls"

patterns-established:
  - "Node.js actions (use node directive) for external API calls"
  - "Zod schema validation before database storage"
  - "Internal mutations for action use, public queries for client"
  - "Animation props schema: text, style, fontFamily, fontSize, color, backgroundColor, durationInFrames, fps"

# Metrics
duration: 4min
completed: 2026-01-27
---

# Phase 2 Plan 1: Convex Backend for Generation Summary

**Convex generations table with Claude API action using Zod validation and @anthropic-ai/sdk**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-27T21:33:22Z
- **Completed:** 2026-01-27T21:37:40Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Generations table with proper indexes (by_user, by_user_created)
- Zod schema for text animation properties with hex color validation
- Claude API action with system prompt for JSON animation generation
- Internal store mutation and public list/get queries

## Task Commits

Each task was committed atomically:

1. **Task 1: Add generations table and validation schemas** - `dc67e22` (feat)
2. **Task 2: Create generation mutations** - `bb73c51` (feat)
3. **Task 3: Create Claude API generation action** - `120278d` (feat)

## Files Created/Modified
- `convex/schema.ts` - Added generations table definition with animationProps object
- `convex/lib/validation.ts` - Zod schema for TextAnimationProps type
- `convex/generations.ts` - Internal store mutation, list/get queries
- `convex/generateAnimation.ts` - Node.js action with Claude API integration

## Decisions Made
- Used Zod 4.x API (issues instead of errors for error messages)
- System prompt instructs Claude to output only JSON without markdown code blocks
- Animation styles limited to: fade-in, typewriter, slide-up, scale
- FPS fixed at 30 for all animations (matches Remotion default)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Zod 4.x circular reference TypeScript error**
- **Found during:** Task 3 (after initial commit)
- **Issue:** TypeScript error "implicitly has type 'any' because it is referenced in its own initializer" due to action calling internal mutation
- **Fix:** Added explicit type annotation `Id<"generations">` to generationId variable
- **Files modified:** convex/generateAnimation.ts
- **Verification:** TypeScript compiles without errors
- **Committed in:** 120278d (amended into Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix necessary for TypeScript compilation. No scope creep.

## Issues Encountered
None - plan executed smoothly after the TypeScript fix.

## User Setup Required

**External services require manual configuration.** The plan specifies ANTHROPIC_API_KEY:
- Environment variable: ANTHROPIC_API_KEY
- Source: Anthropic Console -> API keys -> Create key
- Add to Convex environment variables via `npx convex env set ANTHROPIC_API_KEY <key>`

## Next Phase Readiness
- Convex backend complete and ready for frontend integration
- generateAnimation.generate action available for prompt input UI
- generations.list query available for history display
- ANTHROPIC_API_KEY must be set before manual testing

---
*Phase: 02-generation-pipeline*
*Completed: 2026-01-27*
