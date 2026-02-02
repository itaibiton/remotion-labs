# Architecture: Pro Timeline Editing (v0.3 -- Milestone 5)

**Domain:** AI-Powered Video Creation Platform -- Pro Timeline Editing
**Researched:** 2026-02-02
**Confidence:** HIGH (builds on validated v2.0 architecture, Remotion APIs verified via official docs)

## Executive Summary

Milestone 5 transforms the movie page from a simple scene-list editor into a professional timeline editor with trim, split, resize, inline editing, and a full-screen layout. The existing architecture -- Convex scenes array on the movie document, `MovieComposition` using `<Series>`, `DynamicCode` execution -- remains intact. All changes are additive.

The core challenge is that RemotionLab clips are **code-based** (JSX using `useCurrentFrame()`), not video files. Trimming a code-based clip means adjusting which frame range is visible, which changes how the code's internal frame counter maps to the composition timeline. This is architecturally different from trimming a video file (which just skips bytes). The solution uses Remotion's `<Sequence>` with negative `from` values to shift the frame counter, combined with `durationInFrames` to limit the visible range.

Five architectural changes are required:

1. **Data model extension** -- Add `trimStart`, `trimEnd` fields to the scene descriptor in `movies.scenes[]`
2. **MovieComposition update** -- Wrap each `DynamicCode` in a `<Sequence from={-trimStart}>` with adjusted `durationInFrames`
3. **Timeline component rewrite** -- Replace fixed 160px blocks with proportional-width, zoom-aware, interactive blocks with trim handles
4. **Full-screen layout** -- Replace scrollable movie page with viewport-filling resizable panel layout
5. **Inline editing panel** -- Side panel with Monaco editor + mini preview for the selected clip

---

## 1. Data Model Changes

### Current Schema (What We Have)

```typescript
// movies.scenes array element
scenes: v.array(v.object({
  clipId: v.id("clips"),
  durationOverride: v.optional(v.number()),
}))
```

### Extended Schema (What We Need)

```typescript
// movies.scenes array element -- extended for pro timeline
scenes: v.array(v.object({
  clipId: v.id("clips"),
  durationOverride: v.optional(v.number()),
  // NEW: Trim points (in frames, relative to clip's internal timeline)
  trimStart: v.optional(v.number()),  // Frames trimmed from beginning (default: 0)
  trimEnd: v.optional(v.number()),    // Frames trimmed from end (default: 0)
}))
```

**Why these fields and not `inPoint`/`outPoint`:**

The `trimStart`/`trimEnd` model stores how many frames are removed from each edge, not absolute positions. This is better because:
- The **effective duration** is simple to compute: `clipDuration - trimStart - trimEnd`
- **Resize by dragging** maps directly: dragging the left handle increases `trimStart`, dragging the right handle increases `trimEnd`
- The existing `durationOverride` field is preserved for fps-normalization (it currently handles fps mismatch). Trim fields are separate concerns.
- A trim of `(0, 0)` means "show the full clip" -- the default state requires no data, which is backwards-compatible.

**Computed effective duration:**

```typescript
function getEffectiveDuration(
  scene: { clipId: string; durationOverride?: number; trimStart?: number; trimEnd?: number },
  clip: { durationInFrames: number; fps: number },
  movieFps: number
): number {
  // Base duration: either fps-normalized override or clip's native duration
  const baseDuration = scene.durationOverride ?? clip.durationInFrames;
  // Apply trim
  const trimStart = scene.trimStart ?? 0;
  const trimEnd = scene.trimEnd ?? 0;
  return Math.max(1, baseDuration - trimStart - trimEnd);
}
```

### Split Operation: Data Model Impact

Splitting a clip at the playhead creates **two new scene entries** from one. The original clip document is unchanged (non-destructive editing). Split is purely a scenes-array operation:

```typescript
// Before split: scenes = [..., { clipId: "abc", trimStart: 0, trimEnd: 0 }, ...]
// User splits at frame 45 (relative to clip start) within a 90-frame clip

// After split: scenes = [
//   ...,
//   { clipId: "abc", trimStart: 0, trimEnd: 45 },   // First half: frames 0-44
//   { clipId: "abc", trimStart: 45, trimEnd: 0 },    // Second half: frames 45-89
//   ...
// ]
```

Key insight: **both halves reference the same clipId**. The clip document is not duplicated. Only the trim points differ. This is the standard NLE (non-linear editing) pattern of non-destructive editing.

**Why not create a new clip document for each half:**
- The clip's code is immutable reference material. Trimming is a movie-level concern, not a clip-level concern.
- Multiple movies can reference the same clip with different trim points.
- Avoids database bloat from duplicated code strings.
- The `DynamicCode` component already receives frame information via Remotion context, so the trim is handled at the composition layer.

