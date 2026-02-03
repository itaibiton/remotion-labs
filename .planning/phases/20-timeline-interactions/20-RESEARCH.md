# Phase 20: Timeline Interactions - Research

**Researched:** 2026-02-03
**Domain:** Timeline trim handles, zoom controls, and snapping system (React + @dnd-kit + Remotion)
**Confidence:** HIGH

## Summary

Phase 20 adds three core timeline interaction features: (1) non-destructive trim handles on clip edges, (2) zoom controls via scroll wheel and buttons, and (3) snapping during trim/drag operations. The existing Phase 19 foundation provides proportional clip widths, a draggable playhead, and @dnd-kit reordering -- these are the base for Phase 20.

For **trim handles**, the established pattern uses native pointer events (same as the playhead) on dedicated resize elements at each clip edge. The prior decision to use `setActivatorNodeRef` from @dnd-kit separates drag-to-reorder from trim-by-handle interactions. Trim is non-destructive via `trimStart`/`trimEnd` fields on the scene schema (as decided), storing frame offsets that Remotion's `<Sequence from={-trimStart}>` pattern consumes to skip frames.

For **zoom**, the standard approach is a `scale` factor (pixels-per-frame) controlled by scroll wheel with Ctrl modifier and +/- buttons. The ruler and clip track share this scale, recalculating visible widths as `(durationInFrames * scale)px`. A reasonable default zoom is 2-5 px/frame with min/max bounds (0.5 to 20 px/frame).

For **snapping**, professional video editors snap to: adjacent clip edges, playhead position, and timeline start/end. The implementation detects snap targets within a threshold (typically 8-10px), snaps the dragged position to the target, and shows a visual snap indicator line.

**Primary recommendation:** Implement trim handles using native pointer events on `<div>` elements positioned at clip left/right edges, separate from the @dnd-kit drag system. Store `trimStart`/`trimEnd` in scene schema. Add zoom via state variable with wheel event listener and button controls. Build snapping into trim/drag handlers by checking distance to targets and rendering a temporary indicator line.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core + sortable | 6.3.1 / 10.0.0 (installed) | Clip reordering | Already used; `setActivatorNodeRef` separates drag from trim |
| React pointer events | native | Trim handle drag | Same pattern as playhead; no extra dependency |
| Remotion Sequence | 4.0.410 (installed) | Frame offset for trim | `from={-trimStart}` skips frames non-destructively |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Convex | (installed) | Persist trimStart/trimEnd | Schema update for scene object |
| lucide-react | 0.563.0 (installed) | Zoom +/- icons | Button controls |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native pointer events for trim | react-rnd or react-resizable | Overkill; adds dependency; harder to integrate with @dnd-kit reorder |
| Custom zoom state | d3-zoom | Heavy for simple linear scale; d3 is for canvas/SVG transforms |
| Pixel threshold snapping | Library-based snap | No library needed; simple distance check is sufficient |

**Installation:**
```bash
# No new dependencies required
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── movie/
│   │   ├── timeline.tsx              # MODIFIED - add zoom state + snap detection
│   │   ├── timeline-scene.tsx        # MODIFIED - add trim handles
│   │   ├── timeline-trim-handle.tsx  # NEW - left/right trim handle component
│   │   ├── timeline-ruler.tsx        # MODIFIED - respect zoom scale
│   │   ├── timeline-playhead.tsx     # EXISTING - snap target
│   │   └── timeline-zoom-controls.tsx # NEW - +/- buttons for zoom
│   └── ui/
│       └── ...
├── hooks/
│   └── use-timeline-zoom.ts          # NEW - zoom state management
└── ...
convex/
├── schema.ts                         # MODIFIED - add trimStart/trimEnd to scene
└── movies.ts                         # MODIFIED - trimScene mutation
```

### Pattern 1: Non-Destructive Trim via Scene Schema
**What:** Store `trimStart` (frames to skip from beginning) and `trimEnd` (frames to cut from end) on each scene. The clip's original duration remains unchanged.
**When to use:** Any trim operation on timeline.
**Example:**
```typescript
// convex/schema.ts - Updated scene object
scenes: v.array(v.object({
  clipId: v.id("clips"),
  durationOverride: v.optional(v.number()),
  trimStart: v.optional(v.number()),  // Frames to skip from start (default 0)
  trimEnd: v.optional(v.number()),    // Frames to cut from end (default 0)
})),

// Effective duration calculation
function getEffectiveDuration(scene: Scene, clip: Clip): number {
  const baseDuration = scene.durationOverride ?? clip.durationInFrames;
  const trimStart = scene.trimStart ?? 0;
  const trimEnd = scene.trimEnd ?? 0;
  return baseDuration - trimStart - trimEnd;
}
```

