# Pitfalls Research

**Domain:** AI-powered prompt-to-video platform (Remotion + Claude Code)
**Researched:** 2026-01-27
**Confidence:** MEDIUM-HIGH (verified against official docs and multiple sources)

---

## Critical Pitfalls

Mistakes that cause rewrites, budget blowouts, or product failure.

### Pitfall 1: Claude-Generated Code Fails at Runtime

**What goes wrong:**
Claude generates Remotion code that looks syntactically correct but crashes during rendering. Common failures include: undefined component imports, invalid props, animation timing that exceeds composition duration, missing asset references, or React hooks used incorrectly in Remotion context.

**Why it happens:**
- LLMs generate code based on patterns, not logic validation
- Claude has no runtime environment to test generated code
- Remotion's API has subtle constraints (e.g., `useCurrentFrame()` must be called in specific contexts)
- Research shows even Claude Opus 4.5 produces correct AND secure code only 56-69% of the time ([Endor Labs](https://www.endorlabs.com/learn/the-most-common-security-vulnerabilities-in-ai-generated-code))

**How to avoid:**
1. **Validate before rendering:** Parse generated code, check for common errors (missing imports, invalid JSX)
2. **Constrained generation:** Provide Claude with a strict component schema and examples
3. **Sandbox execution:** Use a preview sandbox (iframe/web worker) to catch runtime errors before Lambda
4. **Iterative generation:** Generate in small chunks, validate each, rather than entire compositions at once
5. **Template-based approach:** Have Claude fill slots in pre-validated templates rather than generating from scratch

**Warning signs:**
- High rate of failed renders (>20% failure rate)
- Errors cluster around specific patterns (animations, external assets)
- Users report "it worked in preview but failed in render"

**Phase to address:**
Phase 1 (MVP) - Build validation pipeline BEFORE connecting to Lambda. This is foundational.

---

### Pitfall 2: Rendering Costs Explode Unpredictably

**What goes wrong:**
A user's prompt triggers a render that costs $5-50 instead of $0.02. Or a malicious actor renders thousands of videos on your bill. Monthly AWS bill exceeds revenue.

**Why it happens:**
- Remotion Lambda pricing is complex: memory, duration, concurrency, region all factor in
- User prompts can generate arbitrarily complex compositions (4K, long duration, heavy effects)
- No built-in cost caps in Lambda
- Warm vs cold Lambda starts affect costs unpredictably
- [Remotion docs](https://www.remotion.dev/docs/lambda/cost-example): "Rendering video inside your video increases cost significantly"

**How to avoid:**
1. **Hard limits:** Cap resolution (1080p max), duration (30s max for MVP), and complexity
2. **Cost estimation:** Calculate estimated cost BEFORE rendering, show user, require confirmation for expensive renders
3. **Per-user quotas:** Daily/monthly render limits per user tier
4. **Rate limiting:** Prevent rapid-fire render requests
5. **Render queue:** Don't render immediately; queue and batch to control concurrency
6. **Region selection:** Deploy to cost-effective regions ([varies by AWS region](https://www.remotion.dev/docs/lambda/optimizing-cost))

**Warning signs:**
- Individual renders exceeding $1
- Render duration >5 minutes for simple videos
- Concurrency consistently hitting limits
- Unexpected AWS bill spikes

**Phase to address:**
Phase 1 (MVP) - Implement cost controls BEFORE public launch. This is existential.

---

### Pitfall 3: Preview and Final Render Diverge

**What goes wrong:**
Users see one thing in the browser preview but get different results in the final rendered video. Timing is off, assets are missing, colors differ, or animations behave differently.

**Why it happens:**
- Browser preview uses the Remotion Player (real-time, browser-based)
- Final render uses Lambda (headless Chromium, FFmpeg encoding)
- Assets may not be fully loaded during preview ([Remotion flickering docs](https://www.remotion.dev/docs/troubleshooting/player-flicker))
- GPU-accelerated CSS effects render differently without GPU ([Performance docs](https://www.remotion.dev/docs/performance))
- Timing issues with dynamic video sources

**How to avoid:**
1. **Preload assets:** Use Remotion's preloading hooks; add `pauseWhenBuffering` to media components
2. **Avoid GPU-dependent effects:** `box-shadow`, `filter: blur()`, gradients render slowly/differently on Lambda
3. **Test parity regularly:** Automated tests comparing preview screenshots vs rendered frames
4. **Use Server-Side Preview:** For critical previews, do a quick low-res Lambda render instead of browser preview
5. **Deterministic compositions:** Avoid random values; use seeded randomness

**Warning signs:**
- Users report "it looked different in preview"
- QA catches visual differences between preview and render
- Specific effects (shadows, blurs) look bad in final output

**Phase to address:**
Phase 2 (after MVP validation) - Initially acceptable to have minor differences; fix before scaling.

---

### Pitfall 4: User Expectations vs AI Reality Gap

**What goes wrong:**
Users expect "Midjourney magic" - type a sentence, get a perfect video. Reality: AI generation is iterative, imperfect, and constrained. Users churn due to disappointment.

**Why it happens:**
- Midjourney/ChatGPT have trained users to expect instant magic
- Video is fundamentally more complex than images (temporal dimension, audio sync, motion)
- Claude generates code, not directly pixels - there's a translation layer
- [NN/g research](https://www.nngroup.com/articles/ai-imagegen-stages/): "Changing small details of an AI-generated image can be an arduous, time-consuming task"

**How to avoid:**
1. **Guided onboarding:** Show examples of what's achievable vs not; set expectations early
2. **Iterative workflow:** Design UX around refinement, not one-shot generation
3. **Preset templates:** Offer constrained starting points that reliably work
4. **Transparent limitations:** "Best for X, not designed for Y" messaging
5. **Quick feedback loops:** Fast preview generation (seconds, not minutes)
6. **Variation controls:** Let users tweak parameters rather than re-prompting from scratch

**Warning signs:**
- High churn after first generation attempt
- Support tickets asking "why doesn't it do X?"
- Users compare unfavorably to Midjourney/Runway
- Low return usage after sign-up

**Phase to address:**
Phase 1 (MVP) - Core to product-market fit. Bad UX expectations kill products.

---

### Pitfall 5: Claude API Rate Limits Block Production Use

**What goes wrong:**
At scale, you hit Claude's rate limits, causing failed generations, timeouts, or degraded UX. Users see errors or long waits.

**Why it happens:**
- Anthropic applies limits per organization, not per API key ([Rate limit docs](https://docs.anthropic.com/en/api/rate-limits))
- Tier 1 ($5): Only 50 RPM, 40K ITPM
- Tier 3 ($200): 2,000 RPM, 800K ITPM
- Video prompts require substantial context (Remotion docs, examples) = high token usage
- [January 2026](https://www.theregister.com/2026/01/05/claude_devs_usage_limits/): Developers report ~60% reduction in effective limits

**How to avoid:**
1. **Start at higher tier:** Budget for Tier 3+ from launch ($200+ deposit)
2. **Prompt caching:** Use Anthropic's prompt caching - cached tokens don't count toward ITPM
3. **Request batching:** Combine multiple small requests where possible
4. **Graceful degradation:** Queue requests when near limits; show estimated wait times
5. **Retry with backoff:** Implement exponential backoff for 429 errors
6. **Monitor usage:** Track daily/weekly token consumption; alert before hitting limits

**Warning signs:**
- 429 errors in logs
- Generation times increasing unpredictably
- Burst traffic during launches/marketing causing failures

**Phase to address:**
Phase 1 (MVP) - Rate limit handling is infrastructure. Build it from the start.

---

### Pitfall 6: Convex Bandwidth Explodes with Real-Time Updates

**What goes wrong:**
As users increase, Convex bandwidth costs spike. Real-time subscriptions cause over-fetching. You hit the 1GB bandwidth threshold in weeks, not months.

**Why it happens:**
- Convex re-sends entire query results when ANY document in the result changes
- [GitHub Issue #95](https://github.com/get-convex/convex-backend/issues/95): "Any update to a single element triggers full re-send of entire list"
- Paginated queries may not cache as expected
- Render status updates (progress %) could trigger constant re-syncs

**How to avoid:**
1. **Query design:** Fetch minimal data; avoid large list subscriptions
2. **Debounce updates:** Don't update render progress every frame; batch to 5-10% increments
3. **Selective subscriptions:** Only subscribe to data user is actively viewing
4. **Polling fallback:** For non-critical updates, poll instead of real-time subscribe
5. **Index properly:** Add indexes for all filtered queries
6. **Monitor bandwidth:** Track Convex dashboard metrics weekly

**Warning signs:**
- Convex dashboard showing high bandwidth relative to user count
- Many subscription re-triggers in logs
- Render progress updates causing UI lag

**Phase to address:**
Phase 2 - Acceptable to be inefficient for MVP; optimize before scaling.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip code validation | Faster generation flow | High failure rate, bad UX, wasted Lambda costs | Never - validate from day 1 |
| No render cost estimation | Simpler UX | Bill shock, user complaints, potential fraud | Never - implement before launch |
| Direct Lambda execution (no queue) | Lower latency | No cost control, concurrency issues | MVP only, add queue before scale |
| Store full video in Convex | Simpler architecture | Bandwidth/storage costs explode | Never - use S3/CloudFlare R2 |
| No user render quotas | Frictionless UX | One user can bankrupt you | MVP only with tight monitoring |
| Hardcoded Remotion templates | Faster initial development | Can't iterate on video quality without deploys | Acceptable for first 2-3 months |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| **Clerk + Convex** | Auth token not passed to Convex functions | Use Clerk's `getToken({ template: "convex" })` pattern |
| **Clerk Production** | Using `pk_test_` keys in production | Environment-based key switching; [production checklist](https://clerk.com/docs/guides/development/deployment/production) |
| **Remotion Lambda** | Not deploying function before rendering | Deploy function on app startup or as separate CI step |
| **Claude API** | No retry logic for 429/5xx errors | Exponential backoff with jitter; use `retry-after` header |
| **S3 for video output** | Public bucket without CloudFront | Signed URLs or CloudFront distribution for cost/security |
| **Convex + Clerk** | Not setting `authorizedParties` | Explicit allowlist prevents subdomain cookie attacks |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Rendering every prompt variation | High Lambda costs, slow feedback | Cache similar prompts; use previews aggressively | >100 renders/day |
| Full-resolution previews | Slow preview load times | Lower preview resolution (480p), render final at 1080p | >10 concurrent users |
| Synchronous render flow | UI blocks during generation | Queue-based architecture; WebSocket progress updates | >5 concurrent renders |
| Single Lambda region | High latency for distant users | Multi-region deployment or user-closest routing | Global users |
| No asset CDN | Slow asset loading in Lambda | CloudFront for fonts, images, audio assets | Complex compositions |
| Unlimited video duration | Renders timeout (15min Lambda limit) | Hard cap at 2-5 minutes for MVP | Videos >3 minutes |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Executing Claude-generated code without sandbox | Code injection, data exfiltration, server compromise | Isolated sandbox (iframe, web worker, or microVM); [NVIDIA research](https://developer.nvidia.com/blog/how-code-execution-drives-key-risks-in-agentic-ai-systems/) on agentic code execution risks |
| No render rate limiting | Bill fraud, DDoS via expensive renders | Per-user render quotas, CAPTCHA for anonymous |
| Storing API keys client-side | Key theft, account compromise | All API calls through Convex backend functions |
| User-provided assets without validation | Malicious files, XSS via SVG, copyright issues | Validate file types, scan for malware, size limits |
| No output content moderation | Generating inappropriate content | Filter prompts + output review for policy violations |
| Lambda with excessive IAM permissions | Compromised function accesses other resources | Minimal IAM policy for Lambda function |

---

## UX Pitfalls

Common user experience mistakes in AI video generation platforms.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indication during render | Users think it's broken, refresh, trigger duplicate renders | Real-time progress bar (%), estimated time remaining |
| "Generation failed" without details | Users don't know how to fix their prompt | Specific error messages: "Your prompt requested 4K but max is 1080p" |
| Forcing full re-generation for small changes | Frustrating iteration, high costs | Partial regeneration, parameter sliders, style presets |
| No examples or templates | Users don't know what's possible | Gallery of example outputs with prompts shown |
| Discord/chat-based interface | Steep learning curve ([Midjourney criticism](https://www.frankandmarci.com/blog/why-midjourney-is-way-more-frustrating-than-you-expect/)) | Proper web UI with form inputs and preview |
| Hiding costs until after render | Trust erosion, chargebacks | Show estimated cost BEFORE user confirms |
| No way to cancel long renders | Wasted credits, frustration | Cancel button that actually stops Lambda execution |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Code generation:** Often missing error boundary - verify Claude output is wrapped in try/catch and fallback
- [ ] **Preview component:** Often missing asset preloading - verify `pauseWhenBuffering` is on all media
- [ ] **Render pipeline:** Often missing cost calculation - verify cost shown before render starts
- [ ] **Auth flow:** Often missing Clerk production keys - verify `pk_live_` in production env
- [ ] **Video output:** Often missing CDN/signed URLs - verify videos aren't served direct from S3
- [ ] **Rate limiting:** Often missing per-user quotas - verify user can't trigger unlimited renders
- [ ] **Error handling:** Often missing Claude 429 retry - verify exponential backoff implemented
- [ ] **Mobile experience:** Often missing responsive preview - verify Player works on mobile viewports

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Massive AWS bill from runaway renders | HIGH | Set up billing alerts immediately; implement hard spending cap; contact AWS support for potential credits; add rate limiting before re-enabling |
| Claude API blocked due to rate limits | MEDIUM | Switch to queued generation; implement backoff; contact Anthropic for tier upgrade; temporary fallback to GPT-4 |
| Preview/render divergence in production | MEDIUM | Document known differences; offer "safe mode" that avoids problematic effects; build render-preview comparison testing |
| User churn from expectation mismatch | HIGH | Survey churned users; revise onboarding; add template gallery; consider refund/credit program |
| Convex bandwidth overage | LOW | Optimize queries; add debouncing; consider upgrading plan short-term while fixing |
| Security incident from code execution | CRITICAL | Disable code generation immediately; audit all generated code; implement sandboxing; incident response; notify affected users if data exposed |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Claude code fails at runtime | Phase 1: Core Pipeline | >80% of generations produce valid code |
| Rendering costs explode | Phase 1: Core Pipeline | Cost estimation within 20% of actual; no render >$1 without explicit approval |
| Preview/render divergence | Phase 2: Polish | Visual diff tool shows <5% pixel difference |
| User expectation gap | Phase 1: MVP UX | Onboarding completion >70%; first-render success >60% |
| Claude rate limits | Phase 1: Infrastructure | Zero 429 errors visible to users (handled gracefully) |
| Convex bandwidth explosion | Phase 2: Scale Prep | Bandwidth/user <10MB/month at steady state |
| Sandbox security | Phase 1: Core Pipeline | Generated code runs in isolated context; no filesystem/network access |

---

## Sources

**Official Documentation (HIGH confidence):**
- [Remotion Lambda Limits](https://www.remotion.dev/docs/lambda/limits)
- [Remotion Lambda Cost Optimization](https://www.remotion.dev/docs/lambda/optimizing-cost)
- [Remotion Performance Tips](https://www.remotion.dev/docs/performance)
- [Remotion Player Flickering](https://www.remotion.dev/docs/troubleshooting/player-flicker)
- [Remotion Player Best Practices](https://www.remotion.dev/docs/player/best-practices)
- [Claude API Rate Limits](https://docs.anthropic.com/en/api/rate-limits)
- [Clerk Production Deployment](https://clerk.com/docs/guides/development/deployment/production)

**Research and Analysis (MEDIUM confidence):**
- [Endor Labs: Security Vulnerabilities in AI-Generated Code](https://www.endorlabs.com/learn/the-most-common-security-vulnerabilities-in-ai-generated-code)
- [NVIDIA: Code Execution Risks in Agentic AI](https://developer.nvidia.com/blog/how-code-execution-drives-key-risks-in-agentic-ai-systems/)
- [NN/g: AI Image Generation UX Stages](https://www.nngroup.com/articles/ai-imagegen-stages/)
- [Convex Bandwidth/Scaling Issue #95](https://github.com/get-convex/convex-backend/issues/95)
- [Addy Osmani: LLM Coding Workflow 2026](https://addyosmani.com/blog/ai-coding-workflow/)

**Community Reports (LOW-MEDIUM confidence):**
- [The Register: Claude Usage Limits (Jan 2026)](https://www.theregister.com/2026/01/05/claude_devs_usage_limits/)
- [VentureBeat: Anthropic Rate Limit Changes](https://venturebeat.com/ai/anthropic-throttles-claude-rate-limits-devs-call-foul/)
- [Frank and Marci: Midjourney Frustrations](https://www.frankandmarci.com/blog/why-midjourney-is-way-more-frustrating-than-you-expect/)

---
*Pitfalls research for: AI-powered prompt-to-video platform*
*Researched: 2026-01-27*