### Convex Mutation Changes

The existing `computeTotalDuration` helper and mutations need updates:

```typescript
// Updated computeTotalDuration
async function computeTotalDuration(
  ctx: { db: { get: (id: any) => Promise<any> } },
  scenes: Array<{ clipId: any; durationOverride?: number; trimStart?: number; trimEnd?: number }>
): Promise<number> {
  let total = 0;
  for (const scene of scenes) {
    const clip = await ctx.db.get(scene.clipId);
    const baseDuration = scene.durationOverride ?? clip?.durationInFrames ?? 0;
    const trimStart = scene.trimStart ?? 0;
    const trimEnd = scene.trimEnd ?? 0;
    total += Math.max(1, baseDuration - trimStart - trimEnd);
  }
  return total;
}
```

**New mutations needed:**

| Mutation | Purpose |
|----------|---------|
| `movies.trimScene` | Update `trimStart` and/or `trimEnd` for a scene at index |
| `movies.splitScene` | Split a scene at a given frame into two scenes |
| `movies.updateScene` | Generic scene field update (used by resize, trim) |

**Updated mutations:**

| Mutation | Change |
|----------|--------|
| `movies.reorderScenes` | Must pass through `trimStart`/`trimEnd` in `sceneOrder` |
| `movies.addScene` | No change (new scenes have default trim of 0) |
| `movies.removeScene` | No change |

### Schema Validator Update

```typescript
// Updated scene validator in schema.ts
const sceneValidator = v.object({
  clipId: v.id("clips"),
  durationOverride: v.optional(v.number()),
  trimStart: v.optional(v.number()),
  trimEnd: v.optional(v.number()),
});

movies: defineTable({
  userId: v.string(),
  name: v.string(),
  scenes: v.array(sceneValidator),
  totalDurationInFrames: v.number(),
  fps: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

This is a backwards-compatible change. Existing scenes without `trimStart`/`trimEnd` default to `undefined`, which the code treats as `0`.

---

## 2. MovieComposition: Handling Trimmed Clips

### The Frame-Offset Problem

When a clip uses `useCurrentFrame()` internally, it expects frame 0 to be the clip's beginning. A clip with `trimStart: 30` should see frame 30 as its starting frame, not frame 0. But `<Series.Sequence>` resets the frame counter to 0 for its children.

### Solution: Nested `<Sequence>` with Negative `from`

Remotion's `<Sequence>` with a negative `from` value shifts the internal timeline backwards. Combined with `durationInFrames`, this creates the exact behavior needed for trimming:

```
<Series.Sequence durationInFrames={effectiveDuration}>
  <Sequence from={-trimStart} layout="none">
    <DynamicCode ... />
  </Sequence>
</Series.Sequence>
```

When `trimStart = 30`:
- The inner `<Sequence from={-30}>` shifts the timeline back by 30 frames
- When the outer `<Series.Sequence>` is at frame 0, the inner component sees frame 30
- When the outer is at frame 1, inner sees frame 31
- The outer `durationInFrames` limits how long the clip plays (effectiveDuration)
- The clip never sees frames 0-29 (trimmed from start) or frames beyond `clipDuration - trimEnd` (trimmed from end)

This is the pattern documented at [remotion.dev/docs/sequence](https://www.remotion.dev/docs/sequence) for trimming content:

> "By shifting the time backwards, the animation has already progressed by N frames when the content appears."

### Updated MovieComposition

```typescript
// src/remotion/compositions/MovieComposition.tsx -- updated

import React from "react";
import { Series, Sequence } from "remotion";
import { DynamicCode } from "./DynamicCode";

export interface MovieScene {
  code: string;
  durationInFrames: number;  // Clip's full duration
  fps: number;
  trimStart?: number;        // NEW: frames trimmed from start
  trimEnd?: number;          // NEW: frames trimmed from end
}

export interface MovieCompositionProps {
  scenes: MovieScene[];
}

