# Architecture: Multi-Scene Movie Editor (v2.0)

**Domain:** AI-Powered Video Creation Platform -- Multi-Scene Movie Editor
**Researched:** 2026-01-29
**Confidence:** HIGH (builds on validated v1.1 patterns, Remotion APIs well-documented)

## Executive Summary

v2.0 extends RemotionLab from single-clip creation to a multi-scene movie editor. The existing architecture -- Convex for state, Remotion Player for preview, Lambda for rendering, Claude for code generation -- remains intact. The new features layer on top without replacing anything.

The core architectural additions are:

1. **Two new Convex tables** (`clips`, `movies`) with relationship patterns connecting to existing `generations` and `renders` tables
2. **A `MovieComposition` wrapper** that uses Remotion's `<Series>` to sequence multiple `DynamicCode` instances into one playable/renderable video
3. **An end-state serialization system** that uses AST analysis to extract the visual state of a clip at its last frame, enabling continuation generation
4. **An app shell layout** using Next.js nested layouts for persistent sidebar navigation
5. **A timeline component** for visual scene management

The critical design decision is **how clips relate to movies**: movies store an ordered list of clip references with per-scene duration overrides, and the `MovieComposition` calculates total duration dynamically via `calculateMetadata()`.

---

## Current Architecture (v1.1)

```
User Prompt
    |
    v
[Claude API] -- generates --> Remotion JSX Code (rawCode)
    |
    v
[AST Validation] -- acorn + acorn-jsx --> Validated JSX
    |
    v
[Sucrase Transform] -- JSX to JS --> Transformed code
    |
    v
[Convex Storage] -- stores --> { rawCode, code, durationInFrames, fps }
    |                             (generations table)
    v
[DynamicCode Composition] -- executes --> Function constructor with scope injection
    |
    +-- [Remotion Player] -- browser preview
    +-- [Remotion Lambda] -- server render (code passed as inputProps)
```

**Key components in play:**
- `convex/schema.ts`: `generations` table (userId, prompt, rawCode, code, durationInFrames, fps, status)
- `convex/renders.ts`: `renders` table (userId, generationId, renderId, bucketName, status, progress)
- `src/remotion/compositions/DynamicCode.tsx`: Meta-composition that accepts code as `inputProps`
- `src/lib/code-executor.ts`: Function constructor with controlled scope injection
- `src/lib/code-validator.ts`: AST-based security validation
- `src/components/preview/preview-player.tsx`: Remotion Player wrapper
- `convex/triggerRender.ts`: Lambda render trigger with progress polling
- `convex/generateAnimation.ts`: Claude API action with validation pipeline

---

## v2.0 Architecture Overview

```
                    +------------------+
                    |   App Shell      |
                    |  (sidebar nav)   |
                    +--------+---------+
                             |
          +------------------+------------------+
          |                  |                  |
    /create             /library            /movie/[id]
   (clip creation)    (saved clips)      (movie editor)
          |                  |                  |
          v                  v                  v
    [Generate Clip]   [Browse Clips]    [Timeline UI]
    [Preview Clip]    [Open/Delete]     [Reorder Scenes]
    [Save as Clip]    [Add to Movie]    [Preview Movie]
          |                                     |
          v                                     v
    +----------+                    +-------------------+
    | clips    |  <--- refs --->    | movies            |
    | table    |                    | table             |
    +----------+                    +-------------------+
         |                                |
         v                                v
    [DynamicCode]                  [MovieComposition]
    (single clip)                  (Series of DynamicCode)
         |                                |
         +------------ Lambda -----------+
```

---

## 1. Convex Schema Design

### New Tables

#### `clips` table

Clips are saved compositions. A clip is created from a generation but decoupled from it -- the clip stores its own copy of the code so that editing a clip does not alter generation history.

```typescript
// convex/schema.ts -- additions

clips: defineTable({
  userId: v.string(),
  // Reference to the generation that created this clip (nullable for future direct-create)
  generationId: v.optional(v.id("generations")),
  // Display name (user-editable)
  name: v.string(),
  // The composition code
  code: v.string(),          // Transformed JS (for execution)
  rawCode: v.string(),       // Original JSX (for editor display)
  // Timing
  durationInFrames: v.number(),
  fps: v.number(),
  // Optional metadata
  thumbnailUrl: v.optional(v.string()),
  // Serialized end-state for continuation generation (JSON string)
  // Contains final positions, styles, text content at last frame
  endState: v.optional(v.string()),
  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_updated", ["userId", "updatedAt"])
  .index("by_generation", ["generationId"]),
```

