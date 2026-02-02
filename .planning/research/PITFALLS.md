# Domain Pitfalls: Pro Timeline Editing for RemotionLab v0.3.0

**Domain:** Adding trim/split/resize timeline editing to an existing Remotion-based video editor
**Researched:** 2026-02-02
**Overall confidence:** HIGH (verified against existing codebase, Remotion docs, @dnd-kit docs, Convex docs, and multiple community sources)

**Context:** RemotionLab v2.0 shipped a horizontal timeline with fixed 160px scene blocks, @dnd-kit drag-to-reorder, Remotion Player preview with `<Series>`, and Convex for all state. v0.3.0 adds pro editing: trim handles, split/blade, variable-width clips, zoom, inline editing panels, and full-screen editor layout.

---

## Critical Pitfalls

Mistakes that cause rewrites, broken core interactions, or architectural dead ends.

---

### Pitfall 1: useCurrentFrame Offset Confusion with Trimmed Clips

**What goes wrong:** When a clip is trimmed (e.g., "skip first 30 frames"), `useCurrentFrame()` inside the clip's `<Sequence>` returns frame numbers relative to the Sequence start, NOT the clip's original frame numbering. If the trim is implemented with a negative `from` value on a nested Sequence (the documented Remotion pattern for trimming), the inner component's `useCurrentFrame()` returns the absolute-value of the negative offset at the first visible frame -- meaning the clip's animation code sees frame 30 on what it perceives as the first visible frame.

**Why it happens:** RemotionLab's `DynamicCode` component executes AI-generated code that calls `useCurrentFrame()`. That code was authored assuming frame 0 is the animation's beginning. When wrapped in `<Sequence from={-30}>` for a 30-frame head trim, the generated code sees frame 30 at what should be the start of playback. Every `interpolate(frame, [0, duration], ...)` call produces mid-animation values at the clip's visual start.

This is the CORRECT behavior for Remotion's intended use case (you WANT the animation to appear as if time has passed), but it can be confusing if misunderstood. The critical subtlety: for DynamicCode clips, the negative-from pattern actually works CORRECTLY for trimming -- you want the animation to start partway through. The pitfall is in misunderstanding this and implementing a different (broken) approach.

**Consequences:**
- If misunderstood, developers implement a manual frame offset that double-shifts the animation
- Split clips show completely wrong animation state if the frame math is wrong
- The issue is invisible during development if you only test untrimmed clips

**Warning signs:**
- Animations "jump" or appear at unexpected states when trimmed clips begin playing
- `spring()` animations appear to start from an intermediate position (which is actually correct for trim, but may appear wrong to the developer)
- Split clips show a discontinuity at the cut point

**Prevention:**
1. **Use the nested-Sequence negative-from pattern for DynamicCode clips.** The `<Series.Sequence>` controls the clip's duration on the timeline (trimEnd - trimStart frames). Inside, wrap DynamicCode in `<Sequence from={-trimStart}>`. This causes `useCurrentFrame()` to return `trimStart` at the first visible frame, which IS the correct behavior for showing the animation starting from a trimmed point.
2. **Write explicit tests** that verify: "At frame 0 of the trimmed clip on the timeline, the DynamicCode component's `useCurrentFrame()` returns `trimStart`."
3. **Do NOT try to intercept `useCurrentFrame()` or adjust it manually.** The Remotion Sequence mechanism already does the right thing. Fighting it creates bugs.
4. **Test with clips that have visible frame-0-to-frame-N transitions** (e.g., fade-ins that complete at frame 30) so you can visually verify trim behavior: a 30-frame head trim should show the post-fade state immediately.

