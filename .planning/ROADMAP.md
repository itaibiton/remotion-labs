# Roadmap: RemotionLab

## Overview

RemotionLab delivers AI-powered video creation. v1.0 (14 requirements) validated the core value: users can go from text prompt to rendered video without coding knowledge. v1.1 (11 requirements) unlocks unlimited animation possibilities by having Claude generate actual Remotion JSX code with secure validation and execution. v2.0 (15 requirements) evolves from single-clip creation into a multi-scene movie editor with a clip library, horizontal timeline, full-movie rendering, and continuation-based generation for scene-to-scene visual continuity. v0.2.0 (11 requirements) overhauls the create page into a Midjourney-style scrolling feed with multi-variation generation, configurable settings, image upload for reference-based prompts, per-creation actions, and prequel generation. v0.3.0 (12 requirements) transforms the movie page into a professional-grade editor with a full-screen resizable layout, proportional timeline with trim/split/zoom interactions, per-clip generation actions, and inline code editing.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

<details>
<summary>v1.0 (Complete)</summary>

- [x] **Phase 1: Foundation & Auth** - Users can securely access their accounts via Clerk
- [x] **Phase 2: Generation Pipeline** - Users can generate animation code from text prompts
- [x] **Phase 3: Preview System** - Users can see real-time preview of generated animations
- [x] **Phase 4: Templates & Discovery** - Users can browse and select templates as starting points
- [x] **Phase 5: Render Pipeline** - Users can render and download MP4 videos

</details>

<details>
<summary>v1.1 (Complete)</summary>

- [x] **Phase 6: Code Generation & Safe Execution** - Users can generate full Remotion JSX with validated, sandboxed execution
- [x] **Phase 7: Editing & Iteration** - Users can edit code and refine via chat
- [x] **Phase 8: Export & Polish** - Users can export source code for standalone use

</details>

<details>
<summary>v2.0 (Complete)</summary>

- [x] **Phase 9: App Shell & Clip Library** - Users can save, organize, and reopen their compositions from a persistent clip library
- [x] **Phase 10: Movie Data & Timeline UI** - Users can create movies and arrange scenes on a horizontal timeline
- [x] **Phase 11: Movie Preview, Render & Export** - Users can preview, render, and export full movies as MP4 or Remotion projects
- [x] **Phase 12: Continuation Generation** - Users can generate visually continuous next scenes from existing clips

</details>

<details>
<summary>v0.2.0 (Complete)</summary>

- [x] **Phase 13: Generation Feed & Settings** - Users see all past generations in a scrolling feed and can configure aspect ratio, duration, and FPS before generating
- [x] **Phase 14: Variations** - Users can generate multiple distinct compositions from one prompt and select among them
- [x] **Phase 15: Image Upload & Input Bar** - Users can attach reference images and use a unified input bar with all generation controls
- [x] **Phase 16: Per-Creation Actions** - Users can manage and extend any generation directly from the feed
- [x] **Phase 17: Prequel Generation** - Users can generate animations that lead into an existing clip's start state

</details>

### v0.3.0 -- Movie Editor Revamp

- [x] **Phase 18: Pro Layout** - Movie page fills the viewport with fixed preview and timeline panels
- [x] **Phase 19: Timeline Foundation** - Timeline displays proportional clips with a synced ruler and draggable playhead
- [ ] **Phase 20: Timeline Interactions** - Users can trim clips, zoom the timeline, and clips snap during operations
- [ ] **Phase 21: Blade & Split** - Users can split clips at the playhead position via blade tool
- [ ] **Phase 22: Per-Clip Actions** - Each timeline clip has generation and editing action buttons
- [ ] **Phase 23: Inline Editing** - Selecting a clip opens an inline panel with preview player and code editor

## Phase Details

<details>
<summary>v1.0 Phase Details (Complete)</summary>

### Phase 1: Foundation & Auth
**Goal**: Users can securely access their accounts and maintain sessions across browsers
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. User can create new account using Clerk signup flow
  2. User can log in with email and password
  3. User can log in with Google or GitHub OAuth
  4. User remains logged in after closing and reopening browser
  5. User can log out from any page
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md - Project scaffolding + Clerk/Convex provider integration
- [x] 01-02-PLAN.md - Auth UI components + middleware + verification