**Design rationale:**
- `code` + `rawCode` are copied from the generation, not referenced. This allows clip editing without mutation side-effects.
- `endState` is a JSON string containing serialized last-frame state. Stored as string (not nested object) because its schema is flexible and evolves independently.
- `generationId` is optional to support future "create clip without AI" workflows.
- `thumbnailUrl` is optional; can be populated later via a screenshot action.

#### `movies` table

Movies are ordered collections of clips. The key design decision is **how to represent scene ordering**.

**Chosen approach: Array of scene descriptors on the movie document.**

Rationale for array-of-IDs over separate table:
- Movies will have 2-20 scenes (well within Convex's recommended 10-element guideline, and far below the 8192 limit).
- Reordering requires updating a single document (the movie), not multiple scene documents.
- Scene order is inherently tied to the movie; there is no independent scene entity.
- Single-user editing (no collaborative conflicts).
- Reading a movie's scenes is a single document fetch + N clip lookups, which is optimal for Convex's reactive queries.

```typescript
movies: defineTable({
  userId: v.string(),
  name: v.string(),
  // Ordered array of scene descriptors
  scenes: v.array(v.object({
    clipId: v.id("clips"),
    // Per-scene overrides (optional)
    durationOverride: v.optional(v.number()),  // Override clip's default duration
  })),
  // Computed/cached totals
  totalDurationInFrames: v.number(),
  fps: v.number(),  // All clips must share fps (enforced at add-time)
  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_updated", ["userId", "updatedAt"]),
```

**Design rationale:**
- `scenes` is an array of objects (not just IDs) to allow per-scene metadata like `durationOverride`.
- `totalDurationInFrames` is cached/computed on every mutation that modifies `scenes`. This avoids recomputing on every read.
- `fps` is enforced to be uniform across all clips in a movie. Mixed fps would require frame-rate conversion, which is out of scope.
- No separate `movieScenes` join table -- the array approach is simpler and appropriate for the expected scale (2-20 scenes).

### Relationship Diagram

```
users (existing)
  |
  +-- 1:many --> generations (existing)
  |                |
  |                +-- 1:1 (optional) --> clips (NEW)
  |                |
  |                +-- 1:many --> renders (existing)
  |
  +-- 1:many --> clips (NEW)
  |                |
  |                +-- referenced by --> movies.scenes[].clipId
  |
  +-- 1:many --> movies (NEW)
                   |
                   +-- scenes[] contains clipId refs --> clips
                   |
                   +-- 1:many --> renders (existing, extended)
```

### `renders` table extension

The existing `renders` table references `generationId`. For movie renders, we need to also support `movieId`:

```typescript
// Extend existing renders table
renders: defineTable({
  userId: v.string(),
  // One of these will be set (not both)
  generationId: v.optional(v.id("generations")),  // Changed from required to optional
  movieId: v.optional(v.id("movies")),             // NEW
  renderId: v.string(),
  bucketName: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("rendering"),
    v.literal("complete"),
    v.literal("failed")
  ),
  progress: v.number(),
  outputUrl: v.optional(v.string()),
  outputSize: v.optional(v.number()),
  error: v.optional(v.string()),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_user", ["userId"])
  .index("by_generation", ["generationId"])
  .index("by_movie", ["movieId"])           // NEW
  .index("by_status", ["status"]),
```

**Migration note:** Making `generationId` optional is a schema change. Existing render documents all have `generationId` set. The change is backwards-compatible (existing code still works) but requires a Convex schema push.

---

## 2. Remotion Composition Hierarchy for Movies

### Architecture: `MovieComposition` wrapping N `DynamicCode` instances

The existing `DynamicCode` composition executes a single clip's code. For movies, we need a new `MovieComposition` that sequences multiple clips using Remotion's `<Series>` component.

```
MovieComposition (receives scenes array as inputProps)
  |
  +-- <Series>
        |
        +-- <Series.Sequence durationInFrames={scene1.duration}>
        |     +-- <DynamicCode code={scene1.code} ... />
        |
        +-- <Series.Sequence durationInFrames={scene2.duration}>
        |     +-- <DynamicCode code={scene2.code} ... />
        |
        +-- <Series.Sequence durationInFrames={scene3.duration}>
              +-- <DynamicCode code={scene3.code} ... />
```

### MovieComposition Implementation

```typescript
// src/remotion/compositions/MovieComposition.tsx
"use client";

import React from "react";
import { Series } from "remotion";
import { DynamicCode } from "./DynamicCode";

export interface MovieScene {
  code: string;           // Transformed JS code
  durationInFrames: number;
  fps: number;
}

export interface MovieCompositionProps {
  scenes: MovieScene[];
  // Total duration is computed externally via calculateMetadata
  durationInFrames: number;
  fps: number;
}

export const MovieComposition: React.FC<MovieCompositionProps> = ({
  scenes,
}) => {
  return (
    <Series>
      {scenes.map((scene, index) => (
        <Series.Sequence
          key={index}
          durationInFrames={scene.durationInFrames}
        >
          <DynamicCode
            code={scene.code}
            durationInFrames={scene.durationInFrames}
            fps={scene.fps}
          />
        </Series.Sequence>
      ))}
    </Series>
  );
};
```

### calculateMetadata for Dynamic Duration

The `<Composition>` registration uses `calculateMetadata` to compute total duration from the scenes array:

```typescript
// In Root.tsx or wherever compositions are registered
import { Composition, CalculateMetadataFunction } from "remotion";
import { MovieComposition, MovieCompositionProps } from "./MovieComposition";

const calculateMovieMetadata: CalculateMetadataFunction<
  MovieCompositionProps
> = ({ props }) => {
  const totalDuration = props.scenes.reduce(
    (sum, scene) => sum + scene.durationInFrames,
    0
  );
  return {
    durationInFrames: totalDuration,
    fps: props.fps,
    width: 1920,
    height: 1080,
  };
};

// Registration:
<Composition
  id="MovieComposition"
  component={MovieComposition}
  durationInFrames={1}  // Overridden by calculateMetadata
  fps={30}
  width={1920}
  height={1080}
  defaultProps={{
    scenes: [],
    durationInFrames: 1,
    fps: 30,
  }}
  calculateMetadata={calculateMovieMetadata}
/>
```

### Why `<Series>` and Not Nested `<Sequence>`

- `<Series>` automatically calculates `from` offsets for each child, eliminating manual frame math.
- `<Series.Sequence>` supports `durationInFrames` per child, which maps directly to our scene model.
- `<Series>` is the idiomatic Remotion pattern for "scenes playing one after another."
- Future upgrade path: `<TransitionSeries>` can replace `<Series>` to add fade/wipe transitions between scenes.

### DynamicCode Reuse

The existing `DynamicCode` composition is reused without modification. Each `<Series.Sequence>` wraps a `DynamicCode` instance. Inside each `DynamicCode`, `useCurrentFrame()` returns frame-relative-to-sequence (not global frame), which is exactly what the generated code expects. This is a Remotion built-in behavior -- `<Sequence>` (and `<Series.Sequence>` which wraps it) automatically adjusts the frame counter for children.

---

## 3. Lambda Rendering for Movies

### Approach: Same meta-composition pattern, extended to movies

The existing Lambda rendering pattern passes `code` as `inputProps` to the `DynamicCode` composition. For movies, we pass the entire `scenes` array as `inputProps` to `MovieComposition`.

```typescript
// convex/triggerRender.ts -- movie render extension

// For single clip renders (existing):
const { renderId, bucketName } = await renderMediaOnLambda({
  composition: "DynamicCode",
  inputProps: {
    code: clip.code,
    durationInFrames: clip.durationInFrames,
    fps: clip.fps,
  },
  // ... other config
});

// For movie renders (NEW):
const { renderId, bucketName } = await renderMediaOnLambda({
  composition: "MovieComposition",
  inputProps: {
    scenes: movieScenes.map(scene => ({
      code: scene.code,
      durationInFrames: scene.durationInFrames,
      fps: scene.fps,
    })),
    durationInFrames: totalDuration,  // Sum of all scene durations
    fps: 30,
  },
  // ... other config
});
```

### Lambda Bundle Deployment

The Lambda bundle (deployed via `deploySite()`) must include both compositions:
- `DynamicCode` (existing, for single clip renders)
- `MovieComposition` (new, for movie renders)

This requires a one-time redeploy of the Lambda site bundle after adding `MovieComposition`. Both compositions share the same `code-executor.ts` and scope injection infrastructure.

### inputProps Size Considerations

Lambda passes `inputProps` as JSON. For a movie with 10 scenes, each scene contains:
- `code`: ~2-5 KB of transformed JavaScript
- `durationInFrames`: number
- `fps`: number

Total inputProps for 10 scenes: ~20-50 KB. This is well within Remotion Lambda's limits (inputProps are serialized to the render request, which has a practical limit of several MB).

### Duration Limits for Movies

The existing `RENDER_LIMITS.MAX_DURATION_FRAMES` (currently 900 frames / 30 seconds) needs adjustment for movies. Recommended approach:

```typescript
// convex/lib/renderLimits.ts -- extend
export const RENDER_LIMITS = {
  // Single clip limits (existing)
  MAX_CLIP_DURATION_FRAMES: 600,    // 20 seconds per clip
  MAX_CLIP_DURATION_SECONDS: 20,

  // Movie limits (new)
  MAX_MOVIE_SCENES: 20,
  MAX_MOVIE_DURATION_FRAMES: 5400,  // 3 minutes total
  MAX_MOVIE_DURATION_SECONDS: 180,

  // Shared
  LAMBDA_TIMEOUT_MS: 240_000,       // 4 minutes (increased from default)
  POLL_INTERVAL_MS: 3000,
};
```

---

## 4. End-State Serialization for Continuation Generation

### The Problem

When a user clicks "Generate next scene," Claude needs to know what the current scene looks like at its last frame so the next scene starts from that visual state. The challenge: the current scene is dynamic JSX code executed at runtime. We need to extract the visual end-state from the code statically.

### Approach: Hybrid AST Analysis + Runtime Snapshot

There are two complementary strategies. The recommended approach is **runtime evaluation at the last frame** because it handles all code patterns (including computed styles), with AST analysis as a fallback/supplement.

#### Strategy A: Runtime Evaluation at Last Frame (Primary)

Execute the clip's code at its last frame and extract the rendered element tree.

```typescript
// src/lib/end-state-extractor.ts

import { executeCode } from "./code-executor";
import React from "react";
import ReactDOMServer from "react-dom/server";

interface EndState {
  elements: EndStateElement[];
  backgroundColor?: string;
}

interface EndStateElement {
  type: string;           // "div", "h1", "span", "svg", etc.
  text?: string;          // Text content
  style: Record<string, string | number>;  // Computed inline styles
  children?: EndStateElement[];
}

/**
 * Extract the visual state of a clip at its last frame.
 *
 * Approach: Execute the code with frame = durationInFrames - 1,
 * render to a static React element tree, and extract styles/text.
 */
export function extractEndState(
  code: string,
  durationInFrames: number,
  fps: number
): EndState | null {
  // Execute the code to get the component
  const result = executeCode(code);
  if (!result.success) return null;

  const Component = result.Component;

  // Create a mock Remotion context where frame = last frame
  // This requires wrapping the component in a mock provider
  // that makes useCurrentFrame() return durationInFrames - 1
  // and useVideoConfig() return the correct config.

  // Render to static markup and parse the element tree
  // (Implementation details below)

  return parseRenderedTree(Component, durationInFrames, fps);
}
```

**How to mock Remotion hooks for last-frame evaluation:**

The `useCurrentFrame()` and `useVideoConfig()` hooks read from React context provided by `<Composition>` or `<Player>`. For extraction purposes, we can:

1. **Use Remotion's `<Freeze>` component** at the last frame: Wrap the component in `<Freeze frame={durationInFrames - 1}>` inside a Remotion context, which locks the frame counter.
2. **Render with a minimal Player context** that provides the last frame value.
3. **Alternatively, render in a headless Remotion environment** using `renderMedia()` locally for a single frame (heavyweight but accurate).

The simplest approach for v2.0: render the component at the last frame using a test/headless Remotion context and extract the resulting React element tree.

#### Strategy B: AST-Based Style Extraction (Supplementary)

Parse the JSX code and extract interpolate/spring call patterns to compute final values.

```typescript
// src/lib/end-state-ast.ts

/**
 * Analyze JSX code to extract the visual state at the last frame.
 *
 * Pattern recognition:
 * 1. Find all interpolate() calls:
 *    interpolate(frame, [0, 30], [0, 1]) -> final value = 1
 *    interpolate(frame, [0, 60], [100, 500]) -> final value = 500
 *
 * 2. Find all spring() calls:
 *    spring({ frame, fps }) -> final value = 1 (spring always settles at 1)
 *    spring value used in interpolate: interpolate(springVal, [0, 1], [0, 200]) -> 200
 *
 * 3. Extract literal style values:
 *    style={{ fontSize: 64, color: "#FFFFFF" }} -> fontSize: 64, color: "#FFFFFF"
 *
 * 4. Extract text content:
 *    <h1>Hello World</h1> -> text: "Hello World"
 */
```

**Key insight about Remotion animations:**
- `spring()` always settles at `1` (with default config). The final interpolated value is therefore the last element of the output range.
- `interpolate(frame, [inputStart, inputEnd], [outputStart, outputEnd], { extrapolateRight: 'clamp' })` clamps at `outputEnd`.
- Without clamp, the value extrapolates linearly, but at `durationInFrames - 1` the value equals approximately `outputEnd` if `inputEnd` matches duration.

**AST analysis limitations:**
- Cannot handle computed styles (e.g., `const size = width * 0.5; style={{ fontSize: size }}`)
- Cannot handle conditional rendering (`if (frame > 30) return <X />;`)
- Cannot handle array.map() generated elements
- Cannot handle state-dependent rendering

**Recommendation:** Use AST analysis as a supplement to enhance the end-state description sent to Claude, but rely on runtime evaluation as the primary extraction method.

#### Strategy C: Claude-Based End-State Description (Pragmatic Alternative)

Instead of extracting end-state programmatically, **send the source code to Claude and ask it to describe the final frame**:

```
System: Analyze this Remotion JSX code. Describe what the visual output looks like
at the very last frame (frame {durationInFrames - 1}). Include:
- All visible elements and their positions
- Colors, fonts, sizes
- Final transform values (opacity, scale, rotation, translation)
- Background color
- Text content

Then generate a new Remotion composition that starts from this exact visual state
and transitions to: {user's next scene prompt}
```

**Pros:**
- Zero infrastructure needed
- Handles all code patterns (Claude understands the code semantically)
- Can be implemented in a single Claude API call

**Cons:**
- Adds latency (extra Claude call or larger prompt)
- Claude may hallucinate or misinterpret complex animations
- Not verifiable programmatically

**Recommendation for v2.0:** Start with Strategy C (send code to Claude for analysis) because it requires no new infrastructure. Supplement with Strategy B (AST analysis for interpolate/spring final values) to provide Claude with computed hints. Defer Strategy A (runtime extraction) to v2.1 if Claude-based analysis proves insufficient.

### End-State Storage and Usage

Regardless of extraction method, the end-state is stored on the clip:

```typescript
// After extraction, store on the clip
await ctx.db.patch(clipId, {
  endState: JSON.stringify({
    description: "White background with centered large blue text 'Hello World' at full opacity, scale 1.2",
    elements: [
      { type: "text", content: "Hello World", style: { fontSize: 80, color: "#3B82F6", opacity: 1, scale: 1.2 } }
    ],
    backgroundColor: "#FFFFFF"
  }),
});

// When generating continuation:
const continuationPrompt = `
Previous scene ends with this state:
${clip.endState}

Generate a Remotion composition that starts from exactly this visual state
and transitions to: ${userPrompt}
`;
```

---

## 5. App Shell Layout

### Pattern: Next.js Nested Layouts with Persistent Sidebar

The current app has no persistent shell -- each page (`/`, `/create`, `/templates`) has its own full-page layout. v2.0 introduces a sidebar navigation that persists across pages.

### Layout Architecture

```
app/
  layout.tsx                    # Root layout (unchanged -- Providers, Toaster)
  page.tsx                      # Landing page (no sidebar, marketing)
  (app)/                        # Route group for authenticated pages
    layout.tsx                  # App shell layout (sidebar + content area)
    create/
      page.tsx                  # Clip creation page
    library/
      page.tsx                  # Saved clips library
    movie/
      [id]/
        page.tsx                # Movie editor with timeline
    templates/
      page.tsx                  # Template gallery (moved from top-level)
```

**Why route groups:** The `(app)` route group allows the app shell layout to wrap all authenticated pages without affecting URLs. The landing page (`/`) stays outside the shell. Pages are accessed at `/create`, `/library`, `/movie/[id]`, `/templates`.

### App Shell Layout Component

```typescript
// app/(app)/layout.tsx
import { Sidebar } from "@/components/shell/sidebar";
import { AppHeader } from "@/components/shell/app-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col">
      {/* Top header bar */}
      <AppHeader />

      {/* Main content area with sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar navigation */}
        <Sidebar />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### Sidebar Component

```typescript
// src/components/shell/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, Library, Film, Palette } from "lucide-react";

const navItems = [
  { href: "/create", label: "Create", icon: Plus },
  { href: "/library", label: "Library", icon: Library },
  { href: "/templates", label: "Templates", icon: Palette },
  // Movie links are contextual (shown when user has movies)
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 border-r bg-muted/30 flex flex-col">
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={/* active state based on pathname */}
          >
            <item.icon className="h-4 w-4 mr-3" />
            {item.label}
          </Link>
        ))}

        {/* Movie list section */}
        <div className="pt-4 mt-4 border-t">
          <h3 className="text-xs font-medium text-muted-foreground mb-2 px-3">
            Movies
          </h3>
          {/* Render list of user's movies */}
        </div>
      </nav>
    </aside>
  );
}
```

### Existing Page Migration

The current `/create` page has its own header with `<Link>` to home and `<UserMenu>`. Under the app shell:
- `<UserMenu>` moves to `<AppHeader>` (shared across all pages)
- Per-page headers are removed (the shell provides navigation)
- The `/create` page content becomes the page body within the shell

---

## 6. Timeline Component Architecture

### Component Hierarchy

```
MovieEditorPage
  |
  +-- MovieHeader (movie name, settings)
  |
  +-- MoviePreviewPlayer (full movie preview using MovieComposition)
  |
  +-- Timeline
  |     |
  |     +-- TimelineTrack (horizontal scrollable container)
  |     |     |
  |     |     +-- TimelineScene (one per scene)
  |     |     |     +-- SceneThumbnail
  |     |     |     +-- SceneDuration label
  |     |     |     +-- SceneActions (remove, edit, duplicate)
  |     |     |
  |     |     +-- AddSceneButton (at end of track)
  |     |
  |     +-- TimelinePlayhead (current position indicator)
  |     +-- TimelineRuler (time markers)
  |
  +-- MovieActions (render, export, generate next scene)
