# Pitfalls Research: Multi-Scene Movie Editor (v2.0)

**Domain:** Adding multi-scene composition, timeline, clip library, and continuation generation to existing RemotionLab
**Researched:** 2026-01-29
**Context:** v1.1 shipped full JSX code generation with sandboxed execution. v2.0 adds clip saving, timeline/movie editor, scene continuation, and multi-clip rendering.
**Confidence:** MEDIUM-HIGH (verified against official Remotion docs, Convex docs, Claude API docs, and community sources)

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or architectural dead ends.

### Pitfall 1: End-State Extraction From JSX is Fundamentally Unreliable Via Static Analysis

**What goes wrong:**
The plan calls for "static analysis of JSX code to extract final frame positions/styles/text" so Claude can generate continuation scenes. This approach has severe limitations that will cause continuation generation to produce visually broken transitions.

**Why it happens:**
Remotion animations use `interpolate()`, `spring()`, and `useCurrentFrame()` to compute styles dynamically at render time. The final frame's visual state depends on runtime computation, not static code inspection. Consider:

```jsx
// Case 1: Simple -- extractable via AST
const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
// Final value at frame 90: 1.0 -- AST can see [0, 1] output range

// Case 2: Computed -- NOT extractable via AST
const springVal = spring({ frame, fps, config: { damping: 10, stiffness: 100 } });
const x = interpolate(springVal, [0, 1], [-200, 400]);
// Final value depends on spring physics. AST sees [-200, 400] but the actual
// value at the final frame is NOT 400 -- spring overshoots and settles.

// Case 3: Conditional -- NOT extractable via AST
const phase = frame < 30 ? 'enter' : frame < 60 ? 'hold' : 'exit';
const scale = phase === 'exit' ? interpolate(frame, [60, 90], [1, 0]) : 1;
// AST cannot evaluate which branch is active at the final frame.

// Case 4: Loop-generated elements -- NOT extractable via AST
{Array.from({ length: 5 }).map((_, i) => {
  const delay = i * 10;
  const y = interpolate(frame - delay, [0, 20], [100, 0], { extrapolateLeft: 'clamp' });
  return <div style={{ transform: `translateY(${y}px)` }} />;
})}
// Each element has different final position based on its delay offset.

// Case 5: State-dependent -- NOT extractable via AST
const [hasAppeared, setHasAppeared] = useState(false);
useEffect(() => { if (frame > 45) setHasAppeared(true); }, [frame]);
// Visual state depends on React state, which AST cannot evaluate.
```

