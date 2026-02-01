# Phase 14: Variations - Research

**Researched:** 2026-02-01
**Domain:** Convex parallel action orchestration, Anthropic Claude temperature control, Remotion Thumbnail grid UI, batch grouping in paginated feeds
**Confidence:** HIGH

## Summary

Phase 14 adds the ability for users to generate 1-4 distinct compositions from a single prompt via parallel Claude API calls, then view them as a grid of thumbnails in the feed, select one to expand, and use it for all downstream actions (save, render, continue, edit). This builds directly on Phase 13's schema (batchId, variationIndex, variationCount fields already exist) and feed infrastructure.

The research covers three core domains: (1) server-side orchestration of parallel Claude calls within a single Convex action using `Promise.all`, (2) the Anthropic API temperature parameter to ensure meaningful diversity between variations, and (3) client-side UI patterns for grouping generations by batchId into variation grids with selection state. The approach is to create a new `generateVariations` action that wraps the existing generation logic into a helper function, calls it N times in parallel with `temperature: 0.9`, and stores each result with a shared batchId. On the client, the feed groups generations by batchId and renders a thumbnail grid per batch.

No new dependencies are needed. The entire implementation uses Convex actions (Promise.all for parallelism), the existing Anthropic SDK (temperature param), existing Remotion Thumbnail component (multiple instances in a CSS grid), and the existing generation settings hook (extended with variationCount). The schema already has the required fields from Phase 13.

**Primary recommendation:** Create a server-side `generateVariations` action that runs 1-4 Claude calls in parallel via `Promise.all`, sharing a batchId. On the client, group feed results by batchId and render a grid of Thumbnails with V1-V4 badges, where clicking a thumbnail selects that variation for preview/edit/save.

## Standard Stack

### Core (already installed -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `convex` | ^1.31.6 | Actions with `Promise.all` for parallel execution, `ctx.runMutation` for storing results | Already installed; actions support up to 1000 concurrent operations |
| `@anthropic-ai/sdk` | ^0.71.2 | `client.messages.create()` with `temperature` param for variation diversity | Already installed; temperature is a standard API parameter |
| `@remotion/player` | ^4.0.410 | `<Thumbnail>` component for rendering variation preview frames | Already installed and used in generation-row.tsx |
| `react` | 19.2.3 | `useState`, `useCallback`, `useMemo` for selection state and grouping logic | Already installed |
| `lucide-react` | ^0.563.0 | Icons for variation UI (Grid2x2, Layers, etc.) | Already installed |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sonner` | ^2.0.7 | Toast notifications for generation progress/completion | Multi-variation generation feedback |
| `tailwindcss` | ^4 | CSS grid styling for variation thumbnail grid | Grid layout for 1-4 thumbnails |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single `generateVariations` action with `Promise.all` | Multiple client-side `generate()` calls | Server-side is better: single batchId coordination, atomic error handling, no client connection issues mid-generation |
| `temperature: 0.9` for diversity | `temperature: 1.0` (default) | 0.9 provides good diversity while being slightly more constrained; 1.0 is already the default and would also work, but 0.9 is a deliberate design choice from the project decisions |
| Client-side batchId grouping via `Array.reduce` | Server-side query that groups by batchId | Client-side grouping is simpler; the feed already returns all data needed; server-side grouping would require a new query pattern that Convex's standard pagination does not natively support |
| CSS Grid for thumbnail layout | Masonry/gallery library | Overkill for a fixed 1-4 item grid; CSS grid with `grid-template-columns` handles this trivially |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure

```
convex/
  generateAnimation.ts         # Add generateVariations action + extract helper function
  generations.ts               # No changes needed (store mutation already accepts batch fields)
  schema.ts                    # No changes needed (batchId, variationIndex, variationCount already exist)

src/
  hooks/
    use-generation-settings.ts # Extend GenerationSettings with variationCount field
  components/
    generation/
      generation-settings.tsx  # Add variation count selector (1-4 buttons)
      generation-feed.tsx      # Update to group results by batchId before rendering
      generation-row.tsx       # Replace with variation-aware row (grid of thumbnails)
      variation-grid.tsx       # New: Grid of 1-4 variation thumbnails with badges + selection
  app/(app)/create/
    create-page-client.tsx     # Wire generateVariations action, variation selection state