```

### Timeline Data Flow

```
[Convex: movie.scenes[]]
    |
    v (reactive query)
[Timeline Component]
    |
    +-- Drag to reorder --> mutation: updateSceneOrder(movieId, newScenes[])
    +-- Click remove --> mutation: removeScene(movieId, sceneIndex)
    +-- Click add --> navigate to /create with ?addToMovie=movieId
    +-- Click scene --> highlight scene in preview player (seek to scene start frame)
```

### Timeline-to-Player Synchronization

When a user clicks a scene in the timeline, the preview player seeks to the first frame of that scene:

```typescript
function getSceneStartFrame(scenes: MovieScene[], sceneIndex: number): number {
  return scenes
    .slice(0, sceneIndex)
    .reduce((sum, scene) => sum + scene.durationInFrames, 0);
}
```

---

## 7. Component Boundaries and New Files

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `MovieComposition` | `src/remotion/compositions/MovieComposition.tsx` | Remotion composition wrapping N clips via `<Series>` |
| `Sidebar` | `src/components/shell/sidebar.tsx` | Persistent navigation sidebar |
| `AppHeader` | `src/components/shell/app-header.tsx` | Persistent top header with user menu |
| `AppLayout` | `app/(app)/layout.tsx` | Next.js layout providing the app shell |
| `ClipCard` | `src/components/library/clip-card.tsx` | Clip display card for library grid |
| `ClipLibrary` | `src/components/library/clip-library.tsx` | Grid of saved clips |
| `Timeline` | `src/components/movie/timeline.tsx` | Horizontal timeline component |
| `TimelineScene` | `src/components/movie/timeline-scene.tsx` | Individual scene block in timeline |
| `MoviePreviewPlayer` | `src/components/movie/movie-preview-player.tsx` | Preview player for full movie |
| `MovieActions` | `src/components/movie/movie-actions.tsx` | Render/export/continue controls for movie |
| `EndStateExtractor` | `src/lib/end-state-extractor.ts` | Extracts last-frame state from clip code |

### New Convex Functions

| Function | Type | Purpose |
|----------|------|---------|
| `clips.save` | mutation | Save a generation as a clip |
| `clips.list` | query | List user's clips |
| `clips.get` | query | Get single clip |
| `clips.update` | mutation | Update clip name/code |
| `clips.remove` | mutation | Delete a clip |
| `movies.create` | mutation | Create new movie |
| `movies.get` | query | Get movie with scene data |
| `movies.list` | query | List user's movies |
| `movies.addScene` | mutation | Append clip as scene |
| `movies.removeScene` | mutation | Remove scene by index |
| `movies.reorderScenes` | mutation | Replace scenes array with new order |
| `movies.update` | mutation | Update movie name/settings |
| `movies.remove` | mutation | Delete a movie |
| `triggerRender.startMovieRender` | action | Trigger Lambda render for movie |
| `generateAnimation.generateContinuation` | action | Generate next scene from end-state |

### Modified Existing Components

| Component | Change |
|-----------|--------|
| `convex/schema.ts` | Add `clips` and `movies` tables, make `renders.generationId` optional |
| `convex/triggerRender.ts` | Add `startMovieRender` action alongside existing `startRender` |
| `app/layout.tsx` | Unchanged (root layout stays minimal) |
| `app/(app)/layout.tsx` | New file providing app shell |
| `src/components/preview/preview-player.tsx` | May need minor updates for movie mode |
| `app/create/create-page-client.tsx` | Add "Save as Clip" and "Add to Movie" buttons |

---

## 8. Data Flow for Key Operations

### Save Clip Flow

```
User clicks "Save as Clip"
  |
  v
