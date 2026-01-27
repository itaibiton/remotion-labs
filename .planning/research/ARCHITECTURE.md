# Architecture Research

**Domain:** AI-Powered Video Creation Platform (Prompt-to-Animation)
**Researched:** 2026-01-27
**Confidence:** HIGH (verified via official Remotion, Convex, and Clerk documentation)

## System Overview

```
+-----------------------------------------------------------------------------------+
|                              CLIENT LAYER (Next.js)                               |
+-----------------------------------------------------------------------------------+
|  +-------------+  +----------------+  +---------------+  +-------------------+    |
|  | Auth UI     |  | Prompt Editor  |  | Video Player  |  | Visual Editor     |    |
|  | (Clerk)     |  | + Chat         |  | (Remotion)    |  | (Future Phase)    |    |
|  +------+------+  +-------+--------+  +-------+-------+  +---------+---------+    |
|         |                 |                   |                    |              |
+---------|-----------------|-------------------|--------------------|--------------+
          |                 |                   |                    |
          v                 v                   v                    v
+-----------------------------------------------------------------------------------+
|                           BACKEND LAYER (Convex)                                  |
+-----------------------------------------------------------------------------------+
|  +-------------+  +----------------+  +---------------+  +-------------------+    |
|  | Auth Sync   |  | Generation     |  | Project       |  | Asset             |    |
|  | (Webhooks)  |  | Jobs           |  | Storage       |  | Storage           |    |
|  +------+------+  +-------+--------+  +-------+-------+  +---------+---------+    |
|         |                 |                   |                    |              |
|         |        +--------v--------+         |                    |              |
|         |        | Scheduled       |         |                    |              |
|         |        | Actions         |         |                    |              |
|         |        +--------+--------+         |                    |              |
|         |                 |                   |                    |              |
+---------|-----------------|-------------------|--------------------|--------------+
          |                 |                   |                    |
          v                 v                   v                    v
+-----------------------------------------------------------------------------------+
|                          EXTERNAL SERVICES                                        |
+-----------------------------------------------------------------------------------+
|  +-------------+  +----------------+  +---------------+  +-------------------+    |
|  | Clerk       |  | Claude API     |  | Remotion      |  | S3 (via Lambda)   |    |
|  | (Identity)  |  | (Code Gen)     |  | Lambda        |  | (Video Storage)   |    |
|  +-------------+  +----------------+  +---------------+  +-------------------+    |
+-----------------------------------------------------------------------------------+
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Auth UI | User sign-in/sign-up, session management | Clerk components (`<SignIn>`, `<UserButton>`) |
| Prompt Editor | User input collection, chat interface | React components with `useMutation` to Convex |
| Video Player | Real-time preview of generated videos | Remotion `<Player>` with `inputProps` |
| Visual Editor | Direct manipulation of video elements | Future: Custom UI modifying Remotion props |
| Auth Sync | Mirror Clerk users to Convex database | Clerk webhooks to Convex HTTP endpoint |
| Generation Jobs | Track AI generation status, manage workflow | Convex table with union-typed status fields |
| Project Storage | Store generated code, version history | Convex documents with code as text field |
| Asset Storage | User uploads (images, audio) | Convex File Storage API |
| Claude API | Generate Remotion code from prompts | Convex action calling Anthropic API |
| Remotion Lambda | Render final MP4 videos | AWS Lambda with S3 output |

## Recommended Project Structure

```
remotionlab/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (sign-in, sign-up)
│   ├── (dashboard)/              # Authenticated routes
│   │   ├── projects/             # Project list, creation
│   │   ├── editor/[id]/          # Project editor view
│   │   └── render/[id]/          # Render status/download
│   ├── api/                      # API routes (if needed for webhooks)
│   └── layout.tsx                # Root layout with providers
├── components/                   # React components
│   ├── ui/                       # Shadcn/UI components
│   ├── editor/                   # Editor-specific components
│   │   ├── PromptInput.tsx
│   │   ├── ChatHistory.tsx
│   │   └── VideoPreview.tsx
│   ├── player/                   # Remotion Player wrappers
│   │   └── PreviewPlayer.tsx     # Memoized Player with inputProps
│   └── providers/                # Context providers
│       └── ConvexClerkProvider.tsx
├── convex/                       # Convex backend
│   ├── schema.ts                 # Database schema
│   ├── auth.ts                   # Auth helpers, user identity
│   ├── projects.ts               # Project CRUD mutations/queries
│   ├── generations.ts            # AI generation job management
│   ├── renders.ts                # Lambda render job management
│   ├── assets.ts                 # File upload/management
│   ├── _actions/                 # External API actions
│   │   ├── claude.ts             # Claude API integration
│   │   └── remotion.ts           # Remotion Lambda integration
│   └── http.ts                   # HTTP endpoints (webhooks)
├── remotion/                     # Remotion compositions
│   ├── Root.tsx                  # Composition registry
│   ├── compositions/             # Video compositions
│   │   └── DynamicVideo.tsx      # Main composition accepting code/props
│   ├── components/               # Reusable video components
│   │   ├── TextSlide.tsx
│   │   ├── ImageSequence.tsx
│   │   └── Transitions.tsx
│   └── utils/                    # Remotion utilities
│       └── interpolations.ts
├── lib/                          # Shared utilities
│   ├── remotion-lambda.ts        # Lambda client configuration
│   └── code-executor.ts          # Safe code evaluation (if needed)
└── public/                       # Static assets
```

### Structure Rationale

- **`app/`:** Next.js 14+ App Router for server components, layouts, and route organization
- **`convex/`:** Co-located backend code for real-time database, actions, and HTTP handlers
- **`remotion/`:** Separated Remotion code to bundle independently for Lambda deployment
- **`components/editor/`:** Editor-specific components isolated from generic UI
- **`convex/_actions/`:** Actions calling external APIs (Claude, Lambda) separated for clarity

## Architectural Patterns

### Pattern 1: Mutation-First Job Scheduling

**What:** User intent captured in mutation, external work scheduled via action
**When to use:** Any operation involving Claude API or Remotion Lambda
**Trade-offs:** More complex than direct action calls, but provides transactional guarantees and UI reactivity

**Example:**
```typescript
// convex/generations.ts
export const startGeneration = mutation({
  args: { projectId: v.id("projects"), prompt: v.string() },
  handler: async (ctx, { projectId, prompt }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Create job record (UI immediately shows "generating")
    const jobId = await ctx.db.insert("generations", {
      projectId,
      prompt,
      status: { type: "pending" },
      createdAt: Date.now(),
      userId: identity.subject,
    });

    // Schedule the actual work
    await ctx.scheduler.runAfter(0, internal.actions.claude.generateCode, {
      jobId,
      prompt,
    });

    return jobId;
  },
});
```

### Pattern 2: Union-Typed Job Status

**What:** Single document with discriminated union for job states
**When to use:** Any async job (AI generation, video render)
**Trade-offs:** More complex schema, but enables type-safe status handling and real-time UI updates

**Example:**
```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  generations: defineTable({
    projectId: v.id("projects"),
    prompt: v.string(),
    userId: v.string(),
    createdAt: v.number(),
    status: v.union(
      v.object({ type: v.literal("pending") }),
      v.object({ type: v.literal("generating"), progress: v.optional(v.string()) }),
      v.object({ type: v.literal("completed"), code: v.string(), elapsedMs: v.number() }),
      v.object({ type: v.literal("failed"), error: v.string(), elapsedMs: v.number() })
    ),
  }).index("by_project", ["projectId"]),
});
```

### Pattern 3: Memoized Player InputProps

**What:** Wrap Remotion Player inputProps in useMemo to prevent unnecessary re-renders
**When to use:** Any use of Remotion Player with dynamic data
**Trade-offs:** Slightly more code, but critical for performance

**Example:**
```tsx
// components/player/PreviewPlayer.tsx
import { Player } from "@remotion/player";
import { useMemo, useCallback } from "react";