```

### Pattern 1: Server-Side Parallel Generation with Shared Helper

**What:** Extract the core Claude call + validation + transformation logic from the existing `generate` action into a plain TypeScript helper function, then call it N times via `Promise.all` inside a new `generateVariations` action.
**When to use:** Generating 1-4 variations from a single prompt.
**Why helper, not ctx.runAction:** Convex documentation explicitly recommends against calling actions from actions in the same runtime. The overhead of `ctx.runAction` is significant (allocates a new function call, freezes parent). Instead, extract shared logic into a plain async function.

```typescript
// Source: https://docs.convex.dev/functions/actions (best practices)
// convex/generateAnimation.ts

// Extracted helper -- NOT a Convex action, just a plain function
async function generateSingleVariation(
  client: Anthropic,
  prompt: string,
  systemPrompt: string,
  temperature: number,
): Promise<{ rawCode: string; code: string; durationInFrames: number; fps: number }> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
    temperature,
  });

  // ... extract text, strip markdown, validate, transform ...
  // (same logic currently in the generate action handler)

  return { rawCode, code, durationInFrames, fps };
}

// New action for parallel variations
export const generateVariations = action({
  args: {
    prompt: v.string(),
    variationCount: v.number(), // 1-4
    aspectRatio: v.optional(v.string()),
    durationInSeconds: v.optional(v.number()),
    fps: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // ... auth check, input validation ...

    const batchId = crypto.randomUUID();
    const temperature = 0.9;

    // Run N Claude calls in parallel
    const promises = Array.from({ length: args.variationCount }, (_, i) =>
      generateSingleVariation(client, args.prompt, enhancedPrompt, temperature)
        .then(async (result) => {
          // Store each variation
          const id = await ctx.runMutation(internal.generations.store, {
            userId: identity.tokenIdentifier,
            prompt: args.prompt,
            code: result.code,
            rawCode: result.rawCode,
            durationInFrames: result.durationInFrames,
            fps: result.fps,
            status: "success",
            createdAt: Date.now(),
            batchId,
            variationIndex: i,
            variationCount: args.variationCount,
            aspectRatio,
            durationInSeconds: targetDuration,
          });
          return { id, ...result, variationIndex: i };
        })
        .catch((error) => {
          // Store failed variation
          // ... store with status: "failed" ...
          return null;
        })
    );

    const results = await Promise.all(promises);
    return { batchId, variations: results.filter(Boolean) };
  },
});
```

### Pattern 2: Client-Side Batch Grouping in Feed

**What:** Group the flat paginated results array by batchId before rendering, so each batch appears as a single visual row with multiple thumbnails.
**When to use:** Rendering the generation feed when variations exist.

```typescript
// Source: Codebase pattern + standard JS grouping
// src/components/generation/generation-feed.tsx

interface BatchGroup {
  batchId: string | null;
  generations: Generation[];
}

function groupByBatch(generations: Generation[]): BatchGroup[] {
  const groups: BatchGroup[] = [];
  const batchMap = new Map<string, Generation[]>();

  for (const gen of generations) {
    if (gen.batchId) {
      const existing = batchMap.get(gen.batchId);
      if (existing) {
        existing.push(gen);
      } else {
        const group: Generation[] = [gen];
        batchMap.set(gen.batchId, group);
        groups.push({ batchId: gen.batchId, generations: group });
      }
    } else {
      // Non-batch generation: standalone row
      groups.push({ batchId: null, generations: [gen] });
    }
  }

  // Sort variations within each batch by variationIndex
  for (const group of groups) {
    group.generations.sort(
      (a, b) => (a.variationIndex ?? 0) - (b.variationIndex ?? 0)
    );
  }

  return groups;
}
```

### Pattern 3: Variation Thumbnail Grid with Badges

**What:** Render 1-4 Remotion Thumbnails in a CSS grid with V1-V4 badge overlays and click-to-select.
**When to use:** Displaying a batch of variations in the feed.

```typescript
// src/components/generation/variation-grid.tsx
// CSS grid: 1 col for 1 var, 2 cols for 2-4 vars
const gridCols = variations.length === 1 ? "grid-cols-1" : "grid-cols-2";

