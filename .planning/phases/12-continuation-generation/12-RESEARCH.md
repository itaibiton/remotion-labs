# Phase 12: Continuation Generation - Research

**Researched:** 2026-02-01
**Domain:** LLM prompt engineering for code continuation, JSX end-state extraction, Remotion animation continuity
**Confidence:** MEDIUM (novel architecture -- no existing library or established pattern for this exact problem)

## Summary

Phase 12 is the most technically novel phase in the project. It enables users to generate a "next scene" that picks up visually from where the previous clip ended. The core challenge is: given a Remotion JSX composition (arbitrary Claude-generated code), determine its visual end state (final positions, colors, sizes, opacity, text content) and use that as the starting state for a new composition.

After investigating three approaches -- (1) pure static AST analysis of JSX code, (2) runtime last-frame rendering plus image analysis, and (3) LLM-based code reading with structured prompt engineering -- the research strongly recommends **approach #3: LLM-based code reading**. Pure AST analysis (approach #1) is fundamentally fragile because animation values depend on runtime expressions (`interpolate(frame, ...)`, `spring({frame, fps, ...})`), conditional logic, and complex variable chains that cannot be statically resolved. Runtime rendering (approach #2) would require server-side headless browser rendering or Lambda-based `renderStill` just to capture a screenshot, adding infrastructure complexity disproportionate to the value. The LLM approach leverages what this project already has (Claude API integration) and is well-suited because Claude can reason about code semantics -- it can read `interpolate(frame, [0, 90], [0, 1], {extrapolateRight: 'clamp'})` and understand that at frame 90 the value is 1.

The architecture is: (1) user clicks "Generate next scene" from a clip, (2) the system sends the previous clip's `rawCode` to a specialized Claude prompt that extracts the end state and generates a continuation, (3) the continuation code goes through the existing validation/transformation pipeline, (4) the user previews and can accept, edit, regenerate, or discard.

**Primary recommendation:** Use a specialized continuation system prompt that sends the previous clip's rawCode to Claude with instructions to analyze the end state and generate a new composition starting from those values. Do NOT attempt static AST analysis of animation end states.

## Standard Stack

### Core (already installed -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | existing | Claude API for end-state analysis + continuation generation | Already used in generateAnimation.ts |
| `acorn` + `acorn-jsx` | existing | AST parsing for code validation | Already used in validation pipeline |
| `sucrase` | existing | JSX-to-JS transformation | Already used in code-transformer.ts |
| `remotion` | ^4.0.410 | Composition framework | Already used throughout |
| `convex` | ^1.31.6 | Backend actions/mutations | Already used for generation pipeline |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sonner` | ^2.0.7 | Toast notifications | User feedback on continuation generation |
| `lucide-react` | ^0.563.0 | Icons for "Generate next scene" button | UI icons |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| LLM code reading for end-state | Static AST analysis | AST cannot resolve runtime values (interpolate, spring, conditionals); would produce incorrect/incomplete end states for most real animations |
| LLM code reading for end-state | renderStill via Lambda + vision model | Would capture pixel-perfect last frame but requires Lambda infra for every continuation, adds latency (5-10s), and visual description loses precision vs. code-level understanding |
| Single prompt (analyze + generate) | Two-step API call (analyze then generate) | Single prompt is simpler, cheaper, lower latency; two-step offers more control but doubles API cost and latency |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure

```
convex/
  generateAnimation.ts       # MODIFY -- add generateContinuation action
src/
  app/(app)/create/
    create-page-client.tsx   # MODIFY -- add continuation flow, accept sourceClipId param
    page.tsx                 # MODIFY -- accept sourceClipId search param
  components/generation/
    prompt-input.tsx         # EXISTING -- reuse for continuation prompt (optional context)
  components/movie/
    timeline-scene.tsx       # MODIFY -- add "Generate next scene" button on scene hover
    movie-editor.tsx         # MODIFY -- wire "Generate next scene" from timeline
  components/library/
    clip-card.tsx            # MODIFY -- add "Generate next scene" action
  lib/
    continuation-prompt.ts   # NEW -- continuation system prompt builder