export function PreviewPlayer({ code, props }: { code: string; props: Record<string, unknown> }) {
  // Memoize inputProps to prevent re-render cascade
  const inputProps = useMemo(() => ({
    generatedCode: code,
    ...props,
  }), [code, props]);

  // If using lazyComponent, wrap in useCallback
  const lazyComponent = useCallback(
    () => import("@/remotion/compositions/DynamicVideo"),
    []
  );

  return (
    <Player
      lazyComponent={lazyComponent}
      inputProps={inputProps}
      durationInFrames={300}
      compositionWidth={1920}
      compositionHeight={1080}
      fps={30}
      controls
    />
  );
}
```

### Pattern 4: Three-Layer Authentication

**What:** Authentication enforced at middleware, client, and database layers
**When to use:** All authenticated routes and data access
**Trade-offs:** Redundant checks, but defense-in-depth prevents security gaps

**Implementation layers:**
1. **Middleware (Next.js):** Clerk middleware redirects unauthenticated users
2. **Client (React):** `useConvexAuth()` hook (not `useAuth()`) for UI state
3. **Database (Convex):** Every mutation/query checks `ctx.auth.getUserIdentity()`

## Data Flow

### Primary Flow: Prompt to Video

```
User types prompt
        |
        v
[React Component] --useMutation--> [Convex: startGeneration]
        |                                    |
        |                           Creates job record
        |                           Schedules action
        |                                    |
        v                                    v