**Research context:**
- Remotion's `interpolate()` and `spring()` are pure functions that CAN be called outside render context with arbitrary frame values ([Remotion docs](https://www.remotion.dev/docs/interpolate), [spring docs](https://www.remotion.dev/docs/spring)). This means runtime evaluation IS possible.
- However, the challenge is extracting the function call arguments from generated code to replay them.
- Static CSS extraction from JSX is a known hard problem. Telerik's research notes "static extraction requires some form of static evaluation, especially when styles depend on imported values" ([Telerik](https://www.telerik.com/blogs/static-extraction-css-js-efficiency-react-apps)).
- Acorn (already in the project) can parse call expressions and extract literal arguments ([ESTree spec](https://github.com/acornjs/acorn)), but computed arguments, variables, and conditional logic defeat AST-only approaches.

**Warning signs (how to detect early):**
- Continuation scenes start with elements in wrong positions
- "Jump cuts" between scenes where elements teleport
- Claude generates continuation code that ignores the end-state context
- Percentage of generated code that uses computed/conditional styles grows with complexity

**Prevention strategy:**
Do NOT rely solely on AST-based static analysis. Use a hybrid approach:

1. **Runtime evaluation (recommended primary approach):** Since RemotionLab already has a sandboxed code executor with `executeCode()`, render the composition at its final frame and extract computed styles from the DOM. Remotion's `<Player>` can be seeked to the last frame. Capture the visual output as structured data (element positions, colors, text content, transforms).

2. **Fallback: Heuristic AST extraction for simple cases.** For `interpolate(frame, [inputRange], [outputRange], { extrapolateRight: 'clamp' })`, extract the last value of the output range. For `spring()`, assume convergence to 1.0. For literal style values, extract directly.

3. **LLM-assisted extraction:** Send the raw JSX code to Claude and ask it to describe the end state in structured format. Claude can reason about conditional logic and computed values better than AST traversal. This adds latency but handles edge cases.

4. **Author-declared end state:** Add a convention where generated code includes an `// END_STATE: { ... }` comment that Claude populates during generation. This is the most reliable but requires prompt engineering to ensure Claude consistently includes it.

**Which phase should address:**
Phase implementing continuation generation. This is the highest-risk technical decision in v2.0.

---

### Pitfall 2: Remotion Sequence/Series Frame Math Errors in Multi-Scene Composition

**What goes wrong:**
When composing multiple AI-generated clips into a single Remotion `<Series>`, frame calculation bugs cause:
- Scenes starting at wrong times (off by one, or off by entire scene durations)
- Scenes overlapping or leaving black gaps
- Total composition duration not matching sum of scene durations
- Nested `<Sequence>` components inside AI-generated code conflicting with the outer `<Series>` wrapper

**Why it happens:**
- Remotion frames are **0-indexed**: first frame is 0, last frame is `durationInFrames - 1`. Off-by-one errors compound with multiple scenes ([Remotion docs](https://www.remotion.dev/docs/use-current-frame)).
- `<Sequence>` components **cascade** when nested: a sequence at frame 60 inside a sequence at frame 30 starts at frame 90 ([Remotion Sequence docs](https://www.remotion.dev/docs/sequence)). Since AI-generated code may internally use `<Sequence>`, wrapping it in another `<Series.Sequence>` creates cascading that shifts all internal timing.
- `<Series.Sequence>` requires **explicit `durationInFrames`** for all but the last item ([Remotion Series docs](https://www.remotion.dev/docs/series)). If a clip's stored duration doesn't match its actual animation length, you get premature unmounting or black frames.
- Each clip's code calls `useCurrentFrame()`, which returns the frame **relative to its containing Sequence**, not the absolute movie frame. This is correct behavior but confusing when debugging.
- Clips may have been generated with different `fps` values. The current system forces `fps: 30`, but if this constraint relaxes, mixing fps values in a single composition creates timing chaos ([Remotion multiple-fps docs](https://www.remotion.dev/docs/multiple-fps)).

**Specific integration risk with existing code:**
The existing `DynamicCode` composition receives `durationInFrames` as a prop but the generated code uses `useVideoConfig()` to read it. When a clip is wrapped in `<Series.Sequence durationInFrames={120}>`, `useVideoConfig()` inside the clip still returns the clip's own duration -- but `useCurrentFrame()` is now relative to the Series offset. If the generated code hardcodes frame values (e.g., `interpolate(frame, [0, 90], ...)` for a 90-frame clip), these hardcoded values will work correctly because `useCurrentFrame()` resets to 0 within each `<Series.Sequence>`. The danger is if code uses absolute timing assumptions.

**Warning signs:**
- Black frames between scenes in preview
- Animations playing too fast or too slow within a scene
- "Popping" where a scene's elements appear at their final state instantly
- Total movie duration in the Player doesn't match expected sum

**Prevention strategy:**
1. **Use `<Series>` not manual `<Sequence from={...}>`** for movie composition. `<Series>` automatically calculates offsets. Manual `from` calculation across N clips is error-prone.
2. **Enforce uniform fps across all clips** (already done with `fps: 30`). Never relax this for v2.0.
3. **Use `calculateMetadata()`** to dynamically compute total movie duration from the sum of clip durations, rather than hardcoding ([Remotion calculateMetadata](https://www.remotion.dev/docs/calculate-metadata)).
4. **Wrap each clip's DynamicCode in a composition boundary** that isolates `useVideoConfig()` values. Use `<Sequence>` with explicit `width`/`height` props (available since Remotion v3.2.13).
5. **Validate at save time:** When a clip is saved, verify its `durationInFrames` matches the `// DURATION:` comment in its code. Alert the user on mismatch.
6. **Test with 3+ scenes** early. Two-scene compositions often work by accident; three exposes cascading bugs.

**Which phase should address:**
Phase implementing movie composition/preview. Must be solid before timeline UI adds complexity.

---

### Pitfall 3: Convex Document Size Limit Blocks Multi-Clip Movies

**What goes wrong:**
A movie document containing the code for multiple clips exceeds Convex's **1 MiB document size limit** ([Convex limits](https://docs.convex.dev/production/state/limits)). A single generated Remotion JSX clip typically ranges from 2-10 KB. A movie with 10+ clips, each storing `rawCode` (JSX) and `code` (transformed JS), could reach 200+ KB in code alone. Adding metadata, end-state snapshots, and thumbnail data pushes toward the 1 MiB ceiling.

More critically: if the data model stores clip code inline within the movie document (denormalized), the limit becomes a hard wall that forces a rewrite.

**Why it happens:**
- Convex documents have a **hard 1 MiB limit** that cannot be increased ([Convex community](https://discord-questions.convex.dev/m/1381745670624514179))
- Developers denormalize for convenience ("just put the clips array in the movie document")
- Generated code size is unpredictable -- Claude may generate 3 KB or 15 KB depending on complexity
- String fields count against the 1 MiB limit when encoded as UTF-8
- Arrays can have at most **8192 elements** and nesting at most **16 levels** -- less likely to hit but worth knowing

**Warning signs:**
- "Value is too large" errors when saving movies with many clips
- Movie save failures that only occur for complex/long movies
- Performance degradation when loading movie documents with large code strings

**Prevention strategy:**
1. **Normalize the data model.** Clips are separate documents in a `clips` table. Movies reference clips by ID in an ordered array. Movie document stays small (metadata + array of clip IDs).

   ```
   clips: { userId, name, rawCode, code, durationInFrames, fps, endState?, createdAt }
   movies: { userId, name, clipIds: Id<"clips">[], createdAt }
   ```

2. **If code strings grow very large**, use Convex file storage for the code field. Store code as a blob, reference via `storageId`. The file size in Convex storage is unlimited (upload has a 2-minute timeout) ([Convex file storage docs](https://docs.convex.dev/file-storage)). However, this adds latency for reads. Only use this escape hatch if clip code routinely exceeds 100 KB.

3. **Monitor document sizes** during development. Add a check in mutations that warns when a document approaches 500 KB.

4. **Keep `code` (transformed JS) out of clip documents if possible.** Re-transform from `rawCode` on demand. This halves code storage per clip. Trade-off: transformation latency on load.

**Which phase should address:**
Phase implementing clips/movies data model. Getting this wrong means a data migration later.

---

### Pitfall 4: Lambda Payload Limits for Multi-Clip Movie Rendering

**What goes wrong:**
When rendering a full movie (all clips composed into one video), the `inputProps` payload sent to `renderMediaOnLambda()` contains the code for ALL clips. A 10-clip movie with 5-10 KB per clip means 50-100 KB of code in `inputProps`. While Remotion 3.3+ handles this by auto-uploading large payloads to S3, the existing `triggerRender.ts` may not account for this.

Additionally, the existing render limits are designed for single clips:
- `MAX_DURATION_SECONDS: 20` (600 frames at 30fps)
- `LAMBDA_TIMEOUT_MS: 60000` (1 minute)

A 10-clip movie at 3 seconds each = 30 seconds of video, which exceeds `MAX_DURATION_SECONDS`. A complex multi-clip movie may take longer than 1 minute to render.

**Why it happens:**
- Render limits were designed for v1.0 single-clip rendering
- Lambda has a 15-minute max timeout, but the current code sets 60 seconds ([Remotion Lambda limits](https://www.remotion.dev/docs/lambda/limits))
- Lambda functions use 3-200 concurrent Lambdas per render. A longer movie uses more concurrent Lambdas, which can hit the **1000 concurrent Lambda default** per region ([Remotion Lambda docs](https://www.remotion.dev/docs/lambda))
- Disk/storage limits on Lambda can be exceeded with large compositions (configurable up to 10 GB)
- The current `startRender` action hardcodes `composition: "TextAnimation"` -- movie rendering needs a different composition (e.g., "MovieComposition")

**Warning signs:**
- Renders timing out for movies with 5+ clips
- "TooManyRequestsException" errors from AWS Lambda
- Users reporting that "short clips render fine but movies fail"
- Renders producing truncated videos (only first N clips rendered)

**Prevention strategy:**
1. **Create separate render limits for clips vs movies:**
   ```typescript
   export const RENDER_LIMITS = {
     CLIP: {
       MAX_DURATION_SECONDS: 20,
       LAMBDA_TIMEOUT_MS: 60_000,
     },
     MOVIE: {
       MAX_DURATION_SECONDS: 120, // 2 minutes
       LAMBDA_TIMEOUT_MS: 300_000, // 5 minutes
       MAX_CLIPS: 20,
     },
   };
   ```

2. **Create a dedicated MovieComposition** that accepts an array of clip codes and durations as `inputProps`, wraps them in `<Series>`, and uses `calculateMetadata()` for dynamic duration.

3. **Use Remotion's `inputProps` → S3 auto-upload** (available since v3.3). Ensure `renderMediaOnLambda` version supports this. Keep `inputProps` as lean as possible -- pass clip IDs and fetch code server-side if feasible, or accept the S3 upload path.

4. **Rate limit movie renders separately.** A movie render costs significantly more Lambda compute than a clip render. Consider 1 movie render per hour vs 5 clip renders per hour.

5. **Implement a "render clips individually, concatenate" fallback.** For very long movies, render each clip as a separate Lambda job, then concatenate with FFmpeg. Remotion's chunk concatenation API is not public, but `frameRange` + `audioCodec: "pcm-16"` renders can be FFmpeg-concatenated ([Remotion distributed rendering](https://www.remotion.dev/docs/distributed-rendering)). This is complex but avoids single-render limits.

**Which phase should address:**
Phase implementing movie rendering. Must follow movie composition phase.

---

## Important Pitfalls

Mistakes that cause significant UX problems, performance issues, or technical debt.

### Pitfall 5: Continuation Generation Produces Incoherent Transitions

**What goes wrong:**
When a user clicks "Generate next scene," Claude receives the end-state of the current clip and a prompt for the next scene. Claude generates code that:
- Uses completely different element names/structure than the previous clip
- Places elements at positions that don't match the previous clip's end state
- Uses a different visual style (colors, fonts, scale) despite supposedly "continuing"
- Generates a valid Remotion composition that works standalone but looks jarring after the previous clip

**Why it happens:**
- Claude has no visual memory -- it works from text descriptions, not rendered frames
- End-state descriptions may be incomplete or inaccurate (see Pitfall 1)
- "Continue from this state" is an ambiguous instruction without concrete examples
- Claude's tendency to generate "fresh" compositions rather than building on existing code structure
- The current system prompt focuses on standalone compositions, not continuations

**Research context:**
- Claude API docs recommend multishot prompting for consistent output format ([Claude docs](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/multishot-prompting))
- Output consistency can be improved with structured outputs and prefilled responses ([Claude consistency docs](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency))
- The AI visual continuity challenge is described as the "continuity cascade" -- small inconsistencies compound into narrative disasters ([AI Film School](https://ai-filmschool.com/2025/06/16/the-continuity-crisis-how-marcus-saved-his-film-from-ai-chaos/))
- Parameter locking (fixing 3-5 critical visual parameters) achieves 87% higher consistency than unconstrained generation

**Warning signs:**
- Users describe transitions as "jarring" or "random"
- Preview of full movie looks like unrelated clips stitched together
- Continuation scenes ignore the provided end-state context
- Users regenerate continuation scenes 3+ times before getting acceptable results

**Prevention strategy:**
1. **Provide the FULL previous code to Claude, not just end-state.** Claude reasons about code better than about abstract state descriptions. Include the complete previous clip code and say "The next scene should visually continue from where this code ends."

2. **Create a dedicated continuation system prompt** separate from the generation and refinement prompts. Include:
   - Explicit examples of good continuations (multishot)
   - Constraints: "Use the same element structure, colors, and fonts"
   - The computed end-state as structured data
   - The total movie context (brief summary of all previous scenes)

3. **Lock visual parameters.** Extract and pass as constraints:
   - Background color
   - Font family and size
   - Color palette (primary, secondary, accent)
   - Element positions at end of previous scene
   - Animation style (spring configs, easing preferences)

4. **Validate continuity before accepting.** After Claude generates continuation code, do a lightweight check:
   - Does it use the same backgroundColor?
   - Does it reference similar element positions?
   - Does it use the same font?
   If not, auto-retry with feedback.

5. **Offer "hard cut" vs "smooth transition" modes.** Not every scene needs visual continuity. A "hard cut" mode has no continuity constraints and is easier to get right.

**Which phase should address:**
Phase implementing continuation generation. Must iterate on prompt engineering.

---

### Pitfall 6: Timeline UI Performance Degrades With Many Clips

**What goes wrong:**
The horizontal timeline UI re-renders on every interaction (scrub, drag-reorder, resize), causing:
- Jank during scrub/seek (playhead moves but UI lags)
- Dropped frames in the preview Player during timeline interaction
- Drag-and-drop reorder feeling sluggish or glitchy
- Browser becoming unresponsive with 10+ clips in the timeline

**Why it happens:**
- Timeline position changes trigger React re-renders of all clip elements
- The Remotion `<Player>` component is expensive to re-render
- Drag-and-drop libraries (even good ones like @hello-pangea/dnd) trigger renders during drag
- State updates from timeline interaction propagate to the Player via React context/props
- No virtualization for off-screen timeline elements

**Research context:**
- The `animation-timeline-control` library uses Canvas-based rendering with area virtualization for performance ([GitHub](https://github.com/ievgennaida/animation-timeline-control))
- React Video Editor uses dedicated Zustand stores to isolate timeline state from render state ([reactvideoeditor.com](https://www.reactvideoeditor.com/features/timeline))
- Remotion's own docs say "We do not currently provide samples how to build a timeline component" and recommend a purchasable solution for production use ([Remotion building-a-timeline](https://www.remotion.dev/docs/building-a-timeline))
- @hello-pangea/dnd is the recommended drag-and-drop library for React in 2026 with horizontal list support ([Puck Editor roundup](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react))

**Warning signs:**
- Playhead position updates feel laggy during scrub
- Reorder drag operations show "rubber banding" or ghost elements
- Player preview freezes during timeline interaction
- React Profiler shows timeline component re-rendering >60 times/second during scrub

**Prevention strategy:**
1. **Separate timeline state from Player state.** Use Zustand or a ref-based store for timeline position. Only update the Player when the user finishes scrubbing (on mouse-up), not during continuous scrub.

2. **Debounce Player seeks.** During timeline scrub, update the playhead visual position immediately (CSS transform, no React render), but debounce the actual `player.seekTo()` call to max 10 updates/second.

3. **Use CSS transforms for playhead position**, not React state. The playhead is a div with `transform: translateX(${position}px)` updated via `requestAnimationFrame`, bypassing React entirely.

4. **Virtualize clip elements.** If a movie has 20+ clips, only render the clips visible in the current scroll viewport. This is less critical for 5-10 clips but essential for scaling.

5. **Keep drag-and-drop simple.** For v2.0 MVP, implement reorder as "click to select, arrow keys to move" or simple button-based reorder rather than full drag-and-drop. Add drag-and-drop polish later.

6. **Avoid canvas-based timeline for v2.0.** Canvas offers better performance but worse accessibility and harder React integration. DOM-based with proper optimization is sufficient for the expected scale (5-20 clips per movie).

**Which phase should address:**
Phase implementing timeline UI. Performance must be tested with 10+ clips during development.

---

### Pitfall 7: Movie Composition With DynamicCode Requires Architecture Change

**What goes wrong:**
The current architecture has a single `DynamicCode` composition that executes ONE piece of code. A movie needs to execute N pieces of code sequentially. The naive approach -- creating a `MovieComposition` that wraps multiple `DynamicCode` instances in `<Series>` -- has problems:

1. **Each DynamicCode instance calls `executeCode()` independently.** The current implementation creates a separate `createExecutionScope()` per clip. Operation counters are per-scope, but all clips share the same React rendering context.

2. **The `useMemo` on `executeCode` is keyed on `code`.** If two clips happen to have the same code, React will share the memoized result. Unlikely but possible.

3. **Each clip creates its own Function constructor scope.** This is correct for isolation but means the scope injection (React, Remotion APIs, operation counters) happens N times.

4. **`<Series.Sequence>` unmounts children outside their time range.** This means DynamicCode components for non-active clips are unmounted and their state is destroyed. When seeking backwards, components remount and re-execute `executeCode()`. This is correct Remotion behavior but may cause visual flicker.

**Why it happens:**
- The current meta-composition pattern was designed for single-clip rendering
- `executeCode()` was not designed for N concurrent executions
- Remotion's `<Series>` unmounting behavior requires components that handle mount/unmount gracefully
- DynamicCode's error boundary catches errors per-clip, but a crash in one clip's code shouldn't bring down the whole movie

**Warning signs:**
- Movie preview showing blank/error for individual clips within the series
- Operation limit errors when scrubbing through multi-clip movies
- Memory increasing as clips are mounted/unmounted during playback
- "Execution Error" shown for a clip in movie context that works fine standalone

**Prevention strategy:**
1. **Create a `MovieComposition` component** that receives `clips: Array<{ code: string; durationInFrames: number }>` as inputProps. It maps over clips and wraps each in `<Series.Sequence>` + `<DynamicCode>`.

2. **Increase or remove the operation counter limit for movie rendering.** The current 10,000 operation limit is per-execution-scope, but seeking through a movie may trigger rapid mount/unmount cycles. Reset counters per frame render (already done in `DynamicCode`), but verify this works in a `<Series>` context.

3. **Wrap each clip's `<DynamicCode>` in an independent React Error Boundary.** If clip 3's code crashes, clips 1, 2, 4, 5 still render. Show an error card for the failed clip.

4. **Use `premountFor` on `<Series.Sequence>`** to pre-mount the next clip before it becomes active, reducing flicker during transitions ([Remotion Sequence docs](https://www.remotion.dev/docs/sequence)).

5. **Test with the Lambda bundle.** The meta-composition pattern (code as inputProps) is validated for single clips. Verify that passing an array of code strings to a MovieComposition works in Lambda without rebundling.

**Which phase should address:**
Phase implementing movie composition. This is the bridge between clips data model and movie preview.

---

### Pitfall 8: Clip Save/Load State Synchronization

**What goes wrong:**
Users save a clip from the create page, then open it later expecting to continue editing. But:
- The saved clip's code is stale if the user edited after the last save
- Opening a saved clip doesn't restore the chat history or editing state
- Quick-save and "save as new clip" create confusing duplicate state
- A clip referenced by multiple movies becomes a shared mutable resource -- editing it changes all movies

**Why it happens:**
- The current create page manages all state in React state (`lastGeneration`, `editedCode`, `chatMessages`). None of this persists to Convex except the generation record.
- No distinction between "clip as saved artifact" vs "clip as working draft"
- Shared clip references vs copied clip data is an architectural decision with no obvious right answer
- Users expect "save" to work like a word processor (idempotent, instant, resumable)

**Warning signs:**
- Users lose edits when navigating away from the create page
- "Which version is the real one?" confusion between library and create page
- Editing a clip in one movie visually changes it in another movie
- Save button doesn't indicate whether changes exist

**Prevention strategy:**
1. **Clips are immutable snapshots.** When saved, a clip captures `rawCode`, `code`, `durationInFrames`, `fps`, and `prompt` at that moment. Editing creates a NEW clip, not modifying the existing one.

2. **Movies reference clip IDs.** A movie's scene list is `[clipId1, clipId2, clipId3]`. Editing a clip used in a movie creates a new clip and updates the movie's reference. Alternatively, copy clip data into the movie scene (denormalized), so movies are independent.

3. **"Save as clip" is an explicit action** from the create page. Not automatic. The create page continues to work with local state as it does today. The "Save" button creates a new clip document in Convex.

4. **"Open clip" loads code into the create page** as a new working session. Navigating away with unsaved changes triggers a confirmation dialog.

5. **Track dirty state.** Compare current `editedCode` against the last-saved clip's `rawCode`. Show a visual indicator (dot on save button, "unsaved changes" banner).

**Which phase should address:**
Phase implementing clip saving. Data model must account for immutability from the start.

---

## Moderate Pitfalls

Mistakes that cause delays, subpar UX, or fixable technical debt.

### Pitfall 9: Timeline Scrub and Player Seek Desynchronization

**What goes wrong:**
The timeline playhead and the Remotion `<Player>` get out of sync:
- User scrubs timeline, Player doesn't seek to the correct frame
- Player auto-plays, but timeline playhead doesn't update
- Clicking on a scene in the timeline doesn't seek to that scene's start frame
- After drag-reorder, the Player shows the wrong scene at the current time position

**Why it happens:**
- The Remotion `<Player>` has its own internal playback state (`play`, `pause`, `seek`)
- Timeline state management maintains a separate "current frame" value
- Two sources of truth for the current time position
- `player.addEventListener("frameupdate")` fires every frame during playback, which can flood state updates
- Drag-reorder changes the clip ordering, which changes the mapping between absolute frame and clip, but the Player continues playing at the same absolute frame (now showing a different clip)

**Warning signs:**
- Playhead position doesn't match what's visible in the preview
- Clicking a timeline clip shows the wrong clip in the preview
- Timeline playhead jumps after reorder operations
- "Stutter" where playhead and preview briefly disagree

**Prevention strategy:**
1. **Single source of truth: Player frame.** The Player is authoritative for the current frame. Timeline reads from the Player via `player.addEventListener("frameupdate")`. Never store current frame in React state separately from the Player.

2. **Throttle frameupdate events.** At 30fps, frameupdate fires 30 times/second. Throttle timeline UI updates to 15/second max (every other frame) using `requestAnimationFrame`.

3. **After reorder, seek to the start of the moved clip.** This makes the reorder result immediately visible and avoids the "wrong clip at current position" confusion.

4. **Derive clip-from-frame as a pure function:** `getCurrentClip(absoluteFrame, clips[])` computes which clip is active at any frame. Use this consistently in both timeline and preview.

5. **Test the boundary frames.** The first frame of clip N is the last frame of clip N-1 plus one. Off-by-one errors here cause the wrong clip to highlight in the timeline.

**Which phase should address:**
Phase implementing timeline UI.

---

### Pitfall 10: Generated Code Using Hardcoded Dimensions Breaks Movie Composition

**What goes wrong:**
AI-generated clip code sometimes hardcodes dimensions:
```jsx
// In generated code:
<div style={{ width: 1920, height: 1080, position: 'absolute' }}>
```
Or hardcodes frame values that assume a specific duration:
```jsx
const progress = interpolate(frame, [0, 90], [0, 1]);
// This clip was 90 frames, but what if it's trimmed to 60?
```

In a movie context, if clips are later trimmed or if the movie composition uses different dimensions, hardcoded values cause visual breaks.

**Why it happens:**
- The system prompt tells Claude to create animations for 1920x1080
- Claude often hardcodes dimensions for positioning calculations
- Duration values in code (`// DURATION: 90`) become hardcoded frame ranges in `interpolate()` calls
- `useVideoConfig()` returns the composition's config, but generated code may not use it consistently

**Warning signs:**
- Elements positioned off-screen when composition size changes
- Animations completing at wrong times after duration changes
- Clipping or overflow when embedding clips in different contexts

**Prevention strategy:**
1. **Strengthen the system prompt** to emphasize using `useVideoConfig()` for all dimension calculations:
   ```
   REQUIRED: Always use useVideoConfig() for width, height, and durationInFrames.
   NEVER hardcode 1920, 1080, or frame count values in interpolations.
   Use: const { width, height, durationInFrames } = useVideoConfig();
   ```

2. **AST validation for hardcoded dimensions.** After generation, scan for literal values of 1920, 1080, or the DURATION value appearing inside `interpolate()` calls. Warn if found.

3. **Accept this as a known limitation for v2.0.** Trimming clips and changing dimensions are out of scope (per requirements). Focus on ensuring clips work at their generated size and duration.

**Which phase should address:**
Phase implementing movie composition. System prompt update for continuation generation.

---

### Pitfall 11: Scaling the Code Executor for Movie Preview

**What goes wrong:**
Movie preview requires executing N clips' code simultaneously (or rapidly in sequence as the user seeks). The current `executeCode()` creates a new `Function()` constructor for each execution. With 10-20 clips:
- Memory usage grows (each Function retains its closure scope)
- Initial movie load is slow (10-20 Function constructions)
- Seeking across clip boundaries triggers mount/unmount/re-execute cycles

**Why it happens:**
- `executeCode()` was designed for single-clip execution
- Function constructor + scope injection is relatively expensive (~1-5ms per call)
- `useMemo` in DynamicCode memoizes per `code` string, so repeated clips are cached
- But `<Series>` unmounting destroys the React tree, losing the memo cache

**Warning signs:**
- Movie preview takes 1+ seconds to initially render
- Visible "flash" when seeking between clips
- Memory usage growing over time during movie preview playback
- Performance degradation with each additional clip

**Prevention strategy:**
1. **Cache executed code at the movie composition level.** Create a Map of `code -> Component` that persists across the entire movie preview lifetime. Pass cached components to each `<Series.Sequence>`.

2. **Pre-execute all clips on movie load.** When the movie composition mounts, execute all clip codes immediately and cache the results. Don't wait for each clip's Sequence to mount.

3. **Use `premountFor` on Series.Sequence** to mount the next clip 30 frames early, giving it time to execute and render before it becomes visible.

4. **Limit movie preview to 20 clips.** Set a practical limit and enforce it in the UI. More than 20 clips in a single movie is unusual and the performance cost may not be worth supporting.

**Which phase should address:**
Phase implementing movie preview/composition.

---

### Pitfall 12: Losing the Meta-Composition Pattern for Movies

**What goes wrong:**
The team creates a separate Remotion bundle for movie rendering, abandoning the elegant meta-composition pattern (code-as-inputProps, single Lambda bundle). This means:
- Two Lambda deployments to maintain
- Two `serveUrl` configurations
- Divergent rendering behavior between clip and movie renders
- Double the deployment/testing burden

**Why it happens:**
- Movie composition seems "different enough" to warrant its own bundle
- Confusion about how to pass multiple codes via inputProps
- Fear that the single-composition approach can't handle movies

**Warning signs:**
- Someone suggests "let's create a separate Lambda function for movie rendering"
- Two different `remotion.config.ts` configurations
- Movie renders produce different visual results than clip previews

**Prevention strategy:**
1. **One bundle, multiple compositions.** Register both `DynamicCode` (single clip) and `MovieComposition` (multi-clip) in the same Root.tsx. Deploy one bundle.

2. **`MovieComposition` accepts `inputProps` with an array of clips.** Each clip entry has `code` and `durationInFrames`. The MovieComposition renders them in a `<Series>`.

3. **Use `calculateMetadata()` on MovieComposition** to dynamically set `durationInFrames` based on the sum of clip durations.

4. **`triggerRender.ts` gains a `type: "clip" | "movie"` parameter** that selects the composition ID. Everything else (Lambda function, serveUrl, polling) stays the same.

**Which phase should address:**
Phase implementing movie rendering. Architecture decision before writing render code.

---

## Minor Pitfalls

Annoyances that are fixable but worth preventing.

### Pitfall 13: Clip Naming and Organization UX

**What goes wrong:**
Users save clips without meaningful names ("Untitled", "Untitled (2)", "Untitled (3)"). The clip library becomes unusable for finding previously saved work. No thumbnails make clips visually indistinguishable.

**Prevention strategy:**
1. Default clip name = first 50 characters of the generation prompt.
2. Generate a thumbnail by capturing the first frame of the preview (canvas snapshot).
3. Allow rename inline in the library.
4. Show creation date and duration as secondary metadata.

**Which phase should address:**
Phase implementing clip library.

---

### Pitfall 14: Chat History Loss on Navigation

**What goes wrong:**
The current create page stores chat messages in React state (`useState<ChatMessage[]>`). Navigating to the library page and back loses all chat history. With v2.0 adding navigation between create, library, and movie pages, this becomes more painful.

**Prevention strategy:**
1. For v2.0, persist chat messages per clip in the database (optional, on clip save).
2. Short-term: persist chat state in a global store (Zustand) that survives page navigation within the SPA.
3. Consider storing conversation context as part of the clip document for "resume editing" functionality.

**Which phase should address:**
Phase implementing app shell/navigation.

---

### Pitfall 15: App Shell Navigation Breaking Existing Create Flow

**What goes wrong:**
Adding a persistent sidebar navigation (Home, Create, Library, Movie, Templates) breaks the existing create page flow:
- Create page state resets on every navigation
- Deep linking to create page with template context stops working
- Sidebar takes horizontal space away from the preview/code layout
- Mobile layout breaks with sidebar + preview + code

**Prevention strategy:**
1. Use a collapsible sidebar that defaults to collapsed on mobile.
2. Preserve create page state in a global store, not component state.
3. Use URL search params for template context (already working via `?template=...`).
4. Test the full create flow after adding navigation before adding new features.

**Which phase should address:**
Phase implementing app shell. Should be early in v2.0 to establish navigation patterns.

---

## Recovery Strategies

When pitfalls occur despite prevention.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| End-state extraction fails for most code | HIGH | Switch from AST-only to runtime evaluation approach; requires building frame capture infrastructure |
| Frame math bugs in composition | MEDIUM | Add comprehensive frame math tests; refactor to use `<Series>` exclusively; add debug overlay showing frame numbers |
| Convex document size exceeded | HIGH | Data migration to normalized schema; extract code into file storage; downtime during migration |
| Lambda timeout on movie renders | MEDIUM | Increase timeout limits; implement per-clip rendering with concatenation; adjust rate limits |
| Continuation produces incoherent scenes | MEDIUM | Iterate on prompt engineering; add validation; offer manual end-state override |
| Timeline performance degradation | MEDIUM | Refactor state management to refs/Zustand; add virtualization; simplify drag interactions |
| Movie composition architecture mismatch | HIGH | Refactor DynamicCode to support multi-clip; may require new composition component |
| Clip save/load state bugs | LOW | Add dirty state tracking; confirmation dialogs; immutable clip pattern |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| End-state extraction reliability | Continuation generation phase | Continuation produces smooth transitions for 3 test scenarios |
| Sequence/Series frame math | Movie composition phase | 5-clip movie plays with correct timing, no gaps or overlaps |
| Convex document size limit | Data model phase | Movie with 20 clips saves and loads without error |
| Lambda payload/timeout limits | Movie rendering phase | 10-clip movie renders to MP4 within timeout |
| Continuation visual coherence | Continuation generation phase | Side-by-side preview shows visual continuity |
| Timeline UI performance | Timeline UI phase | Scrub through 15-clip movie without jank |
| MovieComposition architecture | Movie composition phase | Movie preview uses same DynamicCode pattern as single clips |
| Clip save/load sync | Clip saving phase | Save-navigate-load-edit roundtrip preserves code |
| Timeline/Player desync | Timeline UI phase | Playhead matches preview during scrub and playback |
| Hardcoded dimensions in code | Movie composition + prompt update | `useVideoConfig()` used in >90% of generated code |
| Code executor scaling | Movie preview phase | 10-clip movie loads and plays without visible delay |
| Meta-composition preservation | Movie rendering phase | Single Lambda bundle renders both clips and movies |
| Clip naming UX | Clip library phase | Saved clips have prompt-based names and thumbnails |
| Chat history loss | App shell phase | Chat survives navigation between pages |
| App shell breaking create flow | App shell phase | Full create flow works identically after sidebar addition |

---

## "Looks Done But Isn't" Checklist for v2.0

Things that appear complete but are missing critical pieces:

- [ ] **End-state extraction:** Verify it handles spring animations (not just linear interpolate), conditional logic, and loop-generated elements
- [ ] **Movie composition duration:** Verify `calculateMetadata()` computes total duration dynamically, not hardcoded
- [ ] **Clip independence:** Verify editing a clip used in Movie A doesn't silently change Movie A
- [ ] **Lambda rendering:** Verify movie `inputProps` size doesn't hit payload limits with 15+ clips
- [ ] **Series unmounting:** Verify clips mount/unmount cleanly during seek without errors or memory leaks
- [ ] **Frame 0 of each clip:** Verify each clip starts at frame 0 within its Series.Sequence, not at an offset
- [ ] **Continuation prompt:** Verify the continuation system prompt includes the previous code AND the end-state, not just one
- [ ] **Timeline scrub throttling:** Verify Player seeks are throttled during continuous scrub
- [ ] **Convex document sizes:** Verify movie document stays under 500 KB with 20 clip references
- [ ] **Error isolation:** Verify one clip's code crash doesn't bring down the entire movie preview
- [ ] **Render quota:** Verify movie renders count differently than clip renders in quota system
- [ ] **Dirty state tracking:** Verify "unsaved changes" indicator works before navigation

---

## Key Differences from v1.1 Pitfalls

v1.1 pitfalls were about:
- **Security** (sandbox, prompt injection, code execution safety) -- still applies, already addressed
- **Single-clip complexity** (editor state, bundle size, API misuse) -- still applies, foundation is solid

v2.0 adds:
- **Multi-clip composition complexity** (frame math, Series/Sequence, duration calculation)
- **Data model architectural decisions** (normalization, document sizes, clip references)
- **AI continuity challenge** (maintaining visual coherence across generated scenes)
- **Timeline UI performance** (state management, sync with Player, drag interactions)
- **Scaling Lambda rendering** (payload sizes, timeouts, concurrent renders)
- **End-state extraction as novel hard problem** (no standard solution exists -- requires invention)

**The biggest shift:** v1.1 operated on a single code artifact. v2.0 operates on collections of code artifacts with ordering, timing, and visual continuity requirements. Every feature that was "simple" for one clip becomes "complex" for N clips.

---

## Sources

**Remotion Official Documentation (HIGH confidence):**
- [Sequence component](https://www.remotion.dev/docs/sequence) -- cascading, frame shifting, premountFor
- [Series component](https://www.remotion.dev/docs/series) -- sequential composition, durationInFrames requirement
- [Combining compositions](https://www.remotion.dev/docs/miscellaneous/snippets/combine-compositions) -- Series-based approach
- [calculateMetadata()](https://www.remotion.dev/docs/calculate-metadata) -- dynamic duration/dimensions
- [Lambda limits](https://www.remotion.dev/docs/lambda/limits) -- 1000 concurrent, 15-min timeout, storage limits
- [Building a timeline](https://www.remotion.dev/docs/building-a-timeline) -- state management recommendation
- [interpolate()](https://www.remotion.dev/docs/interpolate) -- pure function, usable outside render
- [spring()](https://www.remotion.dev/docs/spring) -- pure function, frame parameter
- [useCurrentFrame()](https://www.remotion.dev/docs/use-current-frame) -- 0-indexed, Sequence-relative
- [defaultProps size](https://www.remotion.dev/docs/troubleshooting/defaultprops-too-big) -- 256MB serialization limit
- [Distributed rendering](https://www.remotion.dev/docs/distributed-rendering) -- chunk concatenation
- [Lambda changelog](https://www.remotion.dev/docs/lambda/changelog) -- inputProps S3 auto-upload since v3.3

**Convex Official Documentation (HIGH confidence):**
- [Document limits](https://docs.convex.dev/production/state/limits) -- 1 MiB documents, 8192 array elements, 16 nesting levels
- [File storage](https://docs.convex.dev/file-storage) -- unlimited file size, storageId references
- [Community: 1 MiB limit discussion](https://discord-questions.convex.dev/m/1381745670624514179)

**Claude API Documentation (HIGH confidence):**
- [Multishot prompting](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/multishot-prompting) -- consistency via examples
- [Increase output consistency](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency) -- structured outputs, prefilling
- [Prompt templates](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompt-templates-and-variables) -- fixed vs variable content

**Timeline & UI Research (MEDIUM confidence):**
- [React Video Editor](https://www.reactvideoeditor.com/features/timeline) -- dedicated state stores, component architecture
- [animation-timeline-control](https://github.com/ievgennaida/animation-timeline-control) -- canvas virtualization approach
- [hello-pangea/dnd](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) -- 2026 recommended DnD library

**Static Analysis Research (MEDIUM confidence):**
- [Telerik: Static CSS-in-JS extraction](https://www.telerik.com/blogs/static-extraction-css-js-efficiency-react-apps) -- "static extraction requires static evaluation"
- [jsx-ast-utils](https://github.com/jsx-eslint/jsx-ast-utils) -- AST utilities for JSX analysis

**AI Continuity Research (MEDIUM confidence):**
- [AI Film School: Continuity Crisis](https://ai-filmschool.com/2025/06/16/the-continuity-crisis-how-marcus-saved-his-film-from-ai-chaos/) -- parameter locking for consistency

---
*Pitfalls research for: RemotionLab v2.0 Multi-Scene Movie Editor*
*Researched: 2026-01-29*
