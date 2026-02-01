# Phase 13: Generation Feed & Settings - Research

**Researched:** 2026-02-01
**Domain:** Convex paginated queries, Remotion Thumbnail rendering, localStorage persistence in Next.js, aspect ratio handling
**Confidence:** HIGH

## Summary

Phase 13 transforms the create page from a single-generation workspace into a scrolling feed of all past generations with configurable settings (aspect ratio, duration, FPS). The work breaks into three technical domains: (1) schema evolution to support new fields (batchId, variationIndex, aspectRatio, fps, durationInSeconds) with backward-compatible `v.optional()` fields, (2) a settings panel with localStorage persistence using a custom SSR-safe hook, and (3) a paginated feed using Convex's `usePaginatedQuery` with the Remotion `<Thumbnail>` component for static previews.

The codebase currently has 1920x1080 hardcoded in all Player/Thumbnail usages (6 locations across preview-player.tsx, clip-card.tsx, movie-preview-player.tsx, timeline-scene.tsx, add-scene-panel.tsx). The generation action in `generateAnimation.ts` hardcodes `fps: 30` and has no concept of aspect ratio or user-configurable dimensions. The `generations.list` query returns a flat `take(50)` -- no pagination. All of these need to change.

The standard approach is well-established: Convex pagination is a first-class feature with `paginationOptsValidator` on the server and `usePaginatedQuery` on the client. The Remotion `<Thumbnail>` component (from `@remotion/player`) renders a single frame efficiently and is already used in `clip-card.tsx`. localStorage in Next.js requires a hydration-safe pattern (initialize with defaults, read in useEffect). No new dependencies are needed.

**Primary recommendation:** Add optional fields to the generations schema (no migration needed for `v.optional`), create a paginated query using Convex's built-in pagination, render feed thumbnails with Remotion's `<Thumbnail>` component, and persist settings via a custom `useLocalStorage` hook that defers reads to after hydration.

## Standard Stack

### Core (already installed -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `convex` | ^1.31.6 | Paginated queries, schema validators, `paginationOptsValidator` | Already installed; pagination is built-in |
| `@remotion/player` | ^4.0.410 | `<Thumbnail>` component for static frame rendering | Already installed and used in clip-card.tsx |
| `remotion` | ^4.0.410 | Composition framework, `useVideoConfig()` | Already installed |
| `react` | 19.2.3 | `useState`, `useEffect`, `useCallback`, `useMemo` for hooks | Already installed |
| `lucide-react` | ^0.563.0 | Icons for settings panel (Settings2, Monitor, Square, Smartphone) | Already installed |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sonner` | ^2.0.7 | Toast notifications for settings save/reset | User feedback |
| `@radix-ui/react-dialog` | ^1.1.15 | Settings panel as sheet/dialog if desired | Already have Dialog UI component |
| `tailwindcss` | ^4 | Styling for feed rows and settings panel | Already in use everywhere |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom `useLocalStorage` hook | `usehooks-ts` package | Adding a dependency for one hook is overkill; custom hook is ~20 lines |
| Convex `usePaginatedQuery` | `getPage` from `convex-helpers` | `usePaginatedQuery` is the standard built-in; `getPage` adds complexity for no benefit at this scale |
| Remotion `<Thumbnail>` for feed | Server-rendered static screenshots | Thumbnail is already used in clip-card.tsx, renders client-side with zero infrastructure, is sufficient for a feed of ~50-100 items |
| localStorage for settings | Convex user document (server-side) | localStorage is faster (no network), works offline, appropriate for UI preferences; server storage would be needed for cross-device sync which is not a v0.2 requirement |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure

```
convex/
  schema.ts                    # Add optional fields to generations table + by_batchId index
  generations.ts               # Add listPaginated query, update store mutation args
  generateAnimation.ts         # Accept aspectRatio/duration/fps settings, pass to Claude prompt

src/
  hooks/
    use-local-storage.ts       # New: SSR-safe useLocalStorage hook
    use-generation-settings.ts # New: Settings state hook wrapping useLocalStorage
  components/
    generation/
      generation-feed.tsx      # New: Feed container with usePaginatedQuery + load more
      generation-row.tsx       # New: Single generation row (thumbnail + prompt + metadata)
      generation-settings.tsx  # New: Settings panel (aspect ratio, duration, FPS)
  app/(app)/create/
    create-page-client.tsx     # Refactor: integrate feed + settings into create page
