# Stack Research: AI-Powered Video Creation Platform

**Domain:** AI-powered animated video creation ("Midjourney for animations")
**Researched:** 2026-01-27 (v1.0), 2026-01-28 (v1.1 additions), 2026-01-29 (v2.0 additions), 2026-02-02 (v3.0 Pro Timeline additions)
**Confidence:** HIGH (core stack verified via official docs)

---

## Executive Summary

This stack builds a web application where users create animated videos through text prompts, powered by Claude's code generation and Remotion's programmatic video rendering. The architecture combines:

- **Next.js 16** as the React framework (App Router)
- **Clerk** for authentication (already decided)
- **Convex** for real-time backend/database (already decided)
- **Remotion** for video rendering (already decided)
- **Claude API** for JSX code generation (already decided)
- **Remotion Lambda** for serverless video rendering at scale

The stack prioritizes developer velocity, real-time updates, and seamless integration between components.

---

## v3.0 Stack Additions: Pro Timeline Editing

**Added:** 2026-02-02
**Focus:** Clip trimming, blade/split tool, drag-to-resize, per-clip actions, full-screen editor layout, inline editing panel

### Overview of What Is Needed

v3.0 evolves the basic horizontal timeline (fixed 160px scene blocks with drag-to-reorder) into a professional non-linear editing (NLE) timeline. The key technical challenges are:

1. **Timeline rendering** -- Variable-width clips proportional to duration, zoom/pan controls
2. **Clip trimming** -- Drag handles on left/right edges to adjust in/out points
3. **Blade/split tool** -- Cut a clip at the playhead position, creating two clips
4. **Drag-to-resize** -- Resize clip duration by dragging edges (same as trimming, from UI perspective)
5. **Per-clip action buttons** -- Contextual actions on hover/select (edit, duplicate, delete, split)
6. **Full-screen pro editor layout** -- Resizable panels: preview + timeline + properties
7. **Inline editing panel** -- Code editor + preview side-by-side within the editor
8. **Keyboard shortcuts** -- B for blade, Space for play/pause, arrow keys for frame stepping, etc.

### What Is Already Sufficient (No New Dependencies)

Several v3.0 features require no new libraries -- just new patterns using existing stack:

| Feature | Existing Stack | Pattern |
|---------|---------------|---------|
| Variable-width clips | Tailwind CSS | `style={{ width: clip.durationInFrames * pixelsPerFrame }}` |
| Playhead sync | `@remotion/player` PlayerRef | `frameupdate` event + `seekTo()` (already using `useCurrentPlayerFrame` hook) |
| Clip splitting (data) | Convex mutations | New mutation that creates two scene entries from one |
| Per-clip actions | Tailwind + lucide-react | Hover overlay with action buttons (pattern exists in timeline-scene.tsx) |
| Frame stepping | `@remotion/player` PlayerRef | `seekTo(currentFrame + 1)` / `seekTo(currentFrame - 1)` |
| Play/pause | `@remotion/player` PlayerRef | `toggle()` method |
| Clip trimming (data model) | Convex schema | Extend scene object with `trimStart` / `trimEnd` fields |
| Thumbnail filmstrip | `@remotion/player` `<Thumbnail>` | Render multiple `<Thumbnail>` instances at different `frameToDisplay` values |

---

### New Dependencies for v3.0

#### 1. Keyboard Shortcuts: `tinykeys`

**Recommendation: `tinykeys` ^3.0.0**

| Package | Version | Purpose |
|---------|---------|---------|
| `tinykeys` | ^3.0.0 | Keyboard shortcut bindings for blade tool, playback, navigation |

**Why tinykeys over alternatives:**

| Library | Verdict | Reason |
|---------|---------|--------|
| **tinykeys** | RECOMMENDED | ~650B bundle, correct key event handling (defaults to `key`, opt-in `code`), sequence support, `$mod` cross-platform modifier. Praised in Jan 2025 analysis as "our first good one." |
| react-hotkeys-hook v5.2.1 | Rejected | 1.6M weekly downloads but uses both `code` and `key` simultaneously, causing shortcuts to trigger more often than expected. Heavier bundle. |
| hotkeys-js | Rejected | Uses deprecated `keyCode` property. Framework-agnostic but worse key detection. |
| Native `addEventListener` | Rejected | No modifier key abstraction, no sequence support, no cleanup pattern, must handle focus scoping manually. |

**Integration pattern with React:**

```tsx
import { tinykeys } from "tinykeys";

function useTimelineShortcuts(callbacks: {
  blade: () => void;
  delete: () => void;
  playPause: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  undo: () => void;
  redo: () => void;
}) {
  useEffect(() => {
    const unsubscribe = tinykeys(window, {
      "b": callbacks.blade,
      "Delete": callbacks.delete,
      "Backspace": callbacks.delete,
      " ": (e) => { e.preventDefault(); callbacks.playPause(); },
      "ArrowRight": callbacks.stepForward,
      "ArrowLeft": callbacks.stepBackward,
      "$mod+z": callbacks.undo,
      "$mod+Shift+z": callbacks.redo,
    });
    return unsubscribe;
  }, [callbacks]);
}
```

**Important: Focus scoping.** Tinykeys binds to a target element (default: `window`). When Monaco editor is focused, keyboard shortcuts must NOT fire (user is typing code). Solution: bind tinykeys to the timeline panel container element, not `window`. Or conditionally check `document.activeElement` in each handler.

**Confidence:** HIGH -- tinykeys 3.0.0 is stable, last commit 3 months ago, 51K weekly downloads, correct keyboard event handling verified by independent analysis.