Client calls clips.save mutation with:
  - code, rawCode from current generation/editor state
  - durationInFrames, fps
  - name (user-provided or auto-generated)
  - generationId (optional reference to source generation)
  |
  v
Convex creates clip document
  |
  v
(Optional) Extract end-state if code is stable
  |
  v
UI shows "Saved!" toast, clip appears in library
```

### Add Clip to Movie Flow

```
User clicks "Add to Movie" (from library or create page)
  |
  v
If no movie exists:
  - Show "Create Movie" dialog (name)
  - Client calls movies.create mutation
  |
  v
Client calls movies.addScene mutation with:
  - movieId
  - clipId
  |
  v
Mutation appends { clipId } to movie.scenes[]
Mutation recalculates totalDurationInFrames
  |
  v
Reactive query updates timeline UI
```

### Movie Preview Flow

```
MovieEditorPage loads with movieId from URL params
  |
  v
Reactive query: movies.get(movieId) returns movie document
  |
  v
For each scene in movie.scenes:
  - Reactive query: clips.get(scene.clipId) returns clip data
  |
  v
Build MovieCompositionProps:
  scenes = clips.map(clip => ({
    code: clip.code,
    durationInFrames: scene.durationOverride ?? clip.durationInFrames,
    fps: clip.fps,
  }))
  |
  v