```

### Pattern 1: Convex Paginated Query

**What:** Server-side paginated query with client-side infinite scroll
**When to use:** Listing all user generations in the feed
**Example:**

```typescript
// Source: https://docs.convex.dev/database/pagination
// convex/generations.ts
import { paginationOptsValidator } from "convex/server";

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in");
    }

    return await ctx.db
      .query("generations")
      .withIndex("by_user_created", (q) =>
        q.eq("userId", identity.tokenIdentifier)
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
```

```typescript
// Source: https://docs.convex.dev/database/pagination
// Client usage
import { usePaginatedQuery } from "convex/react";

const { results, status, loadMore } = usePaginatedQuery(
  api.generations.listPaginated,
  {},
  { initialNumItems: 10 }
);
```

### Pattern 2: SSR-Safe useLocalStorage

**What:** A custom hook that reads localStorage only after hydration to prevent SSR mismatches
**When to use:** Persisting generation settings (aspect ratio, duration, FPS) across sessions
**Example:**

```typescript
// Source: https://usehooks-ts.com/react-hook/use-local-storage (pattern adapted)
// src/hooks/use-local-storage.ts
import { useState, useEffect, useCallback } from "react";

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Always initialize with the default (SSR-safe)
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Read from localStorage after mount (client-only)
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
  }, [key]);

  // Write to localStorage on change
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
        } catch (error) {
          console.warn(`Error writing localStorage key "${key}":`, error);
        }
        return nextValue;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}
```

### Pattern 3: Aspect Ratio Presets with Dimensions

**What:** Map named aspect ratios to pixel dimensions for Remotion compositions
**When to use:** Settings panel selection and Player/Thumbnail rendering
**Example:**

```typescript
// src/lib/aspect-ratios.ts
export const ASPECT_RATIO_PRESETS = {
  "16:9": { width: 1920, height: 1080, label: "Landscape" },
  "1:1":  { width: 1080, height: 1080, label: "Square" },
  "9:16": { width: 1080, height: 1920, label: "Portrait" },
} as const;

export type AspectRatioKey = keyof typeof ASPECT_RATIO_PRESETS;
export const DEFAULT_ASPECT_RATIO: AspectRatioKey = "16:9";
```

### Pattern 4: Remotion Thumbnail in Feed Rows

**What:** Render a single frame of each generation as a static preview
**When to use:** Displaying generation thumbnails in the feed
**Example:**

```typescript
// Source: https://www.remotion.dev/docs/player/thumbnail
import { Thumbnail } from "@remotion/player";
import { DynamicCode } from "@/remotion/compositions/DynamicCode";

<Thumbnail
  component={DynamicCode}
  inputProps={{
    code: generation.code,
    durationInFrames: generation.durationInFrames ?? 90,
    fps: generation.fps ?? 30,
  }}
  compositionWidth={width}   // From aspect ratio preset
  compositionHeight={height}  // From aspect ratio preset
  frameToDisplay={Math.floor((generation.durationInFrames ?? 90) / 2)}
  durationInFrames={generation.durationInFrames ?? 90}
  fps={generation.fps ?? 30}
  style={{ width: "100%" }}