**Source:** [tinykeys npm](https://www.npmjs.com/package/tinykeys), [tinykeys GitHub](https://github.com/jamiebuilds/tinykeys), [All JS Keyboard Libraries Are Broken (analysis)](https://blog.duvallj.pw/posts/2025-01-10-all-javascript-keyboard-shortcut-libraries-are-broken.html)

---

#### 2. Resizable Panel Layout: `react-resizable-panels`

**Recommendation: `react-resizable-panels` ^4.4.2**

| Package | Version | Purpose |
|---------|---------|---------|
| `react-resizable-panels` | ^4.4.2 | Split-pane layout for preview / timeline / properties panels |

**Why this library:**

The pro editor layout requires a 3-panel resizable layout:
- **Left/Center:** Preview player (Remotion Player)
- **Right:** Properties / code editor panel (Monaco)
- **Bottom:** Timeline strip

This is a Group + Panel + PanelResizeHandle pattern -- exactly what react-resizable-panels provides.

| Library | Verdict | Reason |
|---------|---------|--------|
| **react-resizable-panels** | RECOMMENDED | 2.7M weekly downloads, actively maintained (v4.4.2 released days ago), keyboard accessible, supports pixel/percentage sizing, layout persistence, collapsible panels. By Brian Vaughn (React core team alumnus). Used by shadcn/ui's Resizable component. |
| re-resizable | Rejected | Designed for individual resizable boxes (8-direction resize), not split-pane layouts. Wrong abstraction. |
| Custom CSS resize | Rejected | Pointer capture math, accessibility, and persistence are solved problems -- no value in reimplementing. |
| react-resplit | Rejected | Lower adoption (npm), less feature-complete. |
| CSS `resize` property | Rejected | No keyboard support, no collapse behavior, no min/max constraints, poor UX. |

**Integration with shadcn/ui:** The project uses shadcn/ui. Shadcn provides a `Resizable` component built on react-resizable-panels. We can add it via `npx shadcn@latest add resizable` to get pre-styled wrappers, OR use the library directly for more control.

**Known issue (Jan 2026):** A TypeScript error with `PanelGroup` has been reported with react-resizable-panels v4.4.2 + React 19.2.3 + Next.js 16.1.4 (our exact stack). The workaround is direct imports: `import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels"` rather than namespace imports.

**Editor layout pattern:**

```tsx
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";

function ProEditor() {
  return (
    <PanelGroup direction="vertical" className="h-screen">
      {/* Top: Preview + Properties */}
      <Panel defaultSize={65} minSize={30}>
        <PanelGroup direction="horizontal">
          <Panel defaultSize={60} minSize={30}>
            <PreviewPlayer />
          </Panel>
          <PanelResizeHandle className="w-1.5 bg-border" />
          <Panel defaultSize={40} minSize={20} collapsible>
            <PropertiesPanel />
          </Panel>
        </PanelGroup>
      </Panel>

      <PanelResizeHandle className="h-1.5 bg-border" />

      {/* Bottom: Timeline */}
      <Panel defaultSize={35} minSize={15}>
        <ProTimeline />
      </Panel>
    </PanelGroup>
  );
}
```

**Confidence:** HIGH -- 2.7M weekly downloads, v4 actively maintained, the exact use case it was designed for. TypeScript issue has known workaround.

**Source:** [react-resizable-panels npm](https://www.npmjs.com/package/react-resizable-panels), [react-resizable-panels GitHub](https://github.com/bvaughn/react-resizable-panels), [react-resizable-panels docs](https://react-resizable-panels.vercel.app/)

---

#### 3. Clip Trimming & Resize: Custom Pointer Events (NO Library)

**Recommendation: Build custom trim handles using the Pointer Events API. Do NOT add a resize library.**

**Why NOT use a library:**

| Library | Verdict | Reason |
|---------|---------|--------|
| re-resizable | Rejected | Designed for 2D box resizing (8 handles). Timeline trim is strictly horizontal, single-axis. The library's abstraction (width/height resize with aspect ratio) is wrong for frame-based trimming. |
| react-resizable | Rejected | Same mismatch -- designed for grid/box resizing, not timeline clip trimming. |
| @dnd-kit (for resize) | Rejected | dnd-kit has no built-in resize concept. Hacking it via useDraggable on edge handles is possible but fights the library's drag-and-drop abstraction. Would conflict with the existing sortable reorder behavior on the same elements. |
| @use-gesture/react | Considered but rejected | 10.3.1, last published 2 years ago. Overkill for single-axis drag -- adds gesture recognition we do not need (pinch, rotate). The Pointer Events API is sufficient. |

**Why custom is correct:**

Timeline clip trimming is fundamentally simple pointer math:

1. User presses on a left/right edge handle
2. `pointerdown` -> capture pointer -> track delta
3. `pointermove` -> compute new trimStart/trimEnd from delta (clamped to valid range)
4. `pointerup` -> release capture -> persist to Convex

The Pointer Events API provides `setPointerCapture()` which eliminates the need to bind to `document` for reliable drag tracking. This is ~50 lines of code, not a library-sized problem.

**Implementation pattern:**

```tsx
function TrimHandle({ side, onTrim }: { side: "left" | "right"; onTrim: (deltaFrames: number) => void }) {
  const startXRef = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation(); // Prevent dnd-kit drag activation
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    startXRef.current = e.clientX;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!(e.target as HTMLElement).hasPointerCapture(e.pointerId)) return;
    const deltaPixels = e.clientX - startXRef.current;
    const deltaFrames = Math.round(deltaPixels / pixelsPerFrame);
    onTrim(deltaFrames); // Optimistic local update
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    // Persist final trim values to Convex
  };

  return (
    <div
      className={`absolute top-0 bottom-0 w-2 cursor-ew-resize z-10 hover:bg-primary/50
        ${side === "left" ? "left-0" : "right-0"}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
}
```

**Critical interaction: Trim handles vs dnd-kit sortable.** The same clip element has both:
- Sortable drag (move whole clip) -- handled by `@dnd-kit/sortable` via `listeners` on the clip body
- Trim handles (resize from edges) -- handled by custom Pointer Events on edge elements

Preventing conflict:
1. Trim handles call `e.stopPropagation()` on `pointerdown` to prevent dnd-kit's PointerSensor from activating
2. dnd-kit's `activationConstraint: { distance: 8 }` (already configured) ensures accidental edge clicks don't trigger drag
3. Use `setActivatorNodeRef` from `useSortable` to restrict drag initiation to a central grip handle, NOT the entire clip

**Confidence:** HIGH -- Pointer Events API is a web standard, `setPointerCapture` is supported in all modern browsers. The pattern is well-documented. No library dependency risk.

**Source:** [Pointer Events - 12 Days of Web](https://12daysofweb.dev/2022/pointer-events), [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)

---

#### 4. Timeline Zoom/Pan: Custom Implementation (NO Library)

**Recommendation: Build zoom/pan using native wheel events and CSS transforms. Do NOT add @use-gesture/react.**

**Why NOT @use-gesture/react:**
- Last published 2 years ago (v10.3.1), maintenance concerns
- Adds gesture recognition (pinch, rotate) we do not need
- Timeline zoom is simply: Ctrl+Wheel -> change `pixelsPerFrame` state, then adjust `scrollLeft` to keep the cursor position stable

**Implementation approach:**

```tsx
// Timeline zoom state
const [pixelsPerFrame, setPixelsPerFrame] = useState(2); // 2px per frame default
const MIN_PX_PER_FRAME = 0.5; // Full zoom out
const MAX_PX_PER_FRAME = 10;  // Full zoom in

// Wheel handler on timeline container
const handleWheel = (e: React.WheelEvent) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setPixelsPerFrame(prev =>
      Math.min(MAX_PX_PER_FRAME, Math.max(MIN_PX_PER_FRAME, prev * zoomFactor))
    );
  }
  // Without modifier key: normal horizontal scroll
};
```

**Important browser quirk:** `e.preventDefault()` in a wheel handler requires `{ passive: false }` on the event listener. React's synthetic `onWheel` is passive by default in some browsers. Use a `useEffect` with `addEventListener("wheel", handler, { passive: false })` instead of the React `onWheel` prop.

**Pan:** Horizontal scroll is native via `overflow-x: auto` on the timeline container. No library needed.

**Confidence:** HIGH -- Standard DOM wheel event handling. The zoom math (multiply pixelsPerFrame by a factor) is straightforward.

---

### Remotion APIs for Pro Timeline Features

These existing Remotion capabilities are central to the timeline but require NO new packages:

#### Trimming: `<Sequence>` with Negative `from`

Remotion's `<Sequence>` supports trimming via its `from` and `durationInFrames` props:

- **Trim start:** `<Sequence from={-trimStart}>` -- Negative `from` skips the first N frames of the child content. The child's `useCurrentFrame()` starts at `trimStart`, not 0.
- **Trim end:** `<Sequence durationInFrames={trimmedDuration}>` -- Limits how many frames of the child are shown.
- **Combined:** A clip with `trimStart: 15` and `trimEnd: 30` (out of original 120 frames) renders frames 15-89 of the original content.

**Data model extension for trimming:**

```typescript
// convex/schema.ts -- extend the scene object in movies table
scenes: v.array(v.object({
  clipId: v.id("clips"),
  durationOverride: v.optional(v.number()),
  trimStart: v.optional(v.number()),  // NEW: frames to skip from beginning (default 0)
  trimEnd: v.optional(v.number()),    // NEW: frames to skip from end (default 0)
})),
```

**Effective duration calculation:**
```typescript
function getEffectiveDuration(scene: Scene, clip: Clip): number {
  const baseDuration = scene.durationOverride ?? clip.durationInFrames;
  const trimStart = scene.trimStart ?? 0;
  const trimEnd = scene.trimEnd ?? 0;
  return baseDuration - trimStart - trimEnd;
}
```

**MovieComposition update for trimmed scenes:**

```tsx
<Series>
  {scenes.map((scene, i) => {
    const effectiveDuration = getEffectiveDuration(scene, clips[i]);
    const trimStart = scene.trimStart ?? 0;
    return (
      <Series.Sequence key={i} durationInFrames={effectiveDuration}>
        <Sequence from={-trimStart} durationInFrames={effectiveDuration}>
          <DynamicCode
            code={clips[i].code}
            durationInFrames={clips[i].durationInFrames}
            fps={clips[i].fps}
          />
        </Sequence>
      </Series.Sequence>
    );
  })}
