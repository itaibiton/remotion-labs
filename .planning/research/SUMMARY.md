# Project Research Summary

**Project:** AI-Powered Video Creation Platform (RemotionLab)
**Domain:** Prompt-to-Animation Motion Graphics Generator
**Researched:** 2026-01-27
**Confidence:** HIGH

## Executive Summary

RemotionLab is an AI-powered motion graphics platform that bridges the gap between AI generative video (Runway, Sora) and template-based animation tools (Canva). Users type text prompts and receive deterministic, code-based animated videos rendered through Remotion. Unlike probabilistic AI video generators, this platform produces reproducible outputs and offers code export capabilities—a genuine market differentiator targeting content creators, marketers, and developer-adjacent users.

The recommended technical approach combines Next.js 16 (App Router), Clerk authentication, Convex real-time database, Claude API for JSX code generation, and Remotion Lambda for serverless video rendering. This stack prioritizes developer velocity, real-time updates, and seamless integration. All core technologies are verified compatible and actively maintained with strong documentation.

Critical risks center on Claude-generated code validation (only 56-69% correctness rate without validation), rendering cost control (potential for $5-50 renders instead of $0.02), and managing user expectations around AI capabilities. These risks are addressable through code validation pipelines, hard cost limits before public launch, and guided onboarding that sets realistic expectations. The architecture supports an MVP-first approach with clear scaling paths.

## Key Findings

### Recommended Stack

The stack centers on proven technologies with first-class integration support. Next.js 16 brings React 19.2 compatibility (required for Remotion 4.x), security patches for recent CVEs, and stable App Router patterns. Clerk and Convex were pre-selected and work seamlessly together via JWT templates and the ConvexProviderWithClerk wrapper. Remotion Lambda provides the fastest path to production video rendering with distributed processing and pay-per-render pricing.

**Core technologies:**
- **Next.js 16** with App Router — React framework providing SSR, routing, and server components for optimal performance
- **Clerk** — Authentication with 10K MAU free tier, SOC 2 compliance, pre-built UI components
- **Convex** — Real-time TypeScript database with automatic sync, no WebSocket boilerplate
- **Remotion 4.0.x** — React-based programmatic video rendering compatible with React 19
- **Claude Sonnet 4.5** — AI code generation at $3/$15 per MTok, best balance for Remotion JSX
- **Remotion Lambda** — Serverless distributed rendering, fastest option with minimal setup
- **Tailwind CSS 4.x + shadcn/ui** — Utility-first styling with copy-paste components
- **Zod 4.x** — Schema validation for prompts and API responses, 14x faster parsing

**Critical version notes:** Next.js 15.2.3+ or 16.x required for CVE-2025-29927 patches. Remotion 4.x required for React 19 compatibility. Use tw-animate-css (not deprecated tailwindcss-animate) with shadcn/ui.

### Expected Features

Research shows users entering this space expect "Midjourney magic" but need realistic expectations set early. The platform occupies a unique niche: deterministic motion graphics with code export rather than probabilistic AI-generated video.

**Must have (table stakes):**
- **Prompt input** — Core interaction model; users expect natural language text input
- **Real-time preview** — Browser-based preview before expensive final render
- **Download MP4** — Primary export format at 1080p minimum
- **Progress indicators** — Rendering takes time; users need feedback on generation and render status
- **Error handling** — Specific, actionable error messages (not "something went wrong")
- **Basic iteration** — "Try again" functionality without losing context

**Should have (competitive advantage):**
- **Code export (Remotion JSX)** — Unique differentiator; no competitor offers this
- **Chat-based refinement** — "Make it faster", "change colors" via conversation (Claude-powered)
- **Deterministic output** — Marketing angle: same input = same output every time
- **Template gallery** — Pre-validated starting points reducing blank-slate paralysis
- **Multiple export formats** — 16:9, 9:16, 1:1 aspect ratios for social media
- **Style reference** — "Use this color palette" guidance for consistent branding

**Defer to v2+:**
- **Visual editor** — High complexity; only build if users request fine-tuning
- **Data-driven animations** — CSV/API integration for animated charts
- **Team collaboration** — Only if B2B demand emerges
- **3D rendering** — Out of scope; offer 2.5D effects via CSS transforms instead
- **Audio generation** — Different AI domain; provide royalty-free library instead

**Anti-features (commonly requested but problematic):**
- AI-generated photorealistic video (Runway-style) — Completely different technology; competing here loses
- Unlimited video length — Exponential compute costs; start with 15-30 second cap
- Full video editing suite — Feature creep; export to other tools for editing

### Architecture Approach

