# RemotionLab

## What This Is

A web app where users create animated videos through text prompts, powered by Claude Code and Remotion. Think "Midjourney for animations" — users describe what they want, AI generates professional motion graphics. The interface combines chat-based generation with a visual editor for fine-tuning, serving everyone from content creators to marketers to developers.

## Core Value

Users can go from a text prompt to a rendered, downloadable animated video without any coding or motion design knowledge.

## Current Milestone: v1.1 Full Code Generation

**Goal:** Unlock unlimited animation possibilities by having Claude generate actual Remotion JSX code instead of just props for fixed templates.

**Target features:**
- Claude generates complete Remotion compositions (JSX/React code)
- Safe execution environment for AI-generated code
- Code validation pipeline (AST analysis, security checks)
- Access to Remotion's full animation API
- Users can view and edit generated code

## Requirements

### Validated (v1.0)

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
- [x] OUT-01: User can download rendered video (MP4)
- [x] INFRA-01: System enforces usage limits/quotas per user
- [x] INFRA-02: User sees render progress in real-time
- [x] INFRA-03: System handles errors gracefully with retry options

### Active (v1.1)

- [ ] User can generate any Remotion animation from text prompt (not limited to templates)
- [ ] System executes AI-generated code safely in sandbox
- [ ] User can view generated Remotion code
- [ ] User can edit generated code before rendering
- [ ] System validates generated code for security and correctness
- [ ] Animation types expanded: shapes, transitions, motion graphics, data viz

### Out of Scope

- Payments/subscriptions — focus on core value for MVP, add later
- Custom font uploads — start with system/web fonts
- Audio/music integration — visual-only for MVP
- Brand kits (saved colors, fonts, logos) — future feature
- Mobile app — web-first

## Context

**Inspiration:** Midjourney's UX for image generation, applied to video/animation creation.

**Technical approach:**
- Claude Code generates Remotion JSX/React code
- Hybrid generation: can write custom code AND use pre-built component library
- Remotion Lambda for serverless video rendering (to be researched)

**Target users:**
- Content creators (YouTubers, TikTokers, social media)
- Marketers/businesses (product videos, ads, promos)
- Developers (want Remotion but easier)

**User skill levels:** Mixed — dead simple for beginners, power features (code export) for pros.

## Constraints

- **Auth**: Clerk — already decided, good DX and fast to integrate
- **Backend**: Convex — already decided, real-time and serverless
- **Rendering**: Remotion — core technology, non-negotiable
- **AI**: Claude Code API — powers the generation, non-negotiable
- **MVP goal**: Validate the concept with minimal features, learn fast

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Clerk for auth | Fast integration, good UX, handles OAuth | — Pending |
| Convex for backend | Real-time, serverless, pairs well with React | — Pending |
| Remotion Lambda for rendering | Serverless, scales automatically, Remotion's recommended approach | — Pending |
| Hybrid generation (custom + components) | Flexibility for unique requests + speed for common patterns | — Pending |
| No payments in MVP | Focus on core value, validate before monetizing | — Pending |

---
*Last updated: 2026-01-28 after v1.0 completion, starting v1.1*
