# RemotionLab

**Release: v0.1.0**

## What This Is

A web app where users create animated videos through text prompts, powered by Claude and Remotion. Think "Midjourney for animations" — users describe what they want, AI generates professional motion graphics as actual Remotion JSX code. The interface combines chat-based generation with a code editor for fine-tuning, and exports standalone Remotion projects. Includes a multi-scene movie editor with a timeline, clip library, and continuation-based generation for scene-to-scene visual continuity.

## Core Value

Users can go from a text prompt to a rendered, downloadable animated video without any coding or motion design knowledge.

## Shipped (v0.1.0)

### Milestone 1: Core Validation (Phases 1-5)
Authentication, template-based generation, preview, templates gallery, render pipeline with Lambda.

### Milestone 2: Full Code Generation (Phases 6-8)
Claude generates complete Remotion JSX code. AST validation and sandboxed execution. Monaco editor with live validation, editable code, chat refinement. Export to standalone .tsx or full Remotion project zip.

### Milestone 3: Scenes, Timeline & Movie Editor (Phases 9-12)
Clip library with save/open/delete, movie creation with horizontal timeline and drag-to-reorder scenes, full-movie preview and MP4 rendering, single-clip and multi-composition Remotion project export, continuation generation for visually continuous scene sequences.

## Requirements

### Validated (v1.0 + v1.1)

- [x] AUTH-01: User can sign up with Clerk
- [x] AUTH-02: User can log in via email/password
- [x] AUTH-03: User can log in via OAuth (Google/GitHub)
- [x] AUTH-04: User session persists across browser refresh
- [x] GEN-01: User can enter text prompt describing desired animation
- [x] GEN-02: User can browse template/inspiration gallery
- [x] GEN-03: User can select template as starting point
- [x] GEN-04: System validates generated code before rendering
- [x] GEN-05: User can see real-time preview of animation
- [x] ANIM-01: System supports text/typography animations
- [x] ANIM-02: System supports shape animations (rectangles, circles, paths)
- [x] ANIM-03: System supports motion graphics (complex compositions, sequences)
- [x] ANIM-04: System supports transitions and effects (fade, scale, rotate)
- [x] OUT-01: User can download rendered video (MP4)
- [x] OUT-02: User can export generated Remotion source code
- [x] INFRA-01: System enforces usage limits/quotas per user
- [x] INFRA-02: User sees render progress in real-time
- [x] INFRA-03: System handles errors gracefully with retry options
- [x] CODE-01: Claude generates complete Remotion JSX compositions from text prompts
- [x] CODE-02: System validates generated code via AST parsing before execution
- [x] CODE-03: System executes validated code in safe sandbox environment
- [x] CODE-04: User can view generated Remotion code in editor
- [x] CODE-05: User can edit generated code and re-validate
- [x] ITER-01: User can refine animation via chat
- [x] ITER-02: System suggests fixes when code validation fails

### Validated (Milestone 3 — Scenes, Timeline & Movie Editor)

- [x] SAVE-01: User can quick-save the current composition as a named clip
- [x] SAVE-02: User can list, open, and delete saved clips from a library
- [x] SAVE-03: Saved clip stores composition code, duration, optional name/thumbnail; can be re-opened and re-rendered
- [x] MOVIE-01: User can create/open a movie with an ordered list of scenes
- [x] MOVIE-02: Horizontal timeline UI shows scenes in order with durations; user can reorder, remove, add scenes
- [x] MOVIE-03: User can preview the full movie (all scenes in sequence) in one Remotion Player
- [x] MOVIE-04: User can render the full movie to one MP4
- [x] OUT-03: User can export a single clip as MP4 and/or Remotion source without rendering the whole movie
- [x] OUT-04: User can export the full movie as one MP4 and/or Remotion project
- [x] GEN-06: User can trigger "Generate next scene" — system captures last frame state of a clip via code serialization
- [x] GEN-07: Claude generates continuation JSX that starts from the previous clip's end state
- [x] UI-01: App has a persistent shell with sidebar navigation (Home, Create, Library, Movie, Templates)
- [x] UI-02: Create page supports quick-save, "Add to movie," and "Generate next scene" actions
- [x] UI-03: Dedicated timeline/movie page for managing scenes and previewing/rendering the full movie
- [x] UI-04: Video preview shows a timeline bar (playhead, duration, scrub)

### Out of Scope

- Payments/subscriptions — focus on core value, monetize after validation
- Custom font uploads — start with system/web fonts
- Audio/music tracks on timeline — visual-only for now
- Brand kits (saved colors, fonts, logos) — future feature
- Mobile app — web-first
- Real-time collaboration — solo creation
- Visual drag-and-drop timeline — horizontal timeline with reorder, not full drag-and-drop editor
- Sharing movies — solo creation first

## Context

**Inspiration:** Midjourney's UX for image generation, applied to video/animation creation.

**Technical approach:**
- Claude generates full Remotion JSX/React code (not just template props)
- AST validation + sandboxed execution via Function constructor with controlled scope
- Remotion Lambda for serverless video rendering
- Monaco editor for code viewing/editing with live validation

**Target users:**
- Content creators (YouTubers, TikTokers, social media)
- Marketers/businesses (product videos, ads, promos)
- Developers (want Remotion but easier)

**User skill levels:** Mixed — dead simple for beginners, power features (code editing, export) for pros.

## Constraints

- **Auth**: Clerk — handles signup, login, OAuth, session management
- **Backend**: Convex — real-time serverless with reactive queries
- **Rendering**: Remotion + Lambda — core technology for animation and rendering
- **AI**: Claude API — powers code generation and refinement
- **Validation**: acorn + acorn-jsx + sucrase — AST parsing and JSX transformation
- **Editor**: Monaco — code display, editing, inline error markers
- **Export**: JSZip — client-side project scaffold generation

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Clerk for auth | Fast integration, good UX, handles OAuth, 10K MAU free tier | Validated |
| Convex for backend | Real-time, serverless, pairs well with React | Validated |
| Remotion Lambda for rendering | Serverless, scales automatically | Validated |
| Props-based generation (v1.0) | Fast MVP validation with fixed templates | Shipped, superseded by v1.1 |
| Full JSX generation (v1.1) | Unlimited animation possibilities | Validated |
| Interpreter pattern (acorn + sucrase) | AST validation before execution, no eval/new Function risks from user code | Validated |
| Whitelist-only imports | Security: only remotion, @remotion/*, react allowed | Validated |
| Function constructor with scope injection | Safe execution with controlled API surface | Validated |
| Meta-composition pattern | Single Lambda bundle serves all generated code | Validated |
| Dual code storage (rawCode + code) | JSX for editor, transformed JS for execution | Validated |
| Monaco editor | Industry-standard code editing with markers, syntax highlighting | Validated |
| Stateless chat refinement | Conversation history managed client-side, action is pure | Validated |
| JSZip client-side export | No server needed for project scaffold generation | Validated |
| No payments in MVP | Focus on core value, validate before monetizing | Active |
| LLM code reading for end-state (v0.1) | Claude reads animation code to determine final visual state for continuations; static AST analysis rejected as infeasible | Validated |
| Horizontal timeline UI (v0.1) | Traditional video-editor-style track with duration bars, not a simple list | Validated |

---
*Last updated: 2026-02-01 — v0.1.0 release (all 3 milestones, 40 requirements delivered)*