```

### Pattern 1: LLM-Based End-State Extraction via Prompt Engineering

**What:** Send the previous clip's rawCode to Claude with a specialized system prompt that instructs it to (a) analyze the code to determine the visual state at the final frame, and (b) generate a new composition that starts from that state.

**When to use:** Every time user clicks "Generate next scene."

**Example prompt structure:**
```typescript
// Source: Novel architecture for this project
function buildContinuationSystemPrompt(): string {
  return `You are a Remotion animation code generator specializing in scene continuations.

You will receive:
1. The PREVIOUS SCENE's complete Remotion code
2. A user prompt describing what should happen next

Your task:
1. ANALYZE the previous scene's code to determine its FINAL VISUAL STATE:
   - Read all interpolate() calls and determine their output at the last frame
   - Read all spring() calls and determine their settled value (typically 1.0 for default springs)
   - Identify final positions (transform: translate), rotations, scales
   - Identify final opacity values
   - Identify final colors (backgroundColor, color)
   - Identify text content visible at the end
   - Identify any elements that are visible vs hidden at the end
   - Note the duration (from // DURATION comment) to know the last frame number

2. GENERATE a new composition where:
   - The INITIAL visual state matches the previous scene's FINAL state
   - All elements that were visible at the end of the previous scene start in their final positions
   - Colors, sizes, and opacity start where the previous scene ended
   - The animation then transitions to whatever the user's prompt describes
   - If no specific user prompt, create a natural visual continuation

CRITICAL RULES:
- The new composition MUST start visually identical to how the previous scene ended
- Use the same coordinate system and positioning approach
- If the previous scene used AbsoluteFill with centered content, start the same way
- Interpolations in the new scene should start from the previous scene's end values
- Output ONLY valid JSX code with // DURATION and // FPS comments
- Component must be named MyComposition
- Do NOT use import statements

${STANDARD_API_INSTRUCTIONS}`;
}
```

### Pattern 2: Continuation Action (Convex Backend)

**What:** A new Convex action that takes a clip ID (source clip) + optional user prompt, fetches the clip's rawCode, and calls Claude with the continuation prompt.

**When to use:** Backend handler for continuation generation requests.

**Example:**
```typescript
// Source: Pattern derived from existing generate/refine actions
export const generateContinuation = action({
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
    if (!identity) throw new Error("Not authenticated");

    // Fetch the source clip's raw JSX
    const sourceClip = await ctx.runQuery(
      internal.clips.getInternal,
      { id: args.sourceClipId }
    );
    if (!sourceClip) throw new Error("Source clip not found");

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    // Build the user message with previous code + continuation request
    const userMessage = args.prompt
      ? `PREVIOUS SCENE CODE:\n\`\`\`\n${sourceClip.rawCode}\n\`\`\`\n\nGenerate the next scene: ${args.prompt}`
      : `PREVIOUS SCENE CODE:\n\`\`\`\n${sourceClip.rawCode}\n\`\`\`\n\nGenerate a natural continuation of this scene.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      system: CONTINUATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    // Extract, validate, transform (same pipeline as generate action)
    // ... identical post-processing ...
  },
});
```

### Pattern 3: Navigation to Create Page with Continuation Context

**What:** "Generate next scene" buttons navigate to `/create?sourceClipId=XXX` where the create page loads in continuation mode.

**When to use:** Triggering continuation from timeline, library, or create page.

**Example:**
```typescript
// From timeline-scene.tsx or clip-card.tsx
const handleGenerateNext = (clipId: string) => {
  router.push(`/create?sourceClipId=${clipId}`);
};

// In create-page-client.tsx
// When sourceClipId is present, show continuation UI:
// - Display source clip thumbnail/preview as reference
// - Pre-fill prompt with "Continue from previous scene..."
// - On submit, call generateContinuation instead of generate
```

### Pattern 4: Create Page Contextual Actions

**What:** The create page shows different action buttons based on state: (1) no generation yet shows nothing, (2) after generation shows "Save as Clip", (3) after save shows "Add to Movie" + "Generate Next Scene".

**When to use:** The render controls section of create-page-client.tsx.

**Example:**
```typescript
// Contextual actions based on state
{lastGeneration && !isGenerating && (
  <div className="flex items-center gap-2">
    {/* Always show save */}
    <Button onClick={() => setShowSaveDialog(true)}>
      <Save className="h-4 w-4 mr-2" />
      Save as Clip
    </Button>

    {/* Show "Add to Movie" when clip is saved */}
    {clipId && (
      <Button variant="outline" onClick={() => setShowAddToMovieDialog(true)}>
        <Film className="h-4 w-4 mr-2" />
        Add to Movie
      </Button>
    )}

    {/* Show "Generate Next Scene" when clip is saved */}
    {clipId && (
      <Button variant="outline" onClick={() => handleGenerateNext(clipId)}>
        <FastForward className="h-4 w-4 mr-2" />
        Generate Next Scene
      </Button>
    )}
  </div>
)}
```

### Anti-Patterns to Avoid

- **Static AST analysis of animation end states:** Do NOT attempt to parse `interpolate()` or `spring()` calls and compute their final values via AST. These are runtime functions with complex inputs (frame, fps, config objects, nested expressions). The effort-to-accuracy ratio is terrible.
- **Rendering the last frame to extract state:** While `renderStill` with `frame: -1` can capture a screenshot, converting pixels back to code-level state (exact positions, colors, font sizes) requires a vision model and is inherently lossy. Use LLM code reading instead.
- **Coupling continuation tightly to movie workflow:** Keep continuation generation independent of movies. A user should be able to generate a continuation from any clip, even if no movie exists. The "add to movie" step is separate.
- **Over-engineering the end-state extraction:** The LLM does NOT need to produce a perfect mathematical analysis of every animation value. It needs to produce code that looks visually continuous. Claude is excellent at this kind of semantic code reasoning.
- **Storing continuation relationships in the database:** For MVP, do NOT add a `parentClipId` field or build a clip lineage graph. The continuation is a fresh generation that happens to start from another clip's visual state. Keep the data model simple.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| End-state extraction from animation code | Custom AST evaluator for interpolate/spring/conditionals | Claude's code reading via continuation prompt | Static analysis cannot resolve runtime-dependent values; Claude excels at semantic code understanding |
| Last-frame rendering | Browser automation / puppeteer screenshot | N/A (don't use visual approach at all) | Adds infrastructure complexity, latency, and visual-to-code lossy conversion |
| Code validation for continuations | New validation pipeline | Existing `validateRemotionCode` + `transformJSX` | Continuation output is standard Remotion JSX, identical to any other generation |
| Continuation preview | New preview component | Existing `PreviewPlayer` with `DynamicCode` | Output code follows same pattern as any generation |
| "Add to movie" from create page | Custom movie selector + mutation | Existing `AddScenePanel` pattern (dialog listing movies, call `movies.addScene`) | Same interaction pattern, just triggered from create page instead of movie editor |

**Key insight:** Continuation generation is fundamentally a **prompt engineering problem**, not a code analysis problem. The novel work is crafting the right system prompt and structuring the previous-code-to-Claude pipeline. Everything else reuses existing infrastructure.

## Common Pitfalls

### Pitfall 1: Claude Ignoring the End State

**What goes wrong:** Claude generates a continuation that doesn't visually match the previous scene's end. For example, previous scene ends with text at opacity 1.0 centered, continuation starts with text at opacity 0 sliding in from the left.
**Why it happens:** The continuation system prompt isn't specific enough, or Claude treats the previous code as inspiration rather than a constraint.
**How to avoid:** The system prompt must be extremely explicit:
  - "The FIRST FRAME of your new composition must be VISUALLY IDENTICAL to the LAST FRAME of the previous composition"
  - Require Claude to output a brief analysis comment at the top of the code: `// END STATE: text at center, opacity 1, scale 1, bg #1a1a2e`
  - Include concrete examples in the system prompt showing a previous scene's code and the correct continuation
**Warning signs:** Users report "jumps" between scenes when previewed in sequence.

### Pitfall 2: Coordinate System Mismatch

**What goes wrong:** Previous scene uses `transform: translate(100px, 0)` with absolute positioning; continuation uses flexbox centering. The "same position" is achieved differently, causing visual discontinuity.
**Why it happens:** Claude chooses different layout approaches for different generations.
**How to avoid:** The continuation prompt should instruct Claude to use the SAME layout approach as the previous scene. If previous scene used `AbsoluteFill` + `display: flex` + `justifyContent: center`, the continuation must start the same way.
**Warning signs:** Elements appear to "jump" even though numerical values seem correct.

### Pitfall 3: Duration/FPS Mismatch

**What goes wrong:** Previous clip is 90 frames at 30fps; continuation is 120 frames at 60fps. When combined in a movie, timing feels wrong.
**Why it happens:** Claude picks different timing values unless constrained.
**How to avoid:** The continuation prompt should explicitly state: "Use the same FPS as the previous scene (30fps). Duration can vary but must be reasonable (60-180 frames)."
**Warning signs:** Continuation scenes feel too fast or too slow when combined in a movie.

### Pitfall 4: Accumulating Context Window Bloat

**What goes wrong:** If a user generates scene 1, then continues to scene 2, then continues from scene 2 to scene 3, etc., each continuation only has the immediately previous scene's code. But the user might want scene 5 to reference something from scene 1.
**Why it happens:** We only send one clip's rawCode as context, not the entire chain.
**How to avoid:** For MVP, this is acceptable -- each continuation only looks back one scene. Add a note in the UI: "Continuation is based on the selected clip." If users need multi-scene context, they can describe it in the prompt. Future enhancement: allow selecting multiple reference clips.
**Warning signs:** Users confused about why continuation doesn't match scene N-2.

### Pitfall 5: Create Page State Management Complexity

**What goes wrong:** Adding continuation mode to the already-complex create page creates state spaghetti. The page now has: generate mode, refine mode, edit mode, load-from-clip mode, and continuation mode.
**Why it happens:** Too many features crammed into one page component.
**How to avoid:** Continuation mode is structurally similar to a fresh generation but with a different API call and source context. Handle it with a single boolean/state: `sourceClipId` presence determines whether to call `generateContinuation` vs `generate`. The UI differences are minimal (show source clip reference, different default prompt text).
**Warning signs:** Growing number of conditional branches in CreateContent component.

### Pitfall 6: Missing "Add to Movie" Dialog

**What goes wrong:** User generates a continuation, saves it as a clip, but then has no easy way to add it to a movie from the create page.
**Why it happens:** The current create page has "Save as Clip" but not "Add to Movie."
**How to avoid:** After saving a clip, show "Add to Movie" button that opens a dialog listing the user's movies. Call `movies.addScene` with the new clipId. This is UI-02 in the requirements.
**Warning signs:** Users have to navigate to movie editor, click "Add Scene", find the clip in the library -- tedious workflow.

## Code Examples

### Example 1: Continuation System Prompt

```typescript
// Source: Novel for this project, based on existing SYSTEM_PROMPT pattern
const CONTINUATION_SYSTEM_PROMPT = `You are a Remotion animation code generator specializing in scene continuations.
You create compositions that start EXACTLY where a previous composition ended.

You will receive the PREVIOUS SCENE's complete Remotion code. Your job:

STEP 1 - ANALYZE the previous scene's FINAL VISUAL STATE:
- Look at the // DURATION comment to know the total frames
- For each interpolate(frame, [inputStart, inputEnd], [outputStart, outputEnd]):
  At the last frame, the output will be outputEnd (or clamped if extrapolateRight is 'clamp')
- For each spring({frame, fps, ...}): At the last frame, the value settles to 'to' (default 1)
- Identify ALL visual properties at the last frame:
  - Positions (transform: translate, top/left, flex alignment)
  - Opacity values
  - Scale values
  - Rotation values
  - Colors (backgroundColor, color, borderColor)
  - Font sizes and text content
  - Which elements are visible (opacity > 0, not clipped by Sequence)

STEP 2 - Add a comment block at the top summarizing the end state:
// CONTINUATION FROM PREVIOUS SCENE
// End state: [brief description of final visual state]
// DURATION: [frames]
// FPS: 30

STEP 3 - GENERATE a new composition where:
- Frame 0 MUST look identical to the previous scene's last frame
- Set initial values (before any interpolation) to match the end state
- Then animate FROM those values to new values based on the user's prompt
- Use the same layout approach (AbsoluteFill, flex, etc.) as the previous scene
- Keep consistent styling (font families, color palettes) unless user requests changes

CRITICAL RULES:
- Component must be named "MyComposition"
- Do NOT use import statements (APIs are pre-injected)
- Output ONLY valid JSX code. No markdown, no explanations, no code blocks
- Available APIs: React, useState, useEffect, useMemo, useCallback,
  AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring,
  Sequence, Easing, random, Audio, Img, staticFile, Video, OffthreadVideo,
  Composition, Still, Series, Loop, Freeze
- FORBIDDEN: import/require, eval, Function, fetch, document, window, process

EXAMPLE:
If the previous scene ends with white text "Hello" at center, opacity 1, scale 1.2,
backgroundColor '#1a1a2e', your continuation should start:

// CONTINUATION FROM PREVIOUS SCENE
// End state: "Hello" centered, white, opacity 1, scale 1.2, bg #1a1a2e
// DURATION: 90
// FPS: 30

const MyComposition = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Start from previous end state
  const opacity = interpolate(frame, [0, 30], [1, 0], { extrapolateRight: 'clamp' });
  const scale = interpolate(frame, [0, 30], [1.2, 0.8], { extrapolateRight: 'clamp' });
  // New element fading in as old fades out
  const newOpacity = interpolate(frame, [15, 45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a2e' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', opacity, transform: \`scale(\${scale})\`,
      }}>
        <h1 style={{ color: '#fff', fontSize: 80 }}>Hello</h1>
      </div>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: newOpacity,
      }}>
        <h1 style={{ color: '#fff', fontSize: 80 }}>World</h1>
      </div>
    </AbsoluteFill>
  );
};`;
```

### Example 2: generateContinuation Action

```typescript
// Source: Pattern derived from existing generate/refine actions in generateAnimation.ts
export const generateContinuation = action({
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
    if (!identity) throw new Error("Must be authenticated");

    // Fetch source clip
    const sourceClip = await ctx.runQuery(
      internal.clips.getInternal,
      { id: args.sourceClipId }
    );
    if (!sourceClip) throw new Error("Source clip not found");

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const userContent = args.prompt
      ? `PREVIOUS SCENE CODE:\n${sourceClip.rawCode}\n\nUser request for next scene: ${args.prompt}`
      : `PREVIOUS SCENE CODE:\n${sourceClip.rawCode}\n\nGenerate a natural, visually interesting continuation.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      system: CONTINUATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    // Same post-processing as generate action:
    // extract text, strip markdown, extract metadata, validate, transform
    const textContent = response.content.find((b) => b.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No response from AI");
    }

    let rawCode = textContent.text.trim();
    if (rawCode.startsWith("```")) {
      rawCode = rawCode
        .replace(/^```(?:jsx|tsx|javascript|typescript)?\s*\n?/, "")
        .replace(/\n?```\s*$/, "")
        .trim();
    }

    const durationMatch = rawCode.match(/\/\/\s*DURATION:\s*(\d+)/);
    const durationInFrames = Math.min(
      Math.max(durationMatch ? parseInt(durationMatch[1]) : 90, 30),
      600
    );
    const fps = 30;

    // Reuse existing validation pipeline
    const validation = validateRemotionCode(rawCode);
    if (!validation.valid) {
      throw new Error(`Continuation code validation failed: ${validation.errors[0]?.message}`);
    }

    const transformed = transformJSX(rawCode);
    if (!transformed.success || !transformed.code) {
      throw new Error(transformed.error || "Transformation failed");
    }

    return { rawCode, code: transformed.code, durationInFrames, fps };
  },
});
```

### Example 3: Create Page Continuation Mode

```typescript
// Source: Pattern derived from existing create-page-client.tsx
// In create page, detect sourceClipId and show continuation context

interface CreateContentProps {
  selectedTemplate: Template | null;
  clipId?: string;
  sourceClipId?: string;  // NEW: for continuation mode
}

// Inside CreateContent component:
const sourceClip = useQuery(
  api.clips.get,
  sourceClipId ? { id: sourceClipId as any } : "skip"
);

const generateContinuation = useAction(api.generateAnimation.generateContinuation);

const handleContinuationGenerate = useCallback(async (prompt: string) => {
  if (!sourceClipId) return;
  setIsGenerating(true);
  setCurrentStep("analyzing");
  try {
    await new Promise((r) => setTimeout(r, 500));
    setCurrentStep("generating");
    const result = await generateContinuation({
      sourceClipId: sourceClipId as any,
      prompt: prompt || undefined,
    });
    setCurrentStep("validating");
    await new Promise((r) => setTimeout(r, 300));
    setLastGeneration({
      id: "continuation",
      rawCode: result.rawCode,
      code: result.code,
      durationInFrames: result.durationInFrames,
      fps: result.fps,
    });
    toast.success("Continuation generated!");
  } catch (e) {
    setError({ message: e instanceof Error ? e.message : "Failed", retryCount: 0 });
  } finally {
    setIsGenerating(false);
    setCurrentStep(null);
  }
}, [sourceClipId, generateContinuation]);
```

### Example 4: "Generate Next Scene" from Timeline

```typescript
// Source: Pattern for timeline-scene.tsx modification
// Add a button to TimelineScene that navigates to continuation mode

<button
  className="absolute bottom-1 right-1 z-10 rounded-full bg-primary/80 text-primary-foreground p-1 opacity-0 group-hover:opacity-100 transition-opacity"
  onClick={(e) => {
    e.stopPropagation();
    e.preventDefault();
    // Navigate to create page in continuation mode
    router.push(`/create?sourceClipId=${clip._id}`);
  }}
  onPointerDown={(e) => e.stopPropagation()}
  title="Generate next scene"
>
  <FastForward className="h-3 w-3" />
</button>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static analysis of animation code end-state | LLM-based code reading for semantic understanding | 2024-2025 (LLM code reasoning matured) | Makes continuation generation feasible without building a custom animation evaluator |
| Pixel-based visual continuity (screenshot + vision model) | Code-level continuity via prompt engineering | Project-specific decision | More precise, lower latency, no infrastructure overhead |
| Complex multi-step pipeline (analyze, extract, template, generate) | Single LLM call with rich system prompt | Current best practice for LLM code generation | Simpler architecture, fewer failure points |

**Deprecated/outdated:**
- The PROJECT.md mentions "Serialize end-state from code (static analysis of JSX)" as a pending decision. This research concludes that pure static analysis is NOT viable for arbitrary animation code. The "serialization" should happen via LLM code reading, not AST-based extraction.

## Open Questions

1. **Quality of LLM-generated continuations**
   - What we know: Claude is excellent at understanding code semantics and can reason about interpolate/spring final values. The system prompt approach is well-tested in the existing generation and refinement flows.
   - What's unclear: How consistently Claude produces visually seamless continuations across diverse animation styles (particle effects, complex multi-element scenes, nested Sequences). This needs empirical testing.
   - Recommendation: Build it, test with 10-20 diverse clips, iterate on the system prompt based on failure cases. The prompt is the primary tuning lever.

2. **Continuation refinement loop**
   - What we know: Users may want to refine a continuation (change timing, adjust elements). The existing refine action supports multi-turn conversation.
   - What's unclear: Should continuation refinements include the original source clip's code as persistent context, or just the current continuation code?
   - Recommendation: For refinements after continuation, use the existing refine flow with ONLY the continuation's current code. Include a note in the system prompt that this was a continuation. Keep it simple for MVP.

3. **"Add to Movie" from create page**
   - What we know: Users need to add generated clips to movies directly from the create page (UI-02). Currently they must save a clip, go to movie editor, add scene.
   - What's unclear: Should the dialog list existing movies, create a new movie, or both?
   - Recommendation: Show a dialog listing existing movies (reuse AddScenePanel pattern) with a "Create new movie" option at the top. This requires a small new component.

4. **Multi-scene continuation context**
   - What we know: MVP sends only the immediately previous clip's code. Users generating scene 5 can't reference scene 1's visuals.
   - What's unclear: Whether this is a real user need or a theoretical concern.
   - Recommendation: Defer to post-MVP. If needed, allow selecting "reference clips" that get included as additional context in the prompt.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `convex/generateAnimation.ts` -- System prompts, generate/refine actions, validation pipeline
- Existing codebase: `src/app/(app)/create/create-page-client.tsx` -- Create page state management, generation flow
- Existing codebase: `convex/clips.ts` -- Clip data model (rawCode, code, timing)
- Existing codebase: `convex/movies.ts` -- Movie data model (scenes, addScene mutation)
- Existing codebase: `src/lib/code-validator.ts` -- Validation pipeline for generated code
- Existing codebase: `src/lib/code-executor.ts` -- Code execution with scoped APIs
- [Remotion interpolate docs](https://www.remotion.dev/docs/interpolate) -- interpolate() behavior, extrapolation, clamping
- [Remotion spring docs](https://www.remotion.dev/docs/spring) -- spring() behavior, measureSpring(), settled values
- [Remotion measureSpring docs](https://www.remotion.dev/docs/measure-spring) -- Programmatic duration calculation
- [Remotion renderStill docs](https://www.remotion.dev/docs/renderer/render-still) -- frame: -1 for last frame capture (investigated but NOT recommended)

### Secondary (MEDIUM confidence)
- [Keyframer: Empowering Animation Design using LLMs](https://arxiv.org/html/2402.06071v1) -- Research on LLM-driven animation with iterative "decomposed" prompting. Validates the incremental prompting approach.
- [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering) -- Best practices for structured prompts with examples
- [Context Engineering Guide](https://www.promptingguide.ai/guides/context-engineering-guide) -- Context window management for code generation
- [jsx-ast-utils](https://github.com/jsx-eslint/jsx-ast-utils) -- JSX AST utilities (investigated for static analysis approach, NOT recommended)

### Tertiary (LOW confidence)
- Community examples of LLM animation continuation -- No established patterns found; this is genuinely novel work. The Keyframer paper is the closest reference but focuses on SVG/CSS animations, not Remotion compositions.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing infrastructure reused
- Architecture (LLM-based continuation): MEDIUM -- novel approach with strong reasoning but requires empirical validation of prompt quality
- Architecture (create page modifications): HIGH -- extends well-understood existing patterns
- Pitfalls: MEDIUM -- identified from code analysis and prompt engineering experience, but continuation-specific edge cases need runtime testing
- UI patterns (contextual actions): HIGH -- straightforward button/dialog additions following existing patterns

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (prompt engineering approach is model-independent; architecture is stable)