### Pattern 2: Remotion Sequence with Trim Offset
**What:** Use negative `from` prop to skip trimStart frames, and `durationInFrames` to limit the visible range.
**When to use:** Rendering trimmed clips in MovieComposition.
**Example:**
```typescript
// Source: https://www.remotion.dev/docs/sequence
// MovieComposition with trim support
<Series>
  {scenes.map((scene, index) => {
    const trimStart = scene.trimStart ?? 0;
    const trimEnd = scene.trimEnd ?? 0;
    const effectiveDuration = scene.durationInFrames - trimStart - trimEnd;

    return (
      <Series.Sequence key={index} durationInFrames={effectiveDuration}>
        {/* Negative from skips initial frames */}
        <Sequence from={-trimStart}>
          <DynamicCode
            code={scene.code}
            durationInFrames={scene.durationInFrames}
            fps={scene.fps}
          />
        </Sequence>
      </Series.Sequence>
    );
  })}
</Series>
```

### Pattern 3: Trim Handle with Pointer Events
**What:** Dedicated div elements at clip edges that handle resize via pointer events, separate from the @dnd-kit drag system.
**When to use:** For left and right trim handles on each clip.
**Example:**
```typescript
// Source: Same pointer capture pattern as timeline-playhead.tsx

interface TrimHandleProps {
  side: "left" | "right";
  onTrimChange: (deltaFrames: number) => void;
  onTrimEnd: () => void;
  minWidth: number;  // Minimum frames after trim
  maxExtend: number; // Maximum frames can extend (for restoring trim)
}

function TrimHandle({ side, onTrimChange, onTrimEnd, minWidth, maxExtend }: TrimHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startFramesRef = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation(); // Prevent @dnd-kit from activating
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    startXRef.current = e.clientX;
    startFramesRef.current = 0;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startXRef.current;
    const deltaFrames = Math.round(deltaX / pixelsPerFrame);
    // Clamp to valid range
    const clampedDelta = Math.max(-maxExtend, Math.min(minWidth, deltaFrames));
    if (clampedDelta !== startFramesRef.current) {
      onTrimChange(clampedDelta);
      startFramesRef.current = clampedDelta;
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    onTrimEnd();
  };

  return (
    <div
      className={`absolute top-0 bottom-0 w-2 cursor-ew-resize touch-none z-10
        ${side === "left" ? "left-0" : "right-0"}
        hover:bg-primary/30 active:bg-primary/50`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
```

### Pattern 4: @dnd-kit setActivatorNodeRef for Drag/Trim Separation
**What:** Use `setActivatorNodeRef` to restrict drag activation to a specific handle, leaving clip body and trim handles free for other interactions.
**When to use:** When a clip has both reorder-drag and resize-trim functionality.
**Example:**
```typescript
// Source: https://docs.dndkit.com/presets/sortable/usesortable

function TimelineScene({ id, clip, ... }: TimelineSceneProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,  // Key: separate activator from node
    transform,
    transition,
  } = useSortable({ id });

  return (
    <div ref={setNodeRef} style={{ transform, transition }} className="relative">
      {/* Drag handle (center area) - activates drag */}
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="absolute inset-x-2 inset-y-0 cursor-grab"
      />

      {/* Trim handles - do NOT have drag listeners */}
      <TrimHandle side="left" ... />
      <TrimHandle side="right" ... />

      {/* Content */}
      <Thumbnail ... />
    </div>
  );
}
```

### Pattern 5: Timeline Zoom with Scale Factor
**What:** A `scale` (pixels per frame) state that controls timeline width. Wheel + Ctrl zooms, buttons provide discrete steps.
**When to use:** Timeline zoom in/out functionality.
**Example:**
```typescript
// Source: Standard video editor zoom pattern + MDN wheel event docs

interface UseTimelineZoomOptions {
  minScale?: number;  // px/frame (default 0.5)
  maxScale?: number;  // px/frame (default 20)
  defaultScale?: number;
}

function useTimelineZoom(options: UseTimelineZoomOptions = {}) {
  const { minScale = 0.5, maxScale = 20, defaultScale = 3 } = options;
  const [scale, setScale] = useState(defaultScale);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(maxScale, s * 1.25));
  }, [maxScale]);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(minScale, s / 1.25));
  }, [minScale]);

  const handleWheel = useCallback((e: WheelEvent) => {
    // Only zoom with Ctrl/Cmd modifier (standard convention)
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.min(maxScale, Math.max(minScale, s * factor)));
  }, [minScale, maxScale]);

  return { scale, zoomIn, zoomOut, handleWheel, setScale };
}

// Usage in Timeline:
function Timeline({ totalDurationInFrames, ... }) {
  const { scale, zoomIn, zoomOut, handleWheel } = useTimelineZoom();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const timelineWidth = totalDurationInFrames * scale;

  return (
    <div ref={containerRef} style={{ width: `${timelineWidth}px` }}>
      {/* Ruler and clips scaled by same factor */}
    </div>
  );
}
```

