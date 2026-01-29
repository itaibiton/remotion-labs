# Project Research Summary

**Project:** RemotionLab v2.0 — Scenes, Timeline & Movie Editor
**Domain:** AI-powered multi-scene video/animation editor with clip library and timeline
**Researched:** 2026-01-29
**Confidence:** HIGH

## Executive Summary

RemotionLab v2.0 transforms a single-clip AI animation generator into a full multi-scene movie editor. Research across comparable tools (Canva Video, CapCut, Kapwing, InVideo AI, Runway, LTX Studio) reveals a clear mental model users expect: horizontal timeline with visual scene blocks, drag-to-reorder, one-click preview of the full movie, and single-file export. The differentiator is RemotionLab's code-based approach: each "scene" is an AI-generated Remotion composition, not a video file, enabling unique capabilities like scene-to-scene code continuation and full source-code export.

The recommended technical approach builds on the validated v1.1 architecture (Convex + Remotion Player + Lambda + Claude API) without replacing anything. New additions are: two Convex tables (`clips`, `movies`) using normalized references, a `MovieComposition` wrapper using Remotion's `<Series>` component to sequence multiple `DynamicCode` instances, a horizontal timeline UI built with @dnd-kit for reordering, and an end-state serialization system for continuation generation. The stack additions are minimal (~49KB total): @dnd-kit packages for drag-and-drop, acorn-walk + acorn-jsx-walk for AST traversal, and optionally @remotion/transitions for scene transitions.

The critical risk is **end-state extraction for continuation generation**. Extracting the final-frame visual state from dynamically-animated JSX code via static AST analysis is fundamentally unreliable for computed/conditional styles. The mitigation strategy is a hybrid approach: runtime evaluation at the last frame (render the composition and capture computed styles from the DOM) combined with LLM-assisted extraction (send code to Claude for semantic analysis). The data model must normalize clips (separate documents) to avoid Convex's 1 MiB document size limit. Frame math in multi-scene composition requires disciplined use of `<Series>` and `calculateMetadata()` to avoid off-by-one errors and duration mismatches.

## Key Findings

### Recommended Stack (from STACK.md)

The existing v1.1 stack (Next.js 16, Clerk, Convex, Remotion 4.0.410, Claude API, acorn/sucrase for code execution) remains intact. v2.0 adds minimal dependencies focused on three new capabilities: drag-and-drop timeline reordering, AST traversal for end-state extraction, and scene transitions.

**New dependencies for v2.0:**
- **@dnd-kit/core + sortable + modifiers + utilities** (^6.3.1 / ^10.0.0 / ^9.0.0 / ^3.2.2) — Modular drag-and-drop with horizontal axis restriction for timeline scene reordering. Recommended over alternatives (@hello-pangea/dnd, Pragmatic DnD) for lightweight footprint (~10KB core) and first-class horizontal list support.
- **acorn-walk + acorn-jsx-walk** (^8.3.4 / ^2.0.0) — AST traversal for extracting final-frame state from JSX code. Extends existing acorn stack (already used for validation) with visitor-based tree walking for interpolate/spring extraction.
- **@remotion/transitions** (4.0.410, optional) — Scene-to-scene transitions (fade, slide, wipe) via TransitionSeries. Defer to later phase; basic `<Series>` (already in core) handles sequential playback without transitions.

**What requires NO new dependencies:**
- Clip saving/loading (Convex schema extension)
- Multi-scene preview (Remotion `<Series>` from core package)
- Thumbnails (Remotion `<Thumbnail>` from @remotion/player, already installed)
- App shell sidebar (Next.js nested layouts)
- Movie rendering (extend existing Lambda pattern with MovieComposition)
- Continuation generation (extend existing Claude API integration)

**Stack confidence: HIGH** — All core components verified via official documentation. @dnd-kit has 5.3M weekly downloads. acorn-walk has 43M weekly downloads. Remotion `<Series>` is a documented first-class pattern for multi-scene composition.

### Expected Features (from FEATURES.md)

Research across Canva Video, CapCut, Kapwing, and InVideo AI reveals consistent feature expectations for multi-scene video editors.