### Phase 2: Generation Pipeline
**Goal**: Users can enter text prompts and receive validated animation code
**Depends on**: Phase 1
**Requirements**: GEN-01, GEN-04, ANIM-01, INFRA-03
**Success Criteria** (what must be TRUE):
  1. User can type a text prompt describing desired animation
  2. System generates Remotion-compatible code via Claude API
  3. System validates generated code before attempting render
  4. User sees clear error message if generation fails, with retry option
  5. System supports text/typography animation type (kinetic text, animated titles)
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md - Database schema + Convex backend (Claude API action)
- [x] 02-02-PLAN.md - Generation UI components (prompt input, status, error)
- [x] 02-03-PLAN.md - Integration and human verification

### Phase 3: Preview System
**Goal**: Users can see real-time preview of animations before committing to render
**Depends on**: Phase 2
**Requirements**: GEN-05
**Success Criteria** (what must be TRUE):
  1. User sees animation preview immediately after generation completes
  2. Preview plays in browser without requiring render
  3. Preview accurately represents final output (within acceptable tolerance)
  4. User can replay preview as many times as desired
**Plans**: 1 plan

Plans:
- [x] 03-01-PLAN.md - Remotion Player integration with TextAnimation composition and custom controls

### Phase 4: Templates & Discovery
**Goal**: Users can browse pre-made templates and use them as starting points
**Depends on**: Phase 3
**Requirements**: GEN-02, GEN-03
**Success Criteria** (what must be TRUE):
  1. User can browse a gallery of template animations
  2. User can preview any template before selecting
  3. User can select a template to use as starting point for generation
  4. Selected template pre-fills context for prompt-based customization
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md - Template definitions + gallery components (types, cards, preview modal)
- [x] 04-02-PLAN.md - /templates page + create page integration + verification

### Phase 5: Render Pipeline
**Goal**: Users can render animations to MP4 and download them
**Depends on**: Phase 4
**Requirements**: OUT-01, INFRA-01, INFRA-02
**Success Criteria** (what must be TRUE):
  1. User can trigger render of previewed animation
  2. User sees render progress in real-time (percentage complete)
  3. User can download rendered MP4 when complete
  4. System enforces usage limits/quotas per user
  5. System prevents abuse via render limits (resolution, duration caps)
**Plans**: 4 plans

Plans:
- [x] 05-01-PLAN.md - Backend foundation (schema, rate limiter, renders CRUD)
- [x] 05-02-PLAN.md - Render action with Lambda integration and progress polling
- [x] 05-03-PLAN.md - UI components (RenderButton, RenderProgress, DownloadButton)
- [x] 05-04-PLAN.md - Create page integration and end-to-end verification

</details>

<details>
<summary>v1.1 Phase Details (Complete)</summary>

### Phase 6: Code Generation & Safe Execution
**Goal**: Users can generate full Remotion JSX code that executes safely in a validated sandbox
**Depends on**: Phase 5 (existing generation pipeline, Lambda infrastructure)
**Requirements**: CODE-01, CODE-02, CODE-03, CODE-04, ANIM-02, ANIM-03, ANIM-04
**Success Criteria** (what must be TRUE):
  1. User can request any animation type (shapes, motion graphics, effects) via text prompt
  2. System generates complete Remotion JSX code (not just props for fixed templates)
  3. System validates generated code via AST parsing and rejects dangerous patterns
  4. System executes validated code in controlled sandbox (no network, no DOM, no eval)
  5. User can view the generated source code in a read-only editor
**Plans**: 4 plans

Plans:
- [x] 06-01-PLAN.md - Code validation infrastructure (acorn, ast-guard, sucrase, whitelist)
- [x] 06-02-PLAN.md - DynamicCode composition + code executor (Function constructor, scope injection)
- [x] 06-03-PLAN.md - Enhanced Claude prompt + generation action update (replace props with JSX)
- [x] 06-04-PLAN.md - Monaco editor integration + create page updates + verification

### Phase 7: Editing & Iteration
**Goal**: Users can modify generated code and refine animations through conversation
**Depends on**: Phase 6 (code validation pipeline, editor infrastructure)
**Requirements**: CODE-05, ITER-01, ITER-02
**Success Criteria** (what must be TRUE):
  1. User can edit generated code directly in the editor
  2. System re-validates code on every edit before preview updates
  3. User can refine animation via chat ("make it faster", "change color to blue")
  4. System suggests specific fixes when validation fails (not just "code invalid")
**Plans**: 4 plans

Plans:
- [x] 07-01-PLAN.md -- Raw JSX pipeline + actionable validation errors
- [x] 07-02-PLAN.md -- Editable Monaco editor with live debounced validation
- [x] 07-03-PLAN.md -- Chat refinement action + chat UI component
- [x] 07-04-PLAN.md -- Create page wiring + unified input + human verification