### Pattern 6: Snap Detection and Indicator
**What:** During trim/drag, detect when the moving edge is within threshold of a snap target. Snap the position and show a visual indicator.
**When to use:** Trim operations and clip drag operations.
**Example:**
```typescript
// Snap targets: adjacent clip edges, playhead, timeline start/end
interface SnapTarget {
  frame: number;
  type: "clip-edge" | "playhead" | "timeline-boundary";
}

function findSnapTarget(
  currentFrame: number,
  snapTargets: SnapTarget[],
  thresholdPx: number,
  scale: number
): SnapTarget | null {
  const thresholdFrames = thresholdPx / scale;

  for (const target of snapTargets) {
    if (Math.abs(currentFrame - target.frame) <= thresholdFrames) {
      return target;
    }
  }
  return null;
}

// Build snap targets from scene data
function buildSnapTargets(
  scenes: Scene[],
  playheadFrame: number,
  totalDuration: number
): SnapTarget[] {
  const targets: SnapTarget[] = [
    { frame: 0, type: "timeline-boundary" },
    { frame: totalDuration, type: "timeline-boundary" },
    { frame: playheadFrame, type: "playhead" },
  ];

  let offset = 0;
  for (const scene of scenes) {
    // Left edge
    targets.push({ frame: offset, type: "clip-edge" });
    offset += scene.effectiveDuration;
    // Right edge
    targets.push({ frame: offset, type: "clip-edge" });
  }

  return targets;
}

// Snap indicator component
function SnapIndicator({ frame, scale, visible }: { frame: number; scale: number; visible: boolean }) {
  if (!visible) return null;

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 pointer-events-none z-50"
      style={{ left: `${frame * scale}px` }}
    />
  );
}
```

### Anti-Patterns to Avoid
- **Using @dnd-kit for trim handles:** The prior decision specifies using `setActivatorNodeRef` to separate concerns. Don't add a second DndContext for trim.
- **Storing absolute frame ranges:** Store `trimStart`/`trimEnd` as offsets, not absolute in/out points. This keeps the math simple and allows clips to be reordered.
- **Destructive trim:** Never modify the original clip's `durationInFrames`. All trim is via scene-level metadata.
- **Zoom without scroll container:** If `timelineWidth` exceeds container, ensure horizontal scroll is enabled.
- **Missing Ctrl modifier for wheel zoom:** Standard video editors require Ctrl/Cmd + wheel for zoom. Unmodified wheel should scroll.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-resize library | Custom complex drag system | Native pointer events + `setPointerCapture` | Simple 1D resize; proven pattern from playhead |
| Frame offset in playback | Custom frame skipping logic | Remotion `<Sequence from={-trimStart}>` | Built-in, tested, handles edge cases |
| Snap detection | Visual-only approximate snapping | Distance threshold check with exact frame | Must snap to exact frame for correct playback |
| Scale/zoom library | d3-zoom, react-zoom-pan-pinch | Simple state + wheel event | 1D linear scale is trivial |

**Key insight:** Phase 20 features are extensions of existing patterns (pointer events from playhead, @dnd-kit from reorder, Sequence from MovieComposition). No new paradigms needed.

## Common Pitfalls

### Pitfall 1: Trim Handle Triggering Drag Reorder
**What goes wrong:** Dragging a trim handle starts a clip reorder instead of resizing.
**Why it happens:** @dnd-kit listeners are on the whole clip element.
**How to avoid:** Use `setActivatorNodeRef` on a dedicated drag-handle element (center area). Trim handles have `onPointerDown` with `e.stopPropagation()`.
**Warning signs:** Clicking clip edge initiates drag ghost instead of resize cursor.

### Pitfall 2: Trim Exceeds Original Clip Bounds
**What goes wrong:** User can trim start past the original clip length, or extend past original duration.
**Why it happens:** No validation on trim values.
**How to avoid:** Clamp `trimStart` to `[0, originalDuration - trimEnd - minDuration]`. Clamp `trimEnd` to `[0, originalDuration - trimStart - minDuration]`. MinDuration should be at least 1 frame.
**Warning signs:** Negative effective duration, clip disappears, or extends beyond original.

