# Project Research Summary

**Project:** RemotionLab v0.3.0 — Movie Editor Revamp (Pro Timeline Editing)
**Domain:** Professional video editing timeline features for AI-generated animation clips
**Researched:** 2026-02-02
**Confidence:** HIGH

## Executive Summary

RemotionLab v0.3.0 transforms the basic horizontal timeline (fixed 160px scene blocks with drag-to-reorder) into a professional non-linear editor with trim, split, resize, zoom, inline editing, and full-screen layout. The research confirms this is architecturally feasible using the existing stack — no major framework changes needed, just two small dependencies (tinykeys for shortcuts, react-resizable-panels for layout) and careful integration between Remotion's frame-based composition model and DOM-based editing interactions.

The core technical insight is that RemotionLab's clips are **code-based** (JSX using `useCurrentFrame()`), not video files. This fundamentally changes how trimming works: instead of skipping bytes in a media file, we shift the frame counter using Remotion's `<Sequence from={-trimStart}>` pattern. This is non-destructive — the original clip code is never modified, trim points are stored on the movie's scene descriptor. Split operations create two scene entries referencing the same clip with different trim ranges. All changes are additive to the existing v2.0 architecture (Convex scenes array, `MovieComposition` with `<Series>`, `DynamicCode` execution).

The critical risk is the interaction between @dnd-kit's sortable drag and the new trim handles on clip edges. The existing code spreads drag listeners on the entire clip element, which will conflict with edge-based resize interactions. The solution is well-documented: use `setActivatorNodeRef` to restrict drag activation to a dedicated handle, and use native pointer events with `stopPropagation` for trim interactions. Performance at scale (20+ clips with zoom and filmstrip thumbnails) requires virtualization and lazy loading, but the architecture handles this with standard patterns.

---

## Key Findings

### Recommended Stack

The v0.3.0 stack builds on v2.0's foundation (Next.js 16, Convex, Remotion 4.0.410, @dnd-kit, @monaco-editor/react) with **only two new dependencies**:

**New for v0.3.0:**
- **tinykeys** (^3.0.0) — Keyboard shortcuts for blade tool, play/pause, navigation. 650B bundle, correct key event handling (vs react-hotkeys-hook which fires on both `code` and `key`). Cross-platform `$mod` modifier.
- **react-resizable-panels** (^4.4.2) — Resizable panel layout for preview/timeline/properties split. 2.7M weekly downloads, actively maintained, shadcn/ui compatible. Needed for full-screen editor layout.

**What is NOT needed:**
- @use-gesture/react (last updated 2 years ago, overkill for single-axis trim)
- re-resizable / react-resizable (wrong abstraction for horizontal-only timeline trim)
- Canvas-based timeline (cannot embed Remotion `<Thumbnail>` React components, loses accessibility)
- react-hotkeys-hook (incorrect key matching, heavier than tinykeys)
- Remotion Timeline ($300 commercial component, designed for multi-track overlapping editors)

**Core technologies remain unchanged:**
- Remotion 4.0.410 for composition and rendering (verified: negative `from` for trim, `<Series>` for sequence)
- @dnd-kit/core + @dnd-kit/sortable for drag-to-reorder (verified: `setActivatorNodeRef` separates trim from reorder)
- Convex for real-time state with reactive queries (extended schema, new mutations)
- @remotion/player for in-browser preview (verified: `seekTo()`, `frameupdate` event for playhead sync)

**Total new bundle: ~16KB minified** (extremely lightweight addition)

### Expected Features

#### Must Have (Table Stakes)

From v2.0 features, adapted for pro timeline context:

- **Variable-width clips proportional to duration** — users expect visual duration representation (Canva, CapCut pattern)
- **Clip trimming via edge handles** — drag left/right edges to adjust in/out points (standard NLE behavior)
- **Split/blade tool** — cut a clip at playhead position into two clips (industry standard: `B` key)
- **Zoom and pan controls** — view full timeline or zoom to frame-level precision
- **Playhead sync with player** — visual indicator of which clip is playing, seek on click
- **Inline editing panel** — edit clip code + preview without leaving the movie page