The architecture follows a three-layer model: Next.js client for UI and preview, Convex backend for real-time state and job orchestration, and external services (Claude, Remotion Lambda) for heavy compute. Critical pattern: mutations create job records first, then schedule actions for external work—this provides transactional guarantees and immediate UI reactivity.

**Major components:**

1. **Authentication Layer (Clerk + Convex)** — Three-layer defense: middleware redirects, useConvexAuth() for client state, ctx.auth.getUserIdentity() for backend validation. Webhooks sync user data between systems.

2. **Generation Pipeline** — User prompt triggers mutation creating job record with union-typed status ("pending" | "generating" | "completed" | "failed"). Scheduled action calls Claude API, validates output with Zod, stores code in Convex. UI subscribes via useQuery for real-time updates.

3. **Preview System (Remotion Player)** — Browser-based real-time preview using memoized inputProps to prevent re-render cascades. Composition accepts props rather than executing generated code directly (safer, simpler for MVP).

4. **Render Pipeline (Remotion Lambda)** — Mutation triggers render job, scheduled action calls renderMediaOnLambda(), polls progress, stores S3 URL. Distributed rendering across Lambda functions for speed.

5. **Asset Storage (Convex File Storage)** — User uploads generate signed URLs, files stored in Convex, metadata tracked in database for generation context.

**Key patterns:**
- **Mutation-first job scheduling** — External work scheduled via ctx.scheduler, job status tracked in database
- **Union-typed job status** — Type-safe discriminated unions for async job states
- **Memoized Player inputProps** — Critical for performance; prevents unnecessary re-renders
- **Props-based generation** — Claude generates JSON props for pre-validated templates (defer full JSX execution to v2)

### Critical Pitfalls

Research identified six critical pitfalls that could cause rewrites, budget blowouts, or product failure if not addressed proactively.

1. **Claude-generated code fails at runtime** — Even Claude Opus 4.5 produces correct code only 56-69% of the time. Prevention: validation pipeline before rendering, template-based approach with slot-filling, sandbox execution for preview. Address in Phase 1 (foundational).

2. **Rendering costs explode unpredictably** — User prompts can trigger $5-50 renders instead of $0.02. No built-in cost caps in Lambda. Prevention: hard limits on resolution (1080p max), duration (30s max), complexity; cost estimation shown before render; per-user quotas; render queue. Address in Phase 1 (existential risk).

3. **Preview and final render diverge** — Browser preview (Remotion Player) uses GPU and real-time rendering; Lambda uses headless Chromium without GPU. Prevention: preload all assets with pauseWhenBuffering, avoid GPU-dependent CSS effects (box-shadow, blur, gradients), use deterministic compositions. Address in Phase 2 (acceptable minor differences for MVP).

4. **User expectations vs AI reality gap** — Users expect Midjourney magic, get iterative imperfect results. Prevention: guided onboarding setting realistic expectations, iterative workflow design, preset templates that reliably work, transparent limitations messaging. Address in Phase 1 (core to product-market fit).

5. **Claude API rate limits block production** — Tier 1 only supports 50 RPM, 40K ITPM. January 2026 saw ~60% reduction in effective limits. Prevention: budget for Tier 3+ ($200+ deposit), prompt caching to reduce token usage, graceful degradation with queuing, exponential backoff for 429 errors. Address in Phase 1 (infrastructure requirement).

6. **Convex bandwidth explosion** — Real-time subscriptions re-send entire query results on any change. Prevention: query minimal data, debounce render progress updates to 5-10% increments, selective subscriptions only for active views, proper indexing. Address in Phase 2 (acceptable inefficiency for MVP).

## Implications for Roadmap

Based on architectural dependencies and pitfall prevention requirements, the roadmap should follow a foundation-first approach with clear MVP boundaries.

### Phase 1: Foundation & Auth
**Rationale:** Everything depends on authentication working correctly. Clerk + Convex + Next.js integration has specific patterns that must be established before building features.

**Delivers:** Working auth flow, user session management, basic project CRUD

**Addresses:** Three-layer authentication pattern from ARCHITECTURE.md, sets foundation for all user-scoped features

**Avoids:** Integration gotchas (Pitfall: Clerk production keys, authorizedParties not set)

**Research needed:** No — well-documented standard patterns

### Phase 2: Generation Pipeline (MVP Core)
**Rationale:** This is the core value proposition. Must validate that prompt-to-code generation works before building rendering. Dependencies: requires auth and schema from Phase 1.

**Delivers:** Prompt input, Claude code generation, job status tracking, validation pipeline

