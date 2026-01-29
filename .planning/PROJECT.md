# RemotionLab

## What This Is

A web app where users create animated videos through text prompts, powered by Claude and Remotion. Think "Midjourney for animations" — users describe what they want, AI generates professional motion graphics as actual Remotion JSX code. The interface combines chat-based generation with a code editor for fine-tuning, and exports standalone Remotion projects.

## Core Value

Users can go from a text prompt to a rendered, downloadable animated video without any coding or motion design knowledge.

## Shipped

### v1.0 — Core Validation (Phases 1-5)
Authentication, template-based generation, preview, templates gallery, render pipeline with Lambda.

### v1.1 — Full Code Generation (Phases 6-8)
Claude generates complete Remotion JSX code. AST validation and sandboxed execution. Monaco editor with live validation, editable code, chat refinement. Export to standalone .tsx or full Remotion project zip.

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

### Out of Scope

- Payments/subscriptions — focus on core value, monetize after validation
- Custom font uploads — start with system/web fonts
- Audio/music integration — visual-only for now
- Brand kits (saved colors, fonts, logos) — future feature
- Mobile app — web-first
- Real-time collaboration — solo creation
- Visual click-to-edit — complex, defer to v2

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

---
*Last updated: 2026-01-29 after v1.1 completion*