[UI shows "Generating..."]          [Convex Action: generateCode]
        |                                    |
        | subscribes via useQuery            | calls Claude API
        |                                    |
        v                                    v
[Real-time status updates] <-------- [Mutation: updateJobStatus]
        |                                    |
        |                           Stores generated code
        |                                    |
        v                                    v
[Remotion Player preview] <--------- [Query: getProjectCode]
        |
        | User clicks "Render"
        |
        v
[Convex: startRender] --schedules--> [Action: renderOnLambda]
        |                                    |
        |                           Calls renderMediaOnLambda()
        |                                    |
        v                                    v
[UI shows render progress] <-------- [Polling: getRenderProgress]
        |                                    |
        |                           Video uploaded to S3
        |                                    |
        v                                    v
[Download/Share UI] <--------------- [S3 URL stored in Convex]
```

### Asset Upload Flow

```
User selects image
        |
        v
[Convex: generateUploadUrl] --> [Returns signed upload URL]
        |
        v
[Client uploads to Convex storage]
        |
        v
[Convex: saveAsset mutation] --> [Stores storageId + metadata]
        |
        v
[Asset available in generation context]
```

### Key Data Flows

1. **Authentication Flow:** Clerk token -> ConvexProviderWithClerk -> Backend validation -> `ctx.auth.getUserIdentity()`
2. **Generation Flow:** Prompt -> Mutation (creates job) -> Scheduled Action (calls Claude) -> Mutation (stores code) -> Query (serves to Player)
3. **Render Flow:** Trigger mutation -> Scheduled Action (calls Lambda) -> Progress polling -> S3 URL storage
4. **Real-time Updates:** Convex `useQuery` hooks automatically subscribe to data changes; any mutation triggers instant UI updates across all connected clients

## Rendering Pipeline

### Preview vs Final Render

| Aspect | Preview (Player) | Final Render (Lambda) |
|--------|-----------------|----------------------|
| **Location** | Client browser | AWS Lambda |
| **Speed** | Real-time (60fps) | Minutes (distributed) |
| **Output** | Canvas rendering | MP4/WebM file |
| **Use Case** | Instant feedback, iteration | Downloadable, shareable video |
| **Cost** | Free (client CPU) | AWS Lambda + S3 costs |
| **GPU** | Client GPU available | CPU-only |

### Code Generation to Render Pipeline

**Option A: Props-Based (Recommended for MVP)**
```
Claude generates JSON props -> Store in Convex -> Player renders with inputProps
                                                -> Lambda renders with inputProps