**Must have (table stakes):**
- **Clip library** with save/open/delete/rename — Every creative tool lets users save work. Grid view with thumbnails is the standard pattern.
- **Horizontal timeline** showing scenes in sequence — THE defining UX pattern of video editors. Scenes appear as blocks proportional to duration, arranged left-to-right.
- **Drag-to-reorder scenes** — Canva, CapCut, Kapwing all support this. Users rearrange narrative by dragging.
- **Multi-scene preview** (play all scenes in one Player) — Users need to see the whole movie before rendering.
- **Render full movie to one MP4** — The entire point of multi-scene editing is producing one continuous video file.
- **App shell with persistent navigation** — With multiple pages (Create, Library, Movie, Templates), users need clear persistent navigation (sidebar is the dominant pattern).

**Should have (differentiators):**
- **"Generate next scene" continuation** — NO other tool in this space analyzes the end-state of one code composition to generate a visually continuous next scene. This is RemotionLab's biggest differentiator.
- **Add clip to movie from Create page** — One-click workflow: generate → preview → add to movie. Tight integration between creation and composition.
- **Scene-to-scene transitions** — Remotion's `<TransitionSeries>` provides fade/slide/wipe. Expected in polished editors.
- **Timeline playhead synced to scene highlight** — As the movie plays, the currently-playing scene highlights in the timeline. Canva and CapCut both do this.
- **Movie export as Remotion project** — Export all scenes as standalone .tsx files plus a Main composition. Power users can take it into their own IDE. No other tool offers this.

**Defer (v2.1+):**
- Multi-track timeline (audio, overlays) — Out of scope; each scene is a self-contained composition
- Audio/music tracks — Visual-only for v2.0
- Full drag-and-drop trimming (handles, split, ripple edit) — Too complex; scenes have fixed durations
- Real-time collaboration — Solo creation first; Convex's reactive queries support adding multiplayer later
- Brand kits (saved colors/fonts) — Valuable but not part of core multi-scene editing loop
- Public sharing/gallery — Distribution feature, not creation feature

**Feature confidence: HIGH** — Table stakes features are consistent across Canva Video, CapCut, Kapwing, InVideo. Differentiators leverage RemotionLab's unique code-based approach.

### Architecture Approach (from ARCHITECTURE.md)

The v2.0 architecture extends v1.1 without replacing anything. The core pattern (Convex for state, Remotion Player for preview, Lambda for rendering, Claude for generation) remains unchanged.

**Schema design:**
1. **`clips` table** (normalized) — Stores code, rawCode, name, duration, fps, endState, thumbnailUrl. Clips are self-contained snapshots (code copied from generations, not referenced). Index on userId + updatedAt for library queries.
2. **`movies` table** — Stores ordered array of `{ clipId, durationOverride? }` scene descriptors. Total duration cached/computed on mutation. fps enforced uniform across all clips. Array-of-scenes (not separate join table) appropriate for 2-20 scene scale.
3. **`renders` table extension** — Add optional `movieId` field alongside existing `generationId` for movie renders.

**Composition hierarchy:**
```
MovieComposition (inputProps: { scenes[], fps, durationInFrames })
  └── <Series>
        ├── <Series.Sequence durationInFrames={scene1.duration}>
        │     └── <DynamicCode code={scene1.code} ... />
        ├── <Series.Sequence durationInFrames={scene2.duration}>
        │     └── <DynamicCode code={scene2.code} ... />
        └── ...
```

Total duration computed via `calculateMetadata()` (sum of scene durations). Each DynamicCode instance executes its clip's code in isolation. `<Series>` automatically handles frame offsets. Same meta-composition pattern as v1.1 (code as inputProps).

**End-state serialization** (for continuation generation):
- **Strategy 1 (primary):** Runtime evaluation — Render composition at last frame, extract computed styles from DOM. Handles all code patterns including conditionals/loops.
- **Strategy 2 (fallback):** Heuristic AST extraction — For simple `interpolate()` calls, extract output range endpoints. For `spring()`, assume convergence to 1.0.
- **Strategy 3 (pragmatic):** LLM-assisted — Send raw JSX code to Claude, ask it to describe end-state. Claude reasons about code semantically better than AST traversal.

**App shell layout:**
```
app/
  layout.tsx           # Root (unchanged)
  page.tsx             # Landing (no sidebar)
  (app)/               # Route group for authenticated pages
    layout.tsx         # Sidebar + header shell
    create/page.tsx
    library/page.tsx
    movie/[id]/page.tsx
    templates/page.tsx
```