Render <Player component={MovieComposition} inputProps={props} ... />
  |
  v
calculateMetadata computes total duration dynamically
Player renders all scenes in sequence via <Series>
```

### Movie Render Flow

```
User clicks "Render Movie"
  |
  v
Client calls triggerRender.startMovieRender action with:
  - movieId
  |
  v
Action fetches movie + all clip codes
Action validates: total duration within limits, all clips valid
Action calls renderMediaOnLambda with:
  - composition: "MovieComposition"
  - inputProps: { scenes: [...], durationInFrames: total, fps: 30 }
  |
  v
Lambda renders MovieComposition
  - <Series> sequences all clips
  - Each DynamicCode executes its clip's code
  |
  v
Progress polling (same pattern as existing renders)
  |
  v
Complete: presigned URL for download
```

### Generate Continuation Flow

```
User clicks "Generate Next Scene" on a clip
  |
  v
Client sends to generateAnimation.generateContinuation:
  - clipId (source clip)
  - prompt (what should happen next)
  |
  v
Action fetches clip's rawCode and endState
If no endState: extract it (Strategy C: send rawCode to Claude for analysis)
  |
  v
Claude API call with continuation system prompt:
  "Previous scene code: {rawCode}
   Previous scene end state: {endState}
   Generate a new scene that starts from this visual state and transitions to: {prompt}"
  |
  v