**Confidence:** HIGH -- verified against [Remotion Sequence docs](https://www.remotion.dev/docs/sequence) and [useCurrentFrame docs](https://www.remotion.dev/docs/use-current-frame). The negative-from pattern is the official recommendation for trimming content beginning.

**Which phase should address it:** The very first phase that introduces trim rendering. Must be understood correctly before implementing trim handles, since the frame math propagates into split, thumbnail, and preview features.

---

### Pitfall 2: @dnd-kit Reorder Drag Conflicting with Trim/Resize Edge Handles

**What goes wrong:** The existing timeline uses @dnd-kit's `useSortable` with `PointerSensor` (distance: 8px activation constraint). When trim handles are added to clip edges, any pointer-down on a trim handle also activates the sortable drag because `useSortable` spreads listeners on the entire element. The user tries to trim a clip edge but the clip starts flying to a new position.

**Why it happens:** In `timeline-scene.tsx` (line 59-60), the current code spreads `{...attributes} {...listeners}` on the root div:
```tsx
<div ref={setNodeRef} style={style} {...attributes} {...listeners} className="...">
```
This means the entire 160px block is a drag zone. Trim handles placed as children of this div inherit the drag activation. `stopPropagation` on pointer-down from trim handles does NOT reliably prevent @dnd-kit sensors because @dnd-kit's `PointerSensor` attaches listeners at the document level with `capture: true`, intercepting events before they reach the trim handle's stopPropagation.

**Consequences:**
- Users cannot trim clips -- every attempt to drag an edge starts a reorder
- The same pointer gesture sometimes trims, sometimes reorders, feeling non-deterministic
- Touch users are especially affected due to lower precision

**Warning signs:**
- Trim handles require pixel-perfect clicking to avoid triggering drag
- Mobile testing reveals impossible-to-use trim handles
- User testing shows confusion between "I'm trying to resize" and "it moved my clip"

**Prevention:**
1. **Separate drag listeners from the clip body.** Do NOT spread `{...listeners}` on the root div. Instead, create an explicit drag handle region (e.g., the center body of the clip, or a grip icon at the top) and attach listeners only to that element. @dnd-kit docs explicitly support this pattern: "It is possible for the listeners to be attached to a different node than the one that `setNodeRef` is attached to."
2. **Use raw pointer events for trim handles.** Trim/resize is NOT a DnD operation -- it is a continuous value adjustment. Implement `onPointerDown/Move/Up` with `e.stopPropagation()` AND `e.preventDefault()` on the trim handle elements. Track delta in local state and commit `trimStart`/`trimEnd` on pointer-up.
3. **Increase PointerSensor activation distance** for the reorder context (e.g., 12-15px) to give trim handles more room to activate before reorder kicks in.
4. **Use the `data` argument on useDraggable** to tag what type of interaction is occurring, if you later need the DndContext to differentiate between drag types.
5. **Test the three gestures systematically:** (a) drag from center = reorder, (b) drag from left edge = trim start, (c) drag from right edge = trim end. These must be independently testable.

**Confidence:** HIGH -- verified against [@dnd-kit Sensors docs](https://docs.dndkit.com/api-documentation/sensors/pointer) and the existing `timeline.tsx` / `timeline-scene.tsx` code.

**Which phase should address it:** Must be solved in the first phase that introduces trim handles. This is a refactor of the existing `TimelineScene` component. The drag handle separation should happen before trim handle implementation, not after.

---

### Pitfall 3: Split Operation Creates Data Model Ambiguity

**What goes wrong:** Splitting a clip at frame N should create two timeline items that reference the same underlying clip with different trim windows. The current data model stores scenes as `{ clipId, durationOverride? }` on the movie document. This has no concept of trim ranges. A split must produce TWO scene entries referencing the same `clipId` with different trim start/end values.

If the split is implemented by duplicating the clip document in the `clips` table (creating a full copy with modified code), the copies become orphans that diverge from the original. If the user edits the original clip, the split copies remain stale. If a clip is deleted from the library, some split copies become orphaned "Missing clip" entries while others survive.

**Why it happens:** The current schema in `convex/schema.ts` (lines 67-80) is:
```typescript
movies: defineTable({
  scenes: v.array(v.object({
    clipId: v.id("clips"),
    durationOverride: v.optional(v.number()),
  })),
  ...
})
```
This was designed for simple reordering, not for trim/split. There are no fields for `trimStartFrame` or `trimEndFrame`, and no stable scene identifier for undo/redo.

**Consequences:**
- Split clips that duplicate the code field waste storage and lose the connection to the original
- `totalDurationInFrames` computed by `computeTotalDuration()` in `movies.ts` breaks if it does not account for trim ranges
- Undo of a split requires recreating the original scene entry exactly, which is error-prone without a stable scene ID
- Index-based keys (Pitfall 10) cause React re-renders for all clips after the split point

**Warning signs:**
- Split clips in the database have no relationship to each other
- Duration calculations are wrong after split operations
- Undo after split produces a scene array that doesn't match the pre-split state

**Prevention:**
1. **Store trim state on the scene object, not on the clip.** Extend the scene schema to:
   ```typescript
   scenes: v.array(v.object({
     clipId: v.id("clips"),
     sceneId: v.string(),          // UUID, stable across reorder
     trimStartFrame: v.optional(v.number()),  // default 0
     trimEndFrame: v.optional(v.number()),    // default clip.durationInFrames
     durationOverride: v.optional(v.number()),
   }))
   ```
2. **A split at frame N (relative to the clip)** produces two scenes:
   - Scene A: `{ clipId, sceneId: newUUID(), trimStartFrame: original.trimStart, trimEndFrame: N }`
   - Scene B: `{ clipId, sceneId: newUUID(), trimStartFrame: N, trimEndFrame: original.trimEnd }`
3. **Never duplicate the clips table entry on split.** Both scenes reference the same `clipId`. The clip's `durationInFrames` is the source-of-truth max duration; scenes define sub-ranges within it.
4. **Update `computeTotalDuration`** to use `(trimEndFrame - trimStartFrame)` when trim fields are present, falling back to `durationOverride` then `clip.durationInFrames`.
5. **Use `sceneId` as the React key** (see Pitfall 10) so split operations do not cause unnecessary re-renders.

**Confidence:** HIGH -- derived directly from `convex/schema.ts` and `convex/movies.ts` in the existing codebase.

**Which phase should address it:** The very first phase of v0.3.0. The schema extension must be designed before any UI work. Adding trim fields later forces data migration of all existing movies. The `sceneId` field is also needed from day one.

---

### Pitfall 4: Undo/Redo Complexity with Convex as Sole State Store

**What goes wrong:** Timeline editing operations (trim, split, reorder, delete) are Convex mutations. Undo requires reversing these mutations. But Convex is forward-only -- there is no built-in undo. Each mutation is a committed transaction that triggers reactive query updates to all subscribers. Implementing undo as "reverse mutations" is fragile because: (a) the reverse mutation may conflict with concurrent real-time updates, and (b) Convex's OCC can retry mutations, making "undo the last mutation" ambiguous if the mutation was retried.

**Why it happens:** RemotionLab uses Convex for ALL timeline state. The current pattern is: user action -> `useMutation()` -> Convex mutation -> reactive query push -> UI re-renders. There is no client-side state layer that holds an undo history. Every operation immediately hits the database.

For simple operations (reorder, add, remove), this works fine because they are discrete and infrequent. But pro timeline editing involves continuous operations (trim handle dragging produces dozens of state updates per second) and compound operations (split = delete one scene + insert two scenes) that need to be undone as a single unit.

**Consequences:**
- No undo/redo at all (unacceptable for a pro editor)
- Or: undo that conflicts with real-time subscription updates, causing state oscillation
- Or: undo that works but floods Convex with mutation round-trips during continuous editing
- Rapid undo/redo creates visible flicker as optimistic local state fights server state

**Warning signs:**
- Undo sometimes reverts to an unexpected state
- Trim handle dragging sends 30+ mutations per second to Convex
- Undo after split fails with OCC conflict
- Users see their edits "snap back" briefly during rapid interactions

**Prevention:**
1. **Introduce a local editing state layer.** Use Zustand (or a simple React context) as the editing buffer for the `scenes` array. Convex remains the persistence layer, but all editing interactions update local state first.
2. **Command pattern for undo.** Each edit (trim, split, reorder, delete) creates a forward/reverse command pair. The undo stack lives client-side. Undo applies the reverse command to local state.
3. **Debounce persistence to Convex.** During active editing (trim handle drag), update local state on every pointer move but only persist to Convex on pointer-up or after 500ms idle. This eliminates the mutation flood.
4. **Snapshot-based undo as simpler alternative.** On each discrete action (not continuous drag), snapshot the entire `scenes` array. Undo replaces the current scenes with the previous snapshot. Simpler than command pattern, more memory usage, but sufficient for < 100 scenes.
5. **Sync protocol:** Local state initializes from the Convex query. During active editing, suppress incoming query updates (set a `isEditing` flag). On save (debounced mutation), Convex becomes authoritative again. On undo, only update local state -- persist on the next debounce cycle.

**Confidence:** HIGH -- verified against [Convex OCC docs](https://docs.convex.dev/database/advanced/occ) and [Convex optimistic updates docs](https://docs.convex.dev/client/react/optimistic-updates). Convex explicitly does not provide undo primitives.

**Which phase should address it:** Must be designed in the first phase, before any destructive operation (split, delete) is added. Without undo, destructive operations are too risky for users. The local state layer and persistence debouncing are prerequisites for all subsequent editing features.

---

### Pitfall 5: Thumbnail Performance Explosion with Variable-Width Clips and Zoom

**What goes wrong:** The existing timeline renders one `<Thumbnail>` per scene (fixed 160px blocks). When clips become variable-width (proportional to duration) and zoom is added, the timeline may render filmstrip-style thumbnails (multiple frames per clip at high zoom levels). Each Remotion `<Thumbnail>` mounts an entire React render tree including the `DynamicCode` executor. `DynamicCode` calls `executeCode()` which creates a Function constructor and evaluates arbitrary JS. 20-30 simultaneously mounted Thumbnails will freeze the browser.

**Why it happens:** The existing `timeline-scene.tsx` already shows the pattern -- each `<Thumbnail>` renders a `DynamicCode` component at a specific frame. With variable-width clips, a 10-second clip at high zoom might need 10+ filmstrip thumbnails. Multiply by 15 clips = 150 Thumbnail components, each running executeCode().

The existing code uses an `isMounted` guard (line 32-37 and 98-113) to avoid SSR hydration issues, but does NOT virtualize or limit concurrent thumbnails.

**Consequences:**
- Timeline scrolling drops to sub-10fps
- CPU pegs at 100% when zoomed in or with many clips
- Browser tab crashes on devices with < 8GB RAM
- The editor becomes unusable for movies with 10+ clips

**Warning signs:**
- Noticeable lag when adding the 5th+ clip to the timeline
- Zoom-in causes visible frame drops
- DevTools Performance tab shows long `executeCode` traces during render
- Memory usage grows linearly with clip count and zoom level

**Prevention:**
1. **Virtualize thumbnails.** Only render `<Thumbnail>` for clips visible in the scrollable viewport. Use Intersection Observer or a lightweight virtualization hook. Off-screen clips render placeholder divs with matching dimensions.
2. **Limit filmstrip thumbnails per clip.** Even for visible clips, cap filmstrip thumbnails at 3-5 per clip. Use a single middle-frame Thumbnail for clips narrower than 100px.
3. **Cache thumbnail renders as static images.** Render the Thumbnail once, capture to a canvas data URL, and display as `<img>` for subsequent frames. This converts each expensive React render tree into a single DOM element.
4. **Debounce zoom-level thumbnail regeneration.** When the user zooms, do NOT re-render all thumbnails at new resolution immediately. Wait 200-300ms after zoom stops, show blurred/scaled versions during zoom.
5. **Use `React.memo` aggressively** on Thumbnail wrappers, keying on `clipId + frameToDisplay + clipCode.length` so thumbnails only re-render when their source data changes.
6. **Consider replacing Thumbnail with static screenshots.** Generate a PNG for each clip's middle frame at save time using canvas capture. Use `<img>` in the timeline. This eliminates all DynamicCode execution from the timeline.

**Confidence:** HIGH -- verified against [Remotion Thumbnail docs](https://www.remotion.dev/docs/player/thumbnail) ("If you use `lazyComponent`, wrap it in a `useCallback()` to avoid constant rendering") and the DynamicCode executor's performance characteristics.

**Which phase should address it:** The phase that introduces variable-width timeline blocks or zoom. The fixed-160px design implicitly limits to 1 thumbnail per clip; removing that limit requires performance guardrails.

---

## Moderate Pitfalls

Mistakes that cause delays, degraded UX, or technical debt that compounds.

---

### Pitfall 6: Series Composition Duration Math Breaks with Trimmed Clips

**What goes wrong:** The existing `MovieComposition` passes each clip's full `durationInFrames` to `<Series.Sequence>`. When clips are trimmed, the duration passed to Series.Sequence must be `trimEnd - trimStart`, NOT the original clip duration. If you pass the original duration, Series allocates time for the untrimmed portion, showing blank/unmounted frames. If you pass the trimmed duration but don't also apply the inner negative-from Sequence for the trim offset, the clip plays from frame 0 instead of from `trimStart`.

**Why it happens:** The `computeTotalDuration` function in `convex/movies.ts` (lines 8-22) uses `durationOverride` or `clip.durationInFrames`. Neither accounts for trim ranges:
```typescript
if (scene.durationOverride) {
  total += scene.durationOverride;
} else {
  const clip = await ctx.db.get(scene.clipId);
  total += clip?.durationInFrames ?? 0;
}
```
The `MovieComposition` (line 31) similarly uses `scene.durationInFrames` directly:
```tsx
<Series.Sequence key={index} durationInFrames={scene.durationInFrames}>
```
Both must be updated to use the effective trimmed duration, and they must agree.

**Consequences:**
- Player shows black frames where trimmed portions were
- Total movie duration in header does not match actual content
- Playhead position in timeline does not correspond to preview content
- Rendered MP4s have blank sections

**Warning signs:**
- Black frames between clips in preview
- Movie duration displayed as "45.0s" but actual content is only "32.0s"
- Frame-accurate seeking to a clip boundary shows unexpected blank frame

**Prevention:**
1. **Define a single `effectiveDuration(scene, clip)` helper** used consistently in ALL contexts: `computeTotalDuration` (Convex), `MovieComposition` (React), timeline width calculation, playhead frame-to-clip mapping.
   ```typescript
   function effectiveDuration(scene: Scene, clip: Clip): number {
     const start = scene.trimStartFrame ?? 0;
     const end = scene.trimEndFrame ?? clip.durationInFrames;
     return end - start;
   }
   ```
2. **Update `MovieComposition` to render trimmed clips correctly:**
   ```tsx
   <Series.Sequence durationInFrames={effectiveDuration(scene, clip)}>
     <Sequence from={-(scene.trimStartFrame ?? 0)}>
       <DynamicCode code={clip.code} ... />
     </Sequence>
   </Series.Sequence>
   ```
3. **Update `computeTotalDuration` in Convex** to use trim fields.
4. **Add an integration test** that verifies: `sum of effectiveDuration for all scenes === Player durationInFrames === timeline total width in frames`.

**Confidence:** HIGH -- derived from `MovieComposition.tsx` (line 31) and `convex/movies.ts` (lines 8-22).

**Which phase should address it:** Same phase as the data model extension (Pitfall 3). The composition rendering and duration computation must be updated atomically with the schema change.

---

### Pitfall 7: Optimistic State Divergence During Continuous Editing

**What goes wrong:** The existing timeline uses an optimistic local state pattern in `timeline.tsx`:
```tsx
const [localScenes, setLocalScenes] = useState(scenes);
useEffect(() => { setLocalScenes(scenes); }, [JSON.stringify(scenes)]);
```
This works for discrete reorder (instant mutation, quick server response). But during continuous trim handle dragging, the local state updates 30+ times per second while debounced mutations hit Convex maybe once per 500ms. Between mutation send and server confirmation, the Convex reactive query pushes the OLD scenes array back to the client. The `useEffect` fires and resets `localScenes` to the pre-trim state, causing the trim handle to "rubber band" back to its original position.

**Why it happens:** Convex reactive queries push new values to the client whenever the server state changes. If the user's mutation hasn't committed yet, the query returns the pre-mutation state. The `JSON.stringify(scenes)` dependency in the useEffect detects this as a "new" value and overwrites local state.

**Consequences:**
- Trim handles visually snap back to original position during drag
- Split operations appear to undo themselves for 100-200ms
- Users double-apply edits because the UI showed the edit being reverted

**Warning signs:**
- Visual flicker after every mutation
- Trim handle positions oscillate during drag
- Console logs show rapid back-and-forth state updates in the useEffect

**Prevention:**
1. **Replace the useState/useEffect sync with a proper local state layer** (see Pitfall 4). The local store owns the `scenes` array during editing. Convex queries provide the initial load and post-save confirmation.
2. **Add a `isSyncing` flag** that suppresses Convex query -> local state sync while any mutation is in-flight or while the user is actively editing.
3. **Use Convex optimistic updates** on mutations. This applies the change locally and auto-rolls-back if the server rejects it, avoiding the intermediate stale state.
4. **Remove the `JSON.stringify(scenes)` dependency.** Instead, use a version counter or timestamp from the server that only increments on confirmed commits.

**Confidence:** HIGH -- directly observed in `timeline.tsx` lines 39-44.

**Which phase should address it:** The first phase that introduces continuous editing interactions (trim handle drag). The current sync pattern is adequate for discrete reorder but will break for continuous operations.

---

### Pitfall 8: Panel Resize Handles Conflicting with Timeline Interactions

**What goes wrong:** A full-screen editor layout uses resizable panels (e.g., `react-resizable-panels` via shadcn's Resizable component). The boundary between the preview panel and the timeline panel has a resize handle. The top edge of the timeline also has a ruler for scrubbing. Mouse events on this boundary are ambiguous: is the user resizing the panel or clicking the timeline ruler?

Additionally, the horizontal panel resize handle between the preview/timeline area and an inline editing panel can conflict with horizontal drag gestures on timeline clips.

**Why it happens:** Panel resize libraries use document-level pointer tracking (similar to @dnd-kit). When the resize handle's hit area overlaps with timeline interactive elements, both systems compete for the pointer events. `react-resizable-panels` has a [known issue (#296)](https://github.com/bvaughn/react-resizable-panels/issues/296) where "drag gets priority over overlapping elements."

**Consequences:**
- Users accidentally resize panels when trying to scrub the timeline
- Timeline clip interactions near panel edges trigger panel resize instead
- Panel layout randomly changes during editing sessions
- Users feel the editor is "fighting" their input

**Warning signs:**
- Timeline scrubbing near the top of the timeline area triggers panel resize
- Clip drag near the right edge of the timeline area opens/closes the editing panel
- Test on smaller screens (1366x768 laptop) reveals more overlapping hit zones

**Prevention:**
1. **Add 4-8px visual gutter/divider** between panels. Do not place interactive timeline elements flush against the panel boundary.
2. **Use `hitAreaMargins`** on PanelResizeHandle: `{ coarse: 10, fine: 3 }` to tighten the interactive area.
3. **Disable panel resizing during active timeline interaction.** When @dnd-kit is in a drag state or the playhead is being scrubbed, set `disabled={true}` on PanelResizeHandle.
4. **Place the timeline ruler BELOW a small non-interactive header area** in the timeline panel, creating spatial separation from the panel resize handle above.
5. **For the editing panel, use a toggle button or animation** to open/close rather than a drag-to-resize handle that competes with horizontal timeline gestures.

**Confidence:** MEDIUM -- based on react-resizable-panels documented issues and common layout patterns. Actual severity depends on specific panel arrangement chosen.

**Which phase should address it:** The phase that introduces the full-screen editor layout. Must be part of the initial layout design.

---

### Pitfall 9: Zoom/Scroll Jank with DOM-Based Timeline

**What goes wrong:** The existing timeline is a flex row of divs inside an `overflow-x-auto` container (line 83 of `timeline.tsx`). When clips become variable-width and a zoom slider is added, every zoom change recalculates all clip widths, triggering layout reflow for the entire container. Scroll event handlers for playhead sync and auto-scroll during drag compound the problem.

**Why it happens:** DOM layout is expensive. Each `width` style change on a timeline clip triggers style recalculation + layout + paint for the entire scrolling container and all its children. At 20+ clips, this reflow takes > 16ms, dropping below 60fps. Scroll events fire at 60Hz; reading `scrollLeft` and writing DOM (playhead position) in the same handler causes layout thrashing.

**Consequences:**
- Zoom slider feels sluggish (100-200ms delay)
- Horizontal scroll stutters
- Playhead tracking during playback drops below 30fps
- The editor feels amateur compared to smooth, native-feeling competitors

**Warning signs:**
- Chrome DevTools Performance tab shows "Forced reflow" warnings during zoom
- Scrolling the timeline causes the preview player to stutter
- Zoom changes have visible "step" instead of smooth animation

**Prevention:**
1. **Use CSS transforms for zoom.** Set clip widths at zoom=1, then apply `transform: scaleX(zoomFactor)` to the timeline content container. Transforms bypass layout reflow entirely. Adjust the container's scrollWidth via a spacer element.
2. **Use `requestAnimationFrame` for scroll-dependent updates.** Batch reads (scrollLeft), then batch writes (playhead position) in a single rAF callback.
3. **Debounce zoom-level recalculations.** Apply CSS transform zoom immediately for visual feedback, but only recalculate derived values (thumbnail positions, ruler ticks, snap points) after 150ms idle.
4. **For ruler/time markers, consider a `<canvas>` element.** A single canvas for ruler ticks avoids DOM overhead for potentially hundreds of tick mark elements at high zoom.
5. **Virtualize clips at extreme zoom-out.** If the movie has 50+ clips but only 10 fit in the viewport, unmount the rest.
6. **Avoid inline style changes during scroll.** Pre-calculate positions and use CSS custom properties or transform offsets.

**Confidence:** MEDIUM -- based on web performance best practices and DOM vs Canvas tradeoffs from multiple web editor projects. Actual severity depends on clip count and zoom range.

**Which phase should address it:** The phase that introduces zoom. The fixed-width timeline has acceptable performance; zoom is the inflection point where performance optimization becomes mandatory.

---

### Pitfall 10: Index-Based Scene Keys Cause Unnecessary Re-renders on Split/Reorder

**What goes wrong:** The existing timeline uses `key={`scene-${index}`}` and SortableContext items derived from array index:
```tsx
// timeline.tsx line 54
const sceneIds = localScenes.map((_, i) => `scene-${i}`);
```
After a split operation inserts a new scene at index N, all scenes at index >= N get new keys. React unmounts and remounts those components, destroying their Thumbnail renders and causing visible flicker. After reorder, every scene gets a different key if its position changed.

**Why it happens:** Array index as React key is a well-known anti-pattern for lists that reorder or insert. The existing code uses it because scenes lacked stable identifiers. `clipId` alone is not unique because the same clip can appear multiple times (and split produces two scenes with the same clipId).

**Consequences:**
- Thumbnails flash/flicker after every reorder or split
- Unnecessary `DynamicCode` re-evaluations on every Thumbnail remount
- @dnd-kit animation is disrupted because sortable items lose identity
- Component hover states and inline editing states are lost on reorder

**Warning signs:**
- Thumbnails briefly show the loading/pulse placeholder after reorder
- Split operation causes all clips AFTER the split point to flash
- Console logs show excessive Thumbnail mount/unmount cycles

**Prevention:**
1. **Add a `sceneId` (UUID string) field to each scene object** in the Convex schema. Generate it on scene creation (addScene mutation), preserve through reorder, and assign new UUIDs only to newly created scenes from a split.
2. **Use `sceneId` as the React key** and as the SortableContext item ID.
3. **Do this in the first phase alongside the trim field additions.** Retrofitting stable IDs later requires migrating all existing movies.

**Confidence:** HIGH -- directly observed in `timeline.tsx` line 54 and `timeline-scene.tsx` line 86.

**Which phase should address it:** The data model extension phase (same as Pitfalls 3 and 6). All three changes (`sceneId`, `trimStartFrame`, `trimEndFrame`) should be a single schema update.

---

## Minor Pitfalls

Annoyances and UX issues that are fixable but worth preventing upfront.

---

### Pitfall 11: Blade/Split Tool Discoverability for Non-Pro Users

**What goes wrong:** Professional editors use `B` for blade mode (DaVinci Resolve, Final Cut Pro) or `Cmd+B` to split at playhead. RemotionLab targets non-professional users who do not know these conventions. If the split tool requires a mode switch or is hidden in a context menu, most users will never discover it.

**Prevention:**
1. **Show a split indicator on clip hover** where the playhead intersects the clip. A visible line with a scissors icon appears at the playhead position when hovering over a clip, with a tooltip "Click to split here" on first encounter.
2. **Support both click-on-playhead-line and keyboard shortcut** (`S` or `Cmd+B`).
3. **Do NOT require a mode switch** (blade mode vs pointer mode). Non-pro users find mode-based UIs confusing. The split action should be a direct action on the timeline, not a tool mode.
4. **Add an onboarding tooltip or first-use highlight** that points out the split capability.

**Which phase should address it:** The phase that introduces split. UX should be designed before implementation.

---

### Pitfall 12: Keyboard Shortcut Conflicts with Browser and Existing App

**What goes wrong:** Video editor shortcuts (Space for play/pause, B for blade, Delete for remove clip, Cmd+Z for undo) conflict with browser defaults (Space scrolls page, Delete goes back, Cmd+Z undoes text in other fields) and with the existing Monaco editor shortcuts.

**Prevention:**
1. **Only capture shortcuts when the timeline/editor panel has focus.** Use a focus container element with `tabIndex={0}` and `onKeyDown` handler, NOT a global `document.addEventListener('keydown')`.
2. **`preventDefault()` only for recognized shortcuts** within the focus scope. Do not globally prevent Space or Delete.
3. **Avoid overriding Cmd+Z globally.** Only intercept it when the timeline panel is the active focus element.
4. **Create a shortcut registry** that documents all shortcuts and checks for conflicts with Monaco editor bindings.
5. **Provide a `?` shortcut** (when timeline is focused) that shows a keyboard shortcut reference.

**Which phase should address it:** The phase that introduces keyboard shortcuts, alongside split/blade tool.

---

### Pitfall 13: Trim Handle Visual Precision on Very Short Clips

**What goes wrong:** Short clips (1-2 seconds at 30fps) at normal zoom are only 30-60px wide once variable-width is implemented. Left and right trim handles at 6-8px each leave almost no grabbable area for the clip body (drag-to-reorder). Users cannot distinguish between trim zone and drag zone. The problem compounds on touch devices.

**Prevention:**
1. **Set a minimum visual width** for clips (e.g., 48px) regardless of actual duration.
2. **Use hover-activated trim handles** that only appear when the cursor is within 12px of a clip edge. At rest, the full clip body is the drag zone.
3. **Change cursor to `col-resize`** on trim handle hover to give clear visual feedback before interaction.
4. **At very low zoom where all clips are narrow, hide trim handles** and require zoom-in for trimming. Show a tooltip explaining this.

**Which phase should address it:** The phase that introduces trim handles.

---

### Pitfall 14: Live Preview Lag During Trim Handle Drag

**What goes wrong:** As the user drags a trim handle, the preview should show the frame at the new trim boundary. But updating the Remotion Player's props on every pointer-move (scene array, durationInFrames, etc.) causes the Player to re-render its entire composition tree, creating 100-300ms lag between the trim handle position and the preview.

**Prevention:**
1. **Seek the Player to the trim boundary frame** during drag using `playerRef.current.seekTo(trimFrame)`. This is lightweight -- it does not remount the composition tree.
2. **Only update Player composition props (scenes, durationInFrames) on drag end,** not during drag. The seek gives sufficient visual feedback.
3. **If seek-based feedback is not frame-accurate enough,** show a static `<Thumbnail>` at the current trim frame instead of using the full Player. Swap back to Player on drag end.
4. **Throttle any Player prop updates** to at most 10fps during active drag.

**Which phase should address it:** The phase that wires up trim handle interaction with live preview.

---

## Phase-Specific Warnings Summary

| Phase Topic | Likely Pitfalls | Mitigation Priority |
|---|---|---|
| **Data model extension** (trim fields, sceneId) | 3 (split ambiguity), 6 (duration math), 10 (index keys) | HIGHEST -- must be right from day one, migration is costly |
| **Local state layer + undo** | 4 (undo/redo), 7 (optimistic divergence) | HIGH -- prerequisite for all interactive editing |
| **Trim handle interaction** | 2 (@dnd-kit conflict), 13 (small clips), 14 (preview lag) | HIGH -- core interaction, must feel right |
| **Series composition with trims** | 1 (frame offset), 6 (duration math) | HIGH -- rendering correctness, invisible if wrong |
| **Split/blade tool** | 3 (data model), 11 (discoverability), 12 (keyboard conflicts) | MEDIUM -- builds on data model + trim |
| **Variable-width + zoom** | 5 (thumbnail perf), 9 (zoom jank) | MEDIUM -- performance, can degrade gracefully |
| **Full-screen layout** | 8 (panel conflicts) | MEDIUM -- layout design phase |

---

## "Looks Done But Isn't" Checklist for v0.3.0

- [ ] **Trim rendering:** Verify that a clip trimmed by 30 frames shows the animation state at frame 30, not frame 0
- [ ] **Split produces two scenes:** Verify both halves reference the same clipId with different trim ranges
- [ ] **Duration calculation consistency:** Verify `effectiveDuration` is used in Convex, MovieComposition, timeline width, and playhead mapping -- all four must agree
- [ ] **Undo after split:** Verify undoing a split restores the original single scene with original sceneId
- [ ] **Reorder + trim:** Verify reordering a trimmed clip preserves its trim state
- [ ] **Thumbnail virtualization:** Verify that zooming in does not render more than N thumbnails simultaneously
- [ ] **Trim drag + reorder drag:** Verify that dragging a clip edge trims while dragging the body reorders, on both mouse and touch
- [ ] **Keyboard shortcuts:** Verify Space/Delete/Cmd+Z only activate when timeline is focused, not when typing in a text field
- [ ] **Panel resize vs timeline:** Verify panel resize handles do not interfere with timeline ruler or clip interactions
- [ ] **React keys after split:** Verify that splitting clip 3 of 10 does NOT cause clips 4-10 to remount

---

## Sources

**Remotion Official Documentation (HIGH confidence):**
- [Sequence component](https://www.remotion.dev/docs/sequence) -- negative from for trimming, frame offset behavior, cascading
- [useCurrentFrame](https://www.remotion.dev/docs/use-current-frame) -- relative vs absolute frame, Sequence-relative behavior
- [Series component](https://www.remotion.dev/docs/series) -- offset prop, durationInFrames requirement, cascading to later sequences
- [Thumbnail component](https://www.remotion.dev/docs/player/thumbnail) -- lazyComponent callback, frame prop, performance
- [Building a Timeline](https://www.remotion.dev/docs/building-a-timeline) -- Item/Track types, composition patterns
- [Editor Starter](https://www.remotion.dev/docs/editor-starter) -- official template with undo/redo, timeline features

**@dnd-kit Documentation (HIGH confidence):**
- [Sensors overview](https://docs.dndkit.com/api-documentation/sensors) -- activation constraints
- [Pointer sensor](https://docs.dndkit.com/api-documentation/sensors/pointer) -- distance/delay constraints, don't mix with Mouse/Touch
- [Discussion #809](https://github.com/clauderic/dnd-kit/discussions/809) -- complex interaction patterns, data argument usage
- [Discussion #1313](https://github.com/clauderic/dnd-kit/discussions/1313) -- multiple draggable elements patterns

**Convex Documentation (HIGH confidence):**
- [Optimistic Concurrency Control](https://docs.convex.dev/database/advanced/occ) -- transaction retries, conflict detection
- [Optimistic Updates](https://docs.convex.dev/client/react/optimistic-updates) -- local updates, rollback behavior, caveats
- [How Convex Works](https://stack.convex.dev/how-convex-works) -- reactive queries, WebSocket subscriptions

**react-resizable-panels (MEDIUM confidence):**
- [GitHub #296](https://github.com/bvaughn/react-resizable-panels/issues/296) -- drag priority over overlapping elements
- [GitHub #269](https://github.com/bvaughn/react-resizable-panels/discussions/269) -- collapse/expand handle behavior

**Undo/Redo Patterns (MEDIUM confidence):**
- [Travels (mutativejs)](https://github.com/mutativejs/travels) -- framework-agnostic undo/redo with immutable updates
- [Event Sourcing for Undo](https://ericjinks.com/blog/2025/event-sourcing/) -- event-sourced state pattern
- [React Video Editor](https://www.reactvideoeditor.com/docs/core/components/timeline) -- use-timeline-history hook for undo

**Performance (MEDIUM confidence):**
- [WebCut editor](https://dev.to/frustigor/webcut-redefining-web-based-video-editing-for-developers-with-open-source-excellence-1hci) -- Canvas for timeline, DOM for controls
- [Web Animation Performance Tier List](https://motion.dev/blog/web-animation-performance-tier-list) -- scroll animation performance patterns

**Existing Codebase (HIGH confidence):**
- `src/components/movie/timeline.tsx` -- useState/useEffect sync, index-based keys, PointerSensor config
- `src/components/movie/timeline-scene.tsx` -- listener spread, Thumbnail rendering, isMounted guard
- `src/components/movie/movie-preview-player.tsx` -- Player ref, frame tracking, sceneTimings
- `src/remotion/compositions/MovieComposition.tsx` -- Series + DynamicCode, durationInFrames pass-through
- `convex/schema.ts` -- scenes array schema, no trim fields, no sceneId
- `convex/movies.ts` -- computeTotalDuration, addScene, reorderScenes mutations

---
*Pitfalls research for: RemotionLab v0.3.0 Pro Timeline Editing*
*Researched: 2026-02-02*
