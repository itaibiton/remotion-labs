# Stack Research: AI-Powered Video Creation Platform

**Domain:** AI-powered animated video creation ("Midjourney for animations")
**Researched:** 2026-01-27
**Confidence:** HIGH (core stack verified via official docs)

---

## Executive Summary

This stack builds a web application where users create animated videos through text prompts, powered by Claude's code generation and Remotion's programmatic video rendering. The architecture combines:

- **Next.js 16** as the React framework (App Router)
- **Clerk** for authentication (already decided)
- **Convex** for real-time backend/database (already decided)
- **Remotion** for video rendering (already decided)
- **Claude API** for JSX code generation (already decided)
- **Remotion Lambda** for serverless video rendering at scale

The stack prioritizes developer velocity, real-time updates, and seamless integration between components.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Next.js | 16.x | React framework, routing, SSR | Latest stable with React 19.2, App Router mature, Turbopack stable. Required for Clerk/Convex patterns. Security patches for CVE-2025-29927 included. | HIGH |
| React | 19.2 | UI library | Ships with Next.js 16, required for Remotion 4.x compatibility. React Compiler now stable for automatic memoization. | HIGH |
| TypeScript | 5.5+ | Type safety | Required by Convex, benefits Claude code generation (LSP integration improves output quality). | HIGH |

**Source:** [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)

### Authentication (Pre-decided: Clerk)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| @clerk/nextjs | latest | Authentication, user management | First-class Next.js App Router support, pre-built UI components, 10K MAU free tier sufficient for MVP. SOC 2 Type II compliant. | HIGH |

**Integration Notes:**
- Use `clerkMiddleware()` in `middleware.ts` (Next.js 16 compatible)
- Free tier: 10,000 monthly active users
- JWT template needed for Convex integration (name it "convex")

**Source:** [Clerk Next.js Quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart)

### Backend/Database (Pre-decided: Convex)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| convex | latest | Real-time database, server functions | TypeScript-first, automatic real-time sync, no WebSocket boilerplate. Queries react to database changes automatically. | HIGH |