/>
```

### Anti-Patterns to Avoid

- **Hardcoding 1920x1080 in new code:** All new Player/Thumbnail usages must derive dimensions from the generation's aspectRatio field or the current settings. The existing hardcoded values in preview-player.tsx and other components will be updated when they are wired to the feed.
- **Reading localStorage during SSR:** Never call `window.localStorage` outside of `useEffect` or event handlers. The custom hook handles this.
- **Creating a separate query per feed item:** Do NOT query individual generations. The paginated query returns all needed data in one subscription.
- **Using live `<Player>` instead of `<Thumbnail>` for feed items:** The Player runs animation loops and is expensive. Use `<Thumbnail>` for the feed grid (renders one frame), and `<Player>` only for the selected/expanded generation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Paginated data fetching | Custom cursor management, manual page tracking | `usePaginatedQuery` from `convex/react` + `paginationOptsValidator` from `convex/server` | Convex pagination handles reactive updates, cursor management, page stitching, and deduplication automatically |
| Static frame rendering | Canvas screenshot capture, server-side rendering | Remotion `<Thumbnail>` component from `@remotion/player` | Already renders a single frame of any composition; handles async loading, error fallback, scaling |
| Settings persistence | Manual localStorage read/write scattered across components | Custom `useLocalStorage` hook (see Pattern 2) | Centralizes hydration safety, JSON serialization, error handling |
| Aspect ratio dimension mapping | Inline width/height calculations | Typed constant map (see Pattern 3) | Single source of truth for dimensions; TypeScript enforcement prevents dimension mismatches |

**Key insight:** Every piece of infrastructure needed for this phase already exists as a built-in feature of Convex (pagination), Remotion (Thumbnail), or the browser (localStorage). The work is wiring them together, not building new abstractions.

## Common Pitfalls

### Pitfall 1: SSR Hydration Mismatch with localStorage

**What goes wrong:** Reading localStorage during SSR renders different HTML than the server, causing React hydration errors ("Text content does not match server-rendered HTML").
**Why it happens:** `window.localStorage` does not exist on the server. If you read it during initial render, the server renders with defaults while the client renders with stored values.
**How to avoid:** Use the `useLocalStorage` hook that initializes with the default value and reads localStorage only inside `useEffect` (which runs only on the client after hydration).
**Warning signs:** Console errors about hydration mismatch; settings "flash" from default to stored value on page load.

### Pitfall 2: Pagination Resets on Argument Change

**What goes wrong:** The paginated feed resets to page 1 every time the query arguments change, losing scroll position and loaded data.
**Why it happens:** Convex's `usePaginatedQuery` resets pagination state when the query reference or arguments change. If settings state is included in query args, changing settings resets the feed.
**How to avoid:** Keep the paginated query arguments stable. Generation settings (aspect ratio, duration, FPS) are NOT query filters -- they are applied at generation time and stored per-generation. The feed query only needs the user ID (from auth) and pagination opts.
**Warning signs:** Feed "jumps" to top when user changes settings; `status` returns to `"LoadingFirstPage"` unexpectedly.

### Pitfall 3: Thumbnail Performance with Many Compositions

**What goes wrong:** Rendering 10-20+ Remotion `<Thumbnail>` components simultaneously causes browser lag, especially for complex animations.
**Why it happens:** Each `<Thumbnail>` renders a full React component tree and executes the generated code (DynamicCode runs `executeCode` for each instance).
**How to avoid:** (a) Use `initialNumItems: 10` for the paginated query to limit initial render count. (b) Only render thumbnails for visible items (native scroll + small page size makes this manageable without virtualization). (c) Display thumbnails at a small size (the `style` prop scales the rendering canvas down). (d) Consider lazy-loading thumbnails with a mounted check for below-fold items.
**Warning signs:** Page feels slow on scroll; Chrome DevTools shows high JS execution time on mount.

### Pitfall 4: Backward Compatibility with Existing Generations

**What goes wrong:** Existing generations in the database do not have the new schema fields (batchId, variationIndex, aspectRatio, etc.), causing TypeScript errors or runtime crashes when accessing them.
**Why it happens:** New `v.optional()` fields return `undefined` for existing documents that were created before the schema change. Code that assumes these fields exist will fail.
**How to avoid:** (a) All new fields MUST be `v.optional()`. (b) In the feed UI, provide defaults for missing values: `generation.aspectRatio ?? "16:9"`, `generation.fps ?? 30`, `generation.durationInFrames ?? 90`. (c) In the generation-row component, handle the case where `code` might be `undefined` (failed generations have no code).
**Warning signs:** TypeScript errors about `string | undefined` not assignable to `string`; thumbnails crash for old generations.

### Pitfall 5: Aspect Ratio Mismatch Between Settings and Claude Output

**What goes wrong:** User sets aspect ratio to 9:16 (portrait), but Claude generates code that looks wrong because it was not told about the dimensions.
**Why it happens:** The current system prompt tells Claude to use `useVideoConfig()` for dimensions, but the `compositionWidth` and `compositionHeight` are hardcoded to 1920x1080 in the Player. If we change the Player dimensions but the generated code assumes landscape layout, the output will be stretched or cropped.
**How to avoid:** (a) Pass the selected aspect ratio dimensions to the Claude system prompt: "The composition dimensions are {width}x{height} ({ratio})". (b) Update `compositionWidth`/`compositionHeight` in the Player and Thumbnail to match the generation's aspect ratio. (c) Store the aspect ratio per-generation so thumbnails render at the correct dimensions.
**Warning signs:** Generated animations look squished or stretched; text is cut off in portrait mode.

### Pitfall 6: DynamicCode Width/Height Props Not Used

**What goes wrong:** `DynamicCode` component accepts optional `width` and `height` props but the existing code ignores them (they are eslint-disabled unused vars).
**Why it happens:** Currently all compositions are 1920x1080 so the props were added for future use but never wired.
**How to avoid:** This is fine -- the `compositionWidth` and `compositionHeight` props on `<Player>` and `<Thumbnail>` control the actual canvas dimensions. The DynamicCode component does not need to use them internally because `useVideoConfig()` inside the generated code will automatically return the dimensions set by the Player/Thumbnail wrapper.
**Warning signs:** None -- this is a non-issue as long as Player/Thumbnail dimensions are correct.

## Code Examples

### Server-Side Paginated Query

```typescript
// convex/generations.ts
import { query, internalMutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in to view generations");
    }

    return await ctx.db
      .query("generations")
      .withIndex("by_user_created", (q) =>
        q.eq("userId", identity.tokenIdentifier)
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
```

### Client-Side Feed with Load More

```typescript
// src/components/generation/generation-feed.tsx
import { usePaginatedQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { GenerationRow } from "./generation-row";
import { Button } from "@/components/ui/button";

export function GenerationFeed() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.generations.listPaginated,
    {},
    { initialNumItems: 10 }
  );

  if (status === "LoadingFirstPage") {
    return <div className="animate-pulse">Loading generations...</div>;
  }

  return (
    <div className="space-y-4">
      {results.map((generation) => (
        <GenerationRow key={generation._id} generation={generation} />
      ))}

      {status === "CanLoadMore" && (
        <Button
          variant="outline"
          onClick={() => loadMore(10)}
          className="w-full"
        >
          Load More
        </Button>
      )}

      {status === "LoadingMore" && (
        <div className="text-center text-muted-foreground text-sm py-2">
          Loading more...
        </div>
      )}

      {status === "Exhausted" && results.length > 0 && (
        <div className="text-center text-muted-foreground text-sm py-2">
          All generations loaded
        </div>
      )}
    </div>
  );
}
```

### Schema with New Optional Fields

```typescript
// convex/schema.ts -- generations table (updated)
generations: defineTable({
  userId: v.string(),
  prompt: v.string(),
  code: v.optional(v.string()),
  rawCode: v.optional(v.string()),
  // Legacy v1.0 field (deprecated)
  animationProps: v.optional(v.object({
    text: v.string(),
    style: v.string(),
    color: v.string(),
    backgroundColor: v.string(),
    fontFamily: v.string(),
    fontSize: v.number(),
    durationInFrames: v.number(),
    fps: v.number(),
  })),
  durationInFrames: v.optional(v.number()),
  fps: v.optional(v.number()),
  status: v.union(v.literal("success"), v.literal("failed")),
  errorMessage: v.optional(v.string()),
  createdAt: v.number(),
  // v0.2 Phase 13: batch/variation tracking
  batchId: v.optional(v.string()),
  variationIndex: v.optional(v.number()),
  variationCount: v.optional(v.number()),
  // v0.2 Phase 13: generation settings
  aspectRatio: v.optional(v.string()),  // "16:9" | "1:1" | "9:16"
  durationInSeconds: v.optional(v.number()),
  // v0.2 Phase 15: image upload (placeholder for future)
  referenceImageIds: v.optional(v.array(v.string())),
  // v0.2 Phase 12: continuation tracking
  continuationType: v.optional(v.string()),
})
  .index("by_user", ["userId"])
  .index("by_user_created", ["userId", "createdAt"])
  .index("by_batchId", ["batchId"]),
