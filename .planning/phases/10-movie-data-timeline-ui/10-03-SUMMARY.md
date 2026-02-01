---
phase: 10-movie-data-timeline-ui
plan: 03
subsystem: ui
tags: [dnd-kit, react, remotion, timeline, drag-and-drop, sortable, series]
dependency_graph:
  requires:
    - phase: 10-01
      provides: movies table, CRUD mutations (addScene, removeScene, reorderScenes, getWithClips)
    - phase: 10-02
      provides: movie list page, editor shell with placeholder timeline area
  provides:
    - horizontal DnD timeline with sortable scene blocks
    - add-scene clip picker dialog
    - MovieComposition for Series-based multi-scene rendering
    - fully wired movie editor with timeline interactions
  affects: [11-01, 11-02]
tech_stack:
  added: [@dnd-kit/core, @dnd-kit/sortable, @dnd-kit/modifiers, @dnd-kit/utilities, monaco-editor]
  patterns: [optimistic-reorder-local-state, sortable-context-horizontal, remotion-series-composition, thumbnail-preview-isMounted-guard]
key_files:
  created:
    - src/components/movie/timeline.tsx
    - src/components/movie/timeline-scene.tsx
    - src/components/movie/add-scene-panel.tsx
    - src/remotion/compositions/MovieComposition.tsx
  modified:
    - src/components/movie/movie-editor.tsx
    - convex/movies.ts
    - package.json
key_decisions:
  - "Optimistic local state for reorder to prevent flicker (useEffect sync from props)"
  - "Fixed-width scene blocks (160px) for MVP, not proportional to duration"
  - "Remove button uses onPointerDown stopPropagation to prevent drag activation"
  - "getWithClips preserves null entries (no filter) for correct index mapping"
patterns_established:
  - "Optimistic reorder: local useState synced via useEffect with JSON.stringify comparison, immediate setLocalScenes on drag end, then async mutation"
  - "DnD scene IDs: scene-${index} pattern for both SortableContext items and TimelineScene id props"
  - "Thumbnail isMounted guard: useState(false) + useEffect to prevent SSR hydration mismatch"
metrics:
  duration: ~3.7 min
  completed: 2026-02-01
---

# Phase 10 Plan 03: Timeline UI Summary

**Horizontal drag-to-reorder timeline with @dnd-kit, add-scene clip picker dialog, Remotion MovieComposition with Series, and full editor wiring with optimistic updates**

## Performance

- **Duration:** ~3.7 min
- **Started:** 2026-02-01T10:12:16Z
- **Completed:** 2026-02-01T10:16:01Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Installed @dnd-kit packages for horizontal drag-to-reorder with optimistic local state preventing flicker
- Built timeline with sortable scene blocks showing Remotion Thumbnails, clip names, durations, and remove buttons
- Built add-scene dialog that displays user's clip library with thumbnails for one-click scene addition
- Created MovieComposition using Remotion Series for future multi-scene preview and rendering
- Wired all interactions into the movie editor with Convex mutations and toast notifications

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @dnd-kit and create timeline + scene components** - `72a8929` (feat)
2. **Task 2: Add-scene panel, MovieComposition, and editor wiring** - `3777292` (feat)

## Files Created/Modified
- `src/components/movie/timeline.tsx` - Horizontal DnD timeline container with SortableContext and optimistic reorder
- `src/components/movie/timeline-scene.tsx` - Sortable scene block with Remotion Thumbnail, duration, remove button
- `src/components/movie/add-scene-panel.tsx` - Dialog showing clip library for adding scenes to movie
- `src/remotion/compositions/MovieComposition.tsx` - Series-based multi-scene Remotion composition for Phase 11
- `src/components/movie/movie-editor.tsx` - Updated with Timeline, AddScenePanel, mutation handlers, and Add Scene button
- `convex/movies.ts` - Fixed getWithClips to preserve null entries for correct index mapping
- `package.json` - Added @dnd-kit/core, sortable, modifiers, utilities, and monaco-editor

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Optimistic local state for reorder | Prevents flicker-back when Convex mutation round-trips | Immediate visual feedback, syncs from props when server confirms |
| Fixed 160px scene block width | Proportional width adds complexity without proportional UX value for MVP | Consistent visual timeline regardless of clip duration |
| onPointerDown stopPropagation on remove button | Prevents drag activation when clicking the X button | Clean separation of remove action from drag gesture |
| Preserve nulls in getWithClips sceneClips | filter(Boolean) broke index correspondence between scenes and sceneClips | Timeline correctly shows "Missing clip" placeholder for deleted references |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed getWithClips sceneClips index misalignment**
- **Found during:** Task 1 (analyzing data flow before creating timeline)
- **Issue:** `getWithClips` used `clips.filter(Boolean)` which removed null entries for deleted clips, causing `sceneClips[i]` to no longer correspond to `scenes[i]`
- **Fix:** Removed `filter(Boolean)`, preserving null entries so index mapping works correctly
- **Files modified:** `convex/movies.ts`
- **Verification:** Build passes, timeline correctly maps scenes to clips by index
- **Committed in:** `72a8929` (Task 1 commit)

**2. [Rule 3 - Blocking] Installed monaco-editor for pre-existing missing type declaration**
- **Found during:** Task 1 (build verification)
- **Issue:** `npm run build` failed with "Cannot find module 'monaco-editor'" in code-display.tsx -- pre-existing error unrelated to plan changes
- **Fix:** Installed `monaco-editor` package for type declarations
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** Build passes cleanly
- **Committed in:** `72a8929` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for correctness and build success. No scope creep.

## Issues Encountered
- @dnd-kit required `--legacy-peer-deps` for React 19 compatibility as documented in research (expected, not a deviation)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness

Phase 10 is COMPLETE. All 5 success criteria are met:
1. User can create a new movie from the Movie page (Plan 02)
2. User can add clips from the library as scenes in a movie (AddScenePanel)
3. User sees scenes displayed as blocks on a horizontal timeline with durations (Timeline + TimelineScene)
4. User can drag scenes to reorder them on the timeline (DnD with @dnd-kit)
5. User can remove a scene from the timeline (Remove button on TimelineScene)

Phase 11 (Movie Preview & Render) can proceed:
- MovieComposition with Series is ready for Player integration
- Timeline provides scene data structure for preview synchronization
- All Convex mutations are live for scene management

---
*Phase: 10-movie-data-timeline-ui*
*Completed: 2026-02-01*