### Pitfall 3: Zoom Breaks Layout
**What goes wrong:** Zooming causes timeline to overflow without scroll, or ruler marks don't align with clips.
**Why it happens:** Zoom scale applied inconsistently between ruler and clips, or container doesn't scroll.
**How to avoid:** Use a single `scale` source of truth. Both ruler and clips multiply by `scale`. Container has `overflow-x: auto`.
**Warning signs:** Ruler marks don't align with clip edges at different zoom levels.

### Pitfall 4: Snap Threshold Too Aggressive
**What goes wrong:** Clips snap when user doesn't want them to, making precise positioning impossible.
**Why it happens:** Threshold is too large (e.g., 30px).
**How to avoid:** Use 8-10px threshold. Allow Shift key to temporarily disable snapping (standard convention).
**Warning signs:** Users complain they can't place clips exactly where they want.

### Pitfall 5: Wheel Zoom Conflicts with Page Scroll
**What goes wrong:** Ctrl+wheel zooms but also scrolls the page, or zooms the browser.
**Why it happens:** Default event not prevented, or event listener not capturing correctly.
**How to avoid:** Use `{ passive: false }` on wheel listener, call `e.preventDefault()` when handling zoom.
**Warning signs:** Page or browser zooms along with timeline zoom.

### Pitfall 6: Total Duration Not Updated After Trim
**What goes wrong:** Timeline shows incorrect total time, playhead stops at old position.
**Why it happens:** `totalDurationInFrames` not recomputed after trim change.
**How to avoid:** In `trimScene` mutation, call `computeTotalDuration` which should sum `effectiveDuration` (accounting for trim).
**Warning signs:** Playhead can go past visible clips, or timeline is shorter than sum of visible clips.

## Code Examples

### Trim Mutation (Convex)
```typescript
// convex/movies.ts
export const trimScene = mutation({
  args: {
    movieId: v.id("movies"),
    sceneIndex: v.number(),
    trimStart: v.optional(v.number()),
    trimEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const movie = await ctx.db.get(args.movieId);
    if (!movie || movie.userId !== identity.tokenIdentifier) {
      throw new Error("Movie not found");
    }

    const scene = movie.scenes[args.sceneIndex];
    if (!scene) throw new Error("Scene not found");

    // Validate trim bounds
    const clip = await ctx.db.get(scene.clipId);
    const baseDuration = scene.durationOverride ?? clip?.durationInFrames ?? 0;
    const trimStart = args.trimStart ?? scene.trimStart ?? 0;
    const trimEnd = args.trimEnd ?? scene.trimEnd ?? 0;

    if (trimStart < 0 || trimEnd < 0) {
      throw new Error("Trim values must be non-negative");
    }
    if (trimStart + trimEnd >= baseDuration) {
      throw new Error("Trim would result in zero or negative duration");
    }

    // Update scene
    const newScenes = [...movie.scenes];
    newScenes[args.sceneIndex] = {
      ...scene,
      trimStart: args.trimStart ?? scene.trimStart,
      trimEnd: args.trimEnd ?? scene.trimEnd,
    };

    // Recompute total (accounting for trim)
    const totalDuration = await computeTotalDurationWithTrim(ctx, newScenes);

    await ctx.db.patch(args.movieId, {
      scenes: newScenes,
      totalDurationInFrames: totalDuration,
      updatedAt: Date.now(),
    });
  },
});

// Updated duration computation
async function computeTotalDurationWithTrim(
  ctx: { db: { get: (id: any) => Promise<any> } },
  scenes: Array<{ clipId: any; durationOverride?: number; trimStart?: number; trimEnd?: number }>
): Promise<number> {
  let total = 0;
  for (const scene of scenes) {
    const clip = await ctx.db.get(scene.clipId);
    const baseDuration = scene.durationOverride ?? clip?.durationInFrames ?? 0;
    const trimStart = scene.trimStart ?? 0;
    const trimEnd = scene.trimEnd ?? 0;
    total += Math.max(0, baseDuration - trimStart - trimEnd);
  }
  return total;
}
```