### Phase 8: Export & Polish
**Goal**: Users can export generated code for standalone Remotion projects
**Depends on**: Phase 7 (full code generation and editing complete)
**Requirements**: OUT-02
**Success Criteria** (what must be TRUE):
  1. User can download generated Remotion source code as a file
  2. Exported code is self-contained and runs in standard Remotion project
  3. Export includes necessary imports and composition setup
**Plans**: 2 plans

Plans:
- [x] 08-01-PLAN.md -- Export utility library (JSZip, import detection, single-file + zip generators)
- [x] 08-02-PLAN.md -- Export buttons UI + create page wiring + human verification

</details>

<details>
<summary>v2.0 Phase Details (Complete)</summary>

### Phase 9: App Shell & Clip Library
**Goal**: Users can save their compositions as reusable clips and navigate between app sections through a persistent sidebar
**Depends on**: Phase 8 (existing code generation, validation, and editor infrastructure)
**Requirements**: UI-01, SAVE-01, SAVE-02, SAVE-03
**Success Criteria** (what must be TRUE):
  1. User sees a persistent sidebar with navigation links (Home, Create, Library, Movie, Templates) on all authenticated pages
  2. User can click "Save" on the create page to store the current composition as a named clip
  3. User can open the Library page and see all saved clips in a grid with names and thumbnails
  4. User can open a saved clip from the library, which loads its code back into the editor for preview and re-rendering
  5. User can delete a clip from the library
**Plans**: 3 plans

Plans:
- [x] 09-01-PLAN.md -- App shell layout (sidebar + header) and route group migration of create/templates pages
- [x] 09-02-PLAN.md -- Convex clips backend (schema + CRUD) and save clip dialog on create page
- [x] 09-03-PLAN.md -- Library page with clip grid, thumbnails, open-in-editor, and delete

### Phase 10: Movie Data & Timeline UI
**Goal**: Users can create movies, add clips as scenes, and arrange them on a horizontal timeline with drag-to-reorder
**Depends on**: Phase 9 (clips must exist before movies can reference them)
**Requirements**: MOVIE-01, MOVIE-02, UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. User can create a new movie from the Movie page or navigation
  2. User can add clips from the library as scenes in a movie
  3. User sees scenes displayed as blocks on a horizontal timeline with durations
  4. User can drag scenes to reorder them on the timeline
  5. User can remove a scene from the timeline
**Plans**: 3 plans

Plans:
- [x] 10-01-PLAN.md -- Convex movies backend (schema + CRUD mutations and queries)
- [x] 10-02-PLAN.md -- Movie list page, create dialog, and editor shell
- [x] 10-03-PLAN.md -- Timeline with @dnd-kit drag-to-reorder, add-scene panel, and MovieComposition

### Phase 11: Movie Preview, Render & Export
**Goal**: Users can preview a full movie as one continuous video, render it to MP4, and export individual clips or the entire movie
**Depends on**: Phase 10 (movie data model and timeline must exist)
**Requirements**: MOVIE-03, MOVIE-04, OUT-03, OUT-04
**Success Criteria** (what must be TRUE):
  1. User can click "Preview" on the movie page and watch all scenes play in sequence in one player
  2. User can scrub through the full movie preview and see the corresponding scene highlighted on the timeline
  3. User can render the full movie to a single MP4 and download it
  4. User can export a single clip as MP4 or Remotion source from the library or create page
  5. User can export the full movie as one MP4 or as a multi-composition Remotion project zip
**Plans**: 3 plans

Plans:
- [x] 11-01-PLAN.md -- Movie preview player with frame-synced timeline scene highlighting
- [x] 11-02-PLAN.md -- Movie render pipeline backend (schema, limits, startMovieRender action)
- [x] 11-03-PLAN.md -- Render + export UI wiring (MovieRenderButton, MovieExportButtons, movie zip generator)

### Phase 12: Continuation Generation
**Goal**: Users can generate visually continuous next scenes where the new animation picks up from where the previous clip ended
**Depends on**: Phase 11 (clips, movies, and preview must be functional; continuation adds to this workflow)
**Requirements**: GEN-06, GEN-07, UI-02
**Success Criteria** (what must be TRUE):
  1. User can click "Generate next scene" from a clip on the create page or timeline
  2. System analyzes the previous clip's code and extracts its end state (final frame positions, colors, text)
  3. Claude generates a continuation composition that starts from the previous clip's visual end state
  4. User sees the continuation preview and can accept, regenerate, or edit it before adding to the movie
  5. Create page shows contextual actions: quick-save, "Add to movie," and "Generate next scene" based on current state