```

### Settings Hook with localStorage Persistence

```typescript
// src/hooks/use-generation-settings.ts
import { useLocalStorage } from "./use-local-storage";

export interface GenerationSettings {
  aspectRatio: "16:9" | "1:1" | "9:16";
  durationInSeconds: number;
  fps: number;
}

const DEFAULT_SETTINGS: GenerationSettings = {
  aspectRatio: "16:9",
  durationInSeconds: 3,
  fps: 30,
};

const STORAGE_KEY = "remotionlab-generation-settings";

export function useGenerationSettings() {
  const [settings, setSettings] = useLocalStorage<GenerationSettings>(
    STORAGE_KEY,
    DEFAULT_SETTINGS
  );

  const updateSetting = <K extends keyof GenerationSettings>(
    key: K,
    value: GenerationSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return { settings, updateSetting, resetSettings };
}
```

### Aspect Ratio Selector UI

```typescript
// src/components/generation/generation-settings.tsx (excerpt)
import { ASPECT_RATIO_PRESETS, type AspectRatioKey } from "@/lib/aspect-ratios";
import { Monitor, Square, Smartphone } from "lucide-react";

const ASPECT_RATIO_ICONS: Record<AspectRatioKey, React.ReactNode> = {
  "16:9": <Monitor className="h-4 w-4" />,
  "1:1": <Square className="h-4 w-4" />,
  "9:16": <Smartphone className="h-4 w-4" />,
};

// Render as a button group
{(Object.keys(ASPECT_RATIO_PRESETS) as AspectRatioKey[]).map((ratio) => (
  <Button
    key={ratio}
    variant={settings.aspectRatio === ratio ? "default" : "outline"}
    size="sm"
    onClick={() => updateSetting("aspectRatio", ratio)}
  >
    {ASPECT_RATIO_ICONS[ratio]}
    <span className="ml-2">{ASPECT_RATIO_PRESETS[ratio].label}</span>
  </Button>
))}
```

### Updated Generate Action (accepting settings)

```typescript
// convex/generateAnimation.ts -- updated generate action args
export const generate = action({
  args: {
    prompt: v.string(),
    aspectRatio: v.optional(v.string()),  // "16:9" | "1:1" | "9:16"
    durationInSeconds: v.optional(v.number()),
    fps: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // ... existing auth + validation ...

    // Resolve dimensions from aspect ratio
    const aspectRatio = args.aspectRatio ?? "16:9";
    const dimensions = ASPECT_RATIO_MAP[aspectRatio] ?? { width: 1920, height: 1080 };
    const targetDuration = args.durationInSeconds ?? 3;
    const targetFps = args.fps ?? 30;
    const targetFrames = Math.round(targetDuration * targetFps);

    // Inject dimensions into system prompt
    const enhancedPrompt = SYSTEM_PROMPT +
      `\n\nIMPORTANT COMPOSITION SETTINGS:\n` +
      `- Dimensions: ${dimensions.width}x${dimensions.height} (${aspectRatio})\n` +
      `- Duration: ${targetFrames} frames\n` +
      `- FPS: ${targetFps}\n` +
      `- Use // DURATION: ${targetFrames} and // FPS: ${targetFps} in your output`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      system: enhancedPrompt,
      messages: [{ role: "user", content: args.prompt }],
    });

    // ... existing code extraction, validation, transformation ...

    // Store with new fields
    const generationId = await ctx.runMutation(internal.generations.store, {
      userId: identity.tokenIdentifier,
      prompt: args.prompt,
      code: transformed.code,
      rawCode,
      durationInFrames,
      fps: targetFps,
      aspectRatio,
      durationInSeconds: targetDuration,
      status: "success",
      createdAt: Date.now(),
    });

    return { id: generationId, rawCode, code: transformed.code, durationInFrames, fps: targetFps };
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `generations.list` with `take(50)` | `generations.listPaginated` with `paginationOptsValidator` | Phase 13 | Feed can grow beyond 50 items; load-on-demand reduces initial payload |
| Hardcoded 1920x1080 everywhere | Dynamic dimensions from aspect ratio preset | Phase 13 | Supports portrait (1080x1920), square (1080x1080), and landscape (1920x1080) |
| No settings persistence | localStorage via `useLocalStorage` hook | Phase 13 | User preferences survive page refresh and browser restart |
| Generate action takes only `prompt` | Generate action takes `prompt` + `aspectRatio` + `durationInSeconds` + `fps` | Phase 13 | Claude receives dimension context; output matches user's chosen format |

**Deprecated/outdated:**
- `generations.list` (non-paginated): Keep for backward compatibility but feed should use `listPaginated`
- The existing `generations.list` query will NOT be removed (other pages may use it), but the create page feed will exclusively use the new paginated query

## Open Questions

1. **How many thumbnails can render simultaneously without visible lag?**
   - What we know: The `<Thumbnail>` component runs `DynamicCode` which calls `executeCode` (Function constructor). Each instance is a separate React tree. The clip-card.tsx already uses Thumbnail successfully in a grid of ~10-20 clips.
   - What's unclear: Whether 10-20 thumbnails with complex generated code will cause visible jank on page load. The feed page will potentially show more items than the library page.
   - Recommendation: Start with `initialNumItems: 10`, measure performance, add lazy-loading for below-fold items only if needed. This is explicitly out of scope for v0.2 per requirements (FEED-03 deferred).

2. **Should the old `generations.list` query be deprecated or kept?**
   - What we know: The existing `list` query is used nowhere in the current create-page-client.tsx (the page only shows the most recent generation, not a list). It may be used by other pages or future features.
   - What's unclear: Whether any other part of the app calls `generations.list`.
   - Recommendation: Keep it. Add the new `listPaginated` alongside it. Remove the old one only when confirmed unused.

3. **Lambda render with non-16:9 dimensions**
   - What we know: The current `startClipRender` action uses `DynamicCode` composition but does NOT pass `compositionWidth`/`compositionHeight` overrides to Lambda. The Lambda render uses whatever the Remotion bundle's default dimensions are (1920x1080 in the Composition registration).
   - What's unclear: Whether `renderMediaOnLambda` supports overriding `compositionWidth`/`compositionHeight` via inputProps or needs a new CLI flag. The DynamicCode inputProps do include optional `width`/`height` fields.
   - Recommendation: This is a Phase 13 concern only for preview (Player/Thumbnail). Lambda render aspect ratio support can be addressed when rendering is updated (likely Phase 16 or a follow-up). For now, store the aspectRatio per-generation so the data is there when rendering catches up.

## Sources

### Primary (HIGH confidence)
- [Convex Paginated Queries docs](https://docs.convex.dev/database/pagination) - `paginationOptsValidator`, `usePaginatedQuery` API, status values, complete examples
- [Remotion `<Thumbnail>` docs](https://www.remotion.dev/docs/player/thumbnail) - All props, import path, usage examples, performance notes
- [Remotion Player Sizing docs](https://www.remotion.dev/docs/player/scaling) - compositionWidth/compositionHeight behavior, responsive scaling, aspect ratio handling
- [Remotion Dynamic Metadata docs](https://www.remotion.dev/docs/dynamic-metadata) - calculateMetadata pattern, dynamic width/height/duration/fps
- Existing codebase: `convex/schema.ts`, `convex/generations.ts`, `convex/generateAnimation.ts`, `src/components/library/clip-card.tsx` (Thumbnail usage), `src/components/preview/preview-player.tsx` (Player usage)

### Secondary (MEDIUM confidence)
- [Convex schema docs](https://docs.convex.dev/database/schemas) - `v.optional()` behavior, schema evolution patterns
- [Next.js hydration error docs](https://nextjs.org/docs/messages/react-hydration-error) - SSR/hydration mismatch causes and solutions
- [usehooks-ts useLocalStorage](https://usehooks-ts.com/react-hook/use-local-storage) - SSR-safe localStorage patterns, `initializeWithValue` flag
- Multiple community sources confirming the `useState(default) + useEffect(read)` pattern for SSR-safe localStorage

### Tertiary (LOW confidence)
- None -- all key claims verified with official documentation or codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies; all libraries already installed and verified in codebase
- Architecture: HIGH - Convex pagination and Remotion Thumbnail are documented first-class features with existing usage in this codebase
- Pitfalls: HIGH - All pitfalls derived from official documentation warnings or direct codebase inspection (e.g., the 6 hardcoded 1920x1080 locations)
- Code examples: HIGH - Based on official Convex/Remotion docs and existing codebase patterns

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (stable -- all technologies are mature, no fast-moving changes expected)