</Series>
```

**Confidence:** HIGH -- Remotion docs explicitly document negative `from` for trimming. The `<Sequence>` nesting pattern (outer for positioning, inner for trimming) is the recommended approach.

**Source:** [Remotion Sequence](https://www.remotion.dev/docs/sequence), [Remotion Series](https://www.remotion.dev/docs/series)

#### Blade/Split Tool: Data Operation on Convex

The blade tool is purely a data operation -- no new Remotion API needed:

1. User positions playhead at frame N within a scene
2. User presses B (blade tool shortcut)
3. Convex mutation: Replace scene entry at index with two entries:
   - Scene A: same clipId, `trimEnd` increased to cut at frame N
   - Scene B: same clipId, `trimStart` set to frame N
4. Both scene entries reference the SAME clip (non-destructive editing)
5. Timeline re-renders with two clips where there was one

**Non-destructive editing is critical.** The original clip's code is never modified. Trim points are stored on the scene (movie join record), not the clip. The same clip can appear in multiple movies with different trims.

**Confidence:** HIGH -- This is a pure data model operation. Remotion's Sequence + Series handles the rendering.

#### Thumbnail Filmstrip: Multiple `<Thumbnail>` Instances

For a filmstrip preview on each timeline clip (showing a strip of frames across the clip width):

```tsx
function ClipFilmstrip({ clip, width, pixelsPerFrame }: Props) {
  const thumbnailWidth = 48; // px per thumbnail
  const count = Math.max(1, Math.floor(width / thumbnailWidth));
  const frameStep = clip.durationInFrames / count;

  return (
    <div className="flex h-full overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <Thumbnail
          key={i}
          component={DynamicCode}
          inputProps={{ code: clip.code, durationInFrames: clip.durationInFrames, fps: clip.fps }}
          compositionWidth={1920}
          compositionHeight={1080}
          frameToDisplay={Math.floor(i * frameStep)}
          durationInFrames={clip.durationInFrames}
          fps={clip.fps}
          style={{ width: thumbnailWidth, height: "100%", flexShrink: 0 }}
        />
      ))}
    </div>
  );
}
```

**Performance concern:** Each `<Thumbnail>` mounts a Remotion composition and renders one frame. For a timeline with 10 clips, each showing 5 thumbnails = 50 simultaneous Remotion compositions. This may be heavy.

**Mitigation strategies (prioritized):**
1. **Lazy rendering:** Only render thumbnails for clips visible in the viewport (IntersectionObserver)
2. **Reduce density:** Show 2-3 thumbnails per clip, not filling the entire width
3. **Placeholder on zoom:** While zooming, show solid color placeholders, render thumbnails on zoom stop (debounce)
4. **Memoization:** Wrap `<Thumbnail>` in `React.memo` to prevent re-renders when only zoom level changes (key by clipId + frameToDisplay)

**Confidence:** MEDIUM -- `<Thumbnail>` works for this purpose, but performance at scale (many clips, many thumbnails) needs empirical testing. May need to fall back to canvas-rendered thumbnails or cached stills.

**Source:** [Remotion Thumbnail docs](https://www.remotion.dev/docs/player/thumbnail)

---

### Timeline Rendering Approach: CSS/HTML (NOT Canvas, NOT SVG)

**Recommendation: Build the timeline using CSS/HTML divs with Tailwind. Do NOT use Canvas or SVG.**

**Why CSS/HTML over Canvas:**

| Approach | Pros | Cons |
|----------|------|------|
| **CSS/HTML (RECOMMENDED)** | Native DOM events (click, hover, pointer), accessibility (ARIA, keyboard nav), easy Tailwind styling, existing Remotion `<Thumbnail>` renders as DOM elements | May struggle with 500+ elements (irrelevant for our scale of 5-50 clips) |
| Canvas | Best for 100+ tracks with thousands of keyframes, pixel-level control, smooth 60fps zoom | No native DOM events (must implement hit-testing), cannot embed React components (`<Thumbnail>`), no accessibility, harder to style |
| SVG | Vector scaling, DOM events | DOM overhead at scale, harder to embed React components |

**CSS/HTML is the right choice because:**

1. **Scale:** Our timeline has 1-50 clips on a single track. CSS handles this trivially.
2. **Remotion `<Thumbnail>` integration:** Thumbnails are React components. Canvas cannot render React components without an offscreen DOM -> canvas pipeline (massive complexity).
3. **@dnd-kit integration:** dnd-kit operates on DOM elements. Canvas would require a completely different drag approach.
4. **Accessibility:** Screen readers, keyboard navigation, and focus management work out of the box with DOM elements.
5. **Development speed:** Tailwind CSS + React components is the fastest path to a polished UI.

**When Canvas would be correct (NOT our case):**
- Multi-track timelines with 100+ tracks (DAW-style)
- Thousands of keyframes with continuous animation
- Custom waveform rendering
- Frame-precise scrubbing at 60fps with hundreds of visible elements

**Confidence:** HIGH -- CSS/HTML is the correct choice for a single-track timeline with under 50 clips and embedded React components.

---

### dnd-kit Modifications for Pro Timeline

The existing `@dnd-kit/sortable` setup needs modifications (NOT new packages) to support the pro timeline:

**Current state:** Entire clip element is draggable (`listeners` spread on the outer div).

**Required changes:**

1. **Separate drag handle from clip body:** Use `setActivatorNodeRef` from `useSortable` to restrict drag initiation to a dedicated grip handle area (center of clip), preventing conflict with trim handles on edges.

```tsx
const { setNodeRef, setActivatorNodeRef, listeners, attributes, transform, transition } = useSortable({ id });

return (
  <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
    {/* Left trim handle -- NOT a drag trigger */}
    <TrimHandle side="left" onTrim={handleTrimStart} />

    {/* Drag handle -- center grip area */}
    <div
      ref={setActivatorNodeRef}
      {...listeners}
      {...attributes}
      className="flex-1 cursor-grab active:cursor-grabbing"
    >
      <ClipFilmstrip clip={clip} />
    </div>

    {/* Right trim handle -- NOT a drag trigger */}
    <TrimHandle side="right" onTrim={handleTrimEnd} />
  </div>
);
```

2. **Variable-width clips:** Current clips are fixed at `w-[160px]`. Pro timeline uses `style={{ width: effectiveDuration * pixelsPerFrame }}` for proportional sizing. dnd-kit handles variable-width sortable items without configuration changes.

3. **Snap-to-frame on drag end:** After reorder, clips snap to integer frame positions (no sub-frame gaps). This is handled in the state update, not the dnd-kit config.

**Confidence:** HIGH -- `setActivatorNodeRef` is a documented API in `@dnd-kit/sortable`. Variable-width sortable items are a supported use case.

**Source:** [dnd-kit useSortable docs](https://docs.dndkit.com/presets/sortable/usesortable), [dnd-kit Draggable handle pattern](https://docs.dndkit.com/api-documentation/draggable/usedraggable)

---

### Full v3.0 Dependency Summary

```bash
# New dependencies for v3.0 Pro Timeline
npm install tinykeys@^3.0.0
npm install react-resizable-panels@^4.4.2
```

| Package | Size (approx) | Purpose | When to Add |
|---------|--------------|---------|-------------|
| `tinykeys` | ~650B min | Keyboard shortcuts (blade, play/pause, nav) | Phase: Keyboard shortcuts |
| `react-resizable-panels` | ~15KB min | Resizable editor layout (preview/timeline/properties) | Phase: Pro editor layout |

**Total new bundle: ~16KB minified** (extremely lightweight)

---

### What Is NOT Needed for v3.0

| Technology | Why Not | Use Instead |
|------------|---------|-------------|
| **@use-gesture/react** | Last updated 2 years ago. Overkill for single-axis trim/zoom. Adds pinch/rotate recognition we do not need. | Native Pointer Events API for trim, native wheel events for zoom |
| **re-resizable** | Designed for 2D box resizing (8 handles). Timeline trim is strictly horizontal, single-axis. Wrong abstraction. | Custom trim handles with Pointer Events |
| **react-resizable** | Same mismatch as re-resizable. Designed for grid/box resizing. | Custom trim handles with Pointer Events |
| **Canvas-based timeline** | Cannot embed Remotion `<Thumbnail>` React components. No DOM events. No accessibility. Overkill for 1-50 clips. | CSS/HTML divs with Tailwind |
| **SVG timeline** | DOM overhead without benefit. Cannot easily embed React components. | CSS/HTML divs with Tailwind |
| **react-hotkeys-hook** | Uses both `code` and `key` simultaneously, causing shortcuts to fire more than expected. Heavier than tinykeys. | tinykeys (correct key handling, ~650B) |
| **hotkeys-js** | Uses deprecated `keyCode` property for key detection. | tinykeys |
| **Remotion Timeline ($300)** | Designed for multi-track editors with overlapping clips. Our use case is a single-track sequential timeline. | Custom timeline with Tailwind + dnd-kit |
| **@twick/video-editor** | Full SDK with its own rendering pipeline, incompatible with our DynamicCode/Remotion pattern. | Custom implementation |
| **Wavesurfer.js / waveform libraries** | No audio track support in current scope. AI-generated clips are visual-only. | Defer to future audio milestone |
| **Undo/redo library (immer-undo, etc.)** | Convex is the source of truth. Undo should be implemented as Convex mutations (store action history), not client-side state snapshots. | Convex-backed undo stack (custom) |
| **react-virtuoso for timeline** | Timeline has 1-50 clips in view. Virtualization adds complexity without benefit at this scale. | Simple overflow-x-auto scroll |

---

### Convex Schema Extensions for Trimming

The scene object in the movies table needs two new optional fields:

```typescript
// convex/schema.ts -- extend the scene object
scenes: v.array(v.object({
  clipId: v.id("clips"),
  durationOverride: v.optional(v.number()),
  trimStart: v.optional(v.number()),  // NEW: frames to skip from clip start
  trimEnd: v.optional(v.number()),    // NEW: frames to skip from clip end
})),
```

**Constraints:**
- `trimStart >= 0`
- `trimEnd >= 0`
- `trimStart + trimEnd < effectiveDuration` (cannot trim more than the clip length)
- Effective duration = `(durationOverride ?? clip.durationInFrames) - trimStart - trimEnd`
- Must be > 0 (at least 1 frame visible)

**New mutations needed:**
- `updateSceneTrim({ movieId, sceneIndex, trimStart?, trimEnd? })` -- Set trim points
- `splitScene({ movieId, sceneIndex, splitAtFrame })` -- Create two scenes from one

**Confidence:** HIGH -- Optional fields are backward-compatible. Existing scenes without trimStart/trimEnd behave identically (default to 0).

---

### v3.0 Confidence Assessment

| Component | Confidence | Reason |
|-----------|------------|--------|
| tinykeys for shortcuts | HIGH | 650B, correct key handling, stable v3.0, simple API |
| react-resizable-panels for layout | HIGH | 2.7M weekly downloads, actively maintained, shadcn/ui compatible |
| Custom trim handles (Pointer Events) | HIGH | Web standard API, ~50 lines of code, well-documented pattern |
| Custom zoom/pan (wheel events) | HIGH | Standard DOM events, simple math |
| CSS/HTML timeline rendering | HIGH | Correct choice for 1-50 clips with embedded React components |
| Remotion Sequence trimming | HIGH | Officially documented negative `from` pattern for trimming |
| dnd-kit drag handle separation | HIGH | `setActivatorNodeRef` is a documented API |
| Thumbnail filmstrip performance | MEDIUM | Works in principle, but 50+ simultaneous Thumbnails may need optimization |
| Blade tool (data operation) | HIGH | Pure Convex mutation, no new APIs needed |

---

## v2.0 Stack Additions: Multi-Scene Movie Editor

**Added:** 2026-01-29
**Focus:** Clip saving, horizontal timeline UI, multi-scene composition, end-state serialization, continuation generation, app shell

### Overview of What Is Needed

v2.0 evolves from single-clip creation into a multi-scene movie editor. The key technical challenges are:

1. **Clip persistence** -- Saving/loading compositions to Convex (schema extension, no new deps)
2. **Thumbnail generation** -- Displaying visual previews of saved clips
3. **Horizontal timeline UI** -- Video-editor-style track with duration bars and drag-to-reorder
4. **Multi-scene composition** -- Combining multiple clips into one Remotion video via Series/Sequence
5. **End-state serialization** -- Static analysis of JSX to extract final frame positions/styles/text
6. **Continuation generation** -- Passing serialized end state to Claude for next-scene generation
7. **App shell** -- Persistent sidebar navigation across all pages

### What Is Already Sufficient (No New Dependencies)

Several v2.0 features require no new libraries -- just new patterns using existing stack:

| Feature | Existing Stack | Pattern |
|---------|---------------|---------|
| Clip saving | Convex `defineTable` | New `clips` and `movies` tables in schema.ts |
| Clip library | Convex `useQuery` | Reactive query with index on userId |
| Multi-scene preview | `@remotion/player` (4.0.410) | Player wrapping a MovieComposition that uses `<Series>` |
| Multi-scene render | `@remotion/lambda` (4.0.410) | Same meta-composition pattern, MovieComposition as entry |
| Continuation generation | `@anthropic-ai/sdk` | Extended system prompt with end-state context |
| App shell sidebar | Next.js 16 App Router | Nested `layout.tsx` with persistent sidebar |
| Playback scrubber | `@remotion/player` PlayerRef | `seekTo()`, `getCurrentFrame()`, `frameupdate` event |

---

### New Dependencies for v2.0

#### 1. Drag-and-Drop Timeline Reordering: `@dnd-kit`

**Recommendation: `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/modifiers` + `@dnd-kit/utilities`**

| Package | Version | Purpose |
|---------|---------|---------|
| `@dnd-kit/core` | ^6.3.1 | Core drag-and-drop context, sensors, collision detection |
| `@dnd-kit/sortable` | ^10.0.0 | Sortable preset (useSortable hook, arrayMove) |
| `@dnd-kit/modifiers` | ^9.0.0 | `restrictToHorizontalAxis` modifier |
| `@dnd-kit/utilities` | ^3.2.2 | CSS transform utilities |

**Why dnd-kit over alternatives:**

| Library | Verdict | Reason |
|---------|---------|--------|
| **@dnd-kit** | RECOMMENDED | Modular (~10KB core), zero deps, horizontal axis restriction built-in, works with React 19, custom collision detection |
| @hello-pangea/dnd | Rejected | Designed for vertical lists and Kanban boards. Horizontal support exists but less flexible. No grid layouts. Heavier. |
| Pragmatic drag and drop (Atlassian) | Rejected | Built on HTML5 DnD API which has known quirks. Newer, less ecosystem adoption. |
| react-dnd | Rejected | Complex API, requires backends, declining adoption. |
| Custom CSS (no library) | Rejected | Reorder animation, keyboard accessibility, and collision detection are hard to get right from scratch. |

**Timeline-specific dnd-kit pattern:**

The timeline needs `horizontalListSortingStrategy` from `@dnd-kit/sortable` combined with `restrictToHorizontalAxis` from `@dnd-kit/modifiers`. This constrains drag movement to the horizontal axis and optimizes collision detection for a row of items. The `arrayMove` utility handles the actual reorder in state.

```tsx
// Pattern for horizontal timeline reorder
<DndContext
  collisionDetection={closestCenter}
  modifiers={[restrictToHorizontalAxis]}
  onDragEnd={handleDragEnd}