#### Should Have (Differentiators)

- **Per-clip action buttons** — contextual actions on hover/select (edit, duplicate, delete, generate next/prev)
- **Full-screen editor layout** — resizable panels (preview, timeline, properties) instead of scrollable page
- **Keyboard shortcuts** — blade, play/pause, frame stepping, undo/redo
- **Thumbnail filmstrip** — visual preview across clip width at high zoom

#### Defer (Future)

- **Multi-track timeline** — audio tracks, overlay tracks (explicitly out of scope per PROJECT.md)
- **Audio support** — sound design deferred to separate milestone
- **Transitions UI** — @remotion/transitions exists but UI for selecting transitions deferred
- **Waveform visualization** — no audio tracks in v0.3.0 scope

### Architecture Approach

The v0.3.0 architecture is **100% additive** to v2.0. No components are removed, only extended or replaced with more capable versions.

**Data model changes:**
- Extend `movies.scenes[]` schema to add optional `trimStart`, `trimEnd` fields (frames trimmed from each edge)
- Add `sceneId` (UUID) for stable React keys across reorder/split operations
- Update `computeTotalDuration` helper to account for trim when present
- New mutations: `movies.trimScene`, `movies.splitScene`, `clips.update` (for inline editing)

**Composition layer changes:**
- Update `MovieComposition` to wrap trimmed clips in `<Sequence from={-trimStart}>` with adjusted `durationInFrames`
- Pass `trimStart`/`trimEnd` through to Lambda render via `inputProps`
- Effective duration = `clipDuration - trimStart - trimEnd` (computed consistently everywhere)

**UI component changes:**
- Replace `Timeline` with `ProTimeline` (proportional widths, zoom state, playhead, ruler)
- Replace `TimelineScene` with `TimelineClip` (trim handles, variable width, action buttons)
- Rewrite `MovieEditor` with `ResizablePanelGroup` for viewport-filling layout
- New: `InlineEditPanel` (reuses `CodeDisplay` + `PreviewPlayer` components)
- New: `TimelineRuler`, `TimelineToolbar`, `TimelinePlayhead`

**Major components (post-refactor):**
1. **ProTimeline** — DndContext + zoom state + playhead sync, horizontal scroll container
2. **TimelineClip** — Proportional-width block with trim handles, thumbnail filmstrip, action buttons
3. **InlineEditPanel** — Side panel with Monaco editor + mini preview for selected clip
4. **MovieComposition** — `<Series>` with per-clip `<Sequence from={-trimStart}>` for non-destructive trim rendering

### Critical Pitfalls

From PITFALLS.md, the top 5 architectural risks:

1. **useCurrentFrame offset confusion with trimmed clips** — Remotion's `<Sequence from={-trimStart}>` shifts the frame counter, which is CORRECT for DynamicCode (animation should start partway through). Pitfall is misunderstanding this and implementing a broken manual offset. **Prevention:** Use the nested-Sequence negative-from pattern exactly as documented, test with visible frame-0-to-N transitions.

2. **@dnd-kit reorder drag conflicting with trim handles** — Existing code spreads `{...listeners}` on entire clip element. Trim handles on edges will trigger reorder instead of resize. **Prevention:** Use `setActivatorNodeRef` to restrict drag to a dedicated handle, use native pointer events + `stopPropagation` for trim handles, increase PointerSensor activation distance to 12-15px.

3. **Split operation data model ambiguity** — Current schema has no trim fields, no stable scene IDs. Split must create two scenes referencing the same clipId with different trim ranges, NOT duplicate the clip document. **Prevention:** Extend schema to add `trimStart`/`trimEnd`/`sceneId` in the first phase, before any UI work. Never duplicate clips table entries on split.

4. **Undo/redo complexity with Convex** — Convex is forward-only, no built-in undo. Continuous trim handle dragging floods mutations if every pointer-move hits the database. **Prevention:** Introduce local state layer (Zustand or React context) as editing buffer, debounce persistence to Convex (500ms idle or pointer-up), implement snapshot-based undo client-side.

