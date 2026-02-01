# Phase 10: Movie Data & Timeline UI - Research

**Researched:** 2026-02-01
**Domain:** Convex data modeling, horizontal drag-and-drop timeline, Remotion multi-scene composition
**Confidence:** HIGH

## Summary

Phase 10 introduces movies as first-class entities and a horizontal timeline UI for arranging clips as scenes. The existing codebase from Phase 9 provides a solid foundation: clips table with CRUD, a persistent app shell with sidebar (already has a "Movie" nav link pointing to `/movie`), and the `DynamicCode` composition that executes arbitrary Remotion code.

The standard approach is:
1. Add a `movies` table to Convex with an inline `scenes` array referencing clip IDs
2. Create movie CRUD mutations (create, get, list, addScene, removeScene, reorderScenes)
3. Build a `/movie` route with movie listing and a `/movie/[id]` route for the editor
4. Build a horizontal timeline using `@dnd-kit/core` + `@dnd-kit/sortable` (classic API, installed with `--legacy-peer-deps`) with `horizontalListSortingStrategy` and `restrictToHorizontalAxis`
5. Create a `MovieComposition` using Remotion's `<Series>` that wraps N `DynamicCode` instances
6. Wire timeline interaction to the Remotion Player for playhead synchronization

**Primary recommendation:** Use the classic `@dnd-kit/core@6.3.1` + `@dnd-kit/sortable@10.0.0` packages (NOT the new `@dnd-kit/react@0.2.x` which is pre-release and has known bugs). Install with `--legacy-peer-deps` to work around React 19 peer dependency warnings. The classic packages work correctly at runtime with React 19 -- the issue is only in peer dependency metadata. The project's tsconfig already has `skipLibCheck: true`, so TypeScript type errors from @dnd-kit's stale React type declarations are suppressed.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@dnd-kit/core` | ^6.3.1 | DnD engine: sensors, collision detection, context | 2,039+ npm dependents, ~10KB minified, zero deps, hooks-based |
| `@dnd-kit/sortable` | ^10.0.0 | Sortable preset: useSortable, arrayMove, strategies | Thin layer on core, horizontal list strategy built-in |
| `@dnd-kit/modifiers` | ^9.0.0 | Movement restriction modifiers | `restrictToHorizontalAxis` constrains drag to timeline axis |
| `@dnd-kit/utilities` | ^3.2.2 | CSS transform utilities | Clean `CSS.Transform.toString()` for drag overlay |
| Remotion `<Series>` | 4.0.410 | Sequential scene composition | Already installed in `remotion` package, purpose-built for sequential playback |
| Convex | 1.31.6 | Movies table, mutations, reactive queries | Already the project's backend, no new deps needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@remotion/player` Thumbnail | 4.0.410 | Scene thumbnails in timeline | Already installed, `<Thumbnail>` renders any frame |
| lucide-react | ^0.563.0 | Icons for timeline actions | Already installed, Film/Plus/X/GripHorizontal icons |
| sonner | ^2.0.7 | Toast notifications for actions | Already installed, used in clip library pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@dnd-kit/core` (classic) | `@dnd-kit/react` (0.2.x) | New API supports React 19 natively but is pre-release (v0.2.1), only 24 npm dependents, known bugs with onDragEnd source/target detection. Not production-ready. |
| `@dnd-kit/core` (classic) | `@hello-pangea/dnd` | Better React 19 compat but optimized for vertical Kanban, horizontal is secondary. Heavier. |
| Custom drag-and-drop (no lib) | HTML5 DnD API | Keyboard accessibility, collision detection, and reorder animation are hard to build from scratch. |
| Inline scenes array | Separate `movieScenes` join table | Join table is overkill for 2-20 scenes per movie. Array reorder is a single document mutation. |

**Installation:**
```bash
npm install @dnd-kit/core@^6.3.1 @dnd-kit/sortable@^10.0.0 @dnd-kit/modifiers@^9.0.0 @dnd-kit/utilities@^3.2.2 --legacy-peer-deps
```

**Note on `--legacy-peer-deps`:** The classic `@dnd-kit/core` declares `react ^16.8.0 || ^17.0.0 || ^18.0.0` as a peer dependency. It does not yet list React 19. However, the library works correctly at runtime with React 19 -- the hooks API has not changed. The `--legacy-peer-deps` flag is needed only to bypass npm's strict peer dependency resolution. This is a well-known pattern across the React ecosystem during the React 19 transition. The project's `tsconfig.json` already has `skipLibCheck: true`, which suppresses any TypeScript type errors from @dnd-kit's stale React type declarations.

## Architecture Patterns

### Recommended Project Structure
```
convex/
  schema.ts              # Add movies table
  movies.ts              # Movie CRUD mutations and queries