### Zoom Controls Component
```typescript
// src/components/movie/timeline-zoom-controls.tsx
import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimelineZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  scale: number;
  minScale: number;
  maxScale: number;
}

export function TimelineZoomControls({
  onZoomIn,
  onZoomOut,
  scale,
  minScale,
  maxScale,
}: TimelineZoomControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={onZoomOut}
        disabled={scale <= minScale}
        title="Zoom out (Ctrl + scroll down)"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
        {Math.round(scale * 100)}%
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={onZoomIn}
        disabled={scale >= maxScale}
        title="Zoom in (Ctrl + scroll up)"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

### Complete TimelineScene with Trim Handles
```typescript
// Key structure - TimelineScene with separated drag activator and trim handles
function TimelineScene({ id, clip, index, widthPercent, trimStart, trimEnd, onTrimChange, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ width: widthPercent, transform: CSS.Transform.toString(transform), transition }}
      className={`relative h-[110px] flex-shrink-0 rounded-lg border bg-card overflow-visible
        ${isDragging ? "opacity-50" : ""}`}
    >
      {/* Left trim handle */}
      <TrimHandle
        side="left"
        currentTrim={trimStart}
        maxTrim={clip.durationInFrames - trimEnd - 1}
        onChange={(newTrim) => onTrimChange(index, { trimStart: newTrim })}
      />

      {/* Center drag area - only this activates sorting */}
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="absolute inset-x-2 inset-y-0 cursor-grab active:cursor-grabbing"
      >
        {/* Thumbnail and info rendered here */}
      </div>

      {/* Right trim handle */}
      <TrimHandle
        side="right"
        currentTrim={trimEnd}
        maxTrim={clip.durationInFrames - trimStart - 1}
        onChange={(newTrim) => onTrimChange(index, { trimEnd: newTrim })}
      />
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Library-based resize (react-rnd) | Native pointer events | ~2022 with pointer events maturity | Lighter, no dependency conflicts |
| Fixed timeline scale | Zoomable scale factor | Always standard in NLEs | Professional-grade editing |
| No snap or basic snap | Threshold-based snap with indicators | Always standard in NLEs | Precision editing |
| Destructive trim (new file) | Non-destructive with metadata | Always standard in NLEs | Undo-friendly, disk-efficient |

**Deprecated/outdated:**
- Mouse-only events: Pointer events unify mouse/touch/pen
- Separate zoom/pan libraries for 1D timeline: Overkill; simple state suffices
- @dnd-kit for resize: Library author recommends using native events for resize, @dnd-kit for reorder

## Open Questions

1. **Minimum trim duration**
   - What we know: Must be at least 1 frame to prevent zero-duration clips
   - What's unclear: Is 1 frame too short for UX? (can't see thumbnail)
   - Recommendation: Use 1 frame as technical minimum; UI can enforce higher minimum (e.g., 0.1s = 3 frames at 30fps) for usability

2. **Zoom level persistence**
   - What we know: Zoom is UI state, not data
   - What's unclear: Should zoom persist across page reloads?
   - Recommendation: Don't persist for Phase 20 (keep simple); could add localStorage later if users request

3. **Snap indicator duration**
   - What we know: Indicator should appear when snapped
   - What's unclear: Should it fade out after release, or disappear immediately?
   - Recommendation: Disappear immediately on pointer up; simple implementation first

4. **Trim handle visibility**
   - What we know: Handles need to be grabbable but not obscure content
   - What's unclear: Always visible or only on hover?
   - Recommendation: Semi-transparent always, full opacity on hover (matches existing remove button pattern)

## Sources

### Primary (HIGH confidence)
- [Remotion Sequence docs](https://www.remotion.dev/docs/sequence) - `from={-trimStart}` pattern for frame skipping
- [@dnd-kit useSortable docs](https://docs.dndkit.com/presets/sortable/usesortable) - `setActivatorNodeRef` for drag/resize separation
- [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) - `setPointerCapture` for drag outside bounds
- [MDN Wheel Event](https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event) - deltaY for zoom direction
- Existing codebase: `timeline-playhead.tsx` - Proven pointer capture pattern
- Existing codebase: `convex/schema.ts` - Scene schema structure

### Secondary (MEDIUM confidence)
- [React Video Editor Timeline](https://www.reactvideoeditor.com/docs/core/components/timeline) - `onItemResize` event pattern
- [Remotion Building a Timeline](https://www.remotion.dev/docs/building-a-timeline) - Architecture overview
- WebSearch: Professional video editor snapping patterns (Final Cut Pro, Premiere Pro)

### Tertiary (LOW confidence)
- WebSearch: General video editor UX conventions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All required patterns verified against official docs and existing codebase
- Architecture: HIGH - Builds directly on Phase 19 foundation with proven patterns
- Pitfalls: HIGH - Common issues identified from prior phase experience + official docs

**Research date:** 2026-02-03
**Valid until:** 2026-03-05 (30 days - patterns are stable)
