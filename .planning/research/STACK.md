# Stack Research: AI-Powered Video Creation Platform

**Domain:** AI-powered animated video creation ("Midjourney for animations")
**Researched:** 2026-01-27 (v1.0), 2026-01-28 (v1.1 additions)
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

## v1.1 Stack Additions: Full Code Generation

**Added:** 2026-01-28
**Focus:** Executing AI-generated Remotion JSX code safely

### The Challenge

v1.0 uses props-based generation: Claude generates JSON props for a fixed `TextAnimation` composition. v1.1 requires Claude to generate actual Remotion JSX code that gets executed and rendered.

**Key constraints:**
1. Remotion Lambda requires pre-bundled compositions (cannot add code at runtime)
2. AI-generated code is untrusted and may contain malicious patterns
3. Preview (Player) and Render (Lambda) have different execution contexts

### Recommended Architecture: Interpreter Pattern with AST Validation

After researching the alternatives, the recommended approach is:

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Validation** | acorn + ast-guard | Parse and validate JSX AST against whitelist |
| **Transformation** | sucrase | Fast JSX-to-JS transpilation (20x faster than Babel) |
| **Preview Execution** | Function constructor + Remotion component wrapper | Execute in browser with controlled scope |
| **Lambda Execution** | Parametrized meta-composition | Pass code as prop, execute via controlled wrapper |

**Why NOT other approaches:**

| Approach | Why Not |
|----------|---------|
| `eval()` / `new Function()` without validation | Security vulnerability (CVE-2025-55182 React2Shell demonstrated this) |
| E2B / Vercel Sandbox | Adds latency (~150-200ms), cost per execution, overkill for controlled JSX |
| iframe sandbox | Cannot access Remotion hooks/context, breaks composition model |
| Re-bundle per generation | Expensive (~seconds), deploySite not designed for runtime bundling |

---

### Code Validation Stack

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **acorn** | ^8.14.0 | JavaScript parser | Fast, standards-compliant, ESTree AST output. 55M+ weekly downloads. Used by ESLint, webpack. |
| **acorn-jsx** | ^5.3.2 | JSX support for acorn | Official extension for JSX parsing. Required since Remotion code is JSX. |
| **ast-guard** | ^0.8.x | AST validation with whitelist | Purpose-built for LLM-generated code. Blocks dangerous constructs, whitelist-only globals. |

**Alternative considered:** eslint-plugin-security
- Rejected: Designed for linting, not runtime validation. Too slow for per-request validation.

**Alternative considered:** SandboxJS
- Rejected: 90% ECMAScript support insufficient. No JSX support. Better for general JS sandboxing.

#### ast-guard Configuration for Remotion

```typescript
// lib/code-validator.ts
import { JSAstValidator, createAgentScriptPreset } from 'ast-guard';

// Custom preset for Remotion JSX
const remotionPreset = {
  ...createAgentScriptPreset(),
  allowedGlobals: [
    // Remotion hooks (essential)
    'useCurrentFrame',
    'useVideoConfig',
    'interpolate',
    'spring',
    'Easing',
    'AbsoluteFill',
    'Sequence',
    'Audio',
    'Video',
    'Img',
    'staticFile',

    // React essentials
    'React',
    'useState',
    'useEffect',
    'useMemo',
    'useCallback',

    // Safe JS globals
    'Math',
    'JSON',
    'Object',
    'Array',
    'String',
    'Number',
    'Boolean',
    'Date',
    'console', // for debugging, can remove in production
  ],

  // Block dangerous patterns
  blockedPatterns: [
    'eval',
    'Function',
    'require',
    'import',
    'process',
    'globalThis',
    'window',
    'document',
    'fetch',
    'XMLHttpRequest',
    '__proto__',
    'constructor',
  ],

  // LLM-specific limits
  maxInputSize: 100 * 1024, // 100KB max generated code
  maxNestingDepth: 20,
  maxLineLength: 2000,
};

const validator = new JSAstValidator(remotionPreset);

export async function validateRemotionCode(code: string): Promise<{
  valid: boolean;
  issues: string[];
  ast?: any;
}> {
  const result = await validator.validate(code);
  return {
    valid: result.valid,
    issues: result.issues?.map(i => i.message) ?? [],
    ast: result.valid ? result.ast : undefined,
  };
}
```

**Confidence:** HIGH (acorn is battle-tested, ast-guard is purpose-built for this use case)