export const MovieComposition: React.FC<MovieCompositionProps> = ({ scenes }) => {
  return (
    <Series>
      {scenes.map((scene, index) => {
        const trimStart = scene.trimStart ?? 0;
        const trimEnd = scene.trimEnd ?? 0;
        const effectiveDuration = Math.max(1, scene.durationInFrames - trimStart - trimEnd);

        return (
          <Series.Sequence key={index} durationInFrames={effectiveDuration}>
            {trimStart > 0 ? (
              <Sequence from={-trimStart} layout="none">
                <DynamicCode
                  code={scene.code}
                  durationInFrames={scene.durationInFrames}
                  fps={scene.fps}
                />
              </Sequence>
            ) : (
              <DynamicCode
                code={scene.code}
                durationInFrames={scene.durationInFrames}
                fps={scene.fps}
              />
            )}
          </Series.Sequence>
        );
      })}
    </Series>
  );
};
```

Note: We pass the clip's **full** `durationInFrames` to `DynamicCode` (not the effective duration). The clip code may use `useVideoConfig().durationInFrames` internally for its animation calculations. The trim is handled entirely by the `<Sequence>` and `<Series.Sequence>` wrapper -- the clip code is unaware it's being trimmed. This is the correct non-destructive editing behavior.

### Lambda Render: Updated inputProps

The `startMovieRender` action must pass `trimStart`/`trimEnd` through to the composition:

```typescript
// In triggerRender.ts -- startMovieRender
const scenes = movie.sceneClips
  .filter((clip: any) => clip !== null)
  .map((clip: any, i: number) => ({
    code: clip.code as string,
    durationInFrames: clip.durationInFrames as number,
    fps: clip.fps as number,
    trimStart: movie.scenes[i].trimStart ?? 0,      // NEW
    trimEnd: movie.scenes[i].trimEnd ?? 0,           // NEW
  }));

// Total frames must reflect effective durations
const totalFrames = scenes.reduce((sum, s) => {
  return sum + Math.max(1, s.durationInFrames - (s.trimStart ?? 0) - (s.trimEnd ?? 0));
}, 0);
```

---

## 3. Timeline Architecture: From Simple to Pro

### Current Timeline (What We Replace)

The current timeline is a horizontal flex container with fixed 160px scene blocks. Each block is an `@dnd-kit` sortable with a `Thumbnail` preview. There is no zoom, no playhead, no trim handles, no proportional sizing.

### Pro Timeline: Component Hierarchy

```
ProTimeline (top-level container)
  |
  +-- TimelineToolbar
  |     +-- ZoomSlider (controls pixelsPerFrame)
  |     +-- BladeToolToggle (activates split mode)
  |     +-- FitToViewButton
  |
  +-- TimelineRuler
  |     +-- Frame/time markers (tick marks at intervals based on zoom)
  |     +-- Playhead indicator (synced with player)
  |
  +-- TimelineTrack (DndContext + SortableContext)
  |     |
  |     +-- TimelineClip (one per scene) -- sortable, resizable
  |     |     +-- ClipThumbnail (Remotion <Thumbnail>)
  |     |     +-- ClipLabel (name + effective duration)
  |     |     +-- TrimHandleLeft (drag to adjust trimStart)
  |     |     +-- TrimHandleRight (drag to adjust trimEnd)
  |     |     +-- ClipActionButtons (generate next/prev, edit, delete)
  |     |     +-- DragHandle (for @dnd-kit sortable)
  |     |
  |     +-- Playhead line (vertical line at current frame, positioned absolutely)
  |
  +-- TimelineScrollContainer (horizontal scroll wrapper)
```

### Critical Design Decision: @dnd-kit + Trim Handle Coexistence

The existing `@dnd-kit` setup uses `useSortable` which attaches listeners to the entire element. Trim handle dragging must NOT trigger a reorder drag. The solution uses three complementary techniques:

**1. Separate drag handles from trim handles using `setActivatorNodeRef`:**

```typescript
const {
  attributes,
  listeners,
  setNodeRef,
  setActivatorNodeRef,  // KEY: restricts drag activation to specific element
  transform,
  transition,
} = useSortable({ id });

// Only the drag handle triggers reorder:
<div ref={setNodeRef}>
  <div ref={setActivatorNodeRef} {...listeners} {...attributes}>
    {/* Drag handle icon */}
  </div>
  <div className="trim-handle-left" onPointerDown={handleTrimLeft}>
    {/* Left trim handle -- does NOT trigger dnd-kit */}
  </div>
  <div className="trim-handle-right" onPointerDown={handleTrimRight}>
    {/* Right trim handle -- does NOT trigger dnd-kit */}
  </div>
</div>
```

**2. `onPointerDown` stopPropagation on trim handles:**

```typescript
const handleTrimLeft = (e: React.PointerEvent) => {
  e.stopPropagation();  // Prevent bubbling to dnd-kit listeners
  // Start trim-left drag interaction
};
```

**3. Increased activation distance on the PointerSensor:**

The existing sensor already has `activationConstraint: { distance: 8 }`, which means a small drag on a trim handle (which only moves horizontally within the block) is less likely to trigger a reorder. Combined with the activator ref approach, this provides robust separation.

### Proportional Clip Widths + Zoom

The current fixed 160px blocks are replaced with width proportional to effective duration:

```typescript
// Width of a clip block in pixels
const clipWidth = effectiveDurationInFrames * pixelsPerFrame;