<div className={`grid ${gridCols} gap-2`}>
  {variations.map((variation, i) => (
    <button
      key={variation._id}
      onClick={() => onSelectVariation(variation)}
      className={cn(
        "relative rounded-md overflow-hidden bg-black",
        selectedId === variation._id && "ring-2 ring-primary"
      )}
    >
      <Thumbnail
        component={DynamicCode}
        inputProps={{
          code: variation.code,
          durationInFrames: variation.durationInFrames ?? 90,
          fps: variation.fps ?? 30,
        }}
        compositionWidth={preset.width}
        compositionHeight={preset.height}
        frameToDisplay={Math.floor((variation.durationInFrames ?? 90) / 2)}
        durationInFrames={variation.durationInFrames ?? 90}
        fps={variation.fps ?? 30}
        style={{ width: "100%" }}
      />
      {/* V1-V4 Badge */}
      <span className="absolute top-1 left-1 bg-black/70 text-white text-xs font-mono px-1.5 py-0.5 rounded">
        V{i + 1}
      </span>
    </button>
  ))}
</div>
```

### Pattern 4: Variation Count Selector in Settings

**What:** Add a 1-4 button group to the existing generation settings panel.
**When to use:** Before generating, user picks how many variations.

```typescript
// Extend GenerationSettings
export interface GenerationSettings {
  aspectRatio: "16:9" | "1:1" | "9:16";
  durationInSeconds: number;
  fps: number;
  variationCount: number; // 1-4, default 1
}

// In settings panel
const VARIATION_OPTIONS = [1, 2, 3, 4] as const;

<div className="space-y-1.5">
  <label className="text-sm font-medium text-muted-foreground">
    Variations
  </label>
  <div className="flex gap-2">
    {VARIATION_OPTIONS.map((count) => (
      <Button
        key={count}
        variant={settings.variationCount === count ? "default" : "outline"}
        size="sm"
        onClick={() => onUpdateSetting("variationCount", count)}
      >
        {count}
      </Button>
    ))}
  </div>