Next.js nested layouts provide persistent sidebar without affecting URLs. Sidebar is client component with `usePathname()` for active state.

**Major components:**
1. **MovieComposition** (`src/remotion/compositions/MovieComposition.tsx`) — Remotion composition wrapping N DynamicCode instances via `<Series>`
2. **Timeline** (`src/components/movie/timeline.tsx`) — Horizontal track with drag-reorder, playhead sync, scene blocks
3. **ClipLibrary** (`src/components/library/clip-library.tsx`) — Grid of saved clips with thumbnails
4. **Sidebar** (`src/components/shell/sidebar.tsx`) — Persistent navigation
5. **EndStateExtractor** (`src/lib/end-state-extractor.ts`) — Hybrid AST + runtime extraction for continuation

**Architecture confidence: HIGH** — Builds on validated v1.1 patterns. Remotion `<Series>` is official API. Convex normalized schema follows best practices. Data flow matches existing preview/render pipeline.

### Critical Pitfalls (from PITFALLS.md)

The research identified 15 pitfalls (4 critical, 4 important, 7 moderate/minor). Top 5 critical/important risks:

1. **End-state extraction from JSX is unreliable via static AST analysis alone** — Remotion animations use `interpolate()`, `spring()`, and computed styles. Final frame state depends on runtime computation. AST cannot handle conditional logic, loop-generated elements, or spring physics. **Mitigation:** Use hybrid approach with runtime evaluation (render at last frame, extract from DOM) + LLM-assisted extraction (send code to Claude for semantic analysis). Avoid pure AST-only approach.

2. **Remotion Sequence/Series frame math errors** — Frames are 0-indexed, `<Sequence>` components cascade when nested, `<Series.Sequence>` requires explicit durations for all but last. Off-by-one errors compound with multiple scenes. **Mitigation:** Use `<Series>` exclusively (not manual `<Sequence from={...}>`), enforce uniform fps across all clips, use `calculateMetadata()` for dynamic duration, validate with 3+ scenes early.

3. **Convex document size limit blocks multi-clip movies** — Movies storing clip code inline hit 1 MiB document limit. A 10-clip movie with 5-10 KB per clip approaches limit. **Mitigation:** Normalize data model (clips are separate documents, movies reference by ID). Monitor document sizes during development. Keep code out of movie document.

4. **Lambda payload/timeout limits for movie rendering** — Existing render limits (20 seconds, 60-second timeout) designed for single clips. 10-clip movie = 30+ seconds of video. **Mitigation:** Create separate limits for clips vs movies (movies: 120 seconds max, 300-second timeout, max 20 clips). Use Remotion's inputProps → S3 auto-upload for large payloads. Implement per-clip rendering + concatenation fallback for very long movies.

5. **Continuation generation produces incoherent transitions** — Claude has no visual memory. End-state descriptions may be incomplete. "Continue from this state" is ambiguous without concrete examples. **Mitigation:** Provide FULL previous code to Claude (not just end-state). Create dedicated continuation system prompt with multishot examples. Lock visual parameters (background color, fonts, color palette). Validate continuity before accepting (check same backgroundColor, fonts, positions).

**Additional important risks:**
- Timeline UI performance (separate state from Player, debounce seeks, use CSS transforms for playhead)
- Movie composition architecture (pre-execute all clips on load, use premountFor, wrap in error boundaries)
- Clip save/load state sync (clips are immutable snapshots, save creates new document)
- Timeline/Player desync (Player is source of truth, timeline reads via frameupdate events)

**Pitfall confidence: MEDIUM-HIGH** — Critical pitfalls verified against official docs. Severity assessed based on recovery cost (end-state extraction and frame math are HIGH-cost rewrites if wrong).

## Implications for Roadmap

Based on dependency analysis from ARCHITECTURE.md, feature priorities from FEATURES.md, and risk mitigation from PITFALLS.md, the recommended phase structure is:

### Phase 1: Data Foundation (Clips + App Shell)
**Rationale:** Everything depends on clips existing and the app shell providing navigation context. This establishes the data model and UI structure for all subsequent work.