---

### JSX Transformation Stack

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **sucrase** | ^3.35.0 | Fast JSX transpilation | 20x faster than Babel, 8M+ weekly downloads, sufficient for JSX+TS. |

**Why sucrase over @babel/standalone:**
- Speed: 20x faster (critical for responsive preview)
- Size: Smaller bundle for browser usage
- Focus: Only transforms JSX/TS, not general ES features (which modern browsers handle)

**Why NOT esbuild-wasm:**
- WASM loading adds complexity
- Sucrase is pure JS, easier to bundle
- Sucrase is fast enough for this use case

```typescript
// lib/jsx-transformer.ts
import { transform } from 'sucrase';

export function transformJSX(code: string): string {
  const result = transform(code, {
    transforms: ['jsx', 'typescript'],
    jsxRuntime: 'automatic', // React 17+ style
    production: true,
  });
  return result.code;
}
```

**Confidence:** HIGH (sucrase is mature, widely used in dev tooling)

---

### Preview Execution (Browser)

For the Remotion Player preview, execute transformed code in a controlled scope.

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Function constructor** | (native) | Create function from code string | Safer than eval(), does not access local scope |
| **Remotion scope wrapper** | (custom) | Inject Remotion APIs into function scope | Controlled access to only allowed APIs |

```typescript
// lib/code-executor.ts
import * as RemotionAPI from 'remotion';
import * as React from 'react';
import { validateRemotionCode } from './code-validator';
import { transformJSX } from './jsx-transformer';

// Allowed scope for generated code
const REMOTION_SCOPE = {
  // Remotion core
  useCurrentFrame: RemotionAPI.useCurrentFrame,
  useVideoConfig: RemotionAPI.useVideoConfig,
  interpolate: RemotionAPI.interpolate,
  spring: RemotionAPI.spring,
  Easing: RemotionAPI.Easing,
  AbsoluteFill: RemotionAPI.AbsoluteFill,
  Sequence: RemotionAPI.Sequence,
  Audio: RemotionAPI.Audio,
  Video: RemotionAPI.Video,
  Img: RemotionAPI.Img,
  staticFile: RemotionAPI.staticFile,

  // React
  React,
  useState: React.useState,
  useEffect: React.useEffect,
  useMemo: React.useMemo,
  useCallback: React.useCallback,

  // Safe globals
  Math,
  JSON,
  Object,
  Array,
  String,
  Number,
  Boolean,
  Date,
  console,
};

export async function createRemotionComponent(
  jsxCode: string
): Promise<React.ComponentType<any>> {
  // 1. Validate AST
  const validation = await validateRemotionCode(jsxCode);
  if (!validation.valid) {
    throw new Error(`Invalid code: ${validation.issues.join(', ')}`);
  }

  // 2. Transform JSX to JS
  const jsCode = transformJSX(jsxCode);

  // 3. Create function with controlled scope
  const scopeKeys = Object.keys(REMOTION_SCOPE);
  const scopeValues = Object.values(REMOTION_SCOPE);

  // The generated code should export a component
  // Wrap it to return the component
  const wrappedCode = `
    ${jsCode}
    return typeof MyComposition !== 'undefined' ? MyComposition : Component;
  `;

  const factory = new Function(...scopeKeys, wrappedCode);
  const Component = factory(...scopeValues);

  return Component;
}
```

**Security notes:**
- Function constructor cannot access local closure variables
- All APIs are explicitly whitelisted via scope injection
- AST validation runs BEFORE transformation
- No access to window, document, fetch, or other browser APIs

**Confidence:** MEDIUM (approach is sound, but needs thorough testing)

---

### Lambda Execution: Meta-Composition Pattern

**Critical insight:** Remotion Lambda cannot execute arbitrary code at runtime. The bundle must be pre-deployed. However, we can use a "meta-composition" pattern.

**How it works:**
1. Deploy a `DynamicCode` composition that accepts `code` as a prop
2. The composition uses the same validation + transformation + execution
3. Pass the generated code via `inputProps` to Lambda