**Plans**: 2 plans

Plans:
- [x] 12-01-PLAN.md -- Continuation system prompt + generateContinuation backend action
- [x] 12-02-PLAN.md -- Continuation UI (create page mode, contextual actions, Generate Next buttons, Add to Movie dialog)

</details>

<details>
<summary>v0.2.0 Phase Details (Complete)</summary>

### Phase 13: Generation Feed & Settings
**Goal**: Users see all past generations in a scrolling feed and can configure aspect ratio, duration, and FPS before generating
**Depends on**: Phase 12 (existing create page, generation pipeline, and schema)
**Requirements**: FEED-01, FEED-02, SET-01, SET-02
**Success Criteria** (what must be TRUE):
  1. User opens the create page and sees all past generations listed newest-first as a scrolling feed
  2. Each generation row displays the prompt text and metadata (aspect ratio, duration, timestamp) alongside variation thumbnail(s)
  3. User can open a settings panel and choose aspect ratio (9:16, 1:1, 16:9) before generating
  4. User can set duration and FPS in the settings panel, and these persist as defaults across sessions via localStorage
  5. Newly generated animations respect the configured aspect ratio, duration, and FPS
**Plans**: 3 plans

Plans:
- [x] 13-01-PLAN.md -- Schema updates (batchId, variationIndex, settings fields) and generation action changes
- [x] 13-02-PLAN.md -- Settings panel component with localStorage persistence
- [x] 13-03-PLAN.md -- Feed UI with paginated query, Remotion thumbnails, and create page integration

### Phase 14: Variations
**Goal**: Users can generate multiple distinct compositions from one prompt and choose among them
**Depends on**: Phase 13 (batchId data model and feed UI must exist)
**Requirements**: VAR-01, VAR-02
**Success Criteria** (what must be TRUE):
  1. User can select 1-4 variations before generating; system produces that many distinct compositions via parallel Claude calls
  2. Each generation row in the feed shows a grid of 1-4 variation thumbnails with V1-V4 badges
  3. User can click a variation thumbnail to expand it full-size with preview player, code editor, and action buttons
  4. Selected variation becomes the target for all downstream actions (save, render, continue, edit)
**Plans**: 2 plans

Plans:
- [x] 14-01-PLAN.md -- Parallel generation action (helper extraction, Promise.all, temperature 0.9)
- [x] 14-02-PLAN.md -- Variation grid in feed rows, selection/expansion UI, and variation count selector

### Phase 15: Image Upload & Input Bar
**Goal**: Users can attach reference images and use a unified input bar with all generation controls
**Depends on**: Phase 14 (settings and variations must exist for the input bar to integrate them)
**Requirements**: UPLOAD-01, INPUT-01
**Success Criteria** (what must be TRUE):
  1. User can attach 1-3 reference images via click, drag-drop, or paste in the input area
  2. Attached images show as thumbnail chips with remove buttons before submitting
  3. Images are uploaded to Convex file storage with EXIF data stripped, and passed to Claude as visual context
  4. Input bar displays prompt textarea, image upload button, settings toggle, variation count selector, and generate button in a cohesive layout
**Plans**: 3 plans

Plans:
- [x] 15-01-PLAN.md -- Convex file upload flow (upload URL, EXIF stripping, storage) and Claude vision integration
- [x] 15-02-PLAN.md -- Image attachment UI (drop zone, thumbnail chips, paste handler)
- [x] 15-03-PLAN.md -- Input bar redesign composing all controls (prompt, upload, settings toggle, variation selector)

### Phase 16: Per-Creation Actions
**Goal**: Users can manage and extend any generation directly from the feed
**Depends on**: Phase 15 (all generation capabilities must exist; actions surface them per-row)
**Requirements**: ACT-01, ACT-02
**Success Criteria** (what must be TRUE):
  1. User can click "Extend Next" on a generation to start a continuation from its end state
  2. User can click "Extend Previous" on a generation to start a prequel generation (wired in Phase 17)
  3. User can save a generation's selected variation to the clip library from the feed
  4. User can delete a generation from the feed and rerun it with the same prompt and settings
**Plans**: 2 plans

