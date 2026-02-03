# Phase 19: Timeline Foundation - Research

**Researched:** 2026-02-03
**Domain:** Timeline UI with proportional clip blocks, timecode ruler, and bidirectional playhead synchronization (Remotion Player + custom React components)
**Confidence:** HIGH

## Summary

This phase transforms the existing timeline from fixed-width scene cards into a professional video editor timeline with proportional-width clips, a timecode ruler, and a draggable playhead synced with the Remotion Player. The current `timeline.tsx` uses fixed 160px-wide cards in a flex row with @dnd-kit for reordering. The goal is to keep drag-to-reorder (via @dnd-kit) while adding: (1) clip widths proportional to duration, (2) a ruler with timecode marks, and (3) a playhead indicator that moves during playback and can be dragged to seek.

The Remotion Player (`@remotion/player` 4.0.410 already installed) provides the necessary APIs: `seekTo(frame)` for imperative seeking, `getCurrentFrame()` for reading position, and the `frameupdate` event for playhead synchronization. The existing `useCurrentPlayerFrame` hook (in `src/hooks/use-current-player-frame.ts`) already subscribes to `frameupdate` using `useSyncExternalStore`, providing efficient frame tracking without polling.

For the playhead drag interaction, **native pointer events** (`onPointerDown`, `onPointerMove`, `onPointerUp`) with `setPointerCapture` are the standard approach for slider-like scrubbing UIs. This avoids the overhead of @dnd-kit for a simple 1D drag and prevents conflicts with the existing scene reorder drag. The Remotion custom controls documentation demonstrates this exact pattern with a `SeekBar` component that pauses during drag and resumes playback state after release.

**Primary recommendation:** Add a `TimelineRuler` component that renders timecode marks using CSS percentage widths, and a `Playhead` component with pointer-event-based dragging. Modify the existing `Timeline` component to calculate clip widths as `(clipDuration / totalDuration) * 100%`. Lift the `playerRef` up to `MovieEditor` so both `MoviePreviewPlayer` and `Timeline` can access seeking/frame APIs.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @remotion/player | 4.0.410 (installed) | Video preview + seeking API | Already used; provides `seekTo()`, `getCurrentFrame()`, `frameupdate` event |
| remotion | 4.0.410 (installed) | `interpolate` function for frame-to-position mapping | Clamps and maps values; used in Remotion's own SeekBar example |
| React pointer events | native | Playhead drag interaction | No library needed; built into React DOM; avoids @dnd-kit complexity for 1D drag |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @dnd-kit/core + sortable | 6.3.1 / 10.0.0 (installed) | Scene reorder drag | Already used for reordering; keep for that purpose only |
| lucide-react | 0.563.0 (installed) | Playhead icon (optional) | If a visible handle icon is needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native pointer events | @dnd-kit for playhead | Overkill for 1D slider; potential conflicts with existing DndContext for reorder |
| CSS percentage widths | Canvas rendering | Canvas is heavier; CSS is simpler and sufficient for static clip blocks |
| Custom timecode formatter | smpte-timecode npm | Adds 15KB dependency; simple `MM:SS` or `SS.f` format is sufficient for this use case |

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
│   │   ├── movie-editor.tsx       # MODIFIED - lifts playerRef, passes to Timeline
│   │   ├── movie-preview-player.tsx # MODIFIED - accepts playerRef from parent
│   │   ├── timeline.tsx           # MODIFIED - proportional widths, ruler, playhead
│   │   ├── timeline-scene.tsx     # MODIFIED - flex-based width instead of fixed
│   │   ├── timeline-ruler.tsx     # NEW - timecode ruler with marks
│   │   └── timeline-playhead.tsx  # NEW - draggable playhead indicator
│   └── ui/
│       └── ...
├── hooks/
│   └── use-current-player-frame.ts # EXISTING - already works
├── lib/
│   └── format-timecode.ts         # NEW - simple MM:SS or SS.ff formatter
└── ...
```

### Pattern 1: Proportional Clip Width Calculation
**What:** Each clip's width is calculated as a percentage of the total timeline duration.
**When to use:** Always when rendering timeline clips.
**Example:**
```typescript
// Source: Standard video editor timeline pattern
interface TimelineClip {
  clipId: string;
  durationInFrames: number;
}

function getClipWidthPercent(clip: TimelineClip, totalDurationInFrames: number): string {
  if (totalDurationInFrames === 0) return "0%";
  const percent = (clip.durationInFrames / totalDurationInFrames) * 100;
  return `${percent}%`;
}

