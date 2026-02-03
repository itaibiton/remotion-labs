---
# Execution metadata
phase: 20
plan: 01
subsystem: timeline
tags: [trim, @dnd-kit, remotion, non-destructive-editing]

# Dependency graph
requires: [19]  # Timeline Foundation
provides: ["non-destructive trim", "trim handles", "trimScene mutation"]
affects: [20-02, 20-03, 21]

# Tech tracking
tech-stack:
  added: []
  patterns: ["pointer capture for trim", "setActivatorNodeRef for drag/trim separation", "Sequence from={-n} for frame offset"]

# File tracking
key-files:
  created:
    - src/components/movie/timeline-trim-handle.tsx
  modified:
    - convex/schema.ts
    - convex/movies.ts
    - src/components/movie/timeline-scene.tsx
    - src/components/movie/timeline.tsx
    - src/components/movie/movie-editor.tsx
    - src/remotion/compositions/MovieComposition.tsx

# Decisions
decisions:
  - id: trim-pointer-capture
    choice: "Pointer capture pattern for trim handles (same as playhead)"
    rationale: "Enables smooth dragging across boundaries without losing pointer"
  - id: scale-for-pixels
    choice: "Use zoom scale directly as pixelsPerFrame for trim calculation"
    rationale: "Simpler than ResizeObserver; scale is already available from timeline"

# Metrics
duration: ~20min
completed: 2026-02-03
---

# Phase 20 Plan 01: Trim Handles Summary

**One-liner:** Non-destructive trim with pointer-captured drag handles using @dnd-kit setActivatorNodeRef pattern

## Execution Results

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Add trimStart/trimEnd to schema and create trimScene mutation | 47d0030 | Complete |
| 2 | Create TrimHandle component and update TimelineScene with setActivatorNodeRef | 655c410 | Complete |
| 3 | Wire trim to Timeline and update MovieComposition for playback | eb65b4b | Complete |

## What Was Built

### 1. Schema Updates (convex/schema.ts)

Added `trimStart` and `trimEnd` optional fields to the scene object in the movies table:

```typescript
scenes: v.array(v.object({
  clipId: v.id("clips"),
  durationOverride: v.optional(v.number()),
  trimStart: v.optional(v.number()),  // Frames to skip from start
  trimEnd: v.optional(v.number()),    // Frames to cut from end
})),
```

### 2. trimScene Mutation (convex/movies.ts)

New mutation for persisting trim changes with validation:
- Non-negative trim values required
- Effective duration must be at least 1 frame
- Recomputes `totalDurationInFrames` accounting for trim

Also updated:
- `computeTotalDuration` to account for trim values
- `reorderScenes` args to include trimStart/trimEnd

### 3. TrimHandle Component (src/components/movie/timeline-trim-handle.tsx)

78-line component using the same pointer capture pattern as playhead:
- `side` prop determines left/right behavior
- `onTrimDelta` callback for real-time visual feedback
- `onTrimEnd` callback for database persistence
- Clamping prevents over-trimming (maintains at least 1 frame)

### 4. TimelineScene Updates

Refactored to separate drag from trim using @dnd-kit's `setActivatorNodeRef`:
- Left/right edges: TrimHandle components (not part of drag system)
- Center area: Uses setActivatorNodeRef for drag-to-reorder
- Local trim state for real-time visual feedback during drag
- Displays effective duration (base - trimStart - trimEnd)

### 5. MovieComposition Updates

Non-destructive trim playback using Remotion's Sequence:

```tsx
<Series.Sequence durationInFrames={effectiveDuration}>
  <Sequence from={-trimStart}>
    <DynamicCode ... />
  </Sequence>
</Series.Sequence>
```

The negative `from` prop offsets the clip start, skipping trimStart frames.

## Deviations from Plan

### Concurrent Changes Integration

**Found during:** Task 3
**Issue:** Timeline was modified concurrently with zoom functionality (widthPx instead of widthPercent, scale prop)
**Fix:** Integrated trim props with zoom-based timeline (used scale directly as pixelsPerFrame)
**Rule:** [Rule 3 - Blocking]

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Trim calculation | Use scale directly as pixelsPerFrame | Simpler than ResizeObserver; zoom scale already available |
| Trim persistence | On drag end only | Reduces database writes; local state provides smooth UX |
| Clip minimum | 1 frame minimum effective duration | Prevents invisible/invalid clips |

## Files Changed

| File | Changes |
|------|---------|
| convex/schema.ts | Added trimStart/trimEnd to scene object |
| convex/movies.ts | Updated computeTotalDuration, added trimScene mutation, updated reorderScenes |
| src/components/movie/timeline-trim-handle.tsx | New component (78 lines) |
| src/components/movie/timeline-scene.tsx | Refactored for setActivatorNodeRef pattern, added trim handles |
| src/components/movie/timeline.tsx | Added trim props and onTrimScene callback |
| src/components/movie/movie-editor.tsx | Added trimScene mutation handler, pass trim data through |
| src/remotion/compositions/MovieComposition.tsx | Added Sequence from={-trimStart} for non-destructive playback |

## Next Phase Readiness

Phase 20 Plan 02 (Zoom) can proceed -- no blockers. Trim and zoom are independent features that coexist.

**Note:** The timeline was concurrently modified with zoom functionality. Both features now work together:
- Zoom affects pixelsPerFrame for all timeline calculations
- Trim uses the scale value for pixel-to-frame conversion during drag

## Verification Checklist

- [x] `npx convex dev` runs without errors
- [x] `npm run build` compiles successfully
- [x] Schema includes trimStart/trimEnd on scene objects
- [x] trimScene mutation validates bounds and persists changes
- [x] TrimHandle component uses pointer capture pattern (78 lines, >40 minimum)
- [x] TimelineScene uses setActivatorNodeRef pattern
- [x] MovieComposition uses Sequence from={-trimStart}
