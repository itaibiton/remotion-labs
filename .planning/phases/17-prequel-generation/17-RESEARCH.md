# Phase 17: Prequel Generation - Research

**Researched:** 2026-02-01
**Domain:** LLM prompt engineering for start-state extraction, Remotion animation prequel generation, Convex action wiring
**Confidence:** HIGH

## Summary

Phase 17 is the mirror image of Phase 12 (Continuation Generation). Where continuation generates a new scene that STARTS where a previous clip ENDS, prequel generates a new scene that ENDS where a target clip STARTS. The core technical challenge -- extracting a visual state from animation code and generating code that matches it -- is already solved by Phase 12's architecture. Phase 17 reuses this approach but extracts frame-0 state instead of final-frame state.

The codebase already has every piece of infrastructure needed. The continuation system (Phase 12) established the pattern: a specialized system prompt (`CONTINUATION_SYSTEM_PROMPT`) and a Convex action (`generateContinuation`) that fetches clip rawCode, sends it to Claude, validates, transforms, and returns the result. Phase 17 adds the symmetric counterpart: `PREQUEL_SYSTEM_PROMPT` and `generatePrequel`. The UI wiring (Phase 16's extend-next pattern) established the callback threading pattern through GenerationRowActions -> GenerationRow/VariationGrid -> GenerationFeed -> CreatePageClient. Phase 17 adds `onExtendPrevious` through the same chain.

Start-state extraction (frame 0) is actually simpler than end-state extraction (final frame) because initial values are explicit in code: `interpolate(frame, [0, N], [startVal, endVal])` gives `startVal` at frame 0. Springs start at their `from` value (default 0). Static styles are identical at all frames. The main edge cases are elements with delayed entry (conditional rendering like `{frame > 10 && <Element />}` or `<Sequence from={30}>`) and elements that start invisible (opacity 0).

**Primary recommendation:** Create `PREQUEL_SYSTEM_PROMPT` and `generatePrequel` action in `convex/generateAnimation.ts` following the exact pattern of `CONTINUATION_SYSTEM_PROMPT` and `generateContinuation`. Add "Extend Previous" button to the GenerationRowActions dropdown and wire `onExtendPrevious` through the component chain using the same save-then-navigate pattern established by extend-next (auto-save as clip, navigate to `/create?sourceClipId=X&mode=prequel`). Add prequel mode to the create page alongside continuation mode.

## Standard Stack

### Core (already installed -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | existing | Claude API for start-state analysis + prequel generation | Already used in generateAnimation.ts |
| `acorn` + `acorn-jsx` | existing | AST parsing for code validation | Already used in validation pipeline |
| `sucrase` | existing | JSX-to-JS transformation | Already used in code-transformer |
| `remotion` | ^4.0.410 | Composition framework | Already used throughout |
| `convex` | ^1.31.6 | Backend actions/mutations | Already used for generation pipeline |
| `@radix-ui/react-dropdown-menu` | existing | Action dropdown menus | Already installed for Phase 16 |
| `lucide-react` | ^0.563.0 | Icons (Rewind for Extend Previous) | Already used throughout |
| `sonner` | ^2.0.7 | Toast notifications | Already used throughout |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next/navigation` | 15.x | `useRouter` for navigation | Save-then-navigate flow |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| LLM code reading for start-state | Static AST analysis | Same reasons as Phase 12: AST cannot resolve runtime values reliably. LLM approach is validated. |
| New URL param `mode=prequel` | Separate route `/create/prequel` | New route adds unnecessary routing complexity. URL param is cleaner and matches existing `sourceClipId` pattern. |
| `generatePrequel` as separate action | Shared `generateFromClip` action with `mode` param | Separate actions are clearer and follow the existing `generate`/`refine`/`generateContinuation` pattern. No code duplication concern since the shared helper `generateSingleVariation` is not applicable here (different prompt structure). |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure

```
convex/
  generateAnimation.ts       # MODIFY -- add PREQUEL_SYSTEM_PROMPT + generatePrequel action
src/
  app/(app)/create/
    page.tsx                 # MODIFY -- accept `mode` search param
    create-page-client.tsx   # MODIFY -- add prequel mode handling
  components/generation/
    generation-row-actions.tsx  # MODIFY -- add "Extend Previous" menu item
    generation-row.tsx          # MODIFY -- pass onExtendPrevious callback
    variation-grid.tsx          # MODIFY -- pass onExtendPrevious callback
    generation-feed.tsx         # MODIFY -- accept onExtendPreviousGeneration callback
```

### Pattern 1: PREQUEL_SYSTEM_PROMPT (mirrors CONTINUATION_SYSTEM_PROMPT)

**What:** A system prompt instructing Claude to analyze a clip's frame-0 visual state and generate a composition whose final frame matches it. This is the reverse of the continuation prompt.

**When to use:** Every time user clicks "Extend Previous."

**Key differences from CONTINUATION_SYSTEM_PROMPT:**
- Continuation: analyze FINAL frame state, generate scene that STARTS from it
- Prequel: analyze FIRST frame state (frame 0), generate scene that ENDS at it

**Start-state extraction rules (frame 0):**
- `interpolate(frame, [inputStart, inputEnd], [outputStart, outputEnd])`: At frame 0, if `inputStart === 0`, output is `outputStart`. If `inputStart > 0` and no `extrapolateLeft`, output may extend.
- `spring({frame, fps, ...})`: At frame 0, value is `from` param (default 0).
- Static styles: Same at all frames.
- `<Sequence from={N}>` where N > 0: Content not visible at frame 0.
- Conditional render `{frame > N && <Element />}`: Not visible at frame 0 when N > 0.
- Elements with `opacity: 0` at frame 0: Invisible, not part of visual start state.

**Prompt structure (three-step, matching continuation pattern):**
```
STEP 1 - ANALYZE the target scene's INITIAL VISUAL STATE (frame 0):
STEP 2 - Add a comment block at the top documenting the start state
STEP 3 - GENERATE a new composition where the LAST FRAME matches the target's frame 0
```

**Source:** Derived from existing `CONTINUATION_SYSTEM_PROMPT` in `convex/generateAnimation.ts` (lines 358-439).

### Pattern 2: generatePrequel Action (mirrors generateContinuation)

**What:** A Convex action that takes a `sourceClipId` + optional prompt, fetches the clip's rawCode, calls Claude with `PREQUEL_SYSTEM_PROMPT`, validates, transforms, and returns the result.

**When to use:** Backend handler for prequel generation requests.

**Implementation follows `generateContinuation` exactly (lines 931-1033 of generateAnimation.ts):**
1. Auth check
2. Fetch source clip via `internal.clips.getInternal`
3. Verify rawCode exists
4. Create Anthropic client
5. Build user message with `TARGET SCENE CODE` (instead of `PREVIOUS SCENE CODE`)
6. Call Claude with `PREQUEL_SYSTEM_PROMPT`
7. Extract text, strip markdown, extract metadata
8. Validate with `validateRemotionCode`
9. Transform with `transformJSX`
10. Return `{ rawCode, code, durationInFrames, fps }`

**Key difference in user message framing:**
- Continuation: "PREVIOUS SCENE CODE: ... Generate the next scene"
- Prequel: "TARGET SCENE CODE: ... Generate a prequel that leads into this scene"

**Source:** Derived from `generateContinuation` action in `convex/generateAnimation.ts`.

### Pattern 3: Extend Previous via Save-Then-Navigate (mirrors Extend Next)

**What:** The "Extend Previous" flow follows the exact same save-then-navigate pattern as "Extend Next" (established in Phase 16-02):
1. User clicks "Extend Previous" on a generation
2. System auto-saves generation as clip (via `clips.save` mutation)
3. System navigates to `/create?sourceClipId=<clipId>&mode=prequel`
4. Create page enters prequel mode

**When to use:** For the "Extend Previous" action from the feed dropdown.

**The `mode=prequel` URL param distinguishes prequel from continuation:**
- No `mode` or `mode=continuation`: continuation mode (current behavior)
- `mode=prequel`: prequel mode (new in Phase 17)

**Source:** Derived from `handleExtendNextGeneration` in `create-page-client.tsx` (lines 438-456).

### Pattern 4: Create Page Prequel Mode (mirrors Continuation Mode)

**What:** When `sourceClipId` is present AND `mode=prequel`, the create page:
- Shows a "Generating prequel for: [clip name]" banner (instead of "Generating continuation from")
- Changes prompt placeholder to "Describe what should lead into this scene..."
- Calls `generatePrequel` instead of `generateContinuation` or `generate`

**When to use:** When the page URL has both `sourceClipId` and `mode=prequel`.

**Implementation:** Add `mode` to the create page search params. In `CreateContent`, check `mode === "prequel"` alongside the existing `sourceClipId` checks:
- `handlePrequelGenerate` callback (mirrors `handleContinuationGenerate`)
- `handleUnifiedSubmit` routes to prequel handler when `sourceClipId && mode === "prequel"`
- Continuation banner text changes based on mode

**Source:** Derived from `handleContinuationGenerate` and related logic in `create-page-client.tsx` (lines 310-355).

### Pattern 5: Callback Threading Through Component Chain

**What:** The `onExtendPrevious` callback must be threaded through the same component chain as `onExtendNext`:

```
CreatePageClient (defines handleExtendPreviousGeneration)
  -> GenerationFeed (accepts onExtendPreviousGeneration prop)
    -> GenerationRow (accepts onExtendPrevious prop)
      -> GenerationRowActions (accepts onExtendPrevious prop, renders menu item)
    -> VariationGrid (accepts onExtendPrevious prop)
      -> GenerationRowActions (per-variation and batch-level)
```

**Source:** Exact same chain used for `onExtendNext` (established in Phase 16-02).

### Anti-Patterns to Avoid

- **Don't create a separate prequel page/route:** Reuse the create page with URL params. A separate route would duplicate the entire preview/editor/save infrastructure.
- **Don't merge prequel and continuation into a single prompt with a "direction" flag:** Separate prompts allow each to be optimized independently. The analysis focus is fundamentally different (first frame vs. last frame).
- **Don't add the Extend Previous button without the backend:** This was already the Phase 16 decision. Both the button and the backend ship together in Phase 17.
- **Don't store prequel/continuation relationships in the database:** No `parentClipId` or lineage tracking. The prequel is a standalone generation (same decision as Phase 12 for continuations).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Start-state extraction from animation code | Custom AST evaluator | Claude code reading via PREQUEL_SYSTEM_PROMPT | Same reasoning as Phase 12: runtime values cannot be statically resolved |
| Code validation for prequels | New validation pipeline | Existing `validateRemotionCode` + `transformJSX` | Prequel output is standard Remotion JSX, identical to any generation |
| Prequel preview | New preview component | Existing `PreviewPlayer` with dynamic code | Output format is identical |
| Save-then-navigate flow | New clip saving logic | Existing `clips.save` mutation + `router.push` | Pattern established by extend-next |
| Dropdown menu item | Custom UI | Existing `GenerationRowActions` component with new menu item | Just add one `DropdownMenuItem` |

**Key insight:** Phase 17 is purely additive -- a new system prompt, a new action, one new menu item, and a `mode` URL param. Every other piece of infrastructure already exists.

## Common Pitfalls

### Pitfall 1: Prequel Final Frame Not Matching Target Start Frame

**What goes wrong:** The prequel animation ends in a visual state that doesn't match the target clip's opening frame. When played in sequence, there's a visible "jump."
**Why it happens:** The PREQUEL_SYSTEM_PROMPT isn't explicit enough about matching the final frame to the target's frame 0.
**How to avoid:** The prompt must be extremely clear: "The LAST FRAME of your new composition must be VISUALLY IDENTICAL to the FIRST FRAME of the target composition." Require Claude to output a start-state analysis comment. Include a concrete example in the prompt.
**Warning signs:** Visual discontinuity when prequel plays before the target clip.

### Pitfall 2: Confusing Start-State with End-State in the Prompt

**What goes wrong:** Copy-pasting the continuation prompt and only changing a few words leads to instructions that still reference "end state" or "final frame" in some places.
**Why it happens:** The prompts are long and Claude follows all instructions literally. Mixed signals produce incoherent results.
**How to avoid:** Write the PREQUEL_SYSTEM_PROMPT from scratch using the continuation prompt as a template. Do a thorough review for any "end state" / "final frame" / "last frame" language that should be "start state" / "first frame" / "frame 0" in the analysis step, and any "first frame" that should be "last frame" in the generation step.
**Warning signs:** Generated prequel starts at the target's end state instead of ending at the target's start state.

### Pitfall 3: Elements That Don't Exist at Frame 0

**What goes wrong:** The target clip has elements that only appear after frame 30 (via `<Sequence from={30}>` or conditional render). The prequel tries to include these elements, but they shouldn't be in the frame-0 visual state.
**Why it happens:** Claude sees the elements in the code and includes them in its analysis.
**How to avoid:** The PREQUEL_SYSTEM_PROMPT must explicitly instruct: "Elements inside `<Sequence from={N}>` where N > 0 are NOT visible at frame 0. Elements conditionally rendered via `{frame > N && ...}` where N > 0 are NOT visible at frame 0. Only include elements that are actually VISIBLE at frame 0."
**Warning signs:** Prequel's final frame shows elements that the target clip doesn't show until later.

### Pitfall 4: Forgetting to Thread onExtendPrevious Through All Components

**What goes wrong:** Adding the "Extend Previous" button to `GenerationRowActions` but forgetting to add the prop to `GenerationRow`, `VariationGrid`, or `GenerationFeed` causes TypeScript errors or the callback being undefined.
**Why it happens:** The callback must pass through 4 component layers. Missing any one breaks the chain.
**How to avoid:** Follow the exact same sequence as Phase 16-02's extend-next wiring: actions -> row -> grid -> feed -> create page. The plan should modify all 5 files in sequence.
**Warning signs:** TypeScript errors about missing props or undefined function calls.

### Pitfall 5: Mode Param Not Preserved Through Save-Then-Navigate

**What goes wrong:** The "Extend Previous" handler saves the generation as a clip and navigates to `/create?sourceClipId=X` but forgets to add `&mode=prequel`. The create page then enters continuation mode instead of prequel mode.
**Why it happens:** The handler is copy-pasted from `handleExtendNextGeneration` which doesn't need a mode param.
**How to avoid:** The handler must explicitly append `&mode=prequel` to the navigation URL. The continuation handler should also work without a mode param (backward compatible).
**Warning signs:** Clicking "Extend Previous" opens the create page with "Generating continuation from" banner instead of "Generating prequel for" banner.

### Pitfall 6: Background Color Mismatch Between Prequel End and Target Start

**What goes wrong:** The prequel ends with a background color that differs from the target clip's frame-0 background. Even if elements match, the background "pops."
**Why it happens:** Background color is a static style that Claude might not explicitly match.
**How to avoid:** The PREQUEL_SYSTEM_PROMPT must explicitly list background color as a critical property to match: "Your final frame MUST use the exact same backgroundColor as the target scene's frame 0."
**Warning signs:** Visible background color change when prequel transitions to target clip.

## Code Examples

### Example 1: PREQUEL_SYSTEM_PROMPT

```typescript
// Source: Mirrors CONTINUATION_SYSTEM_PROMPT in convex/generateAnimation.ts
const PREQUEL_SYSTEM_PROMPT = `You are a Remotion animation code generator specializing in scene prequels.
You create compositions whose LAST FRAME matches EXACTLY what appears at the FIRST FRAME (frame 0) of a target composition.

You will receive the TARGET SCENE's complete Remotion code. Your job:

STEP 1 - ANALYZE the target scene's INITIAL VISUAL STATE (frame 0):
- At frame 0, interpolate(frame, [0, ...], [startValue, ...]) outputs startValue
- At frame 0, spring({frame, fps, ...}) outputs the 'from' value (default 0)
- Static styles (no frame dependency) are the same at frame 0 as any frame
- Elements inside <Sequence from={N}> where N > 0 are NOT rendered at frame 0 — ignore them
- Elements conditionally rendered via {frame > N && ...} where N > 0 are NOT visible at frame 0
- Elements with opacity 0 at frame 0 are invisible — note them as "not yet visible"
- Identify ALL visual properties at frame 0:
  - Positions (transform: translate, top/left, flex alignment)
  - Opacity values
  - Scale values
  - Rotation values
  - Colors (backgroundColor, color, borderColor)
  - Font sizes and text content
  - Which elements are visible (opacity > 0, rendered, not in delayed Sequence)

STEP 2 - Add a comment block at the top of your output:
// PREQUEL FOR TARGET SCENE
// Start state (target frame 0): [brief description of frame 0 visual state]
// DURATION: [frames, between 60-180]
// FPS: 30

STEP 3 - GENERATE a new composition where:
- The LAST FRAME must look VISUALLY IDENTICAL to the target scene's frame 0
- All final values (at the last frame) must match the target scene's frame-0 values
- Use the same layout approach (AbsoluteFill, flex centering, etc.) as the target scene
- Use the same coordinate system and positioning approach
- Keep consistent styling (font families, color palettes) as the target scene
- The animation should build UP TO the target scene's starting visual state
- If a user prompt is provided, incorporate it into how the prequel builds up to the start state
- If no specific user prompt, create a natural, visually interesting lead-in

CRITICAL RULES:
- Component must be named "MyComposition"
- Do NOT use import statements (APIs are pre-injected)
- Output ONLY valid JSX code. No markdown, no explanations, no code blocks
- Available APIs: React, useState, useEffect, useMemo, useCallback,
  AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring,
  Sequence, Easing, random, Audio, Img, staticFile, Video, OffthreadVideo,
  Composition, Still, Series, Loop, Freeze
- FORBIDDEN: import/require, eval, Function, setTimeout, setInterval, fetch, XMLHttpRequest, WebSocket, document, window, process
- Use FPS 30. Duration between 60-180 frames.

EXAMPLE:
If the target scene starts (frame 0) with white text "Hello" centered, opacity 1, scale 1,
backgroundColor '#1a1a2e', your prequel should END with those exact values:

// PREQUEL FOR TARGET SCENE
// Start state (target frame 0): "Hello" centered, white, opacity 1, scale 1, bg #1a1a2e
// DURATION: 90
// FPS: 30

const MyComposition = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // Build up to target start state — text fades in and scales to 1
  const opacity = interpolate(frame, [30, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scale = interpolate(frame, [30, 60], [0.5, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // Background is consistent throughout
  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a2e' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', opacity, transform: \`scale(\${scale})\`,
      }}>
        <h1 style={{ color: '#fff', fontSize: 80 }}>Hello</h1>
      </div>
    </AbsoluteFill>
  );
};

Now generate a prequel based on the user's request.`;
```

### Example 2: generatePrequel Action

```typescript
// Source: Mirrors generateContinuation in convex/generateAnimation.ts
export const generatePrequel = action({
  args: {
    sourceClipId: v.id("clips"),
    prompt: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    rawCode: string;
    code: string;
    durationInFrames: number;
    fps: number;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be logged in to generate prequels");
    }

    const sourceClip = await ctx.runQuery(internal.clips.getInternal, {
      id: args.sourceClipId,
    });
    if (!sourceClip) throw new Error("Source clip not found");
    if (!sourceClip.rawCode) throw new Error("Source clip has no raw code available for prequel generation");

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured.");

    const client = new Anthropic({ apiKey });

    const userContent = args.prompt
      ? `TARGET SCENE CODE:\n\`\`\`\n${sourceClip.rawCode}\n\`\`\`\n\nGenerate a prequel that leads into this scene: ${args.prompt}`
      : `TARGET SCENE CODE:\n\`\`\`\n${sourceClip.rawCode}\n\`\`\`\n\nGenerate a natural, visually interesting prequel that leads into this scene.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      system: PREQUEL_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    // Same post-processing as generateContinuation
    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("Failed to generate prequel: No text response from AI.");
    }

    let rawCode = textContent.text.trim();
    if (rawCode.startsWith("```")) {
      rawCode = rawCode
        .replace(/^```(?:jsx|tsx|javascript|typescript)?\s*\n?/, "")
        .replace(/\n?```\s*$/, "")
        .trim();
    }

    const durationMatch = rawCode.match(/\/\/\s*DURATION:\s*(\d+)/);
    const rawDuration = durationMatch ? parseInt(durationMatch[1]) : 90;
    const durationInFrames = Math.min(Math.max(rawDuration, 30), 600);
    const fps = 30;

    const validation = validateRemotionCode(rawCode);
    if (!validation.valid) {
      throw new Error(`Prequel code validation failed: ${validation.errors[0]?.message || "Invalid code"}`);
    }

    const transformed = transformJSX(rawCode);
    if (!transformed.success || !transformed.code) {
      throw new Error(transformed.error || "Code transformation failed");
    }

    return { rawCode, code: transformed.code, durationInFrames, fps };
  },
});
```

### Example 3: Extend Previous Handler (save-then-navigate)

```typescript
// Source: Mirrors handleExtendNextGeneration in create-page-client.tsx
const handleExtendPreviousGeneration = useCallback(async (generation: any) => {
  if (!generation.code || !generation.rawCode) {
    toast.error("Cannot extend: generation has no code");
    return;
  }
  try {
    const clipId = await saveClip({
      name: generation.prompt.slice(0, 50) || "Untitled",
      code: generation.code,
      rawCode: generation.rawCode,
      durationInFrames: generation.durationInFrames ?? 90,
      fps: generation.fps ?? 30,
    });
    toast.success("Saved as clip -- opening prequel generation...");
    router.push(`/create?sourceClipId=${clipId}&mode=prequel`);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Failed to start prequel generation");
  }
}, [saveClip, router]);
```

### Example 4: Prequel Mode in handleUnifiedSubmit

```typescript
// Source: Extends existing handleUnifiedSubmit in create-page-client.tsx
const handleUnifiedSubmit = useCallback(
  async (text: string, imageIds: string[]) => {
    const imgIds = imageIds.length > 0 ? imageIds : undefined;
    if (sourceClipId && mode === "prequel" && !lastGeneration) {
      // Prequel mode: first submission generates prequel
      await handlePrequelGenerate(text);
    } else if (sourceClipId && !lastGeneration) {
      // Continuation mode (default when sourceClipId present)
      await handleContinuationGenerate(text);
    } else if (!lastGeneration) {
      await handleGenerate(text, imgIds);
    } else if (text.toLowerCase().startsWith("start over:")) {
      // ... existing start over logic
    } else {
      await handleRefine(text);
    }
  },
  [sourceClipId, mode, lastGeneration, handleGenerate, handlePrequelGenerate, handleContinuationGenerate, handleRefine, validation]
);
```

### Example 5: "Extend Previous" Menu Item in GenerationRowActions

```typescript
// Source: Added to GenerationRowActions alongside existing Extend Next
<DropdownMenuItem
  onSelect={() => onExtendPrevious(generation)}
  disabled={isFailed || !generation.code}