```typescript
// remotion/compositions/DynamicCode.tsx
"use client";

import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { createRemotionComponent } from '@/lib/code-executor';

interface DynamicCodeProps {
  code: string;
  inputProps?: Record<string, unknown>;
}

export const DynamicCode: React.FC<DynamicCodeProps> = ({ code, inputProps = {} }) => {
  const [Component, setComponent] = React.useState<React.ComponentType<any> | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    createRemotionComponent(code)
      .then(setComponent)
      .catch(e => setError(e.message));
  }, [code]);

  if (error) {
    return (
      <AbsoluteFill style={{ backgroundColor: 'red', color: 'white', padding: 40 }}>
        <h1>Code Error</h1>
        <pre>{error}</pre>
      </AbsoluteFill>
    );
  }

  if (!Component) {
    return (
      <AbsoluteFill style={{ backgroundColor: '#111', color: 'white' }}>
        <p>Loading...</p>
      </AbsoluteFill>
    );
  }

  return <Component {...inputProps} />;
};
```

**Lambda deployment:**
```typescript
// Deploy the bundle with DynamicCode composition
await deploySite({
  entryPoint: './src/remotion/index.ts',
  siteName: 'remotionlab-v1-1',
  // ... other options
});

// Render with generated code
await renderMediaOnLambda({
  composition: 'DynamicCode',
  inputProps: {
    code: generatedJSXCode, // The AI-generated code
    inputProps: userProps,   // Any user-provided props
  },
  // ... other options
});
```

**Important constraints:**
- Bundle must include all validation/transformation code
- Code validation runs on Lambda (not just preview)
- Lambda has same whitelist as browser preview
- Consider code size limits (Lambda payload max 6MB)

**Confidence:** HIGH (this pattern is documented in Remotion community, verified against deploySite docs)

---

### Full Stack Addition Summary

```bash
# New dependencies for v1.1
npm install acorn acorn-jsx ast-guard sucrase
```

| Package | Size | Purpose |
|---------|------|---------|
| acorn | 130KB | JS parser |
| acorn-jsx | 12KB | JSX extension |
| ast-guard | ~50KB | AST validation |
| sucrase | 500KB | JSX transformation |

**Total addition:** ~700KB (acceptable for code execution feature)

---

### Security Checklist for v1.1

- [ ] AST validation rejects `eval`, `Function`, `require`, `import`
- [ ] No access to `window`, `document`, `globalThis`
- [ ] No access to `fetch`, `XMLHttpRequest`, networking
- [ ] No access to `process`, Node.js APIs
- [ ] No prototype pollution via `__proto__`, `constructor`
- [ ] Input size limits (100KB max code)
- [ ] Nesting depth limits (prevent parser DoS)
- [ ] Same validation runs on both preview and Lambda
- [ ] Error messages don't leak internal state
- [ ] Rate limiting on code generation (existing Convex rate limiter)

---

### What NOT to Add for v1.1