Plans:
- [x] 16-01-PLAN.md -- Action bar/overlay component with save, delete, and rerun actions
- [x] 16-02-PLAN.md -- Extend-next and extend-previous action wiring (continuation entry points from feed rows)

### Phase 17: Prequel Generation
**Goal**: Users can generate animations that lead into an existing clip's visual start state
**Depends on**: Phase 16 (extend-previous action button must exist as entry point)
**Requirements**: PREQUEL-01
**Success Criteria** (what must be TRUE):
  1. User clicks "Extend Previous" on a generation and the system analyzes the clip's code to extract its frame-0 visual state
  2. System generates a prequel animation whose final frame matches the target clip's opening frame
  3. User can preview, edit, and save the prequel just like any other generation in the feed
**Plans**: 2 plans

Plans:
- [x] 17-01-PLAN.md -- Start-state extraction and PREQUEL_SYSTEM_PROMPT (mirrors continuation architecture)
- [x] 17-02-PLAN.md -- generatePrequel action wiring and extend-previous integration

</details>

### Phase 18: Pro Layout
**Goal**: Movie page fills the viewport with a professional full-screen editor layout using resizable panels
**Depends on**: Phase 17 (existing movie page and timeline from v2.0)
**Requirements**: LAYOUT-01, LAYOUT-02
**Success Criteria** (what must be TRUE):
  1. User opens the movie page and it fills the entire viewport with no page-level scrolling
  2. Preview player occupies the top panel and timeline occupies the bottom panel in a vertical split
  3. User can drag the divider between preview and timeline to resize panel proportions
  4. Panel proportions persist visually during the session (no jarring resets on re-render)
**Plans**: 1 plan

Plans:
- [x] 18-01-PLAN.md -- Install react-resizable-panels v4, create resizable UI wrapper, refactor movie editor to fixed flex layout

### Phase 19: Timeline Foundation
**Goal**: Timeline displays clips as proportional-width blocks with a timecode ruler and synced draggable playhead
**Depends on**: Phase 18 (pro layout must exist as the container for the new timeline)
**Requirements**: TL-01, TL-05
**Success Criteria** (what must be TRUE):
  1. Each clip on the timeline has a width proportional to its duration relative to the total movie length
  2. A ruler above the clips displays timecodes (seconds/frames) spanning the full movie duration
  3. A playhead indicator on the ruler is draggable and scrubbing it updates the preview player position
  4. Playing the preview player moves the playhead across the timeline in sync
  5. Clicking a position on the ruler jumps the playhead and preview to that timecode
**Plans**: 2 plans

Plans:
- [x] 19-01-PLAN.md -- Proportional clip widths and timecode ruler
- [x] 19-02-PLAN.md -- Draggable playhead with bidirectional player sync

### Phase 20: Timeline Interactions
**Goal**: Users can non-destructively trim clips and navigate the timeline with zoom controls, with snapping for precision
**Depends on**: Phase 19 (proportional clips and playhead must exist before trim/zoom/snap)
**Requirements**: TL-02, TL-04, TL-06
**Success Criteria** (what must be TRUE):
  1. User can drag a handle on the left or right edge of a timeline clip to trim its start or end (non-destructive -- adjusts visible frame range, original clip unchanged)
  2. Trimmed clips visually shrink on the timeline and the preview respects the new frame range
  3. User can zoom in/out on the timeline via scroll wheel and +/- buttons to see more or less detail
  4. During trim and drag operations, clips snap to adjacent clip edges and to the playhead position
  5. Snap indicators (visual guides) appear when a clip edge aligns with a snap target
**Plans**: TBD

Plans:
- [ ] 20-01-PLAN.md -- TBD
- [ ] 20-02-PLAN.md -- TBD

### Phase 21: Blade & Split
**Goal**: Users can split a clip into two independent clips at the playhead position using a blade tool
**Depends on**: Phase 20 (trim data model with trimStart/trimEnd must exist; split creates two trimmed entries)
**Requirements**: TL-03
**Success Criteria** (what must be TRUE):
  1. User can activate the blade tool via a keyboard shortcut or toolbar button
  2. With the blade tool active, clicking on a clip at the playhead position splits it into two clips
  3. The two resulting clips share the same source code but have different trim ranges that together cover the original range
  4. Both resulting clips are independently trimmable and reorderable on the timeline
**Plans**: TBD

Plans:
- [ ] 21-01-PLAN.md -- TBD