5. **Thumbnail performance explosion** — Variable-width clips + zoom = potential 100+ simultaneous Remotion `<Thumbnail>` components, each mounting a `DynamicCode` executor. **Prevention:** Virtualize (only render visible clips), limit filmstrip thumbnails to 3-5 per clip, cache thumbnail renders as static images, debounce zoom-level regeneration.

---

## Implications for Roadmap

Based on architectural dependencies and pitfall analysis, the recommended phase structure:

### Phase A: Data Model & Composition Layer

**Rationale:** Everything else depends on the data model supporting trim points and the composition layer rendering them correctly. This must be right from day one — schema migrations are costly.

**Delivers:**
- Extended Convex schema with `trimStart`, `trimEnd`, `sceneId` on scenes
- Updated `computeTotalDuration` helper
- New mutations: `movies.trimScene`, `movies.splitScene`, `clips.update`
- Updated `MovieComposition` using `<Sequence from={-trimStart}>`
- Updated `startMovieRender` to pass trim data to Lambda
- Verification: trimmed clips render correctly in Player and Lambda

**Addresses:**
- Table stakes: clip trimming foundation
- PITFALLS: #3 (split data model), #6 (duration math), #10 (index keys)
- ARCHITECTURE: data model extension, composition rendering correctness

**Avoids:**
- Schema migration hell (doing this in phase 1 = backwards compatible, doing later = migrate all existing movies)
- Frame-offset confusion (by implementing the pattern correctly from the start with tests)

**Research flag:** No additional research needed — Remotion negative-from pattern verified against official docs. Standard Convex schema extension.

---

### Phase B: Full-Screen Layout

**Rationale:** The layout provides the container for all subsequent UI work. Building the timeline or editing panel first would require rework when the layout changes. This phase has no dependencies on Phase A — can be developed in parallel.

**Delivers:**
- Install `react-resizable-panels` via `npx shadcn@latest add resizable`
- Rewrite `MovieEditor` with vertical split (preview | timeline) using `ResizablePanelGroup`
- Extract `MovieHeader` as compact header for viewport-filling layout
- Remove scrollable layout, replace with viewport-filling panels
- Ensure `MoviePreviewPlayer` works within resizable panel

**Addresses:**
- Table stakes: full-screen editor layout (professional video editor UX pattern)
- STACK: react-resizable-panels integration
- ARCHITECTURE: viewport-filling layout with resizable panels

**Avoids:**
- PITFALLS: #8 (panel resize handles conflicting with timeline) by designing proper hit area separation from the start

**Research flag:** No additional research needed — react-resizable-panels is mature (2.7M weekly downloads), shadcn/ui integration documented.

---

### Phase C: Pro Timeline (Core Editing)

**Rationale:** Depends on layout (Phase B container) and data model (Phase A for trim data). This is the largest and most complex phase — the heart of v0.3.0.

**Delivers:**
- `TimelineRuler` with time markers based on zoom
- `TimelineClip` with proportional width, thumbnail, label
- `ProTimeline` with horizontal scroll, zoom state, `DndContext`
- `TimelineToolbar` with zoom slider, fit-to-view, blade toggle
- `TimelinePlayhead` synced with player via `useCurrentPlayerFrame`
- Trim handles on `TimelineClip` using native pointer events
- Wire trim handle drag to `movies.trimScene` mutation (debounced)
- Per-clip action buttons (generate next/prev, edit, delete)
- Verify: drag reorder coexists with trim handles, zoom works, playhead syncs

**Addresses:**
- Table stakes: variable-width clips, trim handles, zoom/pan, playhead sync
- FEATURES: timeline as visual duration representation
- ARCHITECTURE: ProTimeline component hierarchy

**Avoids:**
- PITFALLS: #2 (dnd-kit conflict) via `setActivatorNodeRef` + stopPropagation
- PITFALLS: #5 (thumbnail perf) via virtualization + 3-5 thumbnails max per clip
- PITFALLS: #7 (optimistic divergence) via debounced persistence
- PITFALLS: #9 (zoom jank) via CSS transforms + rAF batching
- PITFALLS: #13 (small clips) via minimum visual width + hover-activated handles

