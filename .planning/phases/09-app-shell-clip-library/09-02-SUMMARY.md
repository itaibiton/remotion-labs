---
phase: 09-app-shell-clip-library
plan: 02
subsystem: database, ui
tags: [convex, clips, crud, dialog, save, library, shadcn]

# Dependency graph
requires:
  - phase: 09-01
    provides: App shell layout with (app) route group and sidebar navigation
  - phase: 06-code-generation-safe-execution
    provides: Generation pipeline producing code/rawCode/durationInFrames/fps
provides:
  - Convex clips table with schema, indexes, and CRUD operations (save/list/get/remove)
  - SaveClipDialog component for naming and persisting compositions
  - Save as Clip button on create page wired to Convex backend
affects: [09-03-clip-library-page, 10-movie-editor]

# Tech tracking
tech-stack:
  added: [shadcn/ui Input component]
  patterns: [clips CRUD following generations.ts auth pattern, dialog-driven save flow]

key-files:
  created:
    - convex/clips.ts
    - src/components/library/save-clip-dialog.tsx
    - src/components/ui/input.tsx
  modified:
    - convex/schema.ts
    - src/app/(app)/create/create-page-client.tsx

key-decisions:
  - "clips.list returns [] for unauthenticated (graceful loading) vs clips.save throws (explicit auth requirement)"
  - "clips.get has no auth check -- MVP simplicity, clips loaded by ID from URL params"
  - "Save captures editorCode (edited or raw) as rawCode and previewCode (validated transform) as code"

patterns-established:
  - "Convex clips CRUD: same getUserIdentity + tokenIdentifier pattern as generations.ts"
  - "Dialog-driven save flow: parent controls open state, dialog handles mutation + toast"

# Metrics
duration: 2min
completed: 2026-02-01
---

# Phase 9 Plan 02: Clips Backend & Save Flow Summary

**Convex clips table with save/list/get/remove CRUD and SaveClipDialog wired into create page for persisting compositions**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-01T09:13:15Z
- **Completed:** 2026-02-01T09:15:39Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Clips table added to Convex schema with userId, name, code, rawCode, durationInFrames, fps, timestamps, and two indexes
- Full CRUD in clips.ts: save (mutation), list (query, newest first), get (query by ID), remove (mutation with ownership check)
- SaveClipDialog component with name input, Enter key support, auto-focus, save/cancel buttons, toast feedback
- Save as Clip button in create page render controls, capturing both editor state and preview code

## Task Commits

Each task was committed atomically:

1. **Task 1: Add clips table to Convex schema and create clips CRUD** - `4f40b51` (feat)
2. **Task 2: Create SaveClipDialog and wire Save button into create page** - `f417b28` (feat)

## Files Created/Modified
- `convex/schema.ts` - Added clips table definition with by_user and by_user_updated indexes
- `convex/clips.ts` - Clips CRUD: save, list, get, remove with auth checks
- `src/components/library/save-clip-dialog.tsx` - Modal dialog for naming and saving clips
- `src/components/ui/input.tsx` - shadcn Input component (installed via CLI)
- `src/app/(app)/create/create-page-client.tsx` - Added Save as Clip button, SaveClipDialog integration

## Decisions Made
- `clips.list` returns empty array for unauthenticated users (graceful for library page loading state) while `clips.save` throws (explicit auth requirement for writes)
- `clips.get` has no auth check for MVP simplicity -- clips can be loaded by ID from URL params on the create page
- Save captures `editorCode` (which includes manual edits) as rawCode, ensuring the saved clip reflects what the user actually sees in the editor

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Clips backend is ready for the library page (Plan 09-03) to query and display saved clips
- `clips.list` returns clips ordered by updatedAt desc, ready for library grid display
- `clips.get` enables loading a clip by ID from URL params on the create page
- `clips.remove` enables delete functionality in the library

---
*Phase: 09-app-shell-clip-library*
*Completed: 2026-02-01*