>
  <Rewind className="h-4 w-4" />
  Extend Previous
</DropdownMenuItem>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No prequel generation in any tool | LLM-based code reading for start-state extraction | Novel in this project | Unique feature -- no competitor (Runway, Pika, Midjourney) offers temporal prequel generation |
| Static AST analysis rejected (Phase 12) | LLM code reading validated | Phase 12 research | Applies equally to prequel: Claude reads code semantics, not static AST |

**Deprecated/outdated:**
- Nothing deprecated. This is new functionality building on validated patterns.

## Open Questions

1. **URL param design: `mode=prequel` vs. `sourceClipId` + `prequelSourceClipId`**
   - What we know: The current create page uses `sourceClipId` for continuation mode. Prequel also needs a source clip ID.
   - What's unclear: Whether a single `sourceClipId` param with a `mode` query param is cleaner than separate params.
   - Recommendation: Use `sourceClipId` + `mode=prequel`. This is cleaner because both continuation and prequel reference the same concept (a source clip). The `mode` param distinguishes direction. Default mode (no param) = continuation (backward compatible).

2. **Prequel quality for complex animations**
   - What we know: Start-state extraction is simpler than end-state. Initial values are explicit in code. Phase 12's continuation approach is validated.
   - What's unclear: How well Claude handles edge cases: delayed element entry, complex nested Sequences, conditional rendering at frame 0.
   - Recommendation: Build it with the standard approach, test with diverse clips. The prompt handles most cases. Complex edge cases are mitigated by user preview + edit capability. This is listed as a known concern in STATE.md.