>
  <SortableContext items={sceneIds} strategy={horizontalListSortingStrategy}>
    <div className="flex flex-row overflow-x-auto">
      {scenes.map((scene) => (
        <SortableTimelineItem key={scene.id} scene={scene} />
      ))}
    </div>
  </SortableContext>
</DndContext>
```

**Confidence:** HIGH -- dnd-kit is the de facto standard for React DnD with 5.3M weekly downloads. Horizontal sortable lists are a documented first-class use case.

**Source:** [dnd-kit Sortable docs](https://docs.dndkit.com/presets/sortable), [Modifiers docs](https://docs.dndkit.com/api-documentation/modifiers)

---

#### 2. Thumbnail Generation: Remotion `<Thumbnail>` (No New Package)

**Recommendation: Use `<Thumbnail>` from `@remotion/player` (already installed at 4.0.410)**

The `<Thumbnail>` component renders a single frame from a Remotion composition as a static image in the browser. It is exactly what clip thumbnails need.

| Approach | Verdict | Reason |
|----------|---------|--------|
| **Remotion `<Thumbnail>`** | RECOMMENDED | Already in `@remotion/player`, renders any frame, uses same DynamicCode composition, zero extra dependencies |
| html2canvas | Rejected | Would need to mount and screenshot a hidden Player. Fragile, cannot capture Remotion internals accurately. |
| Remotion `renderStill()` / `renderStillOnLambda()` | Rejected for thumbnails | Server-side rendering is overkill for preview thumbnails. Adds latency and Lambda cost. Reserve for export use cases. |
| Canvas toDataURL | Rejected | Same problem as html2canvas -- cannot reliably capture Remotion's rendering pipeline. |

**Thumbnail implementation pattern:**

```tsx
import { Thumbnail } from "@remotion/player";
import { DynamicCode } from "@/remotion/compositions/DynamicCode";

<Thumbnail
  component={DynamicCode}
  inputProps={{ code: clip.code, durationInFrames: clip.durationInFrames, fps: clip.fps }}
  compositionWidth={1920}
  compositionHeight={1080}
  frameToDisplay={clip.durationInFrames - 1} // Last frame as thumbnail
  durationInFrames={clip.durationInFrames}
  fps={clip.fps}
  style={{ width: 160, height: 90 }} // 16:9 thumbnail