// Zoom state
const [pixelsPerFrame, setPixelsPerFrame] = useState(2); // 2px per frame default
// At 30fps: 1 second = 60px at default zoom
// Zoom range: 0.5 (zoomed out) to 10 (zoomed in)
```

### Zoom Controls

```typescript
interface TimelineZoomState {
  pixelsPerFrame: number;       // Core zoom metric
  minPixelsPerFrame: number;    // 0.5 (shows ~66 seconds in 1000px)
  maxPixelsPerFrame: number;    // 10 (shows ~3.3 seconds in 1000px)
}

// "Fit to view" calculates pixelsPerFrame to show all clips:
function fitToView(totalFrames: number, viewportWidth: number): number {
  return Math.max(0.5, Math.min(10, viewportWidth / totalFrames));
}
```

### Playhead Positioning

The playhead is a vertical line absolutely positioned within the timeline track:

```typescript
// Playhead position in pixels
const playheadX = currentFrame * pixelsPerFrame;

// On click in the ruler/track area: seek the player
const handleTimelineClick = (e: React.MouseEvent) => {
  const rect = trackRef.current?.getBoundingClientRect();
  if (!rect) return;
  const x = e.clientX - rect.left + scrollLeft;
  const frame = Math.round(x / pixelsPerFrame);
  playerRef.current?.seekTo(frame);
};
```

### Timeline State Management

Timeline interactions require local state that syncs with Convex. The pattern: optimistic local state for responsiveness, Convex mutations for persistence.

```typescript
interface TimelineState {
  // Zoom/scroll (local only, no persistence needed)
  pixelsPerFrame: number;
  scrollLeft: number;

  // Selection (local only)
  selectedSceneIndex: number | null;

  // Interaction mode (local only)
  activeTool: 'select' | 'blade';
  isDraggingTrim: false | 'left' | 'right';
  trimDragStartFrame: number | null;

  // Optimistic scenes (mirrors Convex, updated optimistically during interactions)
  localScenes: Scene[];
}
```

**Trim interaction flow:**

```
User mousedown on left trim handle
  |
  v
Set isDraggingTrim = 'left', capture initial trimStart
  |
  v
User mousemove (document-level listener)
  |
  v
Calculate deltaFrames = (deltaX / pixelsPerFrame)
Update localScenes[i].trimStart optimistically (clamped to valid range)
Visual feedback updates immediately (clip block width changes, thumbnail shifts)
  |
  v
User mouseup
  |
  v
Call movies.trimScene mutation with final trimStart value
Reset isDraggingTrim = false
```

**Split interaction flow:**

```
User clicks 'blade' tool toggle
  |
  v
Set activeTool = 'blade', cursor changes to crosshair
  |
  v
User clicks on a timeline clip
  |
  v
Calculate split frame: (clickX - clipStartX) / pixelsPerFrame + scene.trimStart
  |
  v
Call movies.splitScene mutation:
  - Original scene: trimEnd = clipDuration - splitFrame
  - New scene: trimStart = splitFrame
  Both reference the same clipId
  |
  v
Reset activeTool = 'select'
```

---

## 4. Full-Screen Layout Architecture

### Current Layout (What We Replace)

```
[Header: movie name + buttons]           <-- fixed
[Preview Player]                          <-- in scrollable content
[Timeline: fixed 160px blocks]            <-- in scrollable content
```

The current layout scrolls vertically. The preview player and timeline are stacked and can scroll out of view.

### Pro Layout: Viewport-Filling Resizable Panels

```
+--------------------------------------------------+
| Header: movie name, render/export buttons         |
+--------------------------------------------------+
|                                                    |
|          Preview Player (resizable)                |
|                                                    |
+==================================================+  <-- ResizableHandle (horizontal)
| Toolbar: zoom, blade, fit-to-view                  |
+----------------------------------------------------+
|                                                    |
|       Timeline Track (horizontal scroll)           |
|       [clip1][clip2][clip3][clip4]                  |
|       ^ playhead                                   |
|                                                    |
+--------------------------------------------------+
```

When a clip is selected for editing, a side panel opens:

```
+--------------------------------------------------+
| Header: movie name, render/export buttons         |
+--------------------------------------------------+
|                        ||                          |
|   Preview Player       ||   Editing Panel          |
|   (resized smaller)    ||   +-- Mini Preview       |
|                        ||   +-- Monaco Editor      |
|                        ||   +-- Action Buttons     |
+========================||==========================+
| Toolbar                ||                          |
+------------------------||                          |
|                        ||   (panel continues       |
|   Timeline Track       ||    vertically)           |
|                        ||                          |
+--------------------------------------------------+
```

### Implementation: react-resizable-panels via shadcn/ui

The project already uses shadcn/ui components. The `ResizablePanelGroup` / `ResizablePanel` / `ResizableHandle` components wrap `react-resizable-panels` with Tailwind styling.

**Recommended new dependency:** `react-resizable-panels` (2.7M weekly downloads, shadcn/ui native support).

```
npx shadcn@latest add resizable
```

This installs the `react-resizable-panels` package and creates `src/components/ui/resizable.tsx`.

### Layout Component Structure

```typescript
// src/components/movie/movie-editor.tsx -- rewritten