</div>
```

### Anti-Patterns to Avoid

- **Calling `ctx.runAction` from within `generateVariations`:** Do NOT use `ctx.runAction(internal.generateAnimation.generate, ...)` to invoke the existing generate action. This has significant overhead per the Convex docs. Instead, extract the shared logic into a plain TypeScript helper function and call it directly.
- **Sequential Claude calls instead of parallel:** Do NOT `await` each Claude call before starting the next. Use `Promise.all` to run all calls concurrently. Convex actions support up to 1000 concurrent operations.
- **Generating batchId on the client:** Generate batchId server-side in the action, not on the client. This ensures atomicity: if the action fails before storing, no orphan batchId exists. Also avoids the Convex runtime UUID format issue (use `crypto.randomUUID()` in Node.js runtime which works correctly).
- **Creating a new Convex query to group by batchId:** Do NOT add a server-side "group by batch" query. The existing `listPaginated` returns all generations ordered by `createdAt desc`. Client-side grouping via `Array.reduce` or a `Map` is simpler and more efficient since the data is already loaded.
- **Re-rendering all Thumbnails when one variation is selected:** Memoize the grid component. Selection state should highlight/ring the selected thumbnail without causing re-render of the Thumbnail components themselves.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Parallel API call orchestration | Custom queue/worker system | `Promise.all` inside Convex action | Convex actions natively support 1000 concurrent operations; `Promise.all` is the standard JavaScript pattern |
| UUID generation for batchId | Custom ID scheme, counter-based IDs | `crypto.randomUUID()` | Standard, cryptographically secure, available in Node.js runtime. The Convex Node.js runtime uses the standard Node.js crypto module |
| Variation thumbnail grid | Custom gallery component, carousel | CSS Grid (`grid-cols-2`) + Remotion `<Thumbnail>` | 1-4 items is trivially handled by CSS grid; no need for a gallery library |
| Badge overlay on thumbnails | Canvas-based watermarking, SVG generation | Absolutely-positioned `<span>` with Tailwind classes | Simple text badge ("V1") over a thumbnail is a 3-line CSS pattern |
| Batch grouping of paginated data | Server-side aggregation query | Client-side `Array.reduce` / `Map` grouping | Convex pagination returns flat results; grouping 10-20 items client-side is trivial and avoids complex server queries |

**Key insight:** This phase is primarily about orchestration (running the existing generation pipeline N times in parallel) and presentation (grouping and displaying results). No new infrastructure or libraries are needed.

## Common Pitfalls

### Pitfall 1: Promise.all Partial Failure

**What goes wrong:** One of the 4 Claude API calls fails (rate limit, network error, validation failure), causing the entire `Promise.all` to reject, losing results from the successful calls.
**Why it happens:** `Promise.all` rejects immediately when any promise rejects. If generation #3 of 4 throws, generations #1, #2, #4 results are lost even if they completed successfully.
**How to avoid:** Use `.catch()` on individual promises inside `Promise.all` to handle per-variation failures. Each promise should catch errors and store a "failed" generation with the error message. The action returns all results, with null entries for failures. Alternatively, use `Promise.allSettled()` and process each result's status.
**Warning signs:** Users see "Generation failed" for all 4 variations when only one actually failed.

### Pitfall 2: Race Condition in createdAt Timestamps

**What goes wrong:** All 4 variations get the same `createdAt: Date.now()` timestamp, causing them to appear in unpredictable order in the feed (which orders by `createdAt desc`).
**Why it happens:** `Date.now()` is called at roughly the same time for all parallel calls. The database insertion order within the same timestamp is not guaranteed.
**How to avoid:** This is not a real problem if grouping is by batchId (order within group is by variationIndex). However, to keep the feed ordering clean, all variations in a batch can use the same createdAt value (they should appear together anyway). The within-batch ordering uses `variationIndex`.
**Warning signs:** Batch variations appear interleaved with other users' generations or split across pagination pages.

### Pitfall 3: Pagination Page Boundary Splits a Batch

**What goes wrong:** A batch of 4 variations gets split across two pagination pages (e.g., 2 on page 1, 2 on page 2), causing an incomplete variation grid to render.
**Why it happens:** The paginated query returns a fixed page size (e.g., 10 items). If a batch of 4 straddles the boundary, only some variations are in the current page.
**How to avoid:** Accept this as a minor UX imperfection for v1. When the user loads more items, the grid will complete. Alternatively, render a "1 of 4 variations loaded" indicator for incomplete batches and auto-load the rest. The simplest approach: since all variations in a batch have the same createdAt and they're ordered desc by createdAt, they will typically be adjacent. Slight createdAt offsets (e.g., adding variationIndex as millisecond offset) can keep them together.
**Warning signs:** Feed shows a grid with 2 of 4 thumbnails, remaining 2 slots empty.

### Pitfall 4: Thumbnail Performance with 4x Multiplier

**What goes wrong:** If a user generates 4 variations for each prompt, the feed now has 4x more Thumbnail components to render, causing significant performance degradation.
**Why it happens:** Each `<Thumbnail>` runs `DynamicCode` which calls `executeCode()`. With 4 variations per batch and 10 batches visible, that is 40 Thumbnail instances all executing AI-generated code.
**How to avoid:** (a) Only render thumbnails at a small size (the grid cell constrains to ~100-200px width). (b) The Thumbnail `style={{ width: "100%" }}` + small container keeps render cost low. (c) Keep `initialNumItems: 10` for the paginated query. (d) Consider rendering Thumbnails only for visible batches using Intersection Observer if performance becomes an issue.
**Warning signs:** Page takes >2s to render after loading feed; Chrome DevTools shows high JS execution time.

### Pitfall 5: Temperature Producing Near-Identical Outputs

**What goes wrong:** Despite using `temperature: 0.9`, variations look nearly identical because the prompt strongly constrains the output space.
**Why it happens:** Temperature adds randomness to token sampling, but if the prompt is very specific ("red ball bouncing"), the output space is narrow. Temperature alone may not produce visually distinct results.
**How to avoid:** This is an expected limitation. Temperature 0.9 is a reasonable starting point. If diversity is insufficient, future iterations could add "You are generating variation N of M. Make this variation distinctly different from other interpretations." to the prompt. For v1, 0.9 temperature with the same prompt is the simplest approach.
**Warning signs:** Users see 4 variations that look almost identical, defeating the purpose.

### Pitfall 6: Variation Selection State Not Propagating to Actions

**What goes wrong:** User selects variation V3, but the save/render/continue actions operate on V1 (the first variation) or on stale state.
**Why it happens:** The `lastGeneration` state in `create-page-client.tsx` holds a single GenerationResult. When selecting a variation from the grid, this state must be updated to the selected variation. If the state management does not properly track which variation is selected, downstream actions will use wrong data.
**How to avoid:** When user clicks a variation thumbnail, call `handleSelectGeneration` with that specific variation's data (code, rawCode, durationInFrames, fps, _id). The existing selection mechanism in `create-page-client.tsx` already handles this pattern (see `handleSelectGeneration` callback). Ensure the selected variation's `_id` is used for downstream operations.
**Warning signs:** User clicks V3 but preview shows V1; saving creates a clip with the wrong code.

## Code Examples

### Parallel Claude Calls with Error Handling

```typescript
// Source: Anthropic API docs (temperature) + Convex actions docs (Promise.all)
// convex/generateAnimation.ts

