# Roadmap: RemotionLab

## Overview

RemotionLab delivers AI-powered video creation through five phases: establishing secure user access, building the Claude-powered generation pipeline, enabling real-time preview, providing template discovery, and implementing video rendering with download capabilities. This roadmap covers v1.0 scope (14 requirements) focused on validating the core value: users can go from text prompt to rendered video without coding or motion design knowledge.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Auth** - Users can securely access their accounts via Clerk
- [ ] **Phase 2: Generation Pipeline** - Users can generate animation code from text prompts
- [ ] **Phase 3: Preview System** - Users can see real-time preview of generated animations
- [ ] **Phase 4: Templates & Discovery** - Users can browse and select templates as starting points
- [ ] **Phase 5: Render Pipeline** - Users can render and download MP4 videos

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
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD

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
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

### Phase 3: Preview System
**Goal**: Users can see real-time preview of animations before committing to render
**Depends on**: Phase 2
**Requirements**: GEN-05
**Success Criteria** (what must be TRUE):
  1. User sees animation preview immediately after generation completes
  2. Preview plays in browser without requiring render
  3. Preview accurately represents final output (within acceptable tolerance)
  4. User can replay preview as many times as desired
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Templates & Discovery
**Goal**: Users can browse pre-made templates and use them as starting points
**Depends on**: Phase 3
**Requirements**: GEN-02, GEN-03
**Success Criteria** (what must be TRUE):
  1. User can browse a gallery of template animations
  2. User can preview any template before selecting
  3. User can select a template to use as starting point for generation
  4. Selected template pre-fills context for prompt-based customization
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

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
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Auth | 0/2 | Not started | - |
| 2. Generation Pipeline | 0/3 | Not started | - |
| 3. Preview System | 0/2 | Not started | - |
| 4. Templates & Discovery | 0/2 | Not started | - |
| 5. Render Pipeline | 0/3 | Not started | - |

---
*Roadmap created: 2026-01-27*
*v1.0 requirements: 14 mapped*