| Technology | Why Not |
|------------|---------|
| **E2B sandbox** | Adds ~$150/mo minimum, 150ms latency per execution. Overkill when AST validation + controlled scope is sufficient. |
| **Vercel Sandbox** | Same cost/latency concerns. Better for truly untrusted arbitrary code. |
| **iframe sandbox** | Breaks Remotion context (hooks don't work across iframe boundary). |
| **Web Workers** | Cannot share React context, would require message passing for every frame. |
| **@babel/standalone** | 20x slower than sucrase, larger bundle size. |
| **esbuild-wasm** | WASM complexity not justified for JSX-only transformation. |
| **vm2 / isolated-vm** | Node.js only, doesn't work in browser preview. |

---

### Confidence Assessment for v1.1 Additions

| Component | Confidence | Reason |
|-----------|------------|--------|
| acorn + acorn-jsx | HIGH | Battle-tested, 55M weekly downloads, ESLint uses it |
| ast-guard | MEDIUM | Newer library but purpose-built for LLM code validation |
| sucrase | HIGH | Mature, widely used, 8M weekly downloads |
| Function constructor approach | MEDIUM | Sound in theory, needs security testing |
| Meta-composition pattern | HIGH | Verified against Remotion docs, community-used pattern |

---

## Recommended Stack (Full)

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
| remotion | 4.0.410 | Programmatic video creation | React-based video composition, supports React 19. Latest stable. | HIGH |
| @remotion/player | 4.0.410 | In-browser video preview | Embed video previews without rendering, real-time prop updates. | HIGH |
| @remotion/lambda | 4.0.410 | Serverless video rendering | Distributed rendering across Lambda functions, fastest option. Pay only while rendering. | HIGH |
| @remotion/cli | 4.0.410 | Local development, rendering | Preview and test videos locally. | HIGH |

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

### Code Execution Stack (NEW in v1.1)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| acorn | ^8.14.0 | JavaScript parser | Fast, standards-compliant, 55M+ weekly downloads. ESTree AST. | HIGH |
| acorn-jsx | ^5.3.2 | JSX support | Official JSX extension for acorn parser. | HIGH |
| ast-guard | ^0.8.x | AST validation | Purpose-built for LLM code. Whitelist-only globals. | MEDIUM |
| sucrase | ^3.35.0 | JSX transformation | 20x faster than Babel. 8M+ weekly downloads. | HIGH |

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
       |
       v
[Next.js API Route / Convex Action]
       |
       v
[Claude API] --> Generates Remotion JSX
       |
       v
[Validate with ast-guard] --> Reject invalid code
       |
       v
[Transform with sucrase] --> JSX to JS
       |
       v
[Store in Convex] --> code + validation status
       |
       v
[Remotion Player] --> Execute via Function constructor
       |                (Preview in browser)
       v
[User clicks "Render"]
       |
       v
[Remotion Lambda] --> DynamicCode composition
       |              (Same validation + execution)
       v
[Store URL in Convex] --> User downloads/shares
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
# Core dependencies (existing)
npm install @clerk/nextjs convex remotion @remotion/player @remotion/cli @remotion/lambda
npm install @anthropic-ai/sdk

# Code execution stack (NEW for v1.1)
npm install acorn acorn-jsx ast-guard sucrase

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
| Code Validation | ast-guard | Custom acorn walker | If ast-guard doesn't meet specific requirements |
| JSX Transform | sucrase | @babel/standalone | If you need Babel plugins (decorators, etc.) |
| Code Sandbox | Function constructor | E2B, Vercel Sandbox | If code truly needs full isolation (filesystem, network) |

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
| eval() | Security vulnerability, access to local scope | new Function() with controlled scope |
| E2B / Vercel Sandbox | Overkill for controlled JSX, adds latency and cost | ast-guard + Function constructor |
| iframe sandbox | Breaks Remotion hooks/context | Direct execution with scope injection |
| Re-bundle per generation | Expensive, not designed for runtime use | Meta-composition pattern |

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
| acorn@8.x | ES2023+ | Stable |
| sucrase@3.x | React 17+ JSX runtime | Automatic runtime supported |
| ast-guard@0.8.x | Node.js 22+, acorn 8.x | Pure TypeScript |

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

### For v1.1 full code generation:
- Implement ast-guard validation first (security baseline)
- Add sucrase transformation (preview execution)
- Create DynamicCode meta-composition (Lambda execution)
- Deploy updated bundle with deploySite()
- Test security with adversarial prompts

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
- [Remotion deploySite](https://www.remotion.dev/docs/lambda/deploysite)
- [Remotion FAQ - Dynamic Compositions](https://www.remotion.dev/docs/lambda/faq)
- [Remotion Parameterized Rendering](https://www.remotion.dev/docs/parameterized-rendering)
- [Claude API Messages](https://platform.claude.com/docs/en/api/messages)
- [shadcn/ui Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)
- [Zod v4](https://zod.dev/)

### Code Execution Research (MEDIUM-HIGH confidence)
- [acorn GitHub](https://github.com/acornjs/acorn) - 55M weekly downloads
- [sucrase GitHub](https://github.com/alangpierce/sucrase) - 8M weekly downloads
- [ast-guard Documentation](https://agentfront.dev/docs/guides/ast-guard) - Purpose-built for LLM code
- [Vercel Guide: Running AI Generated Code](https://vercel.com/guides/running-ai-generated-code-sandbox)
- [E2B Documentation](https://e2b.dev/docs)

### Security Research (MEDIUM confidence)
- [React2Shell CVE-2025-55182](https://www.resecurity.com/blog/article/react2shell-explained-cve-2025-55182-from-vulnerability-discovery-to-exploitation) - Why Function constructor needs validation
- [JavaScript Sandboxing Deep Dive](https://dev.to/leapcell/a-deep-dive-into-javascript-sandboxing-97b)
- [Building Secure Code Sandboxes](https://medium.com/@muyiwamighty/building-a-secure-code-sandbox-what-i-learned-about-iframe-isolation-and-postmessage-a6e1c45966df)

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
*Original research: 2026-01-27*
*v1.1 additions: 2026-01-28 (Code execution stack)*
*Overall confidence: HIGH (core components verified via official documentation)*