### Phase 22: Per-Clip Actions
**Goal**: Each timeline clip provides quick actions for generation and editing without leaving the movie page
**Depends on**: Phase 19 (timeline clips must exist; generation infrastructure from v0.2.0)
**Requirements**: ACT-03, ACT-04
**Success Criteria** (what must be TRUE):
  1. User sees action buttons (generate next, generate previous, re-generate, edit) on each timeline clip when hovering or selecting
  2. Clicking "Generate Next" on a timeline clip triggers continuation generation and the result is automatically added as the next scene in the movie
  3. Clicking "Generate Previous" on a timeline clip triggers prequel generation and the result is automatically inserted before that scene
  4. Clicking "Re-generate" replaces the clip's code with a fresh generation using the same prompt context
**Plans**: TBD

Plans:
- [ ] 22-01-PLAN.md -- TBD
- [ ] 22-02-PLAN.md -- TBD

### Phase 23: Inline Editing
**Goal**: Users can select any timeline clip to open an inline editing panel with preview and code editor for direct modification
**Depends on**: Phase 22 (per-clip "edit" action triggers this panel; also needs Phase 19 timeline selection)
**Requirements**: EDIT-01, EDIT-02
**Success Criteria** (what must be TRUE):
  1. User selects a clip on the timeline and an inline editing panel appears (either as a side panel or expanding section)
  2. The editing panel shows a preview player playing only the selected clip
  3. The editing panel shows a Monaco code editor with the clip's Remotion JSX code
  4. User can edit the code in the panel and click "Save" to persist changes back to the clip
  5. Saved code changes are immediately reflected in the timeline preview and full movie playback
**Plans**: TBD

Plans:
- [ ] 23-01-PLAN.md -- TBD
- [ ] 23-02-PLAN.md -- TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11 -> 12 -> 13 -> 14 -> 15 -> 16 -> 17 -> 18 -> 19 -> 20 -> 21 -> 22 -> 23

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Auth | v1.0 | 2/2 | Complete | 2026-01-27 |
| 2. Generation Pipeline | v1.0 | 3/3 | Complete | 2026-01-27 |
| 3. Preview System | v1.0 | 1/1 | Complete | 2026-01-28 |
| 4. Templates & Discovery | v1.0 | 2/2 | Complete | 2026-01-28 |
| 5. Render Pipeline | v1.0 | 4/4 | Complete | 2026-01-28 |
| 6. Code Generation & Safe Execution | v1.1 | 4/4 | Complete | 2026-01-29 |
| 7. Editing & Iteration | v1.1 | 4/4 | Complete | 2026-01-29 |
| 8. Export & Polish | v1.1 | 2/2 | Complete | 2026-01-29 |
| 9. App Shell & Clip Library | v2.0 | 3/3 | Complete | 2026-02-01 |
| 10. Movie Data & Timeline UI | v2.0 | 3/3 | Complete | 2026-02-01 |
| 11. Movie Preview, Render & Export | v2.0 | 3/3 | Complete | 2026-02-01 |
| 12. Continuation Generation | v2.0 | 2/2 | Complete | 2026-02-01 |
| 13. Generation Feed & Settings | v0.2.0 | 3/3 | Complete | 2026-02-01 |
| 14. Variations | v0.2.0 | 2/2 | Complete | 2026-02-01 |
| 15. Image Upload & Input Bar | v0.2.0 | 3/3 | Complete | 2026-02-01 |
| 16. Per-Creation Actions | v0.2.0 | 2/2 | Complete | 2026-02-01 |
| 17. Prequel Generation | v0.2.0 | 2/2 | Complete | 2026-02-02 |
| 18. Pro Layout | v0.3.0 | 1/1 | Complete | 2026-02-03 |
| 19. Timeline Foundation | v0.3.0 | 2/2 | Complete | 2026-02-03 |
| 20. Timeline Interactions | v0.3.0 | 0/TBD | Not started | - |
| 21. Blade & Split | v0.3.0 | 0/TBD | Not started | - |
| 22. Per-Clip Actions | v0.3.0 | 0/TBD | Not started | - |
| 23. Inline Editing | v0.3.0 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-01-27*
*v1.0 requirements: 14 mapped (complete)*
*v1.1 requirements: 11 mapped (complete)*
*v2.0 requirements: 15 mapped (complete)*
*v0.2.0 requirements: 11 mapped (complete)*
*v0.3.0 requirements: 12 mapped across 6 phases (18-23)*
*Updated: 2026-02-02 -- v0.3.0 roadmap created. 6 phases (18-23), 12 requirements.*