const temperature = 0.9;
const batchId = crypto.randomUUID();

const variationPromises = Array.from(
  { length: variationCount },
  (_, index) =>
    generateSingleVariation(client, prompt, enhancedPrompt, temperature)
      .then(async (result) => {
        const id = await ctx.runMutation(internal.generations.store, {
          userId: identity.tokenIdentifier,
          prompt,
          code: result.code,
          rawCode: result.rawCode,
          durationInFrames: result.durationInFrames,
          fps: targetFps,
          status: "success" as const,
          createdAt: Date.now(),
          batchId,
          variationIndex: index,
          variationCount,
          aspectRatio,
          durationInSeconds: targetDuration,
        });
        return {
          id: String(id),
          rawCode: result.rawCode,
          code: result.code,
          durationInFrames: result.durationInFrames,
          fps: targetFps,
          variationIndex: index,
        };
      })
      .catch(async (error) => {
        // Store the failed variation so user sees partial results
        await ctx.runMutation(internal.generations.store, {
          userId: identity.tokenIdentifier,
          prompt,
          status: "failed" as const,
          errorMessage: error instanceof Error ? error.message : "Generation failed",
          createdAt: Date.now(),
          batchId,
          variationIndex: index,
          variationCount,
          aspectRatio,
          durationInSeconds: targetDuration,
        });
        return null;
      })
);

const results = await Promise.all(variationPromises);
```

### Claude API Call with Temperature

```typescript
// Source: https://platform.claude.com/docs/en/api/messages
// Temperature range: 0.0 to 1.0, default 1.0
const response = await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 4096,
  system: enhancedPrompt,
  messages: [{ role: "user", content: prompt }],
  temperature: 0.9, // Slightly below default for quality+diversity balance
});
```

### Variation Count in Settings Hook

```typescript
// src/hooks/use-generation-settings.ts
export interface GenerationSettings {
  aspectRatio: "16:9" | "1:1" | "9:16";
  durationInSeconds: number;
  fps: number;
  variationCount: number; // NEW: 1-4, default 1
}

export const DEFAULT_SETTINGS: GenerationSettings = {
  aspectRatio: "16:9",
  durationInSeconds: 3,
  fps: 30,
  variationCount: 1, // Default to 1 (no extra variations)
};
```

### Feed Grouping and Rendering

```typescript
// src/components/generation/generation-feed.tsx
const batches = useMemo(() => groupByBatch(results), [results]);

return (
  <div className="flex flex-col gap-2">
    {batches.map((batch) => {
      if (batch.generations.length === 1) {
        // Single generation: render as existing GenerationRow
        return (
          <GenerationRow
            key={batch.generations[0]._id}
            generation={batch.generations[0]}
            onSelect={onSelectGeneration}
          />
        );
      }
      // Multi-variation batch: render variation grid
      return (
        <VariationRow
          key={batch.batchId!}
          variations={batch.generations}
          onSelectVariation={onSelectGeneration}
        />
      );
    })}
  </div>
);
```

### Wiring Generate Button to Variations Action

```typescript
// src/app/(app)/create/create-page-client.tsx
const generateVariations = useAction(api.generateAnimation.generateVariations);