import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

export function MovieEditor({ movieId }: { movieId: string }) {
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number | null>(null);

  return (
    <div className="h-full flex flex-col">
      {/* Fixed header */}
      <MovieHeader movie={movie} />

      {/* Main content: resizable panels */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left side: preview + timeline */}
        <ResizablePanel defaultSize={selectedSceneIndex !== null ? 65 : 100}>
          <ResizablePanelGroup direction="vertical">
            {/* Preview player */}
            <ResizablePanel defaultSize={60} minSize={30}>
              <MoviePreviewPlayer ... />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Timeline */}
            <ResizablePanel defaultSize={40} minSize={20}>
              <ProTimeline ... />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        {/* Right side: editing panel (conditionally shown) */}
        {selectedSceneIndex !== null && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
              <InlineEditPanel
                clip={selectedClip}
                onClose={() => setSelectedSceneIndex(null)}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
```

**Why nested `ResizablePanelGroup`:**

The outer group handles horizontal split (main area | editing panel). The inner group handles vertical split (preview | timeline). This allows:
- User can resize preview vs timeline independently
- User can resize editing panel width independently
- When editing panel closes, preview + timeline fill the full width
- Layout persists via `autoSaveId` on `ResizablePanelGroup` (uses localStorage)

### Layout Persistence

```typescript
<ResizablePanelGroup
  direction="horizontal"
  autoSaveId="movie-editor-horizontal"  // Remembers panel sizes
>
```

---

## 5. Inline Editing Panel

### What It Contains

The inline editing panel shows when a user double-clicks or clicks "edit" on a timeline clip. It provides:

1. **Mini preview player** -- Single-clip preview (the selected clip only, respecting trim)
2. **Monaco editor** -- The clip's `rawCode` with the existing `CodeDisplay` component
3. **Clip info** -- Name, duration, trim range
4. **Action buttons** -- Save changes, generate next, generate prev, re-generate, close

### Connection to Existing Components

The existing `CodeDisplay` component (at `src/components/code-editor/code-display.tsx`) already handles:
- Monaco editor with read-only/edit toggle
- Validation error markers
- Reset to original code
- Copy to clipboard

The existing `PreviewPlayer` component handles single-clip preview. Both can be reused directly within the editing panel.

### Editing Panel Architecture

```typescript
// src/components/movie/inline-edit-panel.tsx

interface InlineEditPanelProps {
  clip: Clip;
  scene: { trimStart?: number; trimEnd?: number };
  movieId: string;
  sceneIndex: number;
  onClose: () => void;
}

export function InlineEditPanel({ clip, scene, movieId, sceneIndex, onClose }: InlineEditPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState<string | null>(null);

  const editorCode = editedCode ?? clip.rawCode;
  const validation = useDebouncedValidation(editorCode, 500, !isEditing);
  const previewCode = validation.transformedCode ?? clip.code;

  return (
    <div className="h-full flex flex-col">
      {/* Panel header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="font-medium truncate">{clip.name}</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Mini preview -- shows the clip with its trim applied */}
      <div className="p-4 border-b">
        <PreviewPlayer
          code={previewCode}
          durationInFrames={clip.durationInFrames}
          fps={clip.fps}
        />
      </div>

      {/* Code editor -- reuse existing CodeDisplay */}
      <div className="flex-1 min-h-0">
        <CodeDisplay
          code={editorCode}
          originalCode={clip.rawCode}
          isEditing={isEditing}
          onEditToggle={() => setIsEditing(!isEditing)}
          onChange={setEditedCode}
          errors={validation.errors}
          isValid={validation.isValid}
        />
      </div>

      {/* Action buttons */}
      <div className="p-4 border-t flex gap-2">
        <Button size="sm" disabled={!isEditing || !validation.isValid} onClick={handleSave}>
          Save Changes
        </Button>
        <Button size="sm" variant="outline" onClick={handleGenerateNext}>
          Generate Next
        </Button>
      </div>
    </div>
  );
}
```

### Saving Edited Code

When the user edits a clip's code within the editing panel, saving should:

1. Update the `clips` document with new `code` and `rawCode`
2. The Convex reactive query automatically propagates the change to the timeline and preview player
3. No need to update the `movies.scenes[]` array (it only stores `clipId` and trim metadata)

**Important consideration:** If the same clip is used in multiple movies (or multiple scenes within the same movie), editing the clip affects ALL usages. This is by design -- clips are shared references. If the user wants independent edits per scene, they should first duplicate the clip (a future "Duplicate Clip" action).

New mutation needed:

```typescript
// convex/clips.ts -- new mutation
export const update = mutation({
  args: {
    id: v.id("clips"),
    code: v.optional(v.string()),
    rawCode: v.optional(v.string()),
    name: v.optional(v.string()),
    durationInFrames: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Auth check, ownership check
    // Patch the clip document
    // If durationInFrames changed, all movies referencing this clip
    // may need totalDurationInFrames recalculated -- but this is
    // handled by the reactive query re-evaluation, not eagerly.
  },
});
```

---

## 6. Player-Timeline Synchronization

### Current State

The existing `useCurrentPlayerFrame` hook efficiently tracks the frame via `useSyncExternalStore` + the player's `frameupdate` event. The `MoviePreviewPlayer` computes `sceneTimings` (cumulative offsets) and determines `activeSceneIndex`.

### Enhanced Synchronization for Pro Timeline

The pro timeline needs bidirectional sync:
- **Player -> Timeline:** Playhead position updates as the player plays
- **Timeline -> Player:** Clicking in the timeline seeks the player

```typescript
// Shared state between MoviePreviewPlayer and ProTimeline
interface TimelineSync {
  currentFrame: number;                   // From player
  totalDurationInFrames: number;          // Computed from scenes
  sceneTimings: Array<{                   // Cumulative frame offsets
    startFrame: number;
    endFrame: number;
    effectiveDuration: number;
  }>;
  seekTo: (frame: number) => void;        // Seek the player
  activeSceneIndex: number;               // Which scene is playing
}
```

This state is lifted to `MovieEditor` and passed down to both `MoviePreviewPlayer` and `ProTimeline`:

```typescript
// In MovieEditor
const playerRef = useRef<PlayerRef>(null);
const currentFrame = useCurrentPlayerFrame(playerRef);

const sceneTimings = useMemo(() => {
  let offset = 0;
  return validScenes.map((scene) => {
    const effectiveDuration = getEffectiveDuration(scene, ...);
    const startFrame = offset;
    const endFrame = offset + effectiveDuration;
    offset = endFrame;
    return { startFrame, endFrame, effectiveDuration };
  });
}, [validScenes]);

const seekTo = useCallback((frame: number) => {
  playerRef.current?.seekTo(frame);
}, []);
```

### Per-Clip Thumbnail in Timeline

The `Thumbnail` component from `@remotion/player` renders a specific frame of a composition. For trimmed clips, the thumbnail should show a frame within the trimmed range:

```typescript
// Thumbnail frame for a trimmed clip
const thumbnailFrame = (scene.trimStart ?? 0) + Math.floor(effectiveDuration / 2);
```

---

## 7. Integration Points with Existing Components

### Components Modified (Not Replaced)

| Component | File | Modification |
|-----------|------|-------------|
| `MovieComposition` | `src/remotion/compositions/MovieComposition.tsx` | Add `<Sequence from={-trimStart}>` wrapper for trimmed clips |
| `MoviePreviewPlayer` | `src/components/movie/movie-preview-player.tsx` | Accept `ref` forwarding, expose `seekTo`, pass trimmed scenes |
| `MovieEditor` | `src/components/movie/movie-editor.tsx` | Complete rewrite: resizable panels, pro timeline, inline editing |
| `computeTotalDuration` | `convex/movies.ts` | Account for `trimStart`/`trimEnd` in duration calculation |
| `reorderScenes` | `convex/movies.ts` | Pass through trim fields in `sceneOrder` validator |
| `startMovieRender` | `convex/triggerRender.ts` | Pass `trimStart`/`trimEnd` in scenes inputProps |
| Schema | `convex/schema.ts` | Add optional `trimStart`/`trimEnd` to scene object validator |

### Components Replaced

| Old Component | New Component | Reason |
|---------------|---------------|--------|
| `Timeline` | `ProTimeline` | Proportional widths, zoom, playhead, trim handles |
| `TimelineScene` | `TimelineClip` | Resizable, trim handles, action buttons, proportional width |

### New Components

| Component | File | Purpose |
|-----------|------|---------|
| `ProTimeline` | `src/components/movie/pro-timeline.tsx` | Full pro timeline with zoom, playhead, interactions |
| `TimelineClip` | `src/components/movie/timeline-clip.tsx` | Interactive clip block with trim handles |
| `TimelineRuler` | `src/components/movie/timeline-ruler.tsx` | Time/frame markers above timeline |
| `TimelineToolbar` | `src/components/movie/timeline-toolbar.tsx` | Zoom, blade tool, fit-to-view controls |
| `TimelinePlayhead` | `src/components/movie/timeline-playhead.tsx` | Vertical playhead line |
| `InlineEditPanel` | `src/components/movie/inline-edit-panel.tsx` | Side panel for clip editing |
| `MovieHeader` | `src/components/movie/movie-header.tsx` | Compact header for pro layout |
| `resizable.tsx` | `src/components/ui/resizable.tsx` | shadcn/ui resizable component (from `npx shadcn add`) |

### New Convex Functions

| Function | Type | Purpose |
|----------|------|---------|
| `movies.trimScene` | mutation | Update trim points for a scene |
| `movies.splitScene` | mutation | Split a scene into two at a given frame |
| `clips.update` | mutation | Update clip code/name after inline editing |

### New Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react-resizable-panels` | ^2.x | Resizable panel layout (via shadcn/ui `resizable` component) |

No other new dependencies needed. The existing `@dnd-kit`, `@monaco-editor/react`, and `@remotion/player` packages handle all other functionality.

---

## 8. Suggested Build Order

Based on dependency analysis, the recommended phase ordering for Milestone 5:

### Phase A: Data Model + Composition Layer

**Why first:** Everything else depends on the data model supporting trim points and the composition layer rendering them correctly.

1. Add `trimStart`/`trimEnd` to schema validator (backwards-compatible)
2. Update `computeTotalDuration` to account for trim
3. Add `movies.trimScene` mutation
4. Add `movies.splitScene` mutation
5. Update `MovieComposition` to use `<Sequence from={-trimStart}>`
6. Update `startMovieRender` to pass trim data
7. Update `reorderScenes` validator to include trim fields
8. Verify: trimmed clips render correctly in Player and Lambda

**Risk:** LOW -- Remotion's `<Sequence from={negative}>` behavior is well-documented and verified.

### Phase B: Full-Screen Layout

**Why second:** The layout provides the container for all subsequent UI work. Building the timeline or editing panel first would require rework when the layout changes.

1. Install `react-resizable-panels` via `npx shadcn@latest add resizable`
2. Rewrite `MovieEditor` with `ResizablePanelGroup` (vertical split: preview | timeline)
3. Extract `MovieHeader` as compact header component
4. Remove scrollable layout, replace with viewport-filling panels
5. Ensure `MoviePreviewPlayer` works within the resizable panel
6. Verify: movie page fills viewport, panels resize correctly

**Risk:** LOW -- react-resizable-panels is mature (2.7M weekly downloads), shadcn/ui integration is documented.

### Phase C: Pro Timeline

**Why third:** Depends on the layout container (Phase B) and data model (Phase A). This is the largest and most complex phase.

1. Build `TimelineRuler` with time markers based on zoom level
2. Build `TimelineClip` with proportional width, thumbnail, label
3. Build `ProTimeline` with horizontal scroll, `DndContext` + `SortableContext`
4. Add zoom state and `TimelineToolbar` with zoom slider
5. Add `TimelinePlayhead` synced with player
6. Add trim handles to `TimelineClip` with pointer event handling
7. Wire trim handle drag to `movies.trimScene` mutation
8. Add blade tool with `movies.splitScene` mutation
9. Add per-clip action buttons (generate next, edit, delete)
10. Verify: drag reorder coexists with trim handles, zoom works, playhead syncs

**Risk:** MEDIUM -- The trim handle + dnd-kit coexistence is the trickiest integration point. Using `setActivatorNodeRef` and `stopPropagation` should work, but may need iteration.

### Phase D: Inline Editing Panel

**Why last:** Depends on the layout (horizontal panel split from Phase B), selection from timeline (Phase C), and existing editor components.

1. Build `InlineEditPanel` component with mini preview + `CodeDisplay`
2. Wire "edit" button on `TimelineClip` to open the panel
3. Add horizontal `ResizableHandle` between main area and editing panel
4. Wire save button to `clips.update` mutation
5. Add "Generate Next" and "Generate Prev" buttons in panel
6. Verify: edit, save, preview cycle works; changes reflect in timeline and player

**Risk:** LOW -- Reuses existing `CodeDisplay` and `PreviewPlayer` components with minimal modification.

---

## 9. Anti-Patterns to Avoid

### 1. Storing trim state in the clip document instead of the scene

**Wrong:** Add `trimStart`/`trimEnd` to the `clips` table.
**Why bad:** The same clip can appear in multiple movies (or multiple times in one movie) with different trim points. Trim is a movie-scene concern, not a clip property.
**Right:** Store trim data on `movies.scenes[]` (the scene descriptor).

### 2. Creating new clip documents on split

**Wrong:** When splitting, duplicate the clip document into two new clips.
**Why bad:** Doubles the stored code, breaks the link to the original clip. If the clip is updated, the split copies are stale.
**Right:** Both halves of a split reference the same `clipId` with different trim points. The clip document is unchanged.

### 3. Modifying the clip's code to implement trim

**Wrong:** Generate a new version of the code that only renders frames `trimStart` to `clipDuration - trimEnd`.
**Why bad:** Destroys the original code. Makes trim non-undoable. Requires AI re-generation for every trim adjustment.
**Right:** Use Remotion's `<Sequence from={-trimStart}>` to shift the frame counter at the composition level. The clip code is untouched.

### 4. Using canvas-based timeline instead of DOM

**Wrong:** Build the timeline as a `<canvas>` element for "performance."
**Why bad:** Loses React component model, accessibility, and Remotion `<Thumbnail>` integration. Canvas would require reimplementing text rendering, thumbnails, drag-and-drop.
**Right:** Use DOM elements with proportional widths. Even at 100+ clips (unlikely), DOM performance is adequate with virtualization. Remotion's `<Thumbnail>` component renders a composition to a small preview, which requires a DOM mount point.

### 5. Trying to make trim handles work without separated drag listeners

**Wrong:** Keep the current `useSortable` setup where the entire element is the drag target, then try to detect trim handles via pointer position.
**Why bad:** Fragile coordinate math, breaks when zoom changes, doesn't account for touch events properly.
**Right:** Use `setActivatorNodeRef` on a dedicated drag handle element. Trim handles are separate pointer event targets that `stopPropagation` to avoid triggering dnd-kit.

### 6. Building zoom before proportional widths

**Wrong:** Add zoom to the fixed-160px timeline blocks.
**Why bad:** Zoom on fixed-width blocks just adds whitespace. The fundamental issue is that blocks must be proportional to duration before zoom has meaning.
**Right:** First make clip widths proportional to effective duration (`width = effectiveDuration * pixelsPerFrame`), then zoom changes `pixelsPerFrame`.

---

## 10. Scalability Considerations

| Concern | At 5 scenes | At 20 scenes | At 50+ scenes |
|---------|-------------|--------------|---------------|
| Timeline rendering | No issues | No issues | Consider virtualization (only render visible clips) |
| Thumbnail loading | Immediate | May show loading placeholders | Lazy-load thumbnails outside viewport |
| Convex reactive queries | Single document read | Single document + 20 clip reads | May benefit from batched clip fetch |
| Layout | Fits in viewport | Horizontal scroll needed | Must have zoom-to-fit |
| inputProps size for Lambda | ~5KB | ~50KB | ~125KB (still within limits) |

The expected usage pattern is 5-20 scenes per movie. The architecture handles this comfortably without optimization. At 50+ scenes, virtualization and lazy loading would be needed, but this is out of scope for v0.3.

---

## Sources

### Remotion (HIGH confidence -- official documentation)

- [Sequence component: negative `from` for trimming](https://www.remotion.dev/docs/sequence) -- Verified: negative `from` shifts frame counter backwards, enabling trim behavior
- [Series component: sequential playback](https://www.remotion.dev/docs/series) -- Verified: `durationInFrames` on `Series.Sequence` controls visible range
- [Freeze component](https://www.remotion.dev/docs/freeze) -- Verified: freezes children at specific frame
- [Player API: seek(), seeked event, frameupdate](https://www.remotion.dev/docs/player/player) -- Verified: `seek()` method for programmatic frame control
- [Custom controls: SeekBar, inFrame/outFrame](https://www.remotion.dev/docs/player/custom-controls) -- Verified: custom seek bar supports frame range
- [Building a timeline-based video editor](https://www.remotion.dev/docs/building-a-timeline) -- Verified: Remotion recommends passing tracks as inputProps, building custom timeline UI

### react-resizable-panels (HIGH confidence -- official repo + shadcn/ui)

- [GitHub: bvaughn/react-resizable-panels](https://github.com/bvaughn/react-resizable-panels) -- 2.7M weekly downloads, mature API
- [shadcn/ui Resizable component](https://ui.shadcn.com/docs/components/resizable) -- Wraps react-resizable-panels with Tailwind styling
- Layout persistence via `autoSaveId` prop confirmed in documentation

### @dnd-kit (HIGH confidence -- official documentation)

- [useSortable: setActivatorNodeRef](https://docs.dndkit.com/presets/sortable/usesortable) -- Verified: restricts drag activation to specific element
- [Pointer sensor: activationConstraint](https://docs.dndkit.com/api-documentation/sensors/pointer) -- Verified: `distance` constraint prevents accidental drag on trim handles

### Video Editing Architecture (MEDIUM confidence -- industry patterns)

- Non-destructive editing model: clips store references with in/out points, original media unchanged
- Split operation creates two references to the same source with different trim points
- Standard NLE data model: source media + timeline references with trim metadata

---
*Architecture research for: RemotionLab v0.3 -- Pro Timeline Editing (Milestone 5)*
*Researched: 2026-02-02*
*Previous version: 2026-01-29 (v2.0 architecture)*
