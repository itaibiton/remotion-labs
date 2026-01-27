# RemotionLab

## What This Is

A web app where users create animated videos through text prompts, powered by Claude Code and Remotion. Think "Midjourney for animations" — users describe what they want, AI generates professional motion graphics. The interface combines chat-based generation with a visual editor for fine-tuning, serving everyone from content creators to marketers to developers.

## Core Value

Users can go from a text prompt to a rendered, downloadable animated video without any coding or motion design knowledge.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can enter a text prompt describing desired animation
- [ ] System generates Remotion code via Claude Code (hybrid: custom + pre-built components)
- [ ] User can browse templates/inspiration as starting points
- [ ] User can refine animation via chat ("make it faster", "change color")
- [ ] User can fine-tune in visual editor (timeline, properties)
- [ ] User can upload images/logos for use in animations
- [ ] User can download rendered video (MP4)
- [ ] User can get shareable link to video
- [ ] User can embed video on external sites
- [ ] User can export Remotion source code
- [ ] User can sign up/login via Clerk
- [ ] Animation types: text/typography, logo/brand, data viz, social media content

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
*Last updated: 2025-01-27 after initialization*