const handleGenerate = useCallback(async (prompt: string) => {
  // ... existing state resets ...

  if (settings.variationCount === 1) {
    // Single generation: use existing generate action (unchanged)
    const result = await generate({
      prompt,
      aspectRatio: settings.aspectRatio,
      durationInSeconds: settings.durationInSeconds,
      fps: settings.fps,
    });
    setLastGeneration({
      id: String(result.id),
      rawCode: result.rawCode,
      code: result.code,
      durationInFrames: result.durationInFrames,
      fps: result.fps,
    });
  } else {
    // Multi-variation: use new action, then select first successful variation
    const result = await generateVariations({
      prompt,
      variationCount: settings.variationCount,
      aspectRatio: settings.aspectRatio,
      durationInSeconds: settings.durationInSeconds,
      fps: settings.fps,
    });
    const firstSuccess = result.variations.find((v: any) => v !== null);
    if (firstSuccess) {
      setLastGeneration({
        id: firstSuccess.id,
        rawCode: firstSuccess.rawCode,
        code: firstSuccess.code,
        durationInFrames: firstSuccess.durationInFrames,
        fps: firstSuccess.fps,
      });
    }
  }
}, [generate, generateVariations, settings]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single generation per prompt | 1-4 parallel variations per prompt | Phase 14 | Users can compare multiple creative interpretations |
| No temperature control | `temperature: 0.9` for variation diversity | Phase 14 | Claude produces meaningfully different outputs |
| Flat feed (one row per generation) | Batch-grouped feed (one row per batch, grid of variations) | Phase 14 | Feed consolidates related variations visually |
| Schema fields unused (batchId, variationIndex, variationCount) | Fields populated and used for grouping/display | Phase 14 | Phase 13 schema investment pays off |

**Deprecated/outdated:**
- The existing `generate` action continues to work for single-generation mode (variationCount === 1). No deprecation needed.
- Anthropic temperature range is 0.0-1.0; there is no "top_p/top_k alternative" needed for this use case.

## Open Questions

1. **Should single-generation (variationCount=1) use the existing `generate` action or the new `generateVariations` action?**
   - What we know: The existing `generate` action works perfectly for single generation. Adding a `generateVariations` action that handles count=1 would duplicate logic.
   - What's unclear: Whether to route variationCount=1 through the new action (simpler client code, one code path) or keep using the old action (no regression risk, proven path).
   - Recommendation: For variationCount=1, continue using the existing `generate` action. For 2-4, use `generateVariations`. This avoids any regression risk for the common single-generation case. The helper function extraction ensures code is shared.

2. **How to handle the feed when variations span a pagination boundary?**
   - What we know: All variations in a batch share the same `createdAt` (approximately). The feed orders by `createdAt desc`. With `initialNumItems: 10`, a batch of 4 starting at item 9 would split (2 on first page, 2 on next load).
   - What's unclear: How common this will be and whether it is worth adding complexity to prevent it.
   - Recommendation: Accept the imperfection for v1. Render incomplete batches with a visual indicator showing "N of M variations shown." When the user loads more, the batch completes. If needed later, slightly offset createdAt (e.g., `Date.now() + index`) to keep variations adjacent in sort order.

3. **Should the `generateVariations` action return all variation data, or should the client rely on the feed's reactive query?**
   - What we know: After the action runs, the Convex `usePaginatedQuery` will reactively update to include the new generations. The action could also return the variation data directly.
   - What's unclear: Whether to use the action return value (faster initial display) or wait for the reactive query (simpler code, single source of truth).
   - Recommendation: Return variation data from the action for immediate display (set `lastGeneration` to the first successful variation). The feed will also update reactively. This gives the best UX: immediate preview + feed update.

## Sources

### Primary (HIGH confidence)
- [Anthropic Messages API](https://platform.claude.com/docs/en/api/messages) - Temperature parameter: range 0.0-1.0, default 1.0, controls randomness
- [Convex Actions docs](https://docs.convex.dev/functions/actions) - Promise.all parallelism, 1000 concurrent operations limit, helper function pattern
- [Convex Best Practices](https://docs.convex.dev/understanding/best-practices/) - Avoid ctx.runAction for same-runtime; use helper functions instead
- [Remotion Thumbnail docs](https://www.remotion.dev/docs/player/thumbnail) - frameToDisplay, compositionWidth/Height, style props
- Existing codebase: `convex/generateAnimation.ts` (generate action), `convex/generations.ts` (store mutation with batch fields), `convex/schema.ts` (batchId/variationIndex/variationCount fields), `src/components/generation/generation-row.tsx` (Thumbnail usage pattern)

### Secondary (MEDIUM confidence)
- [Convex crypto.randomUUID issue #269](https://github.com/get-convex/convex-backend/issues/269) - Convex custom runtime UUID format issue; Node.js runtime unaffected (our actions use "use node")
- [Convex Internal Functions](https://docs.convex.dev/functions/internal-functions) - ctx.runMutation for internal calls
- Multiple community sources confirming Promise.all pattern in Convex actions

### Tertiary (LOW confidence)
- None -- all key claims verified with official documentation or codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies; all libraries already installed and verified in codebase
- Architecture: HIGH - Convex Promise.all pattern is documented; Anthropic temperature is a standard API param; Thumbnail grid is standard CSS
- Pitfalls: HIGH - Derived from official docs (Promise.all failure semantics, Convex action limitations, Anthropic API behavior) and codebase analysis
- Code examples: HIGH - Based on existing codebase patterns (generate action, store mutation, generation-row.tsx) and official API docs

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (stable -- all technologies are mature; Convex/Anthropic APIs unlikely to change within 30 days)