src/app/(app)/
  movie/
    page.tsx             # Movie list page (all user's movies)
    [id]/
      page.tsx           # Movie editor page with timeline

src/components/movie/
  movie-list.tsx         # Grid of user's movies
  create-movie-dialog.tsx # Dialog to create new movie (name input)
  movie-editor.tsx       # Main editor: header + timeline + actions
  timeline.tsx           # Horizontal timeline container with DnD
  timeline-scene.tsx     # Individual scene block (sortable)
  add-scene-panel.tsx    # Panel/dialog to pick clips from library

src/remotion/compositions/
  MovieComposition.tsx   # Series-based multi-clip composition
```

### Pattern 1: Convex Movies Schema with Inline Scenes Array

**What:** Store scenes as an ordered array of objects on the movie document.
**When to use:** When a collection has 2-20 ordered items that are always read/written with the parent, and single-user editing (no concurrent writes).

```typescript
// convex/schema.ts -- add movies table
movies: defineTable({
  userId: v.string(),
  name: v.string(),
  scenes: v.array(v.object({
    clipId: v.id("clips"),
    // Per-scene duration override (optional; falls back to clip's duration)
    durationOverride: v.optional(v.number()),
  })),
  // Cached total (recomputed on every scene mutation)
  totalDurationInFrames: v.number(),
  // Uniform fps enforced across all clips in the movie
  fps: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_updated", ["userId", "updatedAt"]),
```

**Key design decisions:**
- `scenes` is an array of objects, not just clip IDs. This allows per-scene metadata like `durationOverride`.
- `totalDurationInFrames` is recomputed on every mutation that modifies `scenes`. Avoids recomputing on reads.
- `fps` is enforced to be uniform (30) across all clips in a movie. All generated clips use fps: 30.
- The movie document stays small: metadata + array of ~20 objects with IDs. Well under Convex's 1 MiB limit.
- Clips are referenced by ID, not stored inline. Clip code is NOT in the movie document.

### Pattern 2: Movie CRUD Mutations

**What:** Standard Convex mutation pattern for movie operations.
**When to use:** All movie data modifications.

```typescript
// convex/movies.ts

// Create a new empty movie
export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return ctx.db.insert("movies", {
      userId: identity.tokenIdentifier,
      name: args.name,
      scenes: [],
      totalDurationInFrames: 0,
      fps: 30,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Add a clip as the last scene in a movie
export const addScene = mutation({
  args: { movieId: v.id("movies"), clipId: v.id("clips") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const movie = await ctx.db.get(args.movieId);
    if (!movie || movie.userId !== identity.tokenIdentifier)
      throw new Error("Movie not found");
    const clip = await ctx.db.get(args.clipId);
    if (!clip) throw new Error("Clip not found");
    // Enforce uniform fps
    if (movie.scenes.length > 0 && clip.fps !== movie.fps)
      throw new Error("Clip fps must match movie fps");

    const newScenes = [...movie.scenes, { clipId: args.clipId }];
    const totalDuration = await computeTotalDuration(ctx, newScenes);
    await ctx.db.patch(args.movieId, {
      scenes: newScenes,
      totalDurationInFrames: totalDuration,
      fps: clip.fps,
      updatedAt: Date.now(),
    });
  },
});

// Reorder scenes (replace entire array with new order)
export const reorderScenes = mutation({
  args: {
    movieId: v.id("movies"),
    sceneOrder: v.array(v.object({ clipId: v.id("clips") })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const movie = await ctx.db.get(args.movieId);
    if (!movie || movie.userId !== identity.tokenIdentifier)
      throw new Error("Movie not found");
    await ctx.db.patch(args.movieId, {
      scenes: args.sceneOrder,
      updatedAt: Date.now(),
    });
  },
});

// Remove a scene by index
export const removeScene = mutation({
  args: { movieId: v.id("movies"), sceneIndex: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const movie = await ctx.db.get(args.movieId);
    if (!movie || movie.userId !== identity.tokenIdentifier)
      throw new Error("Movie not found");

    const newScenes = movie.scenes.filter((_, i) => i !== args.sceneIndex);
    const totalDuration = await computeTotalDuration(ctx, newScenes);
    await ctx.db.patch(args.movieId, {
      scenes: newScenes,
      totalDurationInFrames: totalDuration,
      updatedAt: Date.now(),
    });
  },
});
```

### Pattern 3: Horizontal Sortable Timeline with @dnd-kit

**What:** DndContext + SortableContext with horizontal strategy for scene reordering.
**When to use:** The timeline component for drag-to-reorder scenes.

```tsx
// Source: https://docs.dndkit.com/presets/sortable
"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";

function Timeline({ scenes, onReorder }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  const sceneIds = scenes.map((s, i) => `scene-${i}`);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sceneIds.indexOf(String(active.id));
    const newIndex = sceneIds.indexOf(String(over.id));
    const newOrder = arrayMove(scenes, oldIndex, newIndex);
    onReorder(newOrder);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToHorizontalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sceneIds}
        strategy={horizontalListSortingStrategy}
      >
        <div className="flex flex-row gap-2 overflow-x-auto p-4">
          {scenes.map((scene, index) => (
            <TimelineScene
              key={`scene-${index}`}
              id={`scene-${index}`}
              scene={scene}
              index={index}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
```

```tsx
// TimelineScene - sortable item
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function TimelineScene({ id, scene, index }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    // Width proportional to duration (e.g., 1px per frame, min 80px)
    minWidth: 80,
    width: Math.max(80, scene.durationInFrames * 0.5),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="border rounded-lg bg-card cursor-grab active:cursor-grabbing"
    >
      {/* Scene thumbnail + info */}
    </div>
  );
}
```

### Pattern 4: MovieComposition with Remotion Series

**What:** A Remotion composition that sequences N DynamicCode instances.
**When to use:** Movie preview in the Player and movie rendering via Lambda.

```tsx
// src/remotion/compositions/MovieComposition.tsx
// Source: https://www.remotion.dev/docs/series
"use client";

import React from "react";
import { Series } from "remotion";
import { DynamicCode } from "./DynamicCode";

export interface MovieScene {
  code: string;
  durationInFrames: number;
  fps: number;
}

export interface MovieCompositionProps {
  scenes: MovieScene[];
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

**Key insight:** `<Series.Sequence>` automatically resets `useCurrentFrame()` to 0 within each child. Generated clip code using `useCurrentFrame()` works without modification inside the Series context. This is a Remotion built-in behavior.

### Pattern 5: Movie Editor Page with getWithClips Query

**What:** A Convex query that returns the movie document plus all referenced clip data, so the UI has everything it needs in one reactive subscription.
**When to use:** The movie editor page.

```typescript
// convex/movies.ts
export const getWithClips = query({
  args: { id: v.id("movies") },
  handler: async (ctx, args) => {
    const movie = await ctx.db.get(args.id);
    if (!movie) return null;

    // Fetch all referenced clips in parallel
    const clips = await Promise.all(
      movie.scenes.map((scene) => ctx.db.get(scene.clipId))
    );

    return {
      ...movie,
      sceneClips: clips.filter(Boolean), // Filter out any deleted clips
    };
  },
});
```

### Anti-Patterns to Avoid
- **Storing clip code inside the movie document:** Movie document stays small (clip IDs only). Code is read from clips table when needed for preview/render.
- **Mixed fps across movie scenes:** Enforce uniform fps (30) at addScene time. Mixed fps creates irreconcilable timing issues in `<Series>`.
- **Separate movieScenes join table:** Overkill for 2-20 scenes. Array reorder is a single atomic document mutation.
- **Using the new `@dnd-kit/react` (v0.2.x):** Pre-release, 24 dependents, known bugs with onDragEnd. Use classic `@dnd-kit/core` + `@dnd-kit/sortable`.
- **Building drag-trim handles on timeline:** Out of scope per REQUIREMENTS. Duration is set per-clip, not adjusted by dragging. Scenes are reordered, not trimmed.
- **Multi-track timeline:** Single horizontal track only. Multi-track is explicitly out of scope.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Horizontal drag-to-reorder | Custom drag events + position math | `@dnd-kit/sortable` with `horizontalListSortingStrategy` | Collision detection, keyboard accessibility, animation, and cross-browser touch support are deceptively complex |
| Scene thumbnails | Canvas screenshot at save time | Remotion `<Thumbnail>` component (already in `@remotion/player`) | Renders any frame from any composition accurately; same rendering pipeline as preview |
| Sequential clip playback | Manual frame offset calculation | Remotion `<Series>` component | Handles frame offset math, mounting/unmounting, and frame-relative `useCurrentFrame()` automatically |
| Dynamic composition duration | Hardcoded total duration | Remotion `calculateMetadata()` | Computes duration from props before render; single source of truth |
| Array reordering | Manual splice/copy | `arrayMove` from `@dnd-kit/sortable` | Immutable reorder utility, no off-by-one errors |

**Key insight:** The Remotion + @dnd-kit combination handles the two hardest problems (sequential video composition and drag-to-reorder) as first-class features. The custom code is mostly UI layout and Convex mutations.

## Common Pitfalls

### Pitfall 1: React 19 Peer Dependency Error on @dnd-kit Install
**What goes wrong:** `npm install @dnd-kit/core` fails with ERESOLVE because the package declares `react ^16.8 || ^17 || ^18` as peer dep, not React 19.
**Why it happens:** The classic @dnd-kit packages have not updated their peer dependency metadata for React 19.
**How to avoid:** Install with `--legacy-peer-deps` flag. The library works correctly at runtime with React 19 -- this is a metadata-only issue. Use `"use client"` directive on all components that use dnd-kit hooks (already required for Next.js App Router). The project's `tsconfig.json` already has `skipLibCheck: true`, so TypeScript type declaration mismatches are suppressed.
**Warning signs:** `npm ERR! ERESOLVE unable to resolve dependency tree` during install.

### Pitfall 2: Stale Scene Array After Clip Deletion
**What goes wrong:** User deletes a clip from the library that is referenced by a movie. Movie's `scenes` array now contains a dangling `clipId` reference. Movie preview crashes or shows errors.
**Why it happens:** No cascading delete or referential integrity check between clips and movies in Convex (Convex is document-based, not relational).
**How to avoid:** Two strategies (implement both):
  1. When deleting a clip, check if it is referenced by any movie. Show a warning: "This clip is used in Movie X. Remove it from the movie first."
  2. In the `getWithClips` query, filter out null clips (deleted references) and show a visual indicator for missing scenes.
**Warning signs:** "Clip not found" errors in the timeline, blank scene blocks.

### Pitfall 3: SortableContext Items Must Match Render Order
**What goes wrong:** `SortableContext` items array is in a different order than the rendered children, causing visual glitches during drag: items jump, swap incorrectly, or snap back.
**Why it happens:** The `items` prop must be sorted in the same order as rendered elements. If you derive IDs separately from the render loop, they can get out of sync.
**How to avoid:** Derive `items` and render loop from the same source array. Use `scenes.map((_, i) => "scene-" + i)` for both the `items` prop and the `key`/`id` of rendered `TimelineScene` components.
**Warning signs:** Items "teleport" during drag, wrong item moves, phantom swaps.

### Pitfall 4: Movie Route Structure -- /movie vs /movie/[id]
**What goes wrong:** The sidebar links to `/movie` but the editor needs a movie ID. If there is only a `/movie/[id]` route and no `/movie` route, the sidebar link leads to a 404.
**Why it happens:** The sidebar was built in Phase 9 with a `/movie` link before the movie feature existed.
**How to avoid:** Create both routes:
  - `/movie` (page.tsx): Lists all user's movies with a "Create Movie" button. Redirect to `/movie/[id]` when a movie is selected.
  - `/movie/[id]` (page.tsx): The actual movie editor with timeline.
**Warning signs:** 404 when clicking "Movie" in the sidebar.

### Pitfall 5: Timeline Playhead Desync with Player
**What goes wrong:** The playhead position in the timeline does not match what is playing in the Remotion Player preview. Clicking a scene in the timeline does not seek to that scene.
**Why it happens:** Two sources of truth for current frame (Player state vs timeline state). Player `frameupdate` events fire every frame (30fps), flooding React state updates.
**How to avoid:**
  1. Player is the single source of truth. Timeline reads frame position from Player via `playerRef.current.addEventListener("frameupdate", callback)`.
  2. Throttle timeline UI updates to ~15/second using `requestAnimationFrame`.
  3. Use a ref (not state) for the playhead position to avoid React re-renders.
  4. Compute "which scene is active" as a pure function: `getCurrentSceneIndex(absoluteFrame, scenes[])`.
**Warning signs:** Playhead jitter, wrong scene highlighted, laggy scrub.

### Pitfall 6: Optimistic Reorder vs Convex Mutation Latency
**What goes wrong:** After drag-to-reorder, the timeline flickers back to the old order briefly while the Convex mutation round-trips, then snaps to the new order.
**Why it happens:** Convex reactive queries return the old state until the mutation completes and the subscription updates. This creates a visible "undo-redo" flash.
**How to avoid:** Apply the reorder optimistically in local state before calling the mutation. Use a local `useState` for the display order that updates immediately on drag-end, then call the mutation. When the Convex query updates, it will match the local state. If the mutation fails, revert local state.
**Warning signs:** Timeline flickering after reorder, scenes briefly jumping back to original positions.

## Code Examples

Verified patterns from official sources:

### Movie Editor Page Structure
```tsx
// src/app/(app)/movie/[id]/page.tsx
import { MovieEditor } from "@/components/movie/movie-editor";

export default async function MovieEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MovieEditor movieId={id} />;
}
```

### Movie List Page
```tsx
// src/app/(app)/movie/page.tsx
import { MovieList } from "@/components/movie/movie-list";

export default function MoviePage() {
  return (
    <div className="flex-1 flex flex-col p-6">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Movies</h1>
          <p className="text-muted-foreground mt-1">
            Your multi-scene movie projects
          </p>
        </div>
        <MovieList />
      </div>
    </div>
  );
}
```

### Remotion Thumbnail for Timeline Scene
```tsx
// Inside TimelineScene component
// Source: https://www.remotion.dev/docs/player/thumbnail
import { Thumbnail } from "@remotion/player";
import { DynamicCode } from "@/remotion/compositions/DynamicCode";

<Thumbnail
  component={DynamicCode}
  inputProps={{
    code: clip.code,
    durationInFrames: clip.durationInFrames,
    fps: clip.fps,
  }}
  compositionWidth={1920}
  compositionHeight={1080}
  frameToDisplay={Math.floor(clip.durationInFrames / 2)}
  durationInFrames={clip.durationInFrames}
  fps={clip.fps}
  style={{ width: "100%", borderRadius: 4 }}
/>
```

### Computing Scene Start Frames (for playhead sync)
```typescript
// Utility for timeline-to-player frame mapping
function getSceneStartFrame(
  scenes: Array<{ durationInFrames: number }>,
  sceneIndex: number
): number {
  return scenes
    .slice(0, sceneIndex)
    .reduce((sum, s) => sum + s.durationInFrames, 0);
}

function getCurrentSceneIndex(
  absoluteFrame: number,
  scenes: Array<{ durationInFrames: number }>
): number {
  let cumulative = 0;
  for (let i = 0; i < scenes.length; i++) {
    cumulative += scenes[i].durationInFrames;
    if (absoluteFrame < cumulative) return i;
  }
  return scenes.length - 1;
}
```

### Compute Total Duration Helper (Convex server-side)
```typescript
// convex/movies.ts -- helper function
async function computeTotalDuration(
  ctx: any,
  scenes: Array<{ clipId: any; durationOverride?: number }>
): Promise<number> {
  let total = 0;
  for (const scene of scenes) {
    if (scene.durationOverride) {
      total += scene.durationOverride;
    } else {
      const clip = await ctx.db.get(scene.clipId);
      total += clip?.durationInFrames ?? 0;
    }
  }
  return total;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@dnd-kit/core` (v5.x) | `@dnd-kit/core` (v6.3.1) + `@dnd-kit/sortable` (v10.0.0) | 2024 | Improved collision detection, better TypeScript types |
| `@dnd-kit/core` classic | `@dnd-kit/react` (v0.2.x) | 2025 (ongoing) | Complete rewrite with React 19 support. NOT production-ready yet (v0.x, 24 dependents, known bugs). |
| Manual `<Sequence from={...}>` | `<Series>` component | Remotion v3.x | `<Series>` auto-calculates offsets, eliminates manual frame math. Use `<Series>` not `<Sequence>` for sequential scenes. |
| Hardcoded composition duration | `calculateMetadata()` | Remotion v3.x | Dynamic duration from props. Use for MovieComposition to compute total from scene durations. |
| `react-beautiful-dnd` | `@dnd-kit/core` | 2022 (deprecated) | `react-beautiful-dnd` is deprecated and incompatible with React 18+. |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Deprecated, no React 18/19 support. Do not use.
- `react-dnd`: Complex API, declining adoption. Not recommended.
- `@xzdarcy/react-timeline-editor`: Unmaintained for 3 years. Do not use.

## Open Questions

Things that could not be fully resolved:

1. **~~TypeScript type errors from @dnd-kit with React 19~~** -- RESOLVED. The project's `tsconfig.json` already has `skipLibCheck: true` (line 6), which suppresses library type declaration mismatches. No action needed.

2. **Exact clip count at which Remotion `<Thumbnail>` rendering becomes slow in the timeline**
   - What we know: Each `<Thumbnail>` renders a full Remotion composition at one frame. With 10+ thumbnails visible simultaneously, this could be slow. The existing `clip-card.tsx` already uses `<Thumbnail>` successfully in the library grid.
   - What is unclear: The exact performance threshold when DynamicCode uses Function constructor for each thumbnail.
   - Recommendation: Start with `<Thumbnail>` for all scenes (proven pattern from clip-card.tsx). If timeline rendering is sluggish with 10+ scenes, switch to lazy-loading thumbnails (only render visible ones using IntersectionObserver) or use a client-mounted guard as clip-card.tsx already does.

3. **Should the `/movie` page show a movie list or redirect to a single default movie?**
   - What we know: The sidebar links to `/movie`. Users might have 0, 1, or many movies.
   - Recommendation: Build `/movie` as a list page (matching the `/library` pattern). This is consistent with the app's existing navigation model and scales to multiple movies.

## Sources

### Primary (HIGH confidence)
- [Remotion `<Series>` docs](https://www.remotion.dev/docs/series) -- Sequential composition, durationInFrames, offset, premountFor
- [Remotion `calculateMetadata()` docs](https://www.remotion.dev/docs/calculate-metadata) -- Dynamic duration computation
- [Remotion `<Thumbnail>` docs](https://www.remotion.dev/docs/player/thumbnail) -- Client-side frame rendering
- [@dnd-kit Sortable docs](https://docs.dndkit.com/presets/sortable) -- SortableContext, useSortable, horizontalListSortingStrategy
- [@dnd-kit Modifiers docs](https://docs.dndkit.com/api-documentation/modifiers) -- restrictToHorizontalAxis
- [Convex schema docs](https://docs.convex.dev/database/schemas) -- defineTable, validators, indexes
- [Convex document limits](https://docs.convex.dev/production/state/limits) -- 1 MiB document limit, 8192 array elements
- Existing codebase verified: `convex/schema.ts`, `convex/clips.ts`, `src/components/library/clip-card.tsx`, `tsconfig.json`

### Secondary (MEDIUM confidence)
- [@dnd-kit/core npm](https://www.npmjs.com/package/@dnd-kit/core) -- v6.3.1, 2039+ dependents
- [@dnd-kit/react npm](https://www.npmjs.com/package/@dnd-kit/react) -- v0.2.1, 24 dependents (pre-release)
- [dnd-kit React 19 issue #1511](https://github.com/clauderic/dnd-kit/issues/1511) -- Peer dep issue confirmed, no maintainer fix timeline
- [dnd-kit next-gen docs](https://next.dndkit.com/react/hooks/use-sortable) -- New useSortable API (for future reference)
- [Top 5 DnD Libraries for React 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) -- @dnd-kit recommended

### Tertiary (LOW confidence)
- [dnd-kit @dnd-kit/react onDragEnd bug #1664](https://github.com/clauderic/dnd-kit/issues/1664) -- source/target identical in new API
- [Dave Gray: Missing DnD Example](https://www.davegray.codes/posts/missing-example-for-react-drag-n-drop) -- SSR workaround patterns

### Milestone Research (HIGH confidence)
- `.planning/research/ARCHITECTURE.md` -- MovieComposition pattern, movies table design, Series composition hierarchy
- `.planning/research/STACK.md` -- @dnd-kit recommendation, Thumbnail usage, installation commands
- `.planning/research/PITFALLS.md` -- Frame math errors, Convex document limits, timeline performance

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - @dnd-kit is well-documented with 2039+ dependents, Remotion Series is official API, Convex patterns match existing codebase
- Architecture: HIGH - Movies schema follows established Convex patterns (inline array for ordered items). MovieComposition follows documented Remotion combining-compositions pattern. Existing clip-card.tsx validates `<Thumbnail>` approach.
- Pitfalls: HIGH - React 19 peer dep issue is well-documented and mitigated by existing tsconfig. Clip deletion cascade and SortableContext ordering are known @dnd-kit patterns.
- DnD integration: HIGH - Classic @dnd-kit works at runtime with React 19, skipLibCheck handles TS issues, horizontal sortable is a documented first-class use case.

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (stable -- @dnd-kit classic is mature, Remotion 4.x is stable)