**Delivers:**
- Convex schema additions (clips table, renders.movieId extension)
- Clip CRUD mutations and queries (save, list, get, update, remove)
- App shell layout with sidebar navigation (Create, Library, Templates routes)
- Save-as-clip flow from Create page (with name input, thumbnail capture)
- Clip library page (grid view with thumbnails, open/delete/rename)

**Addresses features:**
- Clip library (save/open/delete/rename) — table stakes
- App shell with persistent navigation — table stakes
- Quick-save from any state — differentiator

**Avoids pitfalls:**
- Pitfall 3 (Convex document size) — Normalized schema from start prevents data migration later
- Pitfall 8 (Clip save/load sync) — Clips as immutable snapshots prevents shared-mutable-reference bugs
- Pitfall 13 (Clip naming UX) — Default name from prompt prevents "Untitled (1-50)" library chaos

**Stack used:** Convex schema extensions, Next.js nested layouts, Remotion `<Thumbnail>` for clip previews (already in @remotion/player)

**Research flag:** Standard patterns (Convex tables, Next.js layouts). No deeper research needed.

---

### Phase 2: Movie Data + Timeline UI
**Rationale:** Movies depend on clips existing. The timeline is the core new UI and most complex component. Must be built and tested before adding movie preview/render complexity.

**Delivers:**
- Convex schema additions (movies table with scenes array)
- Movie CRUD mutations and queries (create, get, list, update, remove)
- Movie editor page (`/movie/[id]`) with horizontal timeline
- Timeline component with scene blocks (thumbnail, duration, name)
- Add clip to movie (from Library or Create page, with movie picker)
- Remove scene from timeline
- Drag-to-reorder scenes (using @dnd-kit/sortable with horizontalListSortingStrategy)

**Addresses features:**
- Horizontal timeline showing scenes in sequence — table stakes
- Drag-to-reorder scenes — table stakes
- Add clip to movie from Create page — differentiator

**Avoids pitfalls:**
- Pitfall 6 (Timeline UI performance) — Separate timeline state from Player state, use CSS transforms for playhead, debounce seeks
- Pitfall 9 (Timeline/Player desync) — Player is source of truth, timeline reads via frameupdate events
- Pitfall 15 (App shell breaking create flow) — Test full create flow after navigation changes before adding features

**Stack used:** @dnd-kit packages (install during this phase), Convex mutations for scene reordering, Tailwind CSS for timeline layout

**Research flag:** Timeline drag-and-drop may need iteration. @dnd-kit horizontal sortable is documented but timeline-specific patterns may require trial. Budget extra testing time.

---

### Phase 3: Movie Composition + Preview
**Rationale:** Preview and render depend on MovieComposition being correct. This phase bridges clips data model to Remotion rendering. Must validate frame math and Series behavior before Lambda rendering adds complexity.

**Delivers:**
- MovieComposition Remotion component (`<Series>` wrapping N DynamicCode instances)
- calculateMetadata() for dynamic movie duration
- Movie preview player (full movie in one Remotion Player)
- Timeline-to-player synchronization (click scene → seek to scene start frame, playhead moves during playback)
- Movie preview controls (play/pause/scrub for full movie)

**Addresses features:**
- Multi-scene preview (play all scenes in sequence) — table stakes
- Timeline playhead synced to scene highlight — differentiator

**Avoids pitfalls:**
- Pitfall 2 (Sequence/Series frame math) — Use `<Series>` exclusively, calculateMetadata() for duration, test with 3+ scenes early
- Pitfall 7 (MovieComposition architecture) — Pre-execute all clips on load, use premountFor, wrap each DynamicCode in error boundary
- Pitfall 11 (Code executor scaling) — Cache executed code at movie level, pre-execute on load, limit to 20 clips

**Stack used:** Remotion `<Series>` (core), existing DynamicCode composition (reused), calculateMetadata API

**Research flag:** Standard Remotion patterns. Frame math requires careful testing but well-documented. No deeper research needed.

---

### Phase 4: Movie Rendering to Lambda
**Rationale:** Rendering extends the existing Lambda pipeline with MovieComposition. Depends on MovieComposition being stable from Phase 3.

**Delivers:**
- Movie render action (triggerRender.startMovieRender)
- Extended render limits (movies: 120 seconds max, 300-second timeout, max 20 clips)
- Lambda rendering of MovieComposition (same meta-composition pattern, code as inputProps)
- Movie export download (presigned URL for MP4)
- Optional: Movie export as Remotion project (zip with scene files + Main composition)