**Addresses:**
- Must-have features: Prompt input, error handling, basic iteration
- Template-based approach (props generation, not full JSX execution)
- Code validation to prevent runtime failures (Pitfall 1)
- Claude rate limit handling with backoff (Pitfall 5)

**Avoids:**
- Claude-generated code runtime failures via validation
- Rate limit blocking via tier budgeting and retry logic
- Expectation gaps via constrained templates

**Research needed:** Possibly — Claude prompt engineering for Remotion JSX may need iteration. Consider `/gsd:research-phase` if initial results are poor.

### Phase 3: Preview System
**Rationale:** Users need to see what they're getting before committing to expensive renders. Builds on validated code from Phase 2.

**Delivers:** Remotion Player integration, real-time preview, memoized inputProps pattern

**Addresses:**
- Must-have features: Real-time preview
- Memoized Player pattern from ARCHITECTURE.md
- Preview performance optimization

**Avoids:** Re-render cascades via proper memoization

**Research needed:** No — Remotion Player API well-documented

### Phase 4: Render Pipeline
**Rationale:** Final MP4 output is table stakes, but must have cost controls in place first. Dependencies: requires working generation and preview.

**Delivers:** Remotion Lambda deployment, render job management, progress tracking, download

**Addresses:**
- Must-have features: Download MP4, progress indicators
- Render cost controls (Pitfall 2): hard limits on resolution/duration, cost estimation
- Per-user quotas to prevent abuse

**Avoids:**
- Cost explosion via pre-render estimation and hard caps
- Unlimited renders via quotas

**Research needed:** No — Remotion Lambda API well-documented, but budget for Lambda deployment testing

### Phase 5: Onboarding & Templates
**Rationale:** User expectation management is critical for retention. Requires working generation to create template examples.

**Delivers:** Template gallery, guided onboarding, example outputs with prompts

**Addresses:**
- Should-have features: Template gallery
- User expectation gap (Pitfall 4) via examples and guidance
- Blank-slate problem for non-creative users

**Avoids:** Churn from unrealistic expectations via proactive expectation-setting

**Research needed:** No — UX patterns, not technical research

### Phase 6: Iteration & Refinement
**Rationale:** Chat-based refinement is a differentiator but requires working generation context. Can be deferred post-MVP for validation.

**Delivers:** Multi-turn Claude conversations, "make it faster" / "change colors" commands, generation history

**Addresses:**
- Should-have features: Chat refinement
- Competitive advantage via conversational iteration

**Avoids:** Starting over for small changes

**Research needed:** Possibly — Conversation context management may need iteration testing

### Phase 7: Export & Sharing
**Rationale:** Code export is the unique differentiator but not required for initial validation. Multiple formats increase polish.

**Delivers:** Code export (Remotion JSX), multiple aspect ratios, share links, embed codes

**Addresses:**
- Should-have features: Code export, multiple formats, share links
- Developer-friendly positioning

**Avoids:** Feature creep by keeping exports simple

**Research needed:** No — straightforward implementation

### Phase Ordering Rationale

**Why this order:**
- Authentication must come first — nothing works without it
- Generation before preview — can't preview what hasn't been generated
- Preview before render — users need feedback before committing to expensive operations
- Cost controls in render phase — prevent budget disasters before public launch
- Onboarding after working product — need something that works to onboard to
- Advanced features (chat, export) after validation — build differentiators only if core works

**Dependency chain:**
```
Auth → Schema → Generation → Validation → Preview → Render → Onboarding
                                    ↓
                            Templates & Examples
                                    ↓
                          Advanced Features (Chat, Export)
```

**Pitfall prevention mapping:**
- Phase 2 addresses Pitfalls 1, 4, 5 (code validation, expectations, rate limits)
- Phase 4 addresses Pitfall 2 (cost explosion)
- Phase 5 addresses Pitfall 4 (user expectations)
- Phase 6+ addresses Pitfall 6 (Convex bandwidth) via optimization

### Research Flags

**Phases likely needing deeper research:**
- **Phase 2 (Generation Pipeline):** Claude prompt engineering for Remotion JSX may require iteration. If initial generation quality is poor (<60% valid outputs), run `/gsd:research-phase` focused on prompt structure and few-shot examples.
- **Phase 6 (Chat Refinement):** Conversation context management and partial regeneration strategies may need research if simple approaches fail.

