# Phase 11: Movie Preview, Render & Export - Research

**Researched:** 2026-02-01
**Domain:** Remotion Player/Series composition, Lambda multi-scene rendering, multi-clip export
**Confidence:** HIGH

## Summary

Phase 11 connects three existing subsystems -- MovieComposition (Phase 10), the render pipeline (Phase 5), and the export system (Phase 8) -- to enable full-movie preview, render, and export. The MovieComposition with Series is already built and correctly sequences N DynamicCode instances. The render pipeline uses Lambda with progress polling. The export system uses JSZip for project scaffolds.

The core work is: (1) embedding the MovieComposition in a Player with playhead-synced timeline highlighting, (2) adapting the single-clip render pipeline to handle multi-scene movies with adjusted timeout/duration limits, (3) extending the single-clip export to support individual clip export from library/create pages, and (4) building a multi-composition Remotion project zip for full movie export.

**Primary recommendation:** Reuse existing patterns aggressively -- the Player, render pipeline, and export generators already work for single clips. The main new code is the frame-to-scene mapping logic, a new `startMovieRender` action, and a multi-composition zip generator.

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `remotion` | ^4.0.410 | Series composition, frame context | Already used for MovieComposition |
| `@remotion/player` | ^4.0.410 | Player + Thumbnail for movie preview | Already used in PreviewPlayer |
| `@remotion/lambda` | ^4.0.410 | renderMediaOnLambda for movie rendering | Already used in triggerRender.ts |
| `jszip` | ^3.10.1 | Project zip generation for export | Already used in export-project-zip.ts |
| `convex` | ^1.31.6 | Backend mutations, queries, actions, scheduler | Backend for render jobs |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@dnd-kit/*` | various | Timeline drag-and-drop (already working) | Existing timeline interaction |
| `sonner` | ^2.0.7 | Toast notifications | User feedback on render/export |
| `lucide-react` | ^0.563.0 | Icons for buttons | UI icons |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom playhead sync | Remotion built-in `controls={true}` | Built-in controls lack scene highlighting; custom sync needed for timeline-scene mapping |
| Lambda for movie render | Remotion SSR (`@remotion/renderer`) | Lambda already set up; SSR would require a separate server; Lambda handles parallelism natively |

**Installation:** No new packages needed. All dependencies already in `package.json`.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── remotion/compositions/
│   ├── DynamicCode.tsx           # Existing -- single clip
│   └── MovieComposition.tsx      # Existing -- Series of DynamicCode
├── components/movie/
│   ├── movie-editor.tsx          # Existing -- add Preview button, render/export controls
│   ├── timeline.tsx              # Existing -- add playhead indicator + scene highlighting
│   ├── timeline-scene.tsx        # Existing -- add active-scene visual state
│   ├── movie-preview-player.tsx  # NEW -- Player wrapping MovieComposition
│   └── movie-export-buttons.tsx  # NEW -- Export buttons for full movie
├── components/render/
│   ├── render-button.tsx         # Existing -- for single clips (adapt or keep)
│   ├── movie-render-button.tsx   # NEW -- triggers movie render
│   ├── render-progress.tsx       # Existing -- reuse for movie render progress
│   └── download-button.tsx       # Existing -- reuse
├── components/export/
│   └── export-buttons.tsx        # Existing -- single clip export (already works)
├── hooks/
│   └── use-current-player-frame.ts  # NEW -- useSyncExternalStore hook for frame sync
├── lib/
│   ├── export-utils.ts           # Existing -- shared export helpers
│   ├── export-single-file.ts     # Existing -- single composition export
│   ├── export-project-zip.ts     # Existing -- single composition zip
│   └── export-movie-zip.ts       # NEW -- multi-composition zip for movies
convex/
├── triggerRender.ts              # Existing -- add startMovieRender action
├── renders.ts                    # Existing -- schema supports movie renders already
├── movies.ts                     # Existing -- add query for movie render data
└── lib/renderLimits.ts           # Existing -- adjust limits for movies
```

### Pattern 1: Frame-to-Scene Mapping (Player Sync)

**What:** Convert global player frame to active scene index for timeline highlighting.
**When to use:** Whenever the movie Player's frame updates, determine which scene is active.
**Example:**

```typescript
// Source: Derived from MovieComposition Series structure
interface SceneTiming {
  startFrame: number;
  endFrame: number;  // exclusive
  sceneIndex: number;
}

function buildSceneTimings(
  scenes: Array<{ durationInFrames: number }>
): SceneTiming[] {
  let offset = 0;
  return scenes.map((scene, index) => {
    const timing = {
      startFrame: offset,
      endFrame: offset + scene.durationInFrames,
      sceneIndex: index,
    };
    offset += scene.durationInFrames;
    return timing;
  });
}

function getActiveSceneIndex(
  frame: number,
  timings: SceneTiming[]
): number {
  for (const t of timings) {
    if (frame >= t.startFrame && frame < t.endFrame) {
      return t.sceneIndex;
    }
  }
  return timings.length - 1; // Fallback to last scene
}
```

### Pattern 2: useCurrentPlayerFrame Hook (useSyncExternalStore)

**What:** Efficiently track the Player's current frame from a sibling component without causing Player re-renders.
**When to use:** Timeline component needs to highlight the active scene based on Player position.
**Example:**

```typescript
// Source: https://www.remotion.dev/docs/player/current-time
import { CallbackListener, PlayerRef } from "@remotion/player";
import { useCallback, useSyncExternalStore } from "react";

export function useCurrentPlayerFrame(
  ref: React.RefObject<PlayerRef | null>
): number {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const { current } = ref;
      if (!current) return () => undefined;

      const updater: CallbackListener<"frameupdate"> = () => {
        onStoreChange();
      };
      current.addEventListener("frameupdate", updater);
      return () => {
        current.removeEventListener("frameupdate", updater);
      };
    },
    [ref]
  );

  return useSyncExternalStore<number>(
    subscribe,
    () => ref.current?.getCurrentFrame() ?? 0,
    () => 0
  );
}
```

### Pattern 3: Movie Render via Lambda (Code-as-InputProps)

**What:** Render MovieComposition on Lambda by passing all scene code as inputProps.
**When to use:** User clicks "Render Movie" on the movie page.
**Example:**

```typescript
// The existing render pipeline passes inputProps to Lambda.
// For movies, pass the scenes array (code + timing) as inputProps.
// MovieComposition is registered in the Lambda bundle alongside DynamicCode.

const { renderId, bucketName } = await renderMediaOnLambda({
  region,
  functionName,
  serveUrl,
  composition: "MovieComposition",  // Must be registered in Lambda bundle
  inputProps: {
    scenes: movieScenes.map((clip) => ({
      code: clip.code,
      durationInFrames: clip.durationInFrames,
      fps: clip.fps,
    })),
  },
  codec: "h264",
  timeoutInMilliseconds: MOVIE_RENDER_LIMITS.LAMBDA_TIMEOUT_MS,
});
```

### Pattern 4: Multi-Composition Movie Zip Export

**What:** Generate a Remotion project zip containing individual scene compositions + a MovieComposition that uses Series.
**When to use:** User exports the full movie as a Remotion project.
**Example structure:**

```
remotionlab-movie-export/
├── src/
│   ├── Scene01.tsx            # Standalone composition for scene 1
│   ├── Scene02.tsx            # Standalone composition for scene 2
│   ├── MovieComposition.tsx   # Series-based composition importing all scenes
│   ├── Root.tsx               # Multiple <Composition> entries
│   └── index.ts               # registerRoot
├── package.json
├── tsconfig.json
└── remotion.config.ts
```

### Anti-Patterns to Avoid

- **Re-rendering Player on every frame update:** Use `useSyncExternalStore` in a sibling component, never lift frame state to a parent that wraps Player.
- **Passing all movie data as a single string:** Keep scenes as a structured array in inputProps; Lambda serializes JSON fine.
- **Using `useCurrentFrame()` outside a composition context:** This only works inside Remotion compositions, not in regular React components. Use `PlayerRef.getCurrentFrame()` instead.
- **Concatenating MP4 files client-side:** Let Lambda/Remotion handle the full composition render as one video. Series handles frame sequencing natively.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Frame sequencing | Custom frame offset logic | Remotion `<Series>` | Series handles frame resets, mounting/unmounting, and timing automatically |
| Player frame sync | useState + setInterval polling | `useSyncExternalStore` + `frameupdate` event | Official Remotion pattern; avoids unnecessary re-renders |
| Video concatenation | ffmpeg.wasm in browser | Lambda render of full MovieComposition | Server-side rendering handles encoding, muxing, and quality properly |
| Multi-file zip | Manual Blob manipulation | JSZip | Already in the project; handles folder structure and compression |
| Presigned URLs | Custom S3 signing | `@remotion/lambda/client` `presignUrl()` | Already used in existing render pipeline |

**Key insight:** Every problem in this phase has an existing solution either in Remotion's API or in the project's current codebase. The work is integration and adaptation, not invention.

## Common Pitfalls

### Pitfall 1: Lambda Timeout for Multi-Scene Movies

**What goes wrong:** Existing LAMBDA_TIMEOUT_MS is 60000ms (1 minute), and MAX_DURATION_FRAMES is 600 (20s at 30fps). A 5-scene movie at 5s each = 25s = 750 frames, already exceeding the limit.
**Why it happens:** Limits were set for single-clip rendering (Phase 5). Movies are inherently longer.
**How to avoid:** Create separate `MOVIE_RENDER_LIMITS` with higher values:
- `MAX_DURATION_SECONDS`: 120s (4 minutes of video -- generous for movie preview)
- `MAX_DURATION_FRAMES`: 3600 (120s * 30fps)
- `LAMBDA_TIMEOUT_MS`: 240000 (4 minutes -- Lambda renders in parallel chunks, so 120s of video takes much less than 120s to render)
**Warning signs:** Renders timing out or failing with duration validation errors.

### Pitfall 2: Lambda Bundle Must Include MovieComposition

**What goes wrong:** Lambda renders fail with "Composition not found" because MovieComposition is not registered in the Lambda serve bundle.
**Why it happens:** The existing Lambda bundle only registers `TextAnimation` (legacy) and `DynamicCode`. MovieComposition needs to be registered too.
**How to avoid:** Register MovieComposition in the Remotion root used by the Lambda bundle. This may require updating the serve URL bundle or adding a new composition entry.
**Warning signs:** "Composition 'MovieComposition' not found" errors from Lambda.

### Pitfall 3: InputProps Payload Size for Movies

**What goes wrong:** Passing N scenes' code as inputProps to Lambda may exceed payload limits if scenes have large code strings.
**Why it happens:** Lambda inputProps are serialized as JSON. AWS Lambda has a 6MB payload limit (synchronous). Each scene's code is typically 1-5KB, so 20 scenes = 20-100KB -- well within limits.
**How to avoid:** Monitor payload size. For safety, set a max scenes limit (e.g., 20 scenes). The code strings are compact (1-5KB each after transformation), so this is unlikely to be an issue for reasonable movie lengths.
**Warning signs:** Lambda invocation errors about payload size.

### Pitfall 4: Renders Schema Tied to Generations

**What goes wrong:** The existing `renders` table has `generationId: v.id("generations")` as a required field. Movie renders don't have a single generationId -- they span multiple clips.
**Why it happens:** The schema was designed for single-clip rendering in Phase 5.
**How to avoid:** Add an optional `movieId: v.optional(v.id("movies"))` field to the renders table. Make `generationId` optional or use a sentinel/null approach. Alternatively, keep `generationId` required but create a "virtual" generation record for the movie render. The simplest approach: make `generationId` optional and add `movieId` as an optional field.
**Warning signs:** Convex schema validation errors when trying to create a render without a generationId.

### Pitfall 5: FPS Mismatch Between Scenes

**What goes wrong:** If scenes have different FPS values, the Series composition becomes inconsistent (some scenes play too fast/slow).
**Why it happens:** Although `addScene` enforces fps matching, older clips or edge cases could have mismatched fps.
**How to avoid:** The movie already stores a single `fps` field and `addScene` validates fps match. MovieComposition uses per-scene fps in DynamicCode, but the Player/Series needs one global fps. Use the movie's `fps` for the Player and trust that all scenes match (enforced by the backend).
**Warning signs:** Scenes playing at wrong speed in preview.

### Pitfall 6: Deleted Clips in Movie Scenes

**What goes wrong:** A clip referenced by a movie scene gets deleted. The movie preview crashes or shows blank frames.
**Why it happens:** The `getWithClips` query already handles this by preserving null entries in `sceneClips`. But the MovieComposition and Player need to handle null clips gracefully.
**How to avoid:** Filter out null clips when building the scenes array for MovieComposition. Show a placeholder or skip the scene. Recalculate total duration excluding null clips.
**Warning signs:** Null pointer errors in MovieComposition, "Missing clip" in timeline but crash in preview.

## Code Examples

### Example 1: MoviePreviewPlayer Component

```typescript
// Source: Pattern derived from existing PreviewPlayer + MovieComposition
"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { MovieComposition, type MovieScene } from "@/remotion/compositions/MovieComposition";
import { useCurrentPlayerFrame } from "@/hooks/use-current-player-frame";

interface MoviePreviewPlayerProps {
  scenes: MovieScene[];
  fps: number;
  totalDurationInFrames: number;
  onActiveSceneChange?: (sceneIndex: number) => void;
}

function MoviePreviewPlayerInner({
  scenes,
  fps,
  totalDurationInFrames,
  onActiveSceneChange,
}: MoviePreviewPlayerProps) {
  const playerRef = useRef<PlayerRef>(null);
  const frame = useCurrentPlayerFrame(playerRef);

  // Compute scene timings (memoized)
  const sceneTimings = useMemo(() => {
    let offset = 0;
    return scenes.map((scene, index) => {
      const timing = { startFrame: offset, endFrame: offset + scene.durationInFrames, sceneIndex: index };
      offset += scene.durationInFrames;
      return timing;
    });
  }, [scenes]);

  // Determine active scene from frame
  const activeSceneIndex = useMemo(() => {
    for (const t of sceneTimings) {
      if (frame >= t.startFrame && frame < t.endFrame) return t.sceneIndex;
    }
    return scenes.length - 1;
  }, [frame, sceneTimings, scenes.length]);

  // Notify parent of active scene changes
  useEffect(() => {
    onActiveSceneChange?.(activeSceneIndex);
  }, [activeSceneIndex, onActiveSceneChange]);

  const inputProps = useMemo(() => ({ scenes }), [scenes]);

  return (
    <Player
      ref={playerRef}
      component={MovieComposition as any}
      inputProps={inputProps}
      durationInFrames={totalDurationInFrames}
      fps={fps}
      compositionWidth={1920}
      compositionHeight={1080}
      style={{ width: "100%" }}
      controls
      loop
    />
  );
}
```

### Example 2: startMovieRender Action

```typescript
// Source: Pattern derived from existing triggerRender.ts
export const startMovieRender = action({
  args: {
    movieId: v.id("movies"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Must be authenticated");

    // Check rate limit (same quota as clip renders)
    const quotaOk = await ctx.runMutation(internal.userQuotas.checkRenderQuota, {
      userId: identity.tokenIdentifier,
    });
    if (!quotaOk) throw new Error("Render quota exceeded");

    // Fetch movie with clips
    const movie = await ctx.runQuery(internal.movies.getWithClipsInternal, { id: args.movieId });
    if (!movie) throw new Error("Movie not found");

    // Build scenes array from clips (skip nulls)
    const scenes = movie.sceneClips
      .filter((clip): clip is NonNullable<typeof clip> => clip !== null)
      .map((clip) => ({
        code: clip.code,
        durationInFrames: clip.durationInFrames,
        fps: clip.fps,
      }));

    if (scenes.length === 0) throw new Error("Movie has no valid scenes");

    // Validate total duration
    const totalFrames = scenes.reduce((sum, s) => sum + s.durationInFrames, 0);
    if (totalFrames > MOVIE_RENDER_LIMITS.MAX_DURATION_FRAMES) {
      throw new Error("Movie too long to render");
    }

    // Trigger Lambda render
    const { renderId, bucketName } = await renderMediaOnLambda({
      region,
      functionName,
      serveUrl,
      composition: "MovieComposition",
      inputProps: { scenes },
      codec: "h264",
      timeoutInMilliseconds: MOVIE_RENDER_LIMITS.LAMBDA_TIMEOUT_MS,
    });

    // Store render job (with movieId instead of generationId)
    const renderJobId = await ctx.runMutation(internal.renders.create, {
      userId: identity.tokenIdentifier,
      movieId: args.movieId,
      renderId,
      bucketName,
      status: "rendering",
      progress: 0,
    });

    // Schedule progress polling
    await ctx.scheduler.runAfter(
      MOVIE_RENDER_LIMITS.POLL_INTERVAL_MS,
      internal.triggerRender.pollProgress,
      { renderJobId, renderId, bucketName, region }
    );

    return { renderJobId, renderId };
  },
});
```

### Example 3: Multi-Composition Movie Zip

```typescript
// Source: Pattern derived from existing export-project-zip.ts
export async function generateMovieProjectZip(options: {
  movieName: string;
  scenes: Array<{ rawCode: string; name: string; durationInFrames: number; fps: number }>;
  totalDurationInFrames: number;
  fps: number;
}): Promise<Blob> {
  const zip = new JSZip();
  const root = zip.folder("remotionlab-movie-export")!;
  const src = root.folder("src")!;

  // Generate individual scene files
  options.scenes.forEach((scene, index) => {
    const paddedIndex = String(index + 1).padStart(2, "0");
    const componentName = `Scene${paddedIndex}`;
    const usedAPIs = detectUsedAPIs(scene.rawCode);
    const { cleanedCode } = extractMetadata(scene.rawCode);
    const exportedCode = cleanedCode.replace(/^const MyComposition/m, `export const ${componentName}`);

    const remotionImports = usedAPIs.length > 0
      ? `import {\n${usedAPIs.map(a => `  ${a},`).join("\n")}\n} from "remotion";\n`
      : "";

    src.file(`${componentName}.tsx`, `// Scene: ${scene.name}\nimport React from "react";\n${remotionImports}\n${exportedCode}\n`);
  });

  // Generate MovieComposition.tsx with Series
  const sceneImports = options.scenes.map((_, i) => {
    const n = String(i + 1).padStart(2, "0");
    return `import { Scene${n} } from "./Scene${n}";`;
  }).join("\n");

  const seriesSequences = options.scenes.map((scene, i) => {
    const n = String(i + 1).padStart(2, "0");
    return `      <Series.Sequence durationInFrames={${scene.durationInFrames}}>\n        <Scene${n} />\n      </Series.Sequence>`;
  }).join("\n");

  src.file("MovieComposition.tsx", `import React from "react";
import { Series } from "remotion";
${sceneImports}

export const MovieComposition: React.FC = () => {
  return (
    <Series>
${seriesSequences}
    </Series>
  );
};
`);

  // Generate Root.tsx with all compositions
  const sceneCompositions = options.scenes.map((scene, i) => {
    const n = String(i + 1).padStart(2, "0");
    return `      <Composition id="Scene${n}" component={Scene${n}} durationInFrames={${scene.durationInFrames}} fps={${scene.fps}} width={1920} height={1080} />`;
  }).join("\n");

  src.file("Root.tsx", `import React from "react";
import { Composition } from "remotion";
import { MovieComposition } from "./MovieComposition";
${options.scenes.map((_, i) => `import { Scene${String(i + 1).padStart(2, "0")} } from "./Scene${String(i + 1).padStart(2, "0")}";`).join("\n")}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Movie" component={MovieComposition} durationInFrames={${options.totalDurationInFrames}} fps={${options.fps}} width={1920} height={1080} />
${sceneCompositions}
    </>
  );
};
`);

  // index.ts, package.json, tsconfig.json, remotion.config.ts (same as single-clip)
  src.file("index.ts", `import { registerRoot } from "remotion";\nimport { RemotionRoot } from "./Root";\n\nregisterRoot(RemotionRoot);\n`);
  root.file("package.json", generateMoviePackageJson(options.movieName));
  root.file("tsconfig.json", generateTsConfig());
  root.file("remotion.config.ts", generateRemotionConfig());

  return zip.generateAsync({ type: "blob" });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useState` + `setInterval` for player sync | `useSyncExternalStore` + `frameupdate` | Remotion v4 docs | Better performance, no unnecessary re-renders |
| Single composition per project | Multi-composition with Fragment in Root | Always supported | Enables both individual scene and full movie renders in exported project |
| Manual frame offsetting with `<Sequence from={}>` | `<Series>` auto-sequencing | Remotion v3+ | Series handles all frame math automatically |

**Deprecated/outdated:**
- `Config.setVideoImageFormat()` in remotion.config.ts: Still works in v4 but export templates should use it. The existing export already uses this.
- `renderMedia` (local rendering): Still available but Lambda is the project's chosen approach.

## Open Questions

1. **Lambda Bundle Registration for MovieComposition**
   - What we know: The existing Lambda serve URL bundle must register all compositions that can be rendered. Currently only TextAnimation is registered (used by legacy render path). DynamicCode is used but may not be registered as a named composition in the bundle.
   - What's unclear: How the serve URL is built and deployed. The `serveUrl` env var points to a pre-built bundle. Adding MovieComposition requires re-deploying the bundle.
   - Recommendation: Investigate the current bundle setup. If using `npx remotion lambda sites create`, the bundle needs to include a Root.tsx that registers MovieComposition. This is a deployment/infrastructure step.

2. **Renders Schema Migration for Movie Renders**
   - What we know: The renders table requires `generationId: v.id("generations")`. Movie renders need `movieId` instead.
   - What's unclear: Whether Convex supports optional validators for existing required fields without a migration.
   - Recommendation: Add `movieId: v.optional(v.id("movies"))` to the renders schema. Make `generationId` optional: `generationId: v.optional(v.id("generations"))`. Existing render records all have generationId, so making it optional is backward-compatible. The `renders.create` mutation needs to accept either `generationId` or `movieId`.

3. **Single-Clip MP4 Render from Library/Create Page**
   - What we know: OUT-03 requires exporting a single clip as MP4. The existing render pipeline (RenderButton) uses `api.triggerRender.startRender` which expects `animationProps` for TextAnimation -- the legacy v1.0 path. It does NOT support rendering DynamicCode compositions (the v1.1 code-generation path).
   - What's unclear: Whether to adapt the existing startRender or create a new `startClipRender` action that takes `code` + timing instead of `animationProps`.
   - Recommendation: Create a new `startClipRender` action that renders the DynamicCode composition with `code` as inputProps. This keeps the legacy path working and adds the new code-based rendering path. The DynamicCode composition must also be registered in the Lambda bundle.

4. **Scene Limit for Movie Renders**
   - What we know: Lambda has a 6MB payload limit. Each scene's code is 1-5KB.
   - What's unclear: Exact practical limit for number of scenes.
   - Recommendation: Set a conservative limit of 20 scenes per movie render. At 5KB per scene, that's 100KB payload -- well within limits. Add validation in the movie render action.

## Sources

### Primary (HIGH confidence)
- Remotion Series docs: https://www.remotion.dev/docs/series -- Series.Sequence props, auto-frame-reset behavior
- Remotion Player docs: https://www.remotion.dev/docs/player/player -- PlayerRef API, events, controls
- Remotion Player current time: https://www.remotion.dev/docs/player/current-time -- useSyncExternalStore pattern for frame sync
- Remotion Sequence docs: https://www.remotion.dev/docs/sequence -- Frame shifting behavior (useCurrentFrame resets to 0 within Sequence)
- Remotion Lambda renderMediaOnLambda: https://www.remotion.dev/docs/lambda/rendermediaonlambda -- Required/optional params, codec, inputProps
- Remotion Lambda getRenderProgress: https://www.remotion.dev/docs/lambda/getrenderprogress -- Progress fields, done/error detection
- Remotion Lambda limits: https://www.remotion.dev/docs/lambda/limits -- Concurrency max 200, storage max 10GB, timeout max 900s
- Existing codebase: `/src/remotion/compositions/MovieComposition.tsx` -- Series-based scene sequencing
- Existing codebase: `/convex/triggerRender.ts` -- Full render pipeline with Lambda + polling
- Existing codebase: `/src/lib/export-project-zip.ts` -- JSZip-based project scaffold generation
- Existing codebase: `/convex/schema.ts` -- renders table schema with generationId requirement
- Existing codebase: `/convex/lib/renderLimits.ts` -- Current limits (20s max, 60s Lambda timeout)

### Secondary (MEDIUM confidence)
- Remotion multi-composition pattern: https://www.remotion.dev/docs/composition -- Multiple Composition entries in a Fragment for registerRoot
- Remotion Lambda deploy/setup: https://www.remotion.dev/docs/lambda/setup -- Bundle deployment, timeout defaults (120s)
- AWS Lambda hard limits: 900s max timeout, 6MB sync payload -- per AWS docs

### Tertiary (LOW confidence)
- None -- all findings verified with official sources or existing codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and used in the project
- Architecture: HIGH -- patterns derived from existing codebase + official Remotion docs
- Pitfalls: HIGH -- identified from concrete schema/limit constraints in codebase

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (stable -- Remotion v4 is mature, project architecture is settled)