**Addresses features:**
- Render full movie to one MP4 — table stakes
- Movie export as Remotion project — differentiator

**Avoids pitfalls:**
- Pitfall 4 (Lambda payload/timeout limits) — Separate limits for movies, use inputProps → S3 auto-upload, implement per-clip fallback if needed
- Pitfall 12 (Losing meta-composition pattern) — One bundle, multiple compositions, MovieComposition uses inputProps like DynamicCode

**Stack used:** Remotion Lambda (existing), MovieComposition (from Phase 3), Convex actions (extend existing triggerRender pattern)

**Research flag:** Standard Lambda rendering patterns. May need Lambda timeout tuning based on actual movie duration testing. No deeper research needed.

---

### Phase 5: Continuation Generation
**Rationale:** Depends on clips, movies, and end-state extraction system. This is the highest-risk technical feature (Pitfall 1) and benefits from all other infrastructure being stable first.

**Delivers:**
- End-state extraction system (hybrid: runtime evaluation + AST heuristics + LLM-assisted)
- Continuation system prompt design (multishot examples, parameter locking)
- generateContinuation action (Claude API call with previous code + end-state context)
- "Generate next scene" UI (button on Create page and timeline)
- Auto-add continuation to movie option

**Addresses features:**
- "Generate next scene" continuation — THE differentiator, RemotionLab's killer feature

**Avoids pitfalls:**
- Pitfall 1 (End-state extraction unreliability) — Hybrid approach with runtime evaluation primary, AST fallback, LLM-assisted semantic analysis
- Pitfall 5 (Continuation produces incoherent transitions) — Full previous code to Claude, dedicated continuation prompt, parameter locking, continuity validation

**Stack used:** acorn-walk + acorn-jsx-walk (install during this phase), existing Claude API integration (extend system prompts), Remotion rendering at last frame for state capture

**Research flag:** HIGH — End-state extraction is novel and high-risk. Budget time for iteration on extraction approaches and prompt engineering. May need to pivot from AST-only to runtime evaluation based on early testing.

---

### Phase 6: Scene Transitions (Optional/Polish)
**Rationale:** Depends on basic `<Series>` working from Phase 3. Transitions are polish that enhance UX but not core functionality. Can be deferred to v2.1 if needed.

**Delivers:**
- @remotion/transitions package integration
- TransitionSeries component replacing Series in MovieComposition
- Transition picker UI (fade, slide, wipe, none)
- Per-transition duration settings
- Adjusted total duration calculation (scenes minus transition overlaps)

**Addresses features:**
- Scene-to-scene transitions — differentiator, polish

**Stack used:** @remotion/transitions@4.0.410 (install during this phase, deferred from earlier)

**Research flag:** Standard Remotion patterns. TransitionSeries is well-documented. Can skip deeper research.

---

### Phase Ordering Rationale

**Dependencies:**
1. Clips must exist before they can be added to movies (Phase 1 before 2)
2. Movies must exist before they can be previewed/rendered (Phase 2 before 3)
3. MovieComposition must work before Lambda rendering (Phase 3 before 4)
4. End-state extraction needs stable clips data model (Phase 1 before 5)
5. Continuation generation benefits from full workflow being tested (Phase 5 near end)

**Groupings:**
- Phase 1 (Data + Shell) establishes foundation without Remotion complexity
- Phases 2-3 (Movies + Timeline + Preview) are the core multi-scene editing loop
- Phase 4 (Rendering) completes the creation-to-delivery pipeline
- Phase 5 (Continuation) layers on the unique differentiator
- Phase 6 (Transitions) is polish that can flex based on timeline

**Pitfall avoidance:**
- Data model pitfalls (3, 8) addressed in Phase 1 before complexity compounds
- Frame math pitfall (2) addressed in Phase 3 with focused testing
- Performance pitfalls (6, 11) addressed as timeline and preview are built (Phases 2-3)
- Continuation pitfall (1, 5) gets dedicated phase (5) after infrastructure is solid

