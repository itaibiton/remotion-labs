---
phase: 20
plan: 03
subsystem: timeline-interactions
tags: ["snapping", "trim", "visual-feedback", "precision-editing"]

dependency-graph:
  requires: ["20-01"]
  provides: ["snap-detection", "snap-indicator", "snap-integration"]
  affects: ["future-drag-snapping", "split-snapping"]

tech-stack:
  added: []
  patterns: ["threshold-based-snapping", "frame-range-calculation", "state-lifting-for-indicators"]

key-files:
  created:
    - "src/lib/timeline-snap.ts"
    - "src/components/movie/timeline-snap-indicator.tsx"
  modified:
    - "src/components/movie/timeline-trim-handle.tsx"
    - "src/components/movie/timeline-scene.tsx"
    - "src/components/movie/timeline.tsx"

decisions:
  - decision: "8px snap threshold"
    rationale: "Balance between precision and usability - converted to frames based on zoom scale for consistent feel"
  - decision: "Color-coded snap indicators"
    rationale: "Blue for clip edges, yellow for playhead, green for timeline boundaries - instant visual identification"
  - decision: "State lifted to Timeline component"
    rationale: "SnapIndicator must render in timeline container, not inside clip - requires activeSnap state in parent"

metrics:
  duration: "4 minutes"
  completed: "2026-02-03"
---

# Phase 20 Plan 03: Snapping System for Trim Operations Summary

**Threshold-based snapping to clip edges, playhead, and timeline boundaries during trim**

## What Was Built

1. **Snap Detection Utilities** (`src/lib/timeline-snap.ts`)
   - `findSnapTarget`: Finds nearest target within pixel threshold, converts to frames based on zoom
   - `buildSnapTargets`: Collects clip edges (excluding scene being edited), playhead, and timeline boundaries
   - `calculateSceneFrameRanges`: Computes effective frame ranges accounting for trim values

2. **SnapIndicator Component** (`src/components/movie/timeline-snap-indicator.tsx`)
   - Vertical line positioned at snap frame
   - Color-coded by target type for instant recognition
   - Animate-pulse for visibility during active snap

3. **TrimHandle Integration**
   - Calculates edge frame during drag
   - Calls `findSnapTarget` with 8px threshold
   - Adjusts delta to land exactly on snap target
   - Clears snap state on pointer release

4. **Timeline State Management**
   - `activeSnap` state for rendering indicator
   - `trimmingSceneIndex` to exclude self from snap targets
   - Scene frame ranges calculated from local scene data

## Implementation Details

### Snap Flow

```
User drags trim handle
  -> TrimHandle calculates new edge frame
  -> findSnapTarget checks all targets within 8px
  -> If snap found: adjust delta to exact frame, notify parent
  -> Timeline updates activeSnap state
  -> SnapIndicator renders at snap position
  -> On release: clear activeSnap, persist trim
```

### Snap Targets Built

- Timeline start (frame 0) - green indicator
- Timeline end (total duration) - green indicator
- Playhead position - yellow indicator
- All other clip start/end edges - blue indicator
- Current scene edges excluded (no self-snap)

### Threshold Calculation

```typescript
const thresholdFrames = thresholdPx / scale;
// At 3px/frame (100% zoom): 8px = 2.67 frames
// At 0.5px/frame (zoomed out): 8px = 16 frames
// At 20px/frame (zoomed in): 8px = 0.4 frames
```

Pixel-based threshold ensures consistent visual snapping regardless of zoom level.

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

- Snapping infrastructure ready for clip drag operations (future plan)
- Same snap detection can be used for split tool
- Consider adding snap sound feedback for accessibility