**Phases with standard patterns (skip research):**
- **Phase 1 (Foundation & Auth):** Well-documented Clerk + Convex + Next.js patterns
- **Phase 3 (Preview System):** Remotion Player API thoroughly documented
- **Phase 4 (Render Pipeline):** Remotion Lambda API well-established
- **Phase 5 (Onboarding):** Standard UX patterns, no technical research needed
- **Phase 7 (Export & Sharing):** Straightforward implementation, no novel patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All core technologies verified via official documentation. Version compatibility matrix confirmed. Next.js 16 + React 19 + Remotion 4.x tested combination. |
| Features | MEDIUM-HIGH | Competitor analysis based on WebSearch across 15+ sources. Feature expectations validated against Runway, Pika, Canva patterns. Anti-features informed by NN/g UX research. |
| Architecture | HIGH | Patterns sourced from official Remotion, Convex, and Clerk documentation. Mutation-first job scheduling verified in Convex docs. Player memoization from Remotion best practices. |
| Pitfalls | MEDIUM-HIGH | Critical pitfalls (code validation, cost explosion) verified via official Remotion limits docs and Endor Labs research. Rate limits confirmed via Anthropic docs and January 2026 reports. Security concerns validated by NVIDIA/CSA research. |

**Overall confidence:** HIGH

Research provides strong foundation for roadmap creation. Core technical decisions (stack, architecture patterns) are verified against official sources. Feature expectations grounded in competitor analysis. Pitfalls identified proactively with clear prevention strategies.

### Gaps to Address

**Gap 1: Claude prompt engineering effectiveness**
- **Nature:** Unknown how well Claude will generate valid Remotion JSX without extensive few-shot examples
- **Impact:** Could affect Phase 2 timeline if generation quality is poor
- **Mitigation:** Start with heavily constrained templates (props-based, not full JSX). Budget time for prompt iteration in Phase 2. Consider research-phase if quality <60%.

**Gap 2: Actual rendering costs at scale**
- **Nature:** Research provides theoretical cost estimates, but real-world usage patterns unknown
- **Impact:** Could affect pricing model and profitability
- **Mitigation:** Implement comprehensive cost tracking from day 1. Start with conservative limits (1080p, 30s max). Gather real data during MVP before scaling.

**Gap 3: Preview-render divergence tolerance**
- **Nature:** Unclear how much visual difference between preview and final render users will accept
- **Impact:** Could affect user trust and retention
- **Mitigation:** Document known differences in Phase 3. Build automated visual diff testing in Phase 4. Gather user feedback on acceptability.

**Gap 4: User prompt patterns**
- **Nature:** Unknown what users will actually prompt for (kinetic typography vs complex scenes)
- **Impact:** Affects template design and generation complexity
- **Mitigation:** Start with single template type (kinetic typography). Analyze prompt patterns from early users. Expand templates based on actual demand.

**Gap 5: Convex bandwidth at scale**
- **Nature:** Research shows potential bandwidth issues, but actual usage patterns unknown
- **Impact:** Could affect infrastructure costs
- **Mitigation:** Implement efficient query patterns from Phase 1. Monitor bandwidth metrics weekly. Optimize before scaling past 1K users.

## Sources

### Primary (HIGH confidence)
- **Next.js 16 Upgrade Guide** — Version compatibility, App Router patterns
- **Clerk Documentation** — Next.js integration, Convex JWT templates, webhooks
- **Convex Documentation** — Clerk integration, scheduled functions, file storage, real-time patterns
- **Remotion Documentation** — Lambda architecture, Player API, performance, limits, cost optimization
- **Anthropic API Documentation** — Claude rate limits, model selection, prompt caching
- **shadcn/ui Tailwind v4** — Component library setup, tw-animate-css migration
- **Zod v4 Documentation** — Schema validation patterns

### Secondary (MEDIUM confidence)
- **Runway Gen-4.5, Pika 2.5, Sora 2 Reviews** — Competitor feature analysis (15+ sources)
- **Canva Animation Features** — Template-based motion graphics patterns
- **Convex Background Job Management (Stack article)** — Job status union types pattern
- **Remotion Skills (Gaga.art blog)** — Claude + Remotion integration examples
- **Endor Labs Research** — AI code generation correctness rates (56-69%)
- **NVIDIA Research** — Code execution security risks in agentic AI
- **NN/g Research** — AI image generation UX patterns and user expectations

### Tertiary (LOW-MEDIUM confidence)
- **The Register (Jan 2026)** — Claude rate limit reductions (~60% effective limit decrease)
- **VentureBeat** — Anthropic rate limit policy changes
- **Convex GitHub Issue #95** — Bandwidth over-fetching on query changes
- **Frank and Marci Blog** — Midjourney UX frustrations (Discord-based interface critique)

---
*Research completed: 2026-01-27*
*Ready for roadmap: yes*