**Parallel potential:**
- Phase 1 (Clips/Shell) and Phase 2 (Movie data model) could overlap slightly (schema work in parallel)
- Phase 5 (Continuation) could start AST exploration in parallel with Phase 4 (Rendering)
- Phase 6 (Transitions) could run in parallel with earlier phases as a separate workstream

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 2 (Timeline UI):** Drag-and-drop with @dnd-kit for horizontal timeline is documented but timeline-specific patterns may need iteration. Plan extra testing time for reorder interaction polish.
- **Phase 5 (Continuation Generation):** End-state extraction is HIGH-RISK novel work. AST-based extraction may prove insufficient. Budget time for runtime evaluation approach and prompt engineering iteration. Consider spike/prototype before full phase commitment.

**Phases with standard patterns (skip research-phase):**
- **Phase 1:** Standard Convex schema patterns, Next.js layouts well-documented.
- **Phase 3:** Remotion `<Series>` is official API with comprehensive docs and examples.
- **Phase 4:** Extends existing Lambda pattern with no new concepts.
- **Phase 6:** TransitionSeries is documented official API.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core technologies verified via official docs. @dnd-kit (5.3M weekly downloads), acorn-walk (43M downloads), Remotion `<Series>` is first-class API. All versions compatible with existing stack. |
| Features | HIGH | Table stakes features consistent across Canva Video, CapCut, Kapwing, InVideo. Differentiators leverage RemotionLab's unique code-based approach verified against competitor feature sets. |
| Architecture | HIGH | Builds on validated v1.1 patterns. Convex normalized schema follows best practices. Remotion `<Series>` + calculateMetadata() is documented pattern. MovieComposition extends existing DynamicCode meta-composition. |
| Pitfalls | MEDIUM-HIGH | Critical pitfalls verified against official docs. End-state extraction (Pitfall 1) has MEDIUM confidence due to novel nature — static AST analysis limitations confirmed, but runtime evaluation approach is unproven in this context. Frame math pitfall (2) mitigated by well-documented Remotion patterns. |

**Overall confidence:** HIGH

The v2.0 scope builds incrementally on a solid v1.1 foundation. The stack additions are minimal and well-vetted. The architecture extends proven patterns without replacing anything. The primary uncertainty is end-state extraction for continuation generation, which has a clear hybrid mitigation strategy with fallbacks.

### Gaps to Address

**End-state extraction implementation:** The research identifies three strategies (runtime evaluation, AST heuristics, LLM-assisted) but hasn't validated which combination works best. **Resolution:** Implement minimal prototype during Phase 5 planning — test all three approaches with sample generated code to determine primary vs fallback strategy. Accept that v2.0 continuation may require user validation/retry cycles.

**Timeline drag-and-drop performance at scale:** @dnd-kit is proven for horizontal sortable lists but timeline-specific performance (with Player sync, large thumbnails, 15+ clips) is untested. **Resolution:** Build Phase 2 timeline with performance instrumentation from day one. Use React Profiler to measure re-renders. Implement debouncing/throttling preemptively.

**Movie rendering cost/quota management:** Research doesn't quantify Lambda cost differential between clip (20 seconds) and movie (120 seconds) renders. **Resolution:** Implement separate quota tracking for movie renders in Phase 4. Monitor actual Lambda costs in production. Adjust limits based on usage patterns.

**Continuation visual coherence validation:** No automated way to verify if a continuation is "visually coherent" vs "jarring." Relies on user acceptance. **Resolution:** Start with manual testing during Phase 5. Build retry mechanism with feedback. Consider future: side-by-side preview of last frame + first frame of continuation for visual diff.

## Sources

