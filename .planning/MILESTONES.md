# Milestones: RemotionLab

## Completed Milestones

### v1.0 - Core Validation (2026-01-27 → 2026-01-28)

**Goal:** Validate the core concept: can users go from prompt to video?

**Phases:**
1. Foundation & Auth - Clerk integration, session persistence
2. Generation Pipeline - Claude API, props-based text animations
3. Preview System - Remotion Player with custom controls
4. Templates & Discovery - 8 templates, gallery, template context
5. Render Pipeline - Lambda integration, rate limiting, MP4 download

**Requirements delivered:** 14/14
- AUTH-01 through AUTH-04 (authentication)
- GEN-01 through GEN-05 (generation)
- ANIM-01 (text animations)
- OUT-01 (MP4 download)
- INFRA-01 through INFRA-03 (infrastructure)

**Key decisions:**
- Props-based generation for v1.0 (Claude generates JSON props, not full JSX)
- Template-based approach (8 fixed compositions with customizable props)
- @convex-dev/rate-limiter for quota enforcement
- Reactive query subscriptions for real-time progress

**Last phase:** 5

---
*Milestone history for RemotionLab*