**Research flag:** Medium complexity — @dnd-kit + trim handle interaction needs careful implementation. Pattern is documented but requires testing across mouse/touch. Thumbnail virtualization may need iteration based on empirical performance.

---

### Phase D: Blade/Split Tool

**Rationale:** Builds on Phase A (split mutation) and Phase C (timeline interactions, keyboard shortcuts).

**Delivers:**
- Blade tool toggle in `TimelineToolbar`
- Keyboard shortcut (`B`) using tinykeys
- Split indicator on clip hover where playhead intersects
- Wire split action to `movies.splitScene` mutation
- Visual feedback: clip splits into two blocks with shared thumbnail
- Verify: split creates two scenes with same clipId, different trim ranges

**Addresses:**
- Table stakes: split/blade tool (industry standard NLE feature)
- STACK: tinykeys integration for keyboard shortcuts
- FEATURES: blade tool as pro editor differentiator

**Avoids:**
- PITFALLS: #11 (discoverability) via visible split indicator on hover + tooltip
- PITFALLS: #12 (keyboard conflicts) via focus-scoped shortcut handlers

**Research flag:** Low complexity — straightforward mutation + UI. Tinykeys API verified. Main concern is UX discoverability for non-pro users (addressed via hover indicators).

---

### Phase E: Inline Editing Panel

**Rationale:** Depends on layout (Phase B horizontal panel split) and timeline (Phase C selection state). Reuses existing `CodeDisplay` and `PreviewPlayer` components with minimal modification.

**Delivers:**
- `InlineEditPanel` component with mini preview + `CodeDisplay`
- Wire "edit" button on `TimelineClip` to open panel
- Add horizontal `ResizableHandle` between main area and editing panel
- Wire save button to `clips.update` mutation
- Add "Generate Next" and "Generate Prev" buttons (wired to existing continuation endpoint)
- Verify: edit → save → preview cycle works, changes reflect in timeline and player

**Addresses:**
- Table stakes: inline editing (edit without leaving movie page)
- FEATURES: inline editing panel as differentiator
- ARCHITECTURE: panel layout integration

**Avoids:**
- No major pitfalls — reuses proven components (`CodeDisplay`, `PreviewPlayer`)

**Research flag:** Low complexity — component composition, no new patterns. Monaco editor already integrated via `CodeDisplay`.

---

### Phase F: Keyboard Shortcuts & Polish

**Rationale:** Layered on after core editing (Phase C) and blade tool (Phase D). Can be developed incrementally.

**Delivers:**
- Keyboard shortcut registry using tinykeys
- Play/pause (Space), frame stepping (arrows), undo/redo (Cmd+Z/Shift+Z)
- Focus-scoped handlers (timeline panel has `tabIndex={0}`)
- Shortcut reference overlay (triggered by `?`)
- Visual polish: cursor changes, trim handle hover states, smooth zoom transitions

**Addresses:**
- Should have: keyboard shortcuts (pro editor expectation)
- STACK: tinykeys for all shortcut bindings
- FEATURES: keyboard navigation as differentiator

**Avoids:**
- PITFALLS: #12 (keyboard conflicts) via focus scoping + preventDefault only for recognized shortcuts
- PITFALLS: #14 (preview lag) via `seekTo()` during drag, not prop updates

**Research flag:** Low complexity — tinykeys API simple, patterns documented. Main concern is testing across browsers/OSes for modifier key consistency.

---

### Phase Ordering Rationale

**Why this order:**