### Primary (HIGH confidence)
**Remotion Official Documentation:**
- [Sequence component](https://www.remotion.dev/docs/sequence) — Time-shifting, cascading, premountFor
- [Series component](https://www.remotion.dev/docs/series) — Sequential scene composition
- [TransitionSeries](https://www.remotion.dev/docs/transitions/transitionseries) — Scene transitions
- [Combining compositions](https://www.remotion.dev/docs/miscellaneous/snippets/combine-compositions) — Multi-scene patterns
- [calculateMetadata()](https://www.remotion.dev/docs/calculate-metadata) — Dynamic duration/dimensions
- [Thumbnail component](https://www.remotion.dev/docs/player/thumbnail) — Clip preview rendering
- [Player Custom Controls](https://www.remotion.dev/docs/player/custom-controls) — frameupdate events, seekTo API
- [Building a Timeline](https://www.remotion.dev/docs/building-a-timeline) — State management recommendations
- [Lambda Limits](https://www.remotion.dev/docs/lambda/limits) — 1000 concurrent, 15-min timeout, storage
- [interpolate()](https://www.remotion.dev/docs/interpolate) — Pure function, extrapolation
- [spring()](https://www.remotion.dev/docs/spring) — Pure function, physics
- [useCurrentFrame()](https://www.remotion.dev/docs/use-current-frame) — 0-indexed, Sequence-relative

**Convex Official Documentation:**
- [Schemas](https://docs.convex.dev/database/schemas) — Table definitions, validators
- [Relationship patterns](https://stack.convex.dev/relationship-structures-let-s-talk-about-schemas) — 1:many design
- [Document limits](https://docs.convex.dev/production/state/limits) — 1 MiB documents, 8192 array elements
- [File storage](https://docs.convex.dev/file-storage) — Unlimited file size, storageId refs
- [Best practices](https://docs.convex.dev/understanding/best-practices/) — Array sizes, indexing

**Next.js Official Documentation:**
- [Layouts and Pages](https://nextjs.org/docs/pages/building-your-application/routing/pages-and-layouts) — Persistent layout pattern
- [Route Groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups) — Layout scoping

**Claude API Documentation:**
- [Multishot prompting](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/multishot-prompting) — Consistency via examples
- [Increase output consistency](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency) — Structured outputs

**NPM Package Verification:**
- [@dnd-kit/core](https://www.npmjs.com/package/@dnd-kit/core) — v6.3.1, 5.3M weekly downloads
- [@dnd-kit/sortable](https://www.npmjs.com/package/@dnd-kit/sortable) — v10.0.0
- [acorn-walk](https://www.npmjs.com/package/acorn-walk) — v8.3.4, 43M weekly downloads
- [acorn-jsx-walk](https://www.npmjs.com/package/acorn-jsx-walk) — v2.0.0
- [@remotion/transitions](https://www.npmjs.com/package/@remotion/transitions) — v4.0.410

### Secondary (MEDIUM confidence)
**Video Editor UX Patterns:**
- [Canva Video Timeline](https://www.canva.com/design-school/resources/video-timeline) — Timeline interaction patterns
- [CapCut Timeline Guide](https://filmora.wondershare.com/advanced-video-editing/capcut-timeline.html) — Multi-track features
- [Kapwing Timeline Tutorial](https://www.kapwing.com/help/timeline-tutorial/) — Snap mode, ripple editing
- [InVideo Features & Pricing](https://ampifire.com/blog/invideo-ai-features-pricing-what-can-this-text-to-video-generator-do/) — AI workflow

**AI Scene Continuation:**
- [Runway Gen-4 Character Consistency](https://venturebeat.com/ai/runways-gen-4-ai-solves-the-character-consistency-challenge-making-ai-filmmaking-actually-useful) — Reference anchoring
- [LTX Studio Features](https://ltx.studio/blog/top-ltx-studio-features) — Multi-scene storyboard, Elements system

**Timeline & Drag-and-Drop:**
- [Top 5 DnD Libraries for React 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) — @dnd-kit recommendation
- [dnd-kit Sortable Docs](https://docs.dndkit.com/presets/sortable) — Horizontal list strategy
- [dnd-kit Modifiers Docs](https://docs.dndkit.com/api-documentation/modifiers) — restrictToHorizontalAxis

**Static Analysis:**
- [Telerik: Static CSS-in-JS extraction](https://www.telerik.com/blogs/static-extraction-css-js-efficiency-react-apps) — Limitations research
- [ESTree spec](https://github.com/acornjs/acorn) — AST node types

### Tertiary (LOW confidence, needs validation)
**Community patterns:**
- [React Video Editor Timeline](https://www.reactvideoeditor.com/features/timeline) — Dedicated state stores
- [animation-timeline-control](https://github.com/ievgennaida/animation-timeline-control) — Canvas virtualization
- [AI Film School: Continuity Crisis](https://ai-filmschool.com/2025/06/16/the-continuity-crisis-how-marcus-saved-his-film-from-ai-chaos/) — Parameter locking for consistency (case study, not peer-reviewed)

---
*Research completed: 2026-01-29*
*Ready for roadmap: yes*