/>
```

**Key API details (from official docs):**
- Available since v3.2.41 (we have 4.0.410)
- Props: `component`, `frameToDisplay`, `compositionWidth/Height`, `durationInFrames`, `fps`, `inputProps`
- Does NOT use `<Composition>` -- pass component directly
- `frameToDisplay` is zero-indexed (last frame = `durationInFrames - 1`)
- `durationInFrames` and `fps` are required because components may call `useVideoConfig()`

**Thumbnail storage strategy:**
Thumbnails are rendered live in the browser via `<Thumbnail>`. No need to store thumbnail images in Convex. The clip's `code` field IS the thumbnail source. If we later want cached thumbnails (e.g., for faster list loading), we can use `renderStillOnLambda()` to generate a PNG and store the URL in the clip document -- but this is a future optimization, not needed for v2.0.

**Confidence:** HIGH -- `<Thumbnail>` is part of the already-installed `@remotion/player` package and is documented for exactly this use case.

**Source:** [Remotion Thumbnail docs](https://www.remotion.dev/docs/player/thumbnail)

---

#### 3. End-State Serialization: `acorn-jsx-walk` (Extend Existing AST Stack)

**Recommendation: Add `acorn-jsx-walk` to extend the existing acorn + acorn-jsx + acorn-walk stack**

| Package | Version | Purpose |
|---------|---------|---------|
| `acorn-walk` | ^8.3.4 | AST walker for acorn (generic ESTree traversal) |
| `acorn-jsx-walk` | ^2.0.0 | JSX node type support for acorn-walk visitors |

**Why these specific packages:**

The project already uses `acorn` (^8.15.0) and `acorn-jsx` (^5.3.2) for code validation. The end-state serialization feature needs to WALK the parsed AST to extract values from JSX attributes. The existing `code-validator.ts` does manual recursive walking (the `walkNode` function), but for end-state extraction we need more structured traversal with visitor callbacks for specific JSX node types.

- `acorn-walk` is acorn's official AST walker (43M weekly downloads). It provides `simple()`, `ancestor()`, and `recursive()` traversal strategies.
- `acorn-jsx-walk` extends acorn-walk's base visitors to handle JSX-specific node types (`JSXElement`, `JSXAttribute`, `JSXExpressionContainer`, etc.). Without it, acorn-walk would skip JSX nodes during traversal.

**Alternative considered: estree-walker**
- estree-walker (by Rich Harris) auto-discovers child nodes rather than using hardcoded visitors. It found all 41,669 identifiers vs acorn-walk's 23,340 in benchmarks.
- However, since we already use acorn as our parser and acorn-jsx-walk is purpose-built for this exact combination, consistency wins over raw coverage. The missing identifiers in acorn-walk are typically in node types we do not need to traverse for end-state extraction.

**Alternative considered: Manual walking (current pattern in code-validator.ts)**
- The existing `walkNode()` function in `code-validator.ts` does manual recursive descent. This works for validation but is brittle for extraction -- we need to handle many more node types and extract values, not just detect patterns.
- For end-state extraction, structured visitors with `acorn-walk.simple()` are cleaner and more maintainable.

**End-state serialization approach:**

The goal is to statically analyze the JSX code and extract what the visual state looks like at the LAST frame. This means finding:
- Inline `style` props on elements (positions, transforms, colors, opacity)
- Text content in JSX text nodes
- Props passed to Remotion components (e.g., `<Sequence from={X}>`)
- Interpolation calls with their output ranges to determine final values

**What can be extracted statically vs what cannot:**

| Extractable | Example | Approach |
|-------------|---------|----------|
| Static style values | `style={{ left: 100, color: "red" }}` | AST: ObjectExpression in JSXAttribute |
| Text content | `<h1>Hello World</h1>` | AST: JSXText node value |
| Interpolation endpoints | `interpolate(frame, [0,90], [0,500])` | AST: CallExpression args, extract last value of output range |
| Spring targets | `spring({ frame, fps, config: { damping: 10 } })` | AST: CallExpression, spring converges to ~1.0 |
| Static colors | `backgroundColor: "#ff0000"` | AST: Literal in ObjectExpression |

| NOT extractable statically | Example | Mitigation |
|---------------------------|---------|------------|
| Dynamic state (useState) | `const [pos, setPos] = useState(0)` | Ignore -- flag as dynamic |
| Computed expressions | `left: Math.sin(frame) * 100` | Evaluate at known frame value |
| Conditional rendering | `{frame > 45 && <Text />}` | Assume last branch (frame = max) |

**Recommended serialization strategy (pragmatic approach):**

Rather than building a full symbolic evaluator, use a two-pass approach:

1. **Pass 1: AST extraction** -- Walk the JSX AST and extract all static values, interpolation ranges, and spring configs. Build a structured "scene descriptor" with element positions, styles, and text.

2. **Pass 2: Claude interpretation** -- Pass the raw JSX code PLUS the extracted structured data to Claude with a prompt like: "Given this Remotion code, what does the visual state look like at the final frame? Here are the extracted values: [structured data]. Produce a JSON description of the end state."

This hybrid approach avoids building a full JS evaluator while still giving Claude rich context for continuation generation.

**Confidence:** MEDIUM -- The AST extraction is straightforward with acorn-walk + acorn-jsx-walk. The challenge is handling dynamic values (interpolations, springs). The two-pass approach with Claude is pragmatic but adds one extra API call per continuation.

**Source:** [acorn-walk npm](https://www.npmjs.com/package/acorn-walk), [acorn-jsx-walk GitHub](https://github.com/sderosiaux/acorn-jsx-walk)

---

#### 4. Remotion Multi-Scene Composition: `@remotion/transitions` (Optional)

**Recommendation: Add `@remotion/transitions` for scene-to-scene transitions**

| Package | Version | Purpose |
|---------|---------|---------|
| `@remotion/transitions` | 4.0.410 | TransitionSeries component with built-in fade, slide, wipe effects |

**Why add this:**

The basic multi-scene movie can use `<Series>` (already in `remotion` core) to play clips sequentially. However, v2.0 should support smooth transitions between scenes. `@remotion/transitions` provides `<TransitionSeries>` with built-in presentations:

- `fade()` -- Cross-fade between scenes
- `slide()` -- Slide in / push out
- `wipe()` -- Slide over previous scene
- `flip()` -- 3D rotation
- `clockWipe()` -- Circular reveal
- Custom presentations supported

**Duration calculation with transitions:**
Total = sum of all scene durations - sum of all transition durations.
Example: Scene A (90 frames) + Scene B (120 frames) with a 15-frame fade = 90 + 120 - 15 = 195 frames.

**Version alignment is critical:** All `remotion` and `@remotion/*` packages must be the same version. The project uses 4.0.410. Install `@remotion/transitions@4.0.410` (exact, no caret).

**MovieComposition pattern:**

```tsx
import { Series } from "remotion";
import { TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { linearTiming } from "@remotion/transitions/linear-timing";

// Simple sequential (no transitions)
const MovieSimple: React.FC<{ scenes: SceneData[] }> = ({ scenes }) => (
  <Series>
    {scenes.map((scene) => (
      <Series.Sequence key={scene.id} durationInFrames={scene.durationInFrames}>
        <DynamicCode code={scene.code} durationInFrames={scene.durationInFrames} fps={scene.fps} />
      </Series.Sequence>
    ))}
  </Series>
);

// With transitions between scenes
const MovieWithTransitions: React.FC<{ scenes: SceneData[] }> = ({ scenes }) => (
  <TransitionSeries>
    {scenes.flatMap((scene, i) => [
      <TransitionSeries.Sequence key={scene.id} durationInFrames={scene.durationInFrames}>
        <DynamicCode code={scene.code} durationInFrames={scene.durationInFrames} fps={scene.fps} />
      </TransitionSeries.Sequence>,
      i < scenes.length - 1 && (
        <TransitionSeries.Transition
          key={`t-${scene.id}`}
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />
      ),
    ].filter(Boolean))}
  </TransitionSeries>
);
```

**Decision: Start with `<Series>` (no transitions), add `@remotion/transitions` when transition UI is built.**

The `<Series>` component is already available in the `remotion` package. For MVP of multi-scene, hard cuts between scenes are fine. Add `@remotion/transitions` when the UI supports choosing transition types. This can be deferred to a later phase within v2.0.

**Confidence:** HIGH -- `<Series>` and `<TransitionSeries>` are well-documented core Remotion patterns. The combining-compositions guide confirms this approach.

**Source:** [Remotion Series](https://www.remotion.dev/docs/series), [TransitionSeries](https://www.remotion.dev/docs/transitions/transitionseries), [Combining Compositions](https://www.remotion.dev/docs/miscellaneous/snippets/combine-compositions)

---

#### 5. Timeline UI: Custom Build (No Dedicated Timeline Library)

**Recommendation: Build a custom timeline using Tailwind CSS + dnd-kit. Do NOT add a dedicated timeline library.**

**Why NOT use an existing timeline library:**

| Library | Verdict | Reason |
|---------|---------|--------|
| Remotion Timeline (paid, $300) | Rejected | Designed for multi-track editors with overlapping clips. Our timeline is a single-track sequential scene list. Overkill and adds licensing complexity. |
| @xzdarcy/react-timeline-editor | Rejected | Last published 3 years ago, only 5 dependents. Unmaintained. |
| @cloudgpt/timeline-editor | Rejected | Fork of above, very small adoption. Community package, not battle-tested. |
| React Video Editor (RVE) | Rejected | Full editor framework, not a standalone timeline component. Would conflict with our existing architecture. |
| @twick/video-editor | Rejected | Full SDK with its own player/canvas system. Incompatible with our Remotion-based approach. |

**Why custom is the right call:**

Our timeline is fundamentally simple: a horizontal row of scene cards with duration indicators, a playhead, and drag-to-reorder. This is:

1. A flex row of cards (Tailwind CSS)
2. Width proportional to duration (CSS calc or inline style)
3. Drag-to-reorder (dnd-kit, already recommended above)
4. A playhead line that moves with `PlayerRef.getCurrentFrame()` events
5. Click-to-scrub via `PlayerRef.seekTo(frame)`

This is 200-300 lines of custom React + Tailwind, not a library-sized problem. A library would add constraints without adding value for our simple sequential timeline.

**Custom timeline component structure:**

```
components/timeline/
  timeline.tsx          -- Container with overflow-x-auto, playhead overlay
  timeline-item.tsx     -- Individual scene card (thumbnail, title, duration)
  timeline-playhead.tsx -- Animated vertical line showing current position
  timeline-scrubber.tsx -- Click-to-seek bar below the timeline
```

**Integration with Remotion Player:**

The Remotion Player provides all needed APIs for timeline sync:
- `playerRef.current.addEventListener("frameupdate", callback)` -- Real-time frame position
- `playerRef.current.seekTo(frame)` -- Jump to frame on click/scrub
- `playerRef.current.getCurrentFrame()` -- Get current position
- `playerRef.current.play()` / `pause()` / `toggle()` -- Playback control

The timeline translates between per-scene frame numbers and global movie frame numbers:
```ts
// Convert scene-local frame to movie-global frame
function getGlobalFrame(scenes: Scene[], sceneIndex: number, localFrame: number): number {
  let offset = 0;
  for (let i = 0; i < sceneIndex; i++) {
    offset += scenes[i].durationInFrames;
  }
  return offset + localFrame;
}
```

**Confidence:** HIGH -- The Player custom controls API is well-documented. The timeline UI is a straightforward React component.

**Source:** [Remotion Player Custom Controls](https://www.remotion.dev/docs/player/custom-controls), [Building a Timeline](https://www.remotion.dev/docs/building-a-timeline)

---

#### 6. App Shell / Sidebar Navigation: Next.js Nested Layouts (No New Dependencies)

**Recommendation: Use Next.js App Router nested layouts. No new packages needed.**

Next.js App Router layouts are persistent by design -- they do not re-render when child routes change. A sidebar layout wrapping all authenticated pages gives us the app shell for free.

**Implementation pattern:**

```
src/app/
  layout.tsx              -- Root layout (Providers, Toaster)
  page.tsx                -- Landing page (no sidebar)
  (app)/                  -- Route group for authenticated pages with shell
    layout.tsx            -- App shell layout with sidebar
    create/
      page.tsx            -- Create page
    library/
      page.tsx            -- Clip library
    movie/
      [id]/page.tsx       -- Movie editor + timeline
    templates/
      page.tsx            -- Templates gallery
```

**Key patterns:**
- The `(app)` route group provides the sidebar layout without affecting URLs
- The sidebar layout is a Server Component wrapping a Client Component sidebar
- Use `usePathname()` from `next/navigation` to highlight active nav item
- lucide-react (already installed at ^0.563.0) provides sidebar icons

**No new packages needed because:**
- Sidebar is just a flex layout with Tailwind
- Active state uses `usePathname()` (built into Next.js)
- Icons use lucide-react (already installed)
- No parallel routes needed for this simple sidebar pattern

**Confidence:** HIGH -- This is the standard Next.js App Router pattern, documented extensively.

**Source:** [Next.js Layouts](https://nextjs.org/docs/pages/building-your-application/routing/pages-and-layouts)

---

### Convex Schema Extensions (No New Dependencies)

The v2.0 features require new tables in the Convex schema. No new Convex packages needed.

**New tables:**

```typescript
// convex/schema.ts additions
clips: defineTable({
  userId: v.string(),
  name: v.string(),
  code: v.string(),           // Transformed JS code for execution
  rawCode: v.string(),        // Original JSX for editor display
  durationInFrames: v.number(),
  fps: v.number(),
  width: v.optional(v.number()),   // Default 1920
  height: v.optional(v.number()),  // Default 1080
  thumbnailFrame: v.optional(v.number()), // Which frame to show as thumbnail (default: last)
  endState: v.optional(v.string()),       // Serialized end-state JSON for continuation
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_updated", ["userId", "updatedAt"]),

movies: defineTable({
  userId: v.string(),
  name: v.string(),
  sceneOrder: v.array(v.id("clips")),   // Ordered list of clip IDs
  fps: v.number(),                       // Movie-level fps (all clips should match)
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_updated", ["userId", "updatedAt"]),
```

**Design decisions:**
- `sceneOrder` is an array of clip IDs, not a separate join table. Convex arrays are efficient for ordered lists up to ~1000 items (more than enough for scenes in a movie).
- `endState` is stored as a JSON string on the clip, computed when the clip is saved or its code changes. This avoids re-computing on every continuation request.
- `thumbnailFrame` defaults to the last frame but can be set by the user.
- Movies reference clips by ID. A clip can appear in multiple movies (reuse).

**Confidence:** HIGH -- Standard Convex schema patterns, verified against existing schema.ts in the project.

---

### Full v2.0 Dependency Summary

```bash
# New dependencies for v2.0
npm install @dnd-kit/core@^6.3.1 @dnd-kit/sortable@^10.0.0 @dnd-kit/modifiers@^9.0.0 @dnd-kit/utilities@^3.2.2
npm install acorn-walk@^8.3.4 acorn-jsx-walk@^2.0.0

# Optional (defer to transition phase)
npm install @remotion/transitions@4.0.410
```

| Package | Size (approx) | Purpose | When to Add |
|---------|--------------|---------|-------------|
| `@dnd-kit/core` | ~10KB min | DnD engine | Phase: Timeline UI |
| `@dnd-kit/sortable` | ~5KB min | Sortable preset | Phase: Timeline UI |
| `@dnd-kit/modifiers` | ~2KB min | Horizontal axis restriction | Phase: Timeline UI |
| `@dnd-kit/utilities` | ~2KB min | CSS transform helpers | Phase: Timeline UI |
| `acorn-walk` | ~8KB min | AST traversal | Phase: End-state serialization |
| `acorn-jsx-walk` | ~2KB min | JSX node visitors | Phase: End-state serialization |
| `@remotion/transitions` | ~20KB min | Scene transitions | Phase: Transitions (defer) |

**Total new bundle: ~49KB minified** (very lightweight)

---

### What NOT to Add for v2.0

| Technology | Why Not | Use Instead |
|------------|---------|-------------|
| **Remotion Timeline ($300)** | Designed for multi-track overlapping editors. Our timeline is a simple sequential scene list. | Custom Tailwind + dnd-kit |
| **@xzdarcy/react-timeline-editor** | Unmaintained (3 years), tiny ecosystem (5 dependents) | Custom timeline component |
| **React Video Editor (RVE)** | Full editor framework that would conflict with our Remotion Player setup | Custom composition of existing components |
| **@twick/video-editor** | Full SDK with its own rendering pipeline, incompatible with our DynamicCode pattern | Remotion Player + custom UI |
| **@hello-pangea/dnd** | Optimized for vertical lists/Kanban, horizontal support is secondary. Heavier than dnd-kit. | @dnd-kit with horizontal modifiers |
| **html2canvas** | Cannot accurately capture Remotion rendering pipeline. Fragile DOM-based screenshots. | Remotion `<Thumbnail>` component |
| **react-beautiful-dnd** | Deprecated, no React 18+ support | @dnd-kit |
| **Zustand / Jotai** | Convex already provides reactive state management for persisted data. Local UI state is fine with useState/useReducer. | Convex useQuery + React state |
| **framer-motion / motion** | Not needed for timeline UI. Tailwind transitions + dnd-kit animations cover it. Only add if UI animations feel insufficient. | CSS transitions via Tailwind |
| **renderStillOnLambda()** for thumbnails | Adds Lambda cost and latency per thumbnail. Only needed if `<Thumbnail>` client rendering is too slow for large libraries. | Remotion `<Thumbnail>` (client-side) |
| **estree-walker** | While arguably better for generic traversal, acorn-walk + acorn-jsx-walk maintain consistency with our existing acorn-based stack. | acorn-walk + acorn-jsx-walk |

---

### v2.0 Confidence Assessment

| Component | Confidence | Reason |
|-----------|------------|--------|
| dnd-kit for timeline reorder | HIGH | 5.3M weekly downloads, horizontal sortable is a documented first-class use case |
| Remotion `<Thumbnail>` | HIGH | Part of already-installed @remotion/player, documented API, renders any frame |
| Remotion `<Series>` for multi-scene | HIGH | Core Remotion API, well-documented combining-compositions pattern |
| `@remotion/transitions` for TransitionSeries | HIGH | Official package at v4.0.410, same version as existing Remotion |
| Custom timeline UI | HIGH | Simple flex + Tailwind + dnd-kit, no complex library needed |
| App shell via nested layouts | HIGH | Standard Next.js App Router pattern |
| Convex schema extensions | HIGH | Standard Convex patterns, matches existing schema style |
| End-state serialization via AST | MEDIUM | AST extraction is proven, but handling dynamic values (interpolations, conditionals) requires heuristics. Two-pass approach with Claude adds latency. |
| acorn-walk + acorn-jsx-walk | MEDIUM | acorn-walk is well-established (43M downloads), but acorn-jsx-walk is older (last publish 6 years ago, v2.0.0). May need fallback to manual JSX walking if issues arise. |

---

## v1.1 Stack Additions: Full Code Generation

**Added:** 2026-01-28
**Focus:** Executing AI-generated Remotion JSX code safely

### The Challenge

v1.0 uses props-based generation: Claude generates JSON props for a fixed `TextAnimation` composition. v1.1 requires Claude to generate actual Remotion JSX code that gets executed and rendered.

**Key constraints:**
1. Remotion Lambda requires pre-bundled compositions (cannot add code at runtime)
2. AI-generated code is untrusted and may contain malicious patterns
3. Preview (Player) and Render (Lambda) have different execution contexts

### Recommended Architecture: Interpreter Pattern with AST Validation

After researching the alternatives, the recommended approach is:

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Validation** | acorn + ast-guard | Parse and validate JSX AST against whitelist |
| **Transformation** | sucrase | Fast JSX-to-JS transpilation (20x faster than Babel) |
| **Preview Execution** | Function constructor + Remotion component wrapper | Execute in browser with controlled scope |
| **Lambda Execution** | Parametrized meta-composition | Pass code as prop, execute via controlled wrapper |

**Why NOT other approaches:**

| Approach | Why Not |
|----------|---------|
| `eval()` / `new Function()` without validation | Security vulnerability (CVE-2025-55182 React2Shell demonstrated this) |
| E2B / Vercel Sandbox | Adds latency (~150-200ms), cost per execution, overkill for controlled JSX |
| iframe sandbox | Cannot access Remotion hooks/context, breaks composition model |
| Re-bundle per generation | Expensive (~seconds), deploySite not designed for runtime bundling |

---

### Code Validation Stack

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **acorn** | ^8.14.0 | JavaScript parser | Fast, standards-compliant, ESTree AST output. 55M+ weekly downloads. Used by ESLint, webpack. |
| **acorn-jsx** | ^5.3.2 | JSX support for acorn | Official extension for JSX parsing. Required since Remotion code is JSX. |
| **ast-guard** | ^0.8.x | AST validation with whitelist | Purpose-built for LLM-generated code. Blocks dangerous constructs, whitelist-only globals. |

**Confidence:** HIGH (acorn is battle-tested, ast-guard is purpose-built for this use case)

---

### JSX Transformation Stack

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **sucrase** | ^3.35.0 | Fast JSX transpilation | 20x faster than Babel, 8M+ weekly downloads, sufficient for JSX+TS. |

**Confidence:** HIGH (sucrase is mature, widely used in dev tooling)

---

### Preview Execution (Browser)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Function constructor** | (native) | Create function from code string | Safer than eval(), does not access local scope |
| **Remotion scope wrapper** | (custom) | Inject Remotion APIs into function scope | Controlled access to only allowed APIs |

**Confidence:** MEDIUM (approach is sound, but needs thorough testing)

---

### Lambda Execution: Meta-Composition Pattern

**Critical insight:** Remotion Lambda cannot execute arbitrary code at runtime. The bundle must be pre-deployed. However, we can use a "meta-composition" pattern.

**How it works:**
1. Deploy a `DynamicCode` composition that accepts `code` as a prop
2. The composition uses the same validation + transformation + execution
3. Pass the generated code via `inputProps` to Lambda

**Confidence:** HIGH (this pattern is documented in Remotion community, verified against deploySite docs)

---

### Full Stack Addition Summary

```bash
# New dependencies for v1.1
npm install acorn acorn-jsx ast-guard sucrase
```

| Package | Size | Purpose |
|---------|------|---------|
| acorn | 130KB | JS parser |
| acorn-jsx | 12KB | JSX extension |
| ast-guard | ~50KB | AST validation |
| sucrase | 500KB | JSX transformation |

**Total addition:** ~700KB (acceptable for code execution feature)

---

### Security Checklist for v1.1

- [x] AST validation rejects `eval`, `Function`, `require`, `import`
- [x] No access to `window`, `document`, `globalThis`
- [x] No access to `fetch`, `XMLHttpRequest`, networking
- [x] No access to `process`, Node.js APIs
- [x] No prototype pollution via `__proto__`, `constructor`
- [x] Input size limits (100KB max code)
- [x] Nesting depth limits (prevent parser DoS)
- [x] Same validation runs on both preview and Lambda
- [x] Error messages don't leak internal state
- [x] Rate limiting on code generation (existing Convex rate limiter)

---

### What NOT to Add for v1.1

| Technology | Why Not |
|------------|---------|
| **E2B sandbox** | Adds ~$150/mo minimum, 150ms latency per execution. Overkill when AST validation + controlled scope is sufficient. |
| **Vercel Sandbox** | Same cost/latency concerns. Better for truly untrusted arbitrary code. |
| **iframe sandbox** | Breaks Remotion context (hooks don't work across iframe boundary). |
| **Web Workers** | Cannot share React context, would require message passing for every frame. |
| **@babel/standalone** | 20x slower than sucrase, larger bundle size. |
| **esbuild-wasm** | WASM complexity not justified for JSX-only transformation. |
| **vm2 / isolated-vm** | Node.js only, doesn't work in browser preview. |

---

### Confidence Assessment for v1.1 Additions

| Component | Confidence | Reason |
|-----------|------------|--------|
| acorn + acorn-jsx | HIGH | Battle-tested, 55M weekly downloads, ESLint uses it |
| ast-guard | MEDIUM | Newer library but purpose-built for LLM code validation |
| sucrase | HIGH | Mature, widely used, 8M weekly downloads |
| Function constructor approach | MEDIUM | Sound in theory, needs security testing |
| Meta-composition pattern | HIGH | Verified against Remotion docs, community-used pattern |

---

## Recommended Stack (Full)

### Core Framework

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Next.js | 16.x | React framework, routing, SSR | Latest stable with React 19.2, App Router mature, Turbopack stable. Required for Clerk/Convex patterns. Security patches for CVE-2025-29927 included. | HIGH |
| React | 19.2 | UI library | Ships with Next.js 16, required for Remotion 4.x compatibility. React Compiler now stable for automatic memoization. | HIGH |
| TypeScript | 5.5+ | Type safety | Required by Convex, benefits Claude code generation (LSP integration improves output quality). | HIGH |

**Source:** [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)

### Authentication (Pre-decided: Clerk)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| @clerk/nextjs | latest | Authentication, user management | First-class Next.js App Router support, pre-built UI components, 10K MAU free tier sufficient for MVP. SOC 2 Type II compliant. | HIGH |

### Backend/Database (Pre-decided: Convex)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| convex | latest | Real-time database, server functions | TypeScript-first, automatic real-time sync, no WebSocket boilerplate. Queries react to database changes automatically. | HIGH |

### Video Rendering (Pre-decided: Remotion)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| remotion | 4.0.410 | Programmatic video creation | React-based video composition, supports React 19. Latest stable. | HIGH |
| @remotion/player | 4.0.410 | In-browser video preview + thumbnails | Embed video previews, real-time prop updates, `<Thumbnail>` for clip previews. | HIGH |
| @remotion/lambda | 4.0.410 | Serverless video rendering | Distributed rendering across Lambda functions, fastest option. Pay only while rendering. | HIGH |
| @remotion/transitions | 4.0.410 | Scene-to-scene transitions | TransitionSeries with fade, slide, wipe. Add when transition UI is built. | HIGH |

### AI Code Generation (Pre-decided: Claude API)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| @anthropic-ai/sdk | latest | Claude API client | Official TypeScript SDK, streaming support. | HIGH |

### Code Execution Stack (v1.1, validated)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| acorn | ^8.15.0 | JavaScript parser | Fast, standards-compliant, 55M+ weekly downloads. ESTree AST. | HIGH |
| acorn-jsx | ^5.3.2 | JSX support | Official JSX extension for acorn parser. | HIGH |
| sucrase | ^3.35.1 | JSX transformation | 20x faster than Babel. 8M+ weekly downloads. | HIGH |

### End-State Serialization Stack (v2.0, new)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| acorn-walk | ^8.3.4 | AST traversal | Official acorn walker, 43M weekly downloads. Needed for end-state extraction. | HIGH |
| acorn-jsx-walk | ^2.0.0 | JSX visitor support | Extends acorn-walk for JSX node types. Small but purpose-built. | MEDIUM |

### Timeline UI Stack (v2.0, existing)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| @dnd-kit/core | ^6.3.1 | Drag-and-drop engine | Modular, zero deps, ~10KB, React hooks API. | HIGH |
| @dnd-kit/sortable | ^10.0.0 | Sortable list preset | useSortable, arrayMove, horizontalListSortingStrategy. | HIGH |
| @dnd-kit/modifiers | ^9.0.0 | Movement restriction | restrictToHorizontalAxis for timeline. | HIGH |
| @dnd-kit/utilities | ^3.2.2 | CSS transform helpers | Clean CSS.Transform.toString() for drag overlay. | HIGH |

### Pro Timeline Stack (v3.0, new)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| tinykeys | ^3.0.0 | Keyboard shortcuts | ~650B, correct key handling, cross-platform `$mod`. | HIGH |
| react-resizable-panels | ^4.4.2 | Resizable editor layout | 2.7M weekly downloads, keyboard accessible, collapsible panels. | HIGH |

### UI Framework

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Tailwind CSS | 4.x | Utility-first CSS | No config file needed in v4, CSS-native theme variables, works seamlessly with Remotion. | HIGH |
| shadcn/ui | latest | Component library | Copy-paste components, full customization, Radix primitives for accessibility. Uses tw-animate-css (not tailwindcss-animate). | HIGH |

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| zod | 4.x | Schema validation | Validate user prompts, API responses, Remotion props. 14x faster parsing in v4. | HIGH |
| lucide-react | ^0.563.0 | Icons | Sidebar navigation icons, timeline controls. Already installed. | HIGH |
| sonner | ^2.0.7 | Toast notifications | User feedback for save/delete/render actions. Already installed. | HIGH |
| framer-motion | ^12.29.3 | UI animations | Already installed. Use for smooth panel transitions, not timeline rendering. | HIGH |

---

## Installation

```bash
# Core dependencies (existing, already installed)
npm install @clerk/nextjs convex remotion @remotion/player @remotion/cli @remotion/lambda
npm install @anthropic-ai/sdk
npm install acorn acorn-jsx sucrase
npm install @monaco-editor/react
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/modifiers @dnd-kit/utilities

# v2.0 additions
npm install acorn-walk@^8.3.4 acorn-jsx-walk@^2.0.0

# v2.0 optional (add when transition UI is built)
npm install @remotion/transitions@4.0.410

# v3.0 additions (Pro Timeline)
npm install tinykeys@^3.0.0
npm install react-resizable-panels@^4.4.2
```

---

## Alternatives Considered

| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| Framework | Next.js 16 | Remix, Vite + React Router | If you need more control over data loading patterns |
| Auth | Clerk | NextAuth.js | If you need fully self-hosted auth, or Clerk pricing is prohibitive at scale |
| Database | Convex | Supabase, PlanetScale + Prisma | If you need SQL queries, more complex data modeling |
| Video Rendering | Remotion Lambda | Cloud Run, self-hosted | If Lambda constraints (size, GPU) block you |
| AI Model | Claude Sonnet 4.5 | GPT-4, Gemini | If Claude output quality is insufficient (unlikely for code gen) |
| UI | shadcn/ui | Radix Themes, Chakra UI | If you prefer pre-styled components |
| Drag & Drop | @dnd-kit | @hello-pangea/dnd | If you need vertical Kanban-style lists instead of horizontal timelines |
| Timeline UI | Custom (Tailwind + dnd-kit) | Remotion Timeline ($300) | If building a multi-track overlapping editor |
| Thumbnails | Remotion `<Thumbnail>` | renderStillOnLambda | If client-side thumbnail rendering is too slow for 100+ clips |
| AST Walking | acorn-walk + acorn-jsx-walk | estree-walker | If you need to traverse non-standard node types beyond JSX |
| Scene Transitions | @remotion/transitions | Custom Sequence-based overlaps | If you need transitions not in the built-in set |
| Code Validation | acorn + custom validators | ast-guard | If ast-guard doesn't meet specific requirements |
| JSX Transform | sucrase | @babel/standalone | If you need Babel plugins (decorators, etc.) |
| Code Sandbox | Function constructor | E2B, Vercel Sandbox | If code truly needs full isolation (filesystem, network) |
| Keyboard Shortcuts | tinykeys | react-hotkeys-hook | If you want React hook API at the cost of incorrect key matching |
| Panel Layout | react-resizable-panels | Custom CSS resize | If you do not need collapsible panels or keyboard accessibility |
| Clip Trimming | Custom Pointer Events | re-resizable, @use-gesture | If you need 2D resize or multi-gesture recognition |
| Timeline Zoom | Native wheel events | @use-gesture/react | If you need pinch-to-zoom gesture support on touch devices |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| tailwindcss-animate | Deprecated by shadcn/ui as of 2025 | tw-animate-css |
| Clerk's `<SignedIn>` components with Convex | Auth state may not reflect Convex token validation | Convex's `<Authenticated>` components |
| useAuth() from Clerk for auth checks | Doesn't verify Convex backend token validation | useConvexAuth() from Convex |
| Next.js 14.x or lower | CVE-2025-29927 vulnerability, missing React 19 features | Next.js 15.2.3+ or 16.x |
| React Query for Convex data | Convex has built-in reactivity, React Query adds unnecessary complexity | Convex's useQuery/useMutation |
| Remotion Cloud Run | Alpha status, not actively developed, lacks distributed rendering | Remotion Lambda |
| eval() | Security vulnerability, access to local scope | new Function() with controlled scope |
| @xzdarcy/react-timeline-editor | Unmaintained (3 years old), tiny ecosystem | Custom timeline |
| react-beautiful-dnd | Deprecated, no React 18/19 support | @dnd-kit |
| Zustand / Jotai for persisted state | Convex already provides reactive state. Adding a separate store creates sync issues. | Convex useQuery + React useState for local UI state |
| @use-gesture/react | Last updated 2 years ago, overkill for timeline interactions | Native Pointer Events + wheel events |
| re-resizable / react-resizable | Wrong abstraction for timeline clip trimming (2D box vs 1D trim) | Custom trim handles with Pointer Events |
| react-hotkeys-hook | Incorrect key matching (fires on both code and key) | tinykeys |
| Canvas-based timeline | Cannot embed React components, no DOM events, overkill for <50 clips | CSS/HTML divs with Tailwind |

---

## Version Compatibility Matrix

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| remotion@4.0.410 | React 19, Next.js 16 | Verified |
| @remotion/transitions@4.0.410 | remotion@4.0.410 | Must match exact version |
| @clerk/nextjs | Next.js 15+, 16 | Middleware pattern works with both |
| convex | Next.js 15+, React 19 | ConvexProviderWithClerk tested |
| @dnd-kit/core@6.3.1 | React 18, React 19 | Hooks-based, no version conflict |
| @dnd-kit/sortable@10.0.0 | @dnd-kit/core@6.x | Peer dependency |
| tinykeys@3.0.0 | Any (vanilla JS) | No React dependency, use in useEffect |
| react-resizable-panels@4.4.2 | React 19, Next.js 16 | Known TS import workaround needed |
| zod@4.x | TypeScript 5.5+ | Strict mode required |
| Tailwind CSS 4.x | shadcn/ui latest | Use tw-animate-css |
| acorn@8.x | ES2023+ | Stable |
| acorn-walk@8.x | acorn@8.x | Same major version |
| acorn-jsx-walk@2.0.0 | acorn-walk@8.x, acorn-jsx@5.x | Extends base visitors |
| sucrase@3.x | React 17+ JSX runtime | Automatic runtime supported |

---

## Sources

### Official Documentation (HIGH confidence)
- [Next.js Layouts](https://nextjs.org/docs/pages/building-your-application/routing/pages-and-layouts)
- [Remotion Series](https://www.remotion.dev/docs/series)
- [Remotion Sequence](https://www.remotion.dev/docs/sequence)
- [Remotion TransitionSeries](https://www.remotion.dev/docs/transitions/transitionseries)
- [Remotion Thumbnail](https://www.remotion.dev/docs/player/thumbnail)
- [Remotion Combining Compositions](https://www.remotion.dev/docs/miscellaneous/snippets/combine-compositions)
- [Remotion Player Custom Controls](https://www.remotion.dev/docs/player/custom-controls)
- [Remotion Building a Timeline](https://www.remotion.dev/docs/building-a-timeline)
- [Remotion Player API](https://www.remotion.dev/docs/player/player)
- [dnd-kit Sortable Docs](https://docs.dndkit.com/presets/sortable)
- [dnd-kit useSortable](https://docs.dndkit.com/presets/sortable/usesortable)
- [dnd-kit Modifiers Docs](https://docs.dndkit.com/api-documentation/modifiers)
- [Convex File Storage](https://docs.convex.dev/file-storage)
- [tinykeys GitHub](https://github.com/jamiebuilds/tinykeys)
- [react-resizable-panels GitHub](https://github.com/bvaughn/react-resizable-panels)

### NPM Package Verification (HIGH confidence)
- [@dnd-kit/core npm](https://www.npmjs.com/package/@dnd-kit/core) - v6.3.1, 5.3M weekly downloads
- [@dnd-kit/sortable npm](https://www.npmjs.com/package/@dnd-kit/sortable) - v10.0.0
- [@remotion/transitions npm](https://www.npmjs.com/package/@remotion/transitions) - v4.0.403+
- [acorn-walk npm](https://www.npmjs.com/package/acorn-walk) - v8.3.4, 43M weekly downloads
- [acorn-jsx-walk npm](https://www.npmjs.com/package/acorn-jsx-walk) - v2.0.0
- [tinykeys npm](https://www.npmjs.com/package/tinykeys) - v3.0.0, 51K weekly downloads
- [react-resizable-panels npm](https://www.npmjs.com/package/react-resizable-panels) - v4.4.2, 2.7M weekly downloads
- [@use-gesture/react npm](https://www.npmjs.com/package/@use-gesture/react) - v10.3.1, last published 2 years ago (rejected)
- [re-resizable npm](https://www.npmjs.com/package/re-resizable) - v6.11.2 (rejected)
- [react-hotkeys-hook npm](https://www.npmjs.com/package/react-hotkeys-hook) - v5.2.1, 1.6M weekly downloads (rejected)

### Analysis & Comparisons (MEDIUM confidence)
- [All JS Keyboard Libraries Are Broken (Jan 2025)](https://blog.duvallj.pw/posts/2025-01-10-all-javascript-keyboard-shortcut-libraries-are-broken.html)
- [Pointer Events - 12 Days of Web](https://12daysofweb.dev/2022/pointer-events)
- [dnd-kit GitHub](https://github.com/clauderic/dnd-kit)

---

*Stack research for: AI-powered video creation platform*
*Original research: 2026-01-27*
*v1.1 additions: 2026-01-28 (Code execution stack)*
*v2.0 additions: 2026-01-29 (Multi-scene movie editor stack)*
*v3.0 additions: 2026-02-02 (Pro timeline editing stack)*
*Overall confidence: HIGH (core components verified via official documentation)*