```
- **Pros:** Simpler, safer, no code execution
- **Cons:** Limited to pre-defined composition templates

**Option B: Component-Based (Future)**
```
Claude generates JSX -> Store as text -> Dynamically import/evaluate -> Render
```
- **Pros:** Maximum flexibility
- **Cons:** Security concerns (code sandbox needed), complexity

**Recommendation:** Start with Option A. Define a rich `DynamicVideo` composition that accepts props describing:
- Scenes (array of scene definitions)
- Timing (durations, transitions)
- Assets (image URLs, text content)
- Styling (colors, fonts, positions)

This defers the code execution problem while still enabling AI-generated video variety.

### Lambda Integration Pattern

```typescript
// convex/_actions/remotion.ts
"use node";

import { internalAction } from "../_generated/server";
import { renderMediaOnLambda, getRenderProgress } from "@remotion/lambda/client";

export const triggerRender = internalAction({
  args: {
    jobId: v.id("renders"),
    inputProps: v.any(),
  },
  handler: async (ctx, { jobId, inputProps }) => {
    const { renderId, bucketName } = await renderMediaOnLambda({
      region: "us-east-1",
      functionName: process.env.REMOTION_LAMBDA_FUNCTION!,
      serveUrl: process.env.REMOTION_SERVE_URL!,
      composition: "DynamicVideo",
      inputProps,
      codec: "h264",
    });

    // Store render info for progress tracking
    await ctx.runMutation(internal.renders.setRenderId, {
      jobId,
      renderId,
      bucketName,
    });
  },
});
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Single Remotion Lambda deployment, default concurrency |
| 1k-10k users | Increase Lambda concurrency limits, consider SQS queue for renders |
| 10k+ users | Multiple Lambda regions, render queue with priority, CDN for video delivery |

### Scaling Priorities

1. **First bottleneck:** Lambda concurrency (default 1000/region). Solution: Request limit increase, or implement SQS queue to manage render requests.

2. **Second bottleneck:** S3 egress costs for video delivery. Solution: CloudFront CDN in front of S3, or migrate to dedicated video hosting.

3. **Third bottleneck:** Claude API rate limits. Solution: Implement request queuing in Convex with backoff, consider caching common patterns.

## Anti-Patterns

### Anti-Pattern 1: Direct Action Calls from Client

**What people do:** Call Claude/Lambda directly from client via Convex actions
**Why it's wrong:** No transactional guarantees, poor UX (no immediate feedback), harder to track job state
**Do this instead:** Mutation creates job record first, then schedules action. Client subscribes to job status.

### Anti-Pattern 2: Storing Generated Code as Executable

**What people do:** Store Claude output as JavaScript, execute with `eval()` or `new Function()`
**Why it's wrong:** Security vulnerability, no sandboxing, potential for injection attacks
**Do this instead:** Store as structured props/data, render through pre-defined Remotion compositions

### Anti-Pattern 3: Polling for Progress in Client

**What people do:** `setInterval` to check render progress
**Why it's wrong:** Unnecessary requests, doesn't leverage Convex real-time
**Do this instead:** Store progress in Convex, use `useQuery` for automatic real-time updates

### Anti-Pattern 4: Using Clerk's useAuth for Convex State

**What people do:** Use `useAuth()` from Clerk to check authentication before Convex operations
**Why it's wrong:** Race condition - Clerk may report authenticated before Convex has validated token
**Do this instead:** Use `useConvexAuth()` hook which ensures Convex backend has validated the session

### Anti-Pattern 5: Bundle Per Render

