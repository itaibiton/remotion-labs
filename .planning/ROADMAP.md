# Roadmap: RemotionLab

## Overview

RemotionLab delivers AI-powered video creation. v1.0 (14 requirements) validated the core value: users can go from text prompt to rendered video without coding knowledge. v1.1 (11 requirements) unlocks unlimited animation possibilities by having Claude generate actual Remotion JSX code with secure validation and execution. v2.0 (15 requirements) evolves from single-clip creation into a multi-scene movie editor with a clip library, horizontal timeline, full-movie rendering, and continuation-based generation for scene-to-scene visual continuity.

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

### v2.0 — Scenes, Timeline & Movie Editor

- [ ] **Phase 9: App Shell & Clip Library** - Users can save, organize, and reopen their compositions from a persistent clip library
- [ ] **Phase 10: Movie Data & Timeline UI** - Users can create movies and arrange scenes on a horizontal timeline
- [ ] **Phase 11: Movie Preview, Render & Export** - Users can preview, render, and export full movies as MP4 or Remotion projects
- [ ] **Phase 12: Continuation Generation** - Users can generate visually continuous next scenes from existing clips

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
**Plans**: 3-4 plans

Plans:
- [ ] 10-01-PLAN.md - TBD (plan during phase planning)
- [ ] 10-02-PLAN.md - TBD
- [ ] 10-03-PLAN.md - TBD

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
**Plans**: 3-4 plans

Plans:
- [ ] 11-01-PLAN.md - TBD (plan during phase planning)
- [ ] 11-02-PLAN.md - TBD
- [ ] 11-03-PLAN.md - TBD

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
**Plans**: 2-3 plans

Plans:
- [ ] 12-01-PLAN.md - TBD (plan during phase planning)
- [ ] 12-02-PLAN.md - TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11 -> 12

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
| 10. Movie Data & Timeline UI | v2.0 | 0/~3 | Not started | - |
| 11. Movie Preview, Render & Export | v2.0 | 0/~3 | Not started | - |
| 12. Continuation Generation | v2.0 | 0/~2 | Not started | - |

---
*Roadmap created: 2026-01-27*
*v1.0 requirements: 14 mapped (complete)*
*v1.1 requirements: 11 mapped (complete)*
*v2.0 requirements: 15 mapped*
*Updated: 2026-02-01 -- Phase 9 complete (3 plans executed, goal verified)*