**Integration Notes:**
- Use `<ConvexProviderWithClerk>` wrapper (not separate providers)
- Use `useConvexAuth()` hook (not Clerk's `useAuth()`) for checking auth state
- Create `convex/auth.config.ts` with Clerk JWT issuer domain
- Webhooks for syncing Clerk users to Convex database

**Source:** [Convex + Clerk Integration](https://docs.convex.dev/auth/clerk)

### Video Rendering (Pre-decided: Remotion)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| remotion | 4.0.x | Programmatic video creation | React-based video composition, supports React 19. Latest: 4.0.407. | HIGH |
| @remotion/player | 4.0.x | In-browser video preview | Embed video previews without rendering, real-time prop updates. | HIGH |
| @remotion/lambda | 4.0.x | Serverless video rendering | Distributed rendering across Lambda functions, fastest option. Pay only while rendering. | HIGH |
| @remotion/cli | 4.0.x | Local development, rendering | Preview and test videos locally. | HIGH |

**Lambda Constraints to Know:**
- Max 10GB storage per function (output ~5GB max)
- Video length: ~2 hours Full HD max, ~80 min practical limit
- 1000 concurrent Lambdas per region (default, can increase)
- 15-minute timeout per function
- No GPU support (CPU rendering only)

**Remotion Lambda vs Alternatives:**

| Option | Speed | Setup | Best For |
|--------|-------|-------|----------|
| **Remotion Lambda** | Fastest (distributed) | Quick | MVP, production - START HERE |
| Cloud Run | Single machine | Quick | If Lambda constraints block you |
| Node.js Server | Single machine | Complex | High volume, cost optimization later |

**Recommendation:** Start with Lambda. It's the quickest path to production and handles most use cases. Reassess only if you hit constraints.

**Source:** [Remotion Lambda](https://www.remotion.dev/docs/lambda), [SSR Comparison](https://www.remotion.dev/docs/compare-ssr)

### AI Code Generation (Pre-decided: Claude API)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| @anthropic-ai/sdk | latest | Claude API client | Official TypeScript SDK, streaming support. | HIGH |

**Model Selection:**

| Use Case | Model | Pricing | Notes |
|----------|-------|---------|-------|
| **Production code gen** | claude-sonnet-4-5 | $3/$15 per MTok | Best balance of quality/cost for Remotion JSX |
| Complex architecture | claude-opus-4-5 | $15/$75 per MTok | Use sparingly for complex compositions |
| Quick iterations | claude-3-5-haiku | $0.25/$1.25 per MTok | Fast, cheap for simple edits |

**Best Practices for Code Generation:**
1. Use `temperature: 0.2` for deterministic code output
2. Enable streaming for responsive UI during generation
3. Use system prompts with Remotion component examples
4. Consider extended thinking for complex compositions:
   ```json
   { "thinking": { "type": "enabled", "budget_tokens": 2048 } }
   ```
5. Use multi-turn conversations for iterative refinement

**Source:** [Claude API Messages](https://platform.claude.com/docs/en/api/messages), [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)

### UI Framework

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Tailwind CSS | 4.x | Utility-first CSS | No config file needed in v4, CSS-native theme variables, works seamlessly with Remotion. | HIGH |
| shadcn/ui | latest | Component library | Copy-paste components, full customization, Radix primitives for accessibility. Uses tw-animate-css (not tailwindcss-animate). | HIGH |
| motion (Framer Motion) | 12.x | React animations | For UI animations (not video). React 19 compatible. MIT licensed. | HIGH |

**Source:** [Tailwind v4 + shadcn](https://ui.shadcn.com/docs/tailwind-v4)

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| zod | 4.x | Schema validation | Validate user prompts, API responses, Remotion props. 14x faster parsing in v4. | HIGH |
| @upstash/ratelimit | latest | API rate limiting | Protect Claude API from abuse, per-user limits. Serverless Redis. | MEDIUM |
| @upstash/redis | latest | Redis client | Required for rate limiting, optional caching. | MEDIUM |
| @tanstack/react-query | 5.90.x | Data fetching/caching | For non-Convex API calls (Claude API, Remotion status). Convex handles its own reactivity. | MEDIUM |
| @monaco-editor/react | latest | Code editor | If adding "view/edit source" feature for generated code. | LOW |
| monaco-jsx-highlighter | latest | JSX syntax highlighting | Extends Monaco for JSX. Requires @babel/parser and @babel/traverse. | LOW |

---

## Architecture Integration

### How Components Fit Together

```
User Request Flow:

[User types prompt]
       ↓
[Next.js API Route / Convex Action]
       ↓
[Claude API] → Generates Remotion JSX
       ↓
[Validate with Zod] → Store in Convex
       ↓
[Remotion Player] → Preview in browser
       ↓
[User clicks "Render"]
       ↓
[Remotion Lambda] → Render to MP4
       ↓
[Store URL in Convex] → User downloads/shares
```

### Provider Hierarchy (Next.js App Router)

```tsx
// app/providers.tsx (Client Component)
"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

### Convex Auth Configuration

```typescript
// convex/auth.config.ts
import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
```

---

## Installation

```bash
# Create Next.js project with Tailwind
npx create-next-app@latest my-video-app --ts --tailwind --eslint --app

# Core dependencies
npm install @clerk/nextjs convex remotion @remotion/player @remotion/cli @remotion/lambda

# Claude API
npm install @anthropic-ai/sdk

# UI components
npx shadcn@latest init
npm install motion zod

# Rate limiting (recommended)
npm install @upstash/ratelimit @upstash/redis

# Optional: data fetching for non-Convex APIs
npm install @tanstack/react-query

# Dev dependencies
npm install -D @remotion/eslint-config
```

### Remotion Setup

```bash
# Initialize Remotion in existing project
npx remotion init --skip-git

# Deploy Lambda function (after AWS credentials configured)
npx remotion lambda deploy
```

---

## Environment Variables

```bash
# .env.local

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOY_KEY=...

# Clerk JWT for Convex (set in Convex dashboard too)
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev

# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Remotion Lambda (AWS)
REMOTION_AWS_ACCESS_KEY_ID=...
REMOTION_AWS_SECRET_ACCESS_KEY=...
REMOTION_AWS_REGION=us-east-1

# Upstash (optional, for rate limiting)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## Alternatives Considered

| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| Framework | Next.js 16 | Remix, Vite + React Router | If you need more control over data loading patterns |
| Auth | Clerk | NextAuth.js | If you need fully self-hosted auth, or Clerk pricing is prohibitive at scale |
| Database | Convex | Supabase, PlanetScale + Prisma | If you need SQL queries, more complex data modeling |
| Video Rendering | Remotion Lambda | Cloud Run, self-hosted | If Lambda constraints (size, GPU) block you |
| AI Model | Claude Sonnet 4.5 | GPT-4, Gemini | If Claude output quality is insufficient (unlikely for code gen) |
| UI | shadcn/ui | Radix Themes, Chakra UI | If you prefer pre-styled components |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| tailwindcss-animate | Deprecated by shadcn/ui as of 2025 | tw-animate-css |
| Clerk's `<SignedIn>` components with Convex | Auth state may not reflect Convex token validation | Convex's `<Authenticated>` components |
| useAuth() from Clerk for auth checks | Doesn't verify Convex backend token validation | useConvexAuth() from Convex |
| Next.js 14.x or lower | CVE-2025-29927 vulnerability, missing React 19 features | Next.js 15.2.3+ or 16.x |
| React Query for Convex data | Convex has built-in reactivity, React Query adds unnecessary complexity | Convex's useQuery/useMutation |
| Remotion Cloud Run | Alpha status, not actively developed, lacks distributed rendering | Remotion Lambda |
| Express/Fastify server for rendering | Complex to set up correctly, Lambda handles queueing/scaling | Remotion Lambda |

---

## Version Compatibility Matrix

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| remotion@4.0.x | React 19, Next.js 16 | Verified |
| @clerk/nextjs | Next.js 15+, 16 | Middleware pattern works with both |
| convex | Next.js 15+, React 19 | ConvexProviderWithClerk tested |
| motion@12.x | React 19 | Renamed from framer-motion |
| @tanstack/react-query@5.x | React 18+ | useSyncExternalStore requirement |
| zod@4.x | TypeScript 5.5+ | Strict mode required |
| Tailwind CSS 4.x | shadcn/ui latest | Use tw-animate-css |

---

## Stack Patterns by Use Case

### If building MVP (validate concept):
- Use Remotion Lambda with minimal configuration
- Skip rate limiting initially (add when you see abuse)
- Use Claude Sonnet 4.5 for all generation (simpler)
- Skip Monaco editor (defer code editing feature)

### If building for scale (post-validation):
- Add Upstash rate limiting per user
- Consider model routing (Haiku for simple, Sonnet for complex)
- Add SQS queue for Lambda renders (handle traffic spikes)
- Monitor Lambda costs, consider Cloud Run if >$500/month

### If GPU rendering needed:
- Remotion Lambda won't work (no GPU)
- Consider Cloud Run with GPU (untested by Remotion team)
- Or self-hosted rendering on GPU instances
- This is an edge case - most Remotion videos don't need GPU

---

## Cost Estimates (MVP Phase)

| Service | Free Tier | Estimated MVP Cost |
|---------|-----------|-------------------|
| Clerk | 10K MAU | $0 (MVP) |
| Convex | Generous free tier | $0 (MVP) |
| Claude API | Pay per token | ~$10-50/month (depends on usage) |
| Remotion Lambda | Pay per render | ~$5-20/month (pennies per video) |
| Vercel (hosting) | Hobby tier | $0-20/month |
| Upstash Redis | 10K requests/day | $0 (free tier) |

**Total MVP estimate: $15-100/month** (excluding domain)

---

## Sources

### Official Documentation (HIGH confidence)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Clerk Next.js Quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart)
- [Convex + Clerk Integration](https://docs.convex.dev/auth/clerk)
- [Remotion Lambda](https://www.remotion.dev/docs/lambda)
- [Remotion Player](https://www.remotion.dev/docs/player/player)
- [Remotion SSR Comparison](https://www.remotion.dev/docs/compare-ssr)
- [Claude API Messages](https://platform.claude.com/docs/en/api/messages)
- [shadcn/ui Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)
- [Zod v4](https://zod.dev/)

### Verified via WebSearch (MEDIUM confidence)
- [Upstash Rate Limiting](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)
- [TanStack Query v5](https://tanstack.com/query/latest)
- [Motion (Framer Motion) v12](https://motion.dev/)
- [Monaco Editor React](https://github.com/react-monaco-editor/react-monaco-editor)

### Community Patterns (verified with official docs)
- [Clerk + Convex Best Practices](https://stack.convex.dev/authentication-best-practices-convex-clerk-and-nextjs)
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Remotion Skills (Claude integration)](https://gaga.art/blog/remotion-skills/)

---

*Stack research for: AI-powered video creation platform*
*Researched: 2026-01-27*
*Overall confidence: HIGH (core components verified via official documentation)*