**What people do:** Call `bundle()` for every video render
**Why it's wrong:** Expensive operation, unnecessary when only props change
**Do this instead:** Bundle once with `deploySite()`, render many videos with different `inputProps`

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Clerk | JWT templates + webhooks | Use Convex JWT template, sync users via webhook |
| Claude API | Convex action with `"use node"` | 10-minute action timeout sufficient for generation |
| Remotion Lambda | Convex action calling `renderMediaOnLambda` | Store renderId for progress tracking |
| S3 | Accessed via Remotion Lambda | Videos stored in Remotion's S3 bucket |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Next.js <-> Convex | React hooks (`useQuery`, `useMutation`) | Real-time, type-safe |
| Convex mutations <-> actions | `ctx.scheduler.runAfter()` | Transactional scheduling |
| Convex <-> Clerk | HTTP webhook + JWT validation | User sync, token validation |
| Next.js <-> Remotion Player | Direct React component embedding | Import and render directly |

## Build Order Implications

Based on architectural dependencies, recommended implementation order:

### Phase 1: Foundation
1. **Auth integration** (Clerk + Convex + Next.js) - Everything depends on this
2. **Basic schema** (users, projects tables) - Data foundation
3. **Project CRUD** - Basic functionality to test full stack

### Phase 2: Generation Pipeline
4. **Remotion composition** (template-based, accepts props) - Define what we're generating
5. **Player integration** - Preview before render
6. **Claude integration** (action + job management) - Core feature
7. **Generation flow** (mutation -> action -> status updates) - Complete loop

### Phase 3: Rendering Pipeline
8. **Lambda deployment** - Requires working composition
9. **Render triggering** (action + progress tracking) - Depends on Lambda
10. **Download/share** - Final delivery

### Phase 4: Enhancements
11. **Asset uploads** - Richer compositions
12. **Chat refinement** - Iterative generation
13. **Visual editor** - Direct manipulation (complex, defer)

## Sources

### Remotion (HIGH confidence - official documentation)
- [How Remotion Lambda Works](https://www.remotion.dev/docs/lambda/how-lambda-works)
- [Remotion Lambda Overview](https://www.remotion.dev/docs/lambda)
- [Comparison of SSR Options](https://www.remotion.dev/docs/compare-ssr)
- [Player Component API](https://www.remotion.dev/docs/player/player)
- [Passing Props](https://www.remotion.dev/docs/passing-props)
- [renderMediaOnLambda](https://www.remotion.dev/docs/lambda/rendermediaonlambda)
- [deploySite](https://www.remotion.dev/docs/lambda/deploysite)
- [Using Lambda with SQS](https://www.remotion.dev/docs/lambda/sqs)

### Convex (HIGH confidence - official documentation)
- [Next.js App Router](https://docs.convex.dev/client/nextjs/app-router/)
- [Scheduled Functions](https://docs.convex.dev/scheduling/scheduled-functions)
- [Actions](https://docs.convex.dev/functions/actions)
- [File Storage](https://docs.convex.dev/file-storage)
- [Background Job Management](https://stack.convex.dev/background-job-management)
- [Authentication Best Practices](https://stack.convex.dev/authentication-best-practices-convex-clerk-and-nextjs)

### Clerk (HIGH confidence - official documentation)
- [Convex Integration](https://clerk.com/docs/guides/development/integrations/databases/convex)
- [Convex & Clerk](https://docs.convex.dev/auth/clerk)

### Security (MEDIUM confidence - multiple sources)
- [CSA on LLM Code Execution](https://cloudsecurityalliance.org/blog/2025/06/03/llms-writing-code-cool-llms-executing-it-dangerous)
- [Code Sandboxes for AI Agents](https://amirmalik.net/2025/03/07/code-sandboxes-for-llm-ai-agents)

---
*Architecture research for: AI-Powered Video Creation Platform*
*Researched: 2026-01-27*