1. **Phase A first (data model)** — Without trim fields in the schema, nothing else can be built. Schema migrations are expensive. The `sceneId` field is needed for stable React keys (Pitfall #10) which affects all subsequent phases.

2. **Phase B parallel-track (layout)** — Has zero dependency on Phase A. Can be developed by a different team member while data model work completes. Layout is the container for Phases C, E.

3. **Phase C after A+B (timeline)** — Core editing interactions. Requires trim data from Phase A to render correctly. Requires layout from Phase B as container. This is the critical path and largest phase.

4. **Phase D after C (blade)** — Split mutation needs the timeline interactions (selection, playhead position) from Phase C. Keyboard shortcuts infrastructure from this phase is used in Phase F.

5. **Phase E after C (editing panel)** — Needs clip selection state from Phase C timeline. Horizontal panel layout from Phase B.

6. **Phase F last (polish)** — Builds on shortcuts from Phase D, polish on interactions from Phase C. Can be done incrementally.

**Parallel opportunities:**
- Phase A + Phase B can be developed in parallel (no shared dependencies)
- Phase D + Phase E can be developed in parallel after Phase C completes
- Phase F is incremental — keyboard shortcuts can be added throughout C/D/E and consolidated in F

**Critical path:** A → C → D/E → F (B is off the critical path)

**How this avoids pitfalls:**
- Pitfall #3 (data model) — addressed in Phase A before any UI
- Pitfall #2 (dnd-kit conflict) — designed into Phase C from the start
- Pitfall #4 (undo) — addressed in Phase A with local state layer + debouncing
- Pitfall #5 (thumbnail perf) — mitigated in Phase C with virtualization
- Pitfall #8 (panel conflicts) — designed into Phase B layout

### Research Flags

**Phases needing deeper research during planning:**
- None — all technical patterns verified against official docs

**Phases with standard patterns (skip research-phase):**
- **Phase A:** Standard Convex schema extension + Remotion Sequence pattern
- **Phase B:** shadcn/ui Resizable component (documented integration)
- **Phase C:** @dnd-kit + DOM performance patterns (well-documented)
- **Phase D:** Mutation + keyboard shortcut (tinykeys docs complete)
- **Phase E:** Component composition (reuses existing components)
- **Phase F:** Incremental polish (no new architecture)

**Empirical validation needed:**
- Phase C: Thumbnail virtualization thresholds (test with 20+ clips at various zoom levels)
- Phase C: Trim handle + @dnd-kit coexistence (test across mouse/touch/trackpad)
- Phase C: Zoom performance (measure reflow impact, may need CSS transform optimization)

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | All new dependencies verified (tinykeys: 51K weekly downloads, react-resizable-panels: 2.7M weekly downloads). Remotion negative-from pattern verified against official docs. No experimental or unmaintained packages. |
| Features | **HIGH** | Table stakes features confirmed across Canva, CapCut, Kapwing research. Pro timeline editing patterns well-established (DaVinci Resolve, Final Cut Pro, Premiere). Differentiators (inline editing, continuation generation) validated as unique. |
| Architecture | **HIGH** | All changes additive to v2.0. Remotion `<Sequence>` trim pattern confirmed in docs. @dnd-kit `setActivatorNodeRef` pattern confirmed. react-resizable-panels integration via shadcn/ui verified. No risky architectural pivots. |
| Pitfalls | **HIGH** | Critical pitfalls (#1-5) verified against codebase + official docs. @dnd-kit conflict (#2) has documented solution. Thumbnail perf (#5) has standard mitigation (virtualization). Undo/redo (#4) follows established client-side snapshot pattern. |

**Overall confidence: HIGH**

### Gaps to Address

**Minor gaps (address during implementation):**

1. **Thumbnail performance threshold** — Research recommends virtualization + 3-5 thumbnails per clip, but exact threshold (how many total clips before virtualization is mandatory) needs empirical testing. **Mitigation:** Implement virtualization from the start in Phase C, measure performance with 10/20/50 clip test scenarios, adjust lazy-load threshold based on data.

2. **Zoom level UX tuning** — Research recommends `pixelsPerFrame` range of 0.5 to 10, but optimal default and zoom increment may need user testing. **Mitigation:** Start with 2px/frame default (matches 30fps = 60px/second, readable duration labels), add zoom presets (fit-to-view, 1:1, 4:1), tune based on dogfooding.

3. **Trim handle activation area on touch devices** — Pointer events work cross-platform, but minimum hit area for touch may be larger than mouse. **Mitigation:** Use 44x44px touch target guideline (iOS HIG), test on iPad/Android tablet early in Phase C.

4. **Local state sync protocol edge cases** — Research recommends debounced Convex persistence with local editing buffer, but edge cases (user navigates away mid-edit, concurrent edit from another device) need defined behavior. **Mitigation:** Auto-save on page unload (beforeunload), show "changes not saved" warning if local state diverges from Convex for > 5 seconds, conflict resolution via "last write wins" with user notification.

**No major gaps** — all core technical questions answered by research.

---

## Sources

### Primary (HIGH confidence)

**Remotion Official Documentation:**
- [Sequence component — negative from for trimming](https://www.remotion.dev/docs/sequence)
- [Series component — sequential playback](https://www.remotion.dev/docs/series)
- [useCurrentFrame — frame counter behavior](https://www.remotion.dev/docs/use-current-frame)
- [Thumbnail component — performance notes](https://www.remotion.dev/docs/player/thumbnail)
- [Building a timeline](https://www.remotion.dev/docs/building-a-timeline)
- [Player API — seek, frameupdate](https://www.remotion.dev/docs/player/player)

**@dnd-kit Documentation:**
- [useSortable — setActivatorNodeRef](https://docs.dndkit.com/presets/sortable/usesortable)
- [Pointer sensor — activation constraints](https://docs.dndkit.com/api-documentation/sensors/pointer)
- [Modifiers — horizontal axis restriction](https://docs.dndkit.com/api-documentation/modifiers)

**Convex Documentation:**
- [Optimistic Concurrency Control](https://docs.convex.dev/database/advanced/occ)
- [Optimistic updates pattern](https://docs.convex.dev/client/react/optimistic-updates)

**react-resizable-panels:**
- [GitHub — bvaughn/react-resizable-panels](https://github.com/bvaughn/react-resizable-panels)
- [shadcn/ui Resizable component](https://ui.shadcn.com/docs/components/resizable)

**tinykeys:**
- [GitHub — jamiebuilds/tinykeys](https://github.com/jamiebuilds/tinykeys)
- [npm — tinykeys package](https://www.npmjs.com/package/tinykeys)

**Existing RemotionLab Codebase:**
- `src/components/movie/timeline.tsx` — current timeline implementation
- `src/components/movie/timeline-scene.tsx` — @dnd-kit integration, Thumbnail rendering
- `src/remotion/compositions/MovieComposition.tsx` — Series + DynamicCode pattern
- `convex/schema.ts` — movies.scenes schema
- `convex/movies.ts` — computeTotalDuration, mutations

### Secondary (MEDIUM confidence)

**Video Editor UX Patterns:**
- Canva Video timeline interaction patterns
- CapCut timeline guide (multi-track reference, excluded from scope)
- Final Cut Pro browser views (thumbnail grid patterns)
- InVideo features (script-to-video, differentiation analysis)

**Performance & Web APIs:**
- [Pointer Events — 12 Days of Web](https://12daysofweb.dev/2022/pointer-events)
- [All JS Keyboard Libraries Are Broken (Jan 2025 analysis)](https://blog.duvallj.pw/posts/2025-01-10-all-javascript-keyboard-shortcut-libraries-are-broken.html) — tinykeys evaluation

**Architecture Patterns:**
- Non-destructive editing data model (NLE standard pattern)
- Event sourcing for undo (event-sourced state pattern)
- Timeline virtualization (IntersectionObserver + windowing)

### Tertiary (LOW confidence)

- Remotion community discussions on trim/sequence nesting (no single canonical source, pattern inferred from multiple examples)
- @dnd-kit GitHub discussions on complex interactions (#809, #1313) — patterns work but less formal than official docs

---

*Research completed: 2026-02-02*
*Research files: STACK.md, FEATURES.md (05-FEATURES-PRO-TIMELINE.md), ARCHITECTURE.md, PITFALLS.md*
*Ready for roadmap: YES*