3. **Should prequel generation store a `continuationType` field on the generation record?**
   - What we know: The generations schema has an optional `continuationType` field (added in Phase 12). The continuation action does NOT currently set it (returns directly without DB persist).
   - What's unclear: Whether prequel generations that are later saved through the feed should be tagged differently.
   - Recommendation: Don't use this field for now. Prequels are saved as regular clips. If lineage tracking is needed later, it's a future enhancement.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `convex/generateAnimation.ts` -- CONTINUATION_SYSTEM_PROMPT (lines 358-439), generateContinuation action (lines 931-1033), shared validation/transformation pipeline
- Existing codebase: `src/app/(app)/create/create-page-client.tsx` -- Continuation mode handling (lines 310-355), handleExtendNextGeneration (lines 438-456), handleUnifiedSubmit routing (lines 357-382)
- Existing codebase: `src/components/generation/generation-row-actions.tsx` -- Dropdown menu structure, existing Extend Next menu item
- Existing codebase: `src/components/generation/generation-feed.tsx` -- Callback threading pattern
- Existing codebase: `convex/clips.ts` -- clips.save mutation, clips.getInternal internalQuery
- Planning docs: `.planning/phases/12-continuation-generation/12-01-PLAN.md` -- CONTINUATION_SYSTEM_PROMPT specification
- Planning docs: `.planning/phases/16-per-creation-actions/16-02-PLAN.md` -- Extend-next save-then-navigate pattern
- Planning docs: `.planning/phases/16-per-creation-actions/16-02-SUMMARY.md` -- Established patterns reusable for extend-previous

### Secondary (MEDIUM confidence)
- Planning docs: `.planning/research/03-ARCHITECTURE.md` -- Prequel architecture section (lines 140-168)
- Planning docs: `.planning/research/04-PITFALLS.md` -- Prequel quality analysis (lines 82-109)
- Planning docs: `.planning/research/v02-SUMMARY.md` -- Prequel architecture confidence assessment

### Tertiary (LOW confidence)
- None. All findings are derived from the existing codebase and validated Phase 12 architecture.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing infrastructure reused
- Architecture (PREQUEL_SYSTEM_PROMPT): HIGH -- mirrors validated CONTINUATION_SYSTEM_PROMPT with simpler analysis (frame 0 vs final frame)
- Architecture (generatePrequel action): HIGH -- direct copy of generateContinuation with different prompt
- Architecture (UI wiring): HIGH -- exact same callback threading pattern as extend-next (Phase 16-02)
- Architecture (create page prequel mode): HIGH -- minimal addition to existing continuation mode logic
- Pitfalls: MEDIUM -- start-state extraction is simpler but edge cases exist (delayed entry, conditional rendering)

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (architecture mirrors validated continuation system; stable domain)