// In JSX:
<div style={{ width: getClipWidthPercent(clip, totalDuration) }}>
  {/* clip content */}
</div>
```

### Pattern 2: Timecode Ruler with Interval Marks
**What:** A ruler above the clips showing timecodes at regular intervals (e.g., every second or every 5 seconds).
**When to use:** Above the clip track.
**Example:**
```typescript
// Source: Standard video editor UI pattern
interface TimelineRulerProps {
  totalDurationInFrames: number;
  fps: number;
  intervalSeconds?: number; // default 1 or 5 depending on zoom
}

function TimelineRuler({ totalDurationInFrames, fps, intervalSeconds = 1 }: TimelineRulerProps) {
  const totalSeconds = totalDurationInFrames / fps;
  const marks: number[] = [];
  for (let s = 0; s <= totalSeconds; s += intervalSeconds) {
    marks.push(s);
  }

  return (
    <div className="relative h-6 border-b">
      {marks.map((second) => {
        const percent = (second / totalSeconds) * 100;
        return (
          <div
            key={second}
            className="absolute top-0 h-full flex flex-col items-center"
            style={{ left: `${percent}%` }}
          >
            <div className="h-2 w-px bg-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">
              {formatTimecode(second * fps, fps)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

### Pattern 3: Pointer-Event Playhead Dragging
**What:** A playhead indicator that can be dragged horizontally to seek; pointer capture ensures drag continues even when cursor leaves the element.
**When to use:** For the playhead/scrubber interaction.
**Example:**
```typescript
// Source: Remotion custom controls SeekBar pattern + pointer-events best practices
// https://www.remotion.dev/docs/player/custom-controls
// https://blog.r0b.io/post/creating-drag-interactions-with-set-pointer-capture-in-java-script/

interface PlayheadProps {
  currentFrame: number;
  totalDurationInFrames: number;
  playerRef: React.RefObject<PlayerRef>;
  containerRef: React.RefObject<HTMLDivElement>;
}

function Playhead({ currentFrame, totalDurationInFrames, playerRef, containerRef }: PlayheadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const wasPlayingRef = useRef(false);

  const percent = totalDurationInFrames > 0
    ? (currentFrame / totalDurationInFrames) * 100
    : 0;

  const getFrameFromX = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return 0;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, x / rect.width));
    return Math.round(fraction * (totalDurationInFrames - 1));
  }, [containerRef, totalDurationInFrames]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    wasPlayingRef.current = playerRef.current?.isPlaying() ?? false;
    playerRef.current?.pause();
    const frame = getFrameFromX(e.clientX);
    playerRef.current?.seekTo(frame);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const frame = getFrameFromX(e.clientX);
    playerRef.current?.seekTo(frame);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    if (wasPlayingRef.current) {
      playerRef.current?.play();
    }
  };

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-primary cursor-ew-resize touch-none"
      style={{ left: `${percent}%` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
```

### Pattern 4: Click-to-Seek on Ruler
**What:** Clicking anywhere on the ruler (or the timeline background) jumps the playhead to that position.
**When to use:** As a convenience for quick navigation.
**Example:**
```typescript
// Source: Standard video editor interaction pattern
function handleRulerClick(e: React.MouseEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const fraction = Math.max(0, Math.min(1, x / rect.width));
  const frame = Math.round(fraction * (totalDurationInFrames - 1));
  playerRef.current?.seekTo(frame);
}

<div className="cursor-pointer" onClick={handleRulerClick}>
  <TimelineRuler ... />
</div>
```

### Pattern 5: Lifting PlayerRef to Parent
**What:** The playerRef must be accessible from both the preview player (for playback controls) and the timeline (for seeking). Lift it to the common ancestor (MovieEditor).
**When to use:** When multiple components need to interact with the same Player instance.
**Example:**
```typescript
// Source: React ref lifting pattern
// movie-editor.tsx
export function MovieEditor({ movieId }: { movieId: string }) {
  const playerRef = useRef<PlayerRef>(null);
  // ...
  return (
    <>
      <MoviePreviewPlayer
        playerRef={playerRef}
        scenes={validScenes}
        fps={movie.fps}
        totalDurationInFrames={totalDurationInFrames}
      />
      <Timeline
        playerRef={playerRef}
        scenes={scenesWithClips}
        totalDurationInFrames={totalDurationInFrames}
        fps={movie.fps}
        // ...
      />
    </>
  );
}

// movie-preview-player.tsx
interface MoviePreviewPlayerProps {
  playerRef: React.RefObject<PlayerRef>;
  scenes: MovieScene[];
  // ...
}

export function MoviePreviewPlayer({ playerRef, scenes, ... }: MoviePreviewPlayerProps) {
  return (
    <Player
      ref={playerRef}
      // ...
    />
  );
}
```

### Anti-Patterns to Avoid
- **Using @dnd-kit for playhead drag:** Overkill for a 1D slider; adds complexity and may conflict with the existing DndContext for scene reordering.
- **Polling for frame updates:** The existing `useCurrentPlayerFrame` hook uses `useSyncExternalStore` with `frameupdate` event, which is efficient. Don't replace with `setInterval`.
- **Fixed pixel widths for clips:** Breaks the proportional layout; always use percentages or flex-grow.
- **Multiple DndContexts:** If playhead used @dnd-kit, you'd need to nest or coordinate contexts. Pointer events avoid this.
- **Imperative DOM manipulation for playhead position:** Use React state + CSS left percentage; let React handle updates.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Frame-to-position mapping | Custom math with edge cases | `interpolate` from Remotion or simple `frame / total * 100` with clamp | Remotion's interpolate handles extrapolation; simple division works for percentages |
| Timecode formatting (complex SMPTE) | smpte-timecode library | Simple `MM:SS` or `SS.ff` formatter | Full SMPTE with drop-frame is overkill for a web app; simple format is sufficient |
| Player frame tracking | useState + setInterval | `useCurrentPlayerFrame` hook (already exists) | Event-driven via `useSyncExternalStore` is more efficient and accurate |
| Drag interaction library | Custom mouse event handling without capture | Native pointer events with `setPointerCapture` | Pointer capture ensures drag continues outside element; works on touch |

**Key insight:** The Remotion Player already provides all the APIs needed for bidirectional sync. The timeline is purely a display/interaction layer that reads `getCurrentFrame()` and calls `seekTo()`. No complex state synchronization is needed because the Player is the single source of truth.

## Common Pitfalls

### Pitfall 1: Z-Index Conflicts Between Playhead and Draggable Clips
**What goes wrong:** The playhead sits under the clip elements, making it hard to grab, OR the playhead interferes with clip drag handles.
**Why it happens:** Both the playhead and clips need pointer events; z-index stacking is incorrect.
**How to avoid:** Place the playhead in a separate layer (`position: absolute`, `pointer-events: none` on the container, `pointer-events: auto` on the playhead line itself). Alternatively, make the playhead's "grab zone" extend above/below the clip track area (in the ruler or a dedicated scrub area).
**Warning signs:** Clicking the playhead starts a clip drag instead, or vice versa.

### Pitfall 2: Playhead Jitter During Playback
**What goes wrong:** The playhead stutters or lags behind the actual Player position.
**Why it happens:** Using a throttled event listener or polling instead of the `frameupdate` event which fires on every frame.
**How to avoid:** Use the existing `useCurrentPlayerFrame` hook which subscribes to `frameupdate`. This fires on every animation frame during playback.
**Warning signs:** Playhead moves in jumps rather than smoothly.

### Pitfall 3: Race Condition Between seekTo and frameupdate
**What goes wrong:** Dragging the playhead causes it to "fight" with incoming frame updates, resulting in flickering.
**Why it happens:** While dragging, the user sets the frame via `seekTo()`, but if playback was not paused, `frameupdate` keeps firing and the UI jumps between user-set and player-set positions.
**How to avoid:** Always `pause()` the player on `pointerdown` before seeking. Store the `wasPlaying` state and restore it on `pointerup`. The Remotion custom controls example demonstrates this pattern.
**Warning signs:** Playhead snaps back to a previous position during drag, or oscillates.

### Pitfall 4: Timeline Width Not Matching Ruler Width
**What goes wrong:** The playhead position on the ruler doesn't align with the corresponding clip positions below.
**Why it happens:** The ruler and clip track have different padding, borders, or widths.
**How to avoid:** Use a shared container for both ruler and clip track. Both should have the same `padding` and `width`. Consider a CSS Grid or flex layout where both rows share the same column sizing.
**Warning signs:** Playhead at frame 0 is not at the left edge, or at the last frame is not at the right edge.

### Pitfall 5: Touch Drag Fails Without touch-action: none
**What goes wrong:** On touch devices, dragging the playhead triggers page scroll instead of seeking.
**Why it happens:** The browser's default touch behavior (scroll, zoom) takes precedence.
**How to avoid:** Add `touch-action: none` (Tailwind: `touch-none`) to the draggable playhead element.
**Warning signs:** Works on desktop mouse, fails on mobile/tablet.

### Pitfall 6: Inconsistent FPS Between Clips and Timeline
**What goes wrong:** Clip durations are calculated at their original FPS but the timeline uses the movie's FPS, causing width miscalculations.
**Why it happens:** The schema stores per-clip FPS, but the movie has a unified FPS. Duration normalization may be inconsistent.
**How to avoid:** The existing `addScene` mutation already normalizes clip duration to movie FPS (`clip.durationInFrames * (movie.fps / clip.fps)`). Ensure the timeline always uses the normalized `durationOverride` if present, or recalculates using the same formula. The `scenesWithClips` data in `movie-editor.tsx` should include the normalized duration.
**Warning signs:** Clips appear wider or narrower than expected; total timeline width doesn't match total duration.

## Code Examples

### Simple Timecode Formatter
```typescript
// src/lib/format-timecode.ts
// Source: Standard video timecode formatting pattern

/**
 * Format a frame number as MM:SS or SS.f depending on duration.
 * For short clips (< 60s), shows SS.f (e.g., "4.5").
 * For longer clips, shows MM:SS (e.g., "1:23").
 */
export function formatTimecode(frame: number, fps: number): string {
  const totalSeconds = frame / fps;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(0).padStart(2, "0")}`;
  }
  return `${seconds.toFixed(1)}`;
}

/**
 * Format frame as MM:SS:FF (frames within second).
 * Useful for precise frame display in rulers.
 */
export function formatTimecodeWithFrames(frame: number, fps: number): string {
  const totalSeconds = Math.floor(frame / fps);
  const framesInSecond = frame % fps;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}:${framesInSecond.toString().padStart(2, "0")}`;
}
```

### Proportional Timeline Clip Container
```typescript
// Modified TimelineScene - key changes only
// Source: Standard video editor timeline pattern

interface TimelineSceneProps {
  id: string;
  clip: { ... };
  widthPercent: string; // NEW: calculated by parent
  // ...
}

export function TimelineScene({
  id,
  clip,
  widthPercent,
  // ...
}: TimelineSceneProps) {
  // ... existing useSortable, etc.

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        width: widthPercent, // NEW: percentage instead of fixed 160px
        minWidth: "60px",    // Minimum visible width
      }}
      className="..." // Remove w-[160px], add flex-shrink-0
    >
      {/* ... existing content ... */}
    </div>
  );
}
```

### Timeline Component Structure
```typescript
// Conceptual structure for the new Timeline
// Source: Architecture based on research patterns

interface TimelineProps {
  scenes: Array<{ clipId: string; clip: ClipData | null }>;
  totalDurationInFrames: number;
  fps: number;
  playerRef: React.RefObject<PlayerRef>;
  activeSceneIndex?: number;
  onReorder: (newScenes: Array<{ clipId: string }>) => void;
  onRemove: (sceneIndex: number) => void;
}

export function Timeline({
  scenes,
  totalDurationInFrames,
  fps,
  playerRef,
  activeSceneIndex,
  onReorder,
  onRemove,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentFrame = useCurrentPlayerFrame(playerRef);

  // Calculate width percentages
  const sceneWidths = useMemo(() => {
    return scenes.map((scene) => {
      const duration = scene.clip?.durationInFrames ?? 0;
      const percent = totalDurationInFrames > 0
        ? (duration / totalDurationInFrames) * 100
        : 0;
      return `${percent}%`;
    });
  }, [scenes, totalDurationInFrames]);

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const frame = Math.round(fraction * Math.max(totalDurationInFrames - 1, 0));
    playerRef.current?.seekTo(frame);
  };

  return (
    <div className="flex flex-col gap-1" ref={containerRef}>
      {/* Ruler with click-to-seek */}
      <div className="relative cursor-pointer" onClick={handleRulerClick}>
        <TimelineRuler
          totalDurationInFrames={totalDurationInFrames}
          fps={fps}
        />
        <Playhead
          currentFrame={currentFrame}
          totalDurationInFrames={totalDurationInFrames}
          playerRef={playerRef}
          containerRef={containerRef}
        />
      </div>

      {/* Clip track with drag-to-reorder */}
      <DndContext ...>
        <SortableContext ...>
          <div className="flex flex-row relative">
            {scenes.map((scene, index) => (
              <TimelineScene
                key={`scene-${index}`}
                id={`scene-${index}`}
                clip={scene.clip}
                widthPercent={sceneWidths[index]}
                isActive={index === activeSceneIndex}
                onRemove={onRemove}
              />
            ))}
            {/* Playhead extends through clip area */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-primary pointer-events-none"
              style={{ left: `${(currentFrame / totalDurationInFrames) * 100}%` }}
            />
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| setInterval polling for frame | `useSyncExternalStore` + `frameupdate` event | React 18 (2022) | Efficient, no polling, automatic subscription cleanup |
| Mouse events for drag | Pointer events with `setPointerCapture` | Pointer Events API (widely supported 2020+) | Works for mouse + touch + pen; capture prevents drag loss |
| px-based timeline widths | Percentage/flex-based proportional widths | Always standard for NLEs | Scales with container, reflects relative duration |
| Canvas-based timeline rendering | DOM + CSS for simple timelines | Depends on complexity | Canvas for filmstrip thumbnails; DOM sufficient for blocks |

**Deprecated/outdated:**
- Mouse events only: Pointer events are the modern unified API
- onMouseDown/Move/Up without capture: Drag escapes element boundary
- setInterval-based frame polling: Inefficient and inaccurate

## Open Questions

1. **Ruler tick density and zoom**
   - What we know: The requirements don't mention zoom for Phase 19. A fixed tick interval (e.g., every 1 second for short clips, every 5 seconds for longer) is sufficient.
   - What's unclear: Whether adaptive tick density is needed now or deferred.
   - Recommendation: Start with a simple fixed interval (every second). Adaptive density or zoom can be added in a future phase if needed.

2. **Playhead grab zone size**
   - What we know: A thin 2px line is hard to click.
   - What's unclear: The exact UX preference (wider invisible hitbox? visible handle?).
   - Recommendation: Add a transparent 16px-wide hit zone around the playhead line using a `::before` pseudo-element or a wider parent div with `touch-none`. The visual line remains thin.

3. **Active scene highlighting sync**
   - What we know: The existing `activeSceneIndex` state in `MovieEditor` already tracks which scene is playing based on `currentFrame` and `sceneTimings` (computed in `MoviePreviewPlayer`).
   - What's unclear: Whether this logic should move to the Timeline or stay in the preview player.
   - Recommendation: Keep the computation in `MoviePreviewPlayer` (it already does this) and continue passing `activeSceneIndex` down to Timeline. This keeps the timeline stateless regarding playback position.

4. **Performance with many clips**
   - What we know: STATE.md lists "Timeline performance with many clips" as a concern.
   - What's unclear: How many clips cause issues; whether virtualization is needed.
   - Recommendation: For Phase 19 (foundation), proceed with the simple DOM approach. Monitor performance. If > 20-30 clips cause lag, consider virtualization in a future phase. The current approach is standard for video editors with typical clip counts.

## Sources

### Primary (HIGH confidence)
- [Remotion Player API](https://www.remotion.dev/docs/player/player) - `seekTo()`, `getCurrentFrame()`, `frameupdate` event, `PlayerRef` type
- [Remotion Custom Controls](https://www.remotion.dev/docs/player/custom-controls) - SeekBar pattern with pointer events, wasPlaying state preservation
- [Remotion interpolate](https://www.remotion.dev/docs/interpolate) - Frame-to-position mapping with clamping
- Existing codebase: `src/hooks/use-current-player-frame.ts` - Efficient frame tracking via `useSyncExternalStore`
- Existing codebase: `src/components/movie/timeline.tsx` - Current @dnd-kit integration for reorder

### Secondary (MEDIUM confidence)
- [JavaScript Pointer Events](https://javascript.info/pointer-events) - `setPointerCapture` for drag interactions
- [React Video Editor Timeline](https://www.reactvideoeditor.com/docs/core/components/timeline) - Props structure for timeline components
- [Creating drag interactions with setPointerCapture](https://blog.r0b.io/post/creating-drag-interactions-with-set-pointer-capture-in-java-script/) - Pointer capture pattern

### Tertiary (LOW confidence)
- WebSearch results for video editor timeline patterns - General validation of approach

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All required APIs are in already-installed Remotion Player; no new dependencies
- Architecture: HIGH - Patterns verified against Remotion docs and existing codebase
- Pitfalls: HIGH - Common issues identified from Remotion docs, pointer events docs, and prior Phase 18 experience

**Research date:** 2026-02-03
**Valid until:** 2026-03-05 (30 days - Remotion Player API is stable)