Standard validation pipeline (AST validation, sucrase transform)
  |
  v
Return new code as a generation result
Client can preview, then save as clip and add to movie
```

---

## 9. Suggested Build Order

Based on dependency analysis, the recommended phase structure is:

### Phase 1: Data Foundation (Clips + App Shell)
**Why first:** Everything else depends on clips existing and the app shell providing navigation context.

Build order:
1. Convex schema additions (clips table, renders extension)
2. Clip CRUD mutations and queries
3. App shell layout (sidebar + header)
4. Save-as-clip flow from create page
5. Clip library page

### Phase 2: Movie Data + Timeline
**Why second:** Movies depend on clips existing. Timeline is the core new UI.

Build order:
1. Convex schema additions (movies table)
2. Movie CRUD mutations and queries
3. MovieComposition Remotion component
4. Movie editor page with timeline
5. Add/remove/reorder scenes

### Phase 3: Movie Preview + Render
**Why third:** Preview and render depend on MovieComposition and movie data being stable.

Build order:
1. Movie preview player (full movie in one Player)
2. Timeline-to-player synchronization
3. Movie Lambda render action
4. Movie export (zip containing all clip files)

### Phase 4: Continuation Generation
**Why last:** Depends on clips, movies, and the end-state extraction system.

Build order:
1. End-state extraction (start with Claude-based analysis)
2. Continuation system prompt design
3. "Generate next scene" action
4. Create page integration (continuation mode)
5. Auto-add continuation to movie

---

## 10. Anti-Patterns to Avoid

### 1. Storing code by reference instead of by value
**Wrong:** Clip stores `generationId` and reads code from generations table at render time.
**Why bad:** If the generation is deleted or modified, the clip breaks.
**Right:** Clip copies `code` and `rawCode` at save time. The clip is self-contained.

### 2. Mixed fps across movie scenes
**Wrong:** Allow scenes with different fps values (e.g., 30fps and 60fps clips in one movie).
**Why bad:** Remotion compositions have a single fps value. Mixed fps would require frame-rate conversion.
**Right:** Enforce uniform fps (30) across all clips. Reject clips with non-matching fps when adding to a movie. (All clips are currently generated at 30fps anyway.)

### 3. Separate table for scene ordering
**Wrong:** Create a `movieScenes` join table with `movieId`, `clipId`, `order` fields.
**Why bad:** Overkill for 2-20 scenes. Every reorder requires updating multiple documents. Single-user editing means no concurrent write conflicts to worry about.
**Right:** Store `scenes` array directly on movie document. Reorder by replacing the array atomically.

### 4. Runtime bundle() for movies
**Wrong:** Try to bundle all clip code into a single composition at render time.
**Why bad:** Remotion explicitly says bundle() cannot be called in serverless. This was researched and rejected in v1.1.
**Right:** Use the meta-composition pattern. MovieComposition is pre-bundled. Individual clip code is passed as inputProps and executed at runtime via Function constructor.

### 5. Complex end-state extraction before proving value
**Wrong:** Build a full AST-based end-state extraction system with runtime rendering before validating that continuation generation works at all.
**Why bad:** Large infrastructure investment for uncertain value. Claude may handle continuation just fine with source code alone.
**Right:** Start with Strategy C (send code to Claude for end-state analysis). Only build AST-based extraction if Claude-based analysis proves insufficient.

---

## Sources

### Remotion (HIGH confidence -- official documentation)
- [Sequence component](https://www.remotion.dev/docs/sequence) -- Time-shifting and layering
- [Series component](https://www.remotion.dev/docs/series) -- Sequential scene stitching
- [TransitionSeries](https://www.remotion.dev/docs/transitions/transitionseries) -- Transitions between scenes
- [Combining compositions](https://www.remotion.dev/docs/miscellaneous/snippets/combine-compositions) -- Master composition pattern
- [calculateMetadata()](https://www.remotion.dev/docs/calculate-metadata) -- Dynamic duration from props
- [interpolate()](https://www.remotion.dev/docs/interpolate) -- Animation interpolation and clamping
- [Parameterized rendering](https://www.remotion.dev/docs/parameterized-rendering) -- inputProps pattern
- [renderMediaOnLambda()](https://www.remotion.dev/docs/lambda/rendermediaonlambda) -- Lambda render API
- [Lambda FAQ](https://www.remotion.dev/docs/lambda/faq) -- One function serves multiple compositions

### Convex (HIGH confidence -- official documentation)
- [Schemas](https://docs.convex.dev/database/schemas) -- Table definitions and validators
- [Relationship patterns](https://stack.convex.dev/relationship-structures-let-s-talk-about-schemas) -- 1:many, many:many design
- [Relational data](https://www.convex.dev/can-do/relational-data) -- Document ID references
- [Best practices](https://docs.convex.dev/understanding/best-practices/) -- Array size limits, indexing
- [Sorting](https://www.convex.dev/can-do/sorting) -- Index-based ordering

### Next.js (HIGH confidence -- official documentation)
- [Layouts and Pages](https://nextjs.org/docs/pages/building-your-application/routing/pages-and-layouts) -- Persistent layout pattern
- [Route Groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups) -- Layout scoping without URL impact

### Ordering Patterns (MEDIUM confidence -- community resources)
- [Fractional Indexing](https://www.steveruiz.me/posts/reordering-fractional-indices) -- Advanced reordering pattern (not needed for v2.0 scale)
- [fractional-indexing npm](https://www.npmjs.com/package/fractional-indexing) -- Rocicorp implementation

---
*Architecture research for: RemotionLab v2.0 -- Multi-Scene Movie Editor*
*Researched: 2026-01-29*
*Previous version: 2026-01-28 (v1.1 architecture)*
