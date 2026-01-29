# Roadmap: RemotionLab

## Overview

RemotionLab delivers AI-powered video creation. v1.0 (14 requirements) validated the core value: users can go from text prompt to rendered video without coding knowledge. v1.1 (11 requirements) unlocks unlimited animation possibilities by having Claude generate actual Remotion JSX code with secure validation and execution.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

### v1.0 (Complete)

- [x] **Phase 1: Foundation & Auth** - Users can securely access their accounts via Clerk
- [x] **Phase 2: Generation Pipeline** - Users can generate animation code from text prompts
- [x] **Phase 3: Preview System** - Users can see real-time preview of generated animations
- [x] **Phase 4: Templates & Discovery** - Users can browse and select templates as starting points
- [x] **Phase 5: Render Pipeline** - Users can render and download MP4 videos

### v1.1 (In Progress)

- [x] **Phase 6: Code Generation & Safe Execution** - Users can generate full Remotion JSX with validated, sandboxed execution
- [x] **Phase 7: Editing & Iteration** - Users can edit code and refine via chat
- [ ] **Phase 8: Export & Polish** - Users can export source code for standalone use

## Phase Details

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
- [ ] 08-01-PLAN.md -- Export utility library (JSZip, import detection, single-file + zip generators)
- [ ] 08-02-PLAN.md -- Export buttons UI + create page wiring + human verification

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Auth | 2/2 | Complete | 2026-01-27 |
| 2. Generation Pipeline | 3/3 | Complete | 2026-01-27 |
| 3. Preview System | 1/1 | Complete | 2026-01-28 |
| 4. Templates & Discovery | 2/2 | Complete | 2026-01-28 |
| 5. Render Pipeline | 4/4 | Complete | 2026-01-28 |
| 6. Code Generation & Safe Execution | 4/4 | Complete | 2026-01-29 |
| 7. Editing & Iteration | 4/4 | Complete | 2026-01-29 |
| 8. Export & Polish | 0/2 | Not Started | - |

---
*Roadmap created: 2026-01-27*
*v1.0 requirements: 14 mapped (complete)*
*v1.1 requirements: 11 mapped*
*Updated: 2026-01-29 - Phase 8 planned (2 plans in 2 waves)*
