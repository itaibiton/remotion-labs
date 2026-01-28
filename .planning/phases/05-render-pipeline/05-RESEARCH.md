# Phase 5: Render Pipeline - Research

**Researched:** 2026-01-28
**Domain:** Remotion Lambda serverless video rendering with Convex backend
**Confidence:** HIGH

## Summary

This phase implements video rendering using Remotion Lambda, which is Remotion's official serverless solution for rendering videos on AWS Lambda. The integration follows a pattern where Convex actions orchestrate renders by calling Remotion Lambda APIs, storing render state in Convex tables for real-time progress tracking, and providing presigned URLs for secure downloads.

The existing codebase has a TextAnimation composition, Convex-based generation pipeline, and PreviewPlayer. This phase adds: (1) a `renders` table to track render jobs, (2) Convex actions that call Remotion Lambda APIs, (3) a `userQuotas` table with rate limiting, (4) webhook or polling for progress updates, and (5) presigned URL generation for downloads.

**Primary recommendation:** Use `@remotion/lambda/client` light client from Convex Node.js actions, with Convex's reactive queries for real-time progress display. Implement quotas via `@convex-dev/ratelimiter` component.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @remotion/lambda | 4.0.410+ | Serverless video rendering | Remotion's official Lambda integration, matches existing remotion@4.0.410 |
| @convex-dev/ratelimiter | latest | Usage quotas/rate limiting | Official Convex component for per-user limits |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @remotion/bundler | 4.0.410+ | Bundle site for S3 deployment | One-time CLI deployment only |
| dotenv | 16.x | Load AWS credentials | Development environment |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Remotion Lambda | Self-hosted SSR | More control but requires server management, not serverless |
| Polling for progress | Webhooks | Webhooks are push-based but require public endpoint; polling simpler for MVP |
| @convex-dev/ratelimiter | Manual quota table | Component handles edge cases, token bucket algorithm built-in |

**Installation:**
```bash
npm install @remotion/lambda @convex-dev/ratelimiter
```

## Architecture Patterns

### Recommended Project Structure
```
convex/
  renders.ts           # Render job mutations/queries
  triggerRender.ts     # "use node" action calling Lambda APIs
  userQuotas.ts        # Quota checks and limits
  lib/
    renderLimits.ts    # Constants for resolution/duration caps
src/
  components/
    render/
      render-button.tsx      # Trigger render from preview
      render-progress.tsx    # Real-time progress display
      download-button.tsx    # Download completed MP4
  app/
    api/
      webhook/
        route.ts             # (Optional) Lambda webhook handler
```

### Pattern 1: Convex Action + Light Client
**What:** Use `@remotion/lambda/client` from Convex Node.js actions to avoid bundling issues
**When to use:** Always - this is the recommended pattern for serverless environments
**Example:**
```typescript
// convex/triggerRender.ts
"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import {
  renderMediaOnLambda,
  getRenderProgress,
  presignUrl,
} from "@remotion/lambda/client";
import { internal } from "./_generated/api";

export const startRender = action({
  args: {
    generationId: v.id("generations"),
    animationProps: v.object({
      text: v.string(),
      style: v.union(
        v.literal("fade-in"),
        v.literal("typewriter"),
        v.literal("slide-up"),
        v.literal("scale")
      ),
      fontFamily: v.string(),
      fontSize: v.number(),
      color: v.string(),
      backgroundColor: v.optional(v.string()),
      durationInFrames: v.number(),
      fps: v.literal(30),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Must be authenticated");

    // Check quota before rendering
    const quotaOk = await ctx.runMutation(internal.userQuotas.checkAndConsume, {
      userId: identity.tokenIdentifier,
      action: "render",
    });
    if (!quotaOk) {
      throw new Error("Render quota exceeded. Try again later.");
    }

    // Trigger Lambda render
    const { renderId, bucketName } = await renderMediaOnLambda({
      region: "us-east-1",
      functionName: process.env.REMOTION_LAMBDA_FUNCTION_NAME!,
      serveUrl: process.env.REMOTION_SERVE_URL!,
      composition: "TextAnimation",
      inputProps: args.animationProps,
      codec: "h264",
      // Abuse prevention limits
      timeoutInMilliseconds: 60000,
    });

    // Store render job
    const renderJobId = await ctx.runMutation(internal.renders.create, {
      userId: identity.tokenIdentifier,
      generationId: args.generationId,
      renderId,
      bucketName,
      status: "rendering",
      progress: 0,
    });

    return { renderJobId, renderId };
  },
});
```

### Pattern 2: Polling Progress with Convex Scheduler
**What:** Use Convex scheduler to poll getRenderProgress and update state
**When to use:** For real-time progress without webhooks
**Example:**
```typescript
// convex/triggerRender.ts (continued)
export const pollProgress = action({
  args: {
    renderJobId: v.id("renders"),
    renderId: v.string(),
    bucketName: v.string(),
  },
  handler: async (ctx, args) => {
    const progress = await getRenderProgress({
      renderId: args.renderId,
      bucketName: args.bucketName,
      functionName: process.env.REMOTION_LAMBDA_FUNCTION_NAME!,
      region: "us-east-1",
    });

    if (progress.fatalErrorEncountered) {
      await ctx.runMutation(internal.renders.update, {
        id: args.renderJobId,
        status: "failed",
        error: progress.errors[0]?.message ?? "Unknown error",
      });
      return;
    }

    if (progress.done) {
      // Generate presigned URL for download
      const outputUrl = await presignUrl({
        region: "us-east-1",
        bucketName: args.bucketName,
        objectKey: progress.outKey!,
        expiresInSeconds: 3600, // 1 hour
        checkIfObjectExists: true,
      });

      await ctx.runMutation(internal.renders.update, {
        id: args.renderJobId,
        status: "complete",
        progress: 100,
        outputUrl,
        outputSize: progress.outputSizeInBytes,
      });
      return;
    }

    // Update progress and schedule next poll
    await ctx.runMutation(internal.renders.update, {
      id: args.renderJobId,
      progress: Math.round(progress.overallProgress * 100),
    });

    // Poll again in 2 seconds
    await ctx.scheduler.runAfter(2000, internal.triggerRender.pollProgress, {
      renderJobId: args.renderJobId,
      renderId: args.renderId,
      bucketName: args.bucketName,
    });
  },
});
```

### Pattern 3: Real-time UI with Convex Queries
**What:** Convex reactive queries automatically update UI as render state changes
**When to use:** Client-side progress display
**Example:**
```typescript
// src/components/render/render-progress.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface RenderProgressProps {
  renderJobId: Id<"renders">;
}

export function RenderProgress({ renderJobId }: RenderProgressProps) {
  // Automatically updates when Convex mutation changes the record
  const render = useQuery(api.renders.get, { id: renderJobId });

  if (!render) return <div>Loading...</div>;

  if (render.status === "complete") {
    return (
      <a href={render.outputUrl} download className="btn btn-primary">
        Download MP4
      </a>
    );
  }

  if (render.status === "failed") {
    return <div className="text-red-500">Render failed: {render.error}</div>;
  }

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span>Rendering...</span>
        <span>{render.progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all"
          style={{ width: `${render.progress}%` }}
        />
      </div>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Calling `@remotion/lambda` (non-client) from serverless:** Use `@remotion/lambda/client` light client to avoid bundling issues
- **Bundling site at runtime:** Deploy site once via CLI, not per-render. `bundle()` cannot run in serverless.
- **Exposing AWS credentials to client:** All Lambda calls must go through Convex actions (server-side)
- **Polling from client:** Let Convex scheduler poll server-side; client subscribes to reactive query
- **Storing presigned URLs permanently:** URLs expire; generate fresh on each download request

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | Manual counter in table | @convex-dev/ratelimiter | Handles token bucket, fixed window, race conditions, rollback |
| AWS credential management | Custom env loading | Remotion's REMOTION_AWS_* vars | Avoids conflicts with platform AWS vars |
| Webhook signature validation | Manual HMAC | validateWebhookSignature() | Handles edge cases, timing attacks |
| Progress percentage calculation | Manual frame counting | getRenderProgress().overallProgress | Accounts for encoding, chunk status |
| S3 presigned URLs | Manual AWS SDK calls | presignUrl() from @remotion/lambda/client | Integrated with Remotion's bucket structure |

**Key insight:** Remotion Lambda provides a complete API surface (render, progress, presign, webhook validation). Don't wrap AWS SDK directly - use Remotion's abstractions.

## Common Pitfalls

### Pitfall 1: AWS Credential Conflicts
**What goes wrong:** Environment variables like `AWS_ACCESS_KEY_ID` conflict with platform (Vercel, AWS) built-in credentials
**Why it happens:** Serverless platforms inject their own AWS credentials
**How to avoid:** Always use `REMOTION_AWS_ACCESS_KEY_ID` and `REMOTION_AWS_SECRET_ACCESS_KEY` prefixed variables
**Warning signs:** `UnrecognizedClientException` errors, permission denied on Lambda calls

### Pitfall 2: Bundler Import in Serverless
**What goes wrong:** Import from `@remotion/lambda` (not `/client`) pulls in Node.js dependencies that fail to bundle
**Why it happens:** Full package includes renderer dependencies incompatible with serverless
**How to avoid:** Always import from `@remotion/lambda/client` for serverless contexts
**Warning signs:** Webpack/ESBuild bundling errors, missing Node.js APIs

### Pitfall 3: Exceeding Lambda Concurrency
**What goes wrong:** `TooManyRequestsException` errors when renders pile up
**Why it happens:** AWS default limit is 1000 concurrent Lambdas per region; new accounts may have 10-50
**How to avoid:** Check limits with `npx remotion lambda quotas`, implement user quotas, use `framesPerLambda` to reduce function count
**Warning signs:** Intermittent 429 errors, failed renders during peak usage

### Pitfall 4: Presigned URL Expiration
**What goes wrong:** Download links stop working after time period
**Why it happens:** S3 presigned URLs have configurable expiration (max 7 days)
**How to avoid:** Generate fresh presigned URL on each download request, or regenerate when user views completed render
**Warning signs:** 403 Forbidden on download attempts

### Pitfall 5: delayRender Timeout vs Lambda Timeout
**What goes wrong:** Render silently fails without error message
**Why it happens:** Lambda function timeout (set at deploy) triggers before delayRender timeout
**How to avoid:** Set delayRender timeout (in render call) lower than Lambda timeout (in deploy)
**Warning signs:** `overallProgress` stuck, no errors in progress object

### Pitfall 6: Missing Site Deployment
**What goes wrong:** Render fails immediately with "site not found" or 404
**Why it happens:** Forgot to run `npx remotion lambda sites create` or serveUrl is incorrect
**How to avoid:** Deploy site before implementing render logic; store serveUrl in environment variable
**Warning signs:** Render starts but fails immediately

## Code Examples

Verified patterns from official sources:

### Convex Schema for Renders Table
```typescript
// convex/schema.ts (addition)
// Source: Convex docs + Remotion Lambda response structure

renders: defineTable({
  userId: v.string(),
  generationId: v.id("generations"),
  renderId: v.string(),           // Remotion Lambda render ID
  bucketName: v.string(),         // S3 bucket
  status: v.union(
    v.literal("pending"),
    v.literal("rendering"),
    v.literal("complete"),
    v.literal("failed")
  ),
  progress: v.number(),           // 0-100
  outputUrl: v.optional(v.string()),  // Presigned download URL
  outputSize: v.optional(v.number()), // Bytes
  error: v.optional(v.string()),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_user", ["userId"])
  .index("by_generation", ["generationId"])
  .index("by_status", ["status"]),
```

### Rate Limiting with @convex-dev/ratelimiter
```typescript
// convex/userQuotas.ts
// Source: https://www.convex.dev/components/rate-limiter

import { RateLimiter } from "@convex-dev/ratelimiter";
import { components } from "./_generated/api";

const rateLimiter = new RateLimiter(components.rateLimiter, {
  // 5 renders per hour per user
  renderLimit: { kind: "fixed window", rate: 5, period: 60 * 60 * 1000 },
});

export const checkRenderQuota = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const result = await rateLimiter.limit(ctx, "renderLimit", {
      key: args.userId,
      throws: false,
    });
    return result.ok;
  },
});
```

### Webhook Handler (Optional - Alternative to Polling)
```typescript
// src/app/api/webhook/route.ts
// Source: https://www.remotion.dev/docs/lambda/webhooks

import { appRouterWebhook } from "@remotion/lambda/client";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const POST = appRouterWebhook({
  secret: process.env.REMOTION_WEBHOOK_SECRET!,
  onSuccess: async ({ renderId, outputUrl }) => {
    // Update Convex render record
    await convex.mutation(api.renders.completeFromWebhook, {
      renderId,
      outputUrl,
    });
  },
  onError: async ({ renderId, errors }) => {
    await convex.mutation(api.renders.failFromWebhook, {
      renderId,
      error: errors[0]?.message ?? "Unknown error",
    });
  },
  onTimeout: async ({ renderId }) => {
    await convex.mutation(api.renders.failFromWebhook, {
      renderId,
      error: "Render timed out",
    });
  },
});

export const OPTIONS = POST;
```

### Environment Variables Required
```bash
# .env.local (development)
# AWS credentials for Remotion Lambda
REMOTION_AWS_ACCESS_KEY_ID=your_access_key
REMOTION_AWS_SECRET_ACCESS_KEY=your_secret_key
REMOTION_AWS_REGION=us-east-1

# Remotion Lambda configuration
REMOTION_LAMBDA_FUNCTION_NAME=remotion-render-xxxxx
REMOTION_SERVE_URL=https://remotionlambda-xxxxx.s3.us-east-1.amazonaws.com/sites/your-site/index.html

# Optional: Webhook secret
REMOTION_WEBHOOK_SECRET=your_webhook_secret
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full @remotion/lambda import | @remotion/lambda/client light client | v3.3.42 | Enables serverless usage without bundling issues |
| Webhook-only progress | skipLambdaInvocation for polling | v4.0.218 | Faster, cheaper progress checks without invoking Lambda |
| Manual bucket creation | getOrCreateBucket() idempotent | Always | Simplifies setup, handles existing buckets |
| Complex presignUrl setup | presignUrl() in client package | v3.3.42+ | No AWS SDK needed, integrated with Remotion structure |

**Deprecated/outdated:**
- Using `renderVideoOnLambda()`: Renamed to `renderMediaOnLambda()` for audio support
- Importing presignUrl from main package: Use `@remotion/lambda/client` for serverless

## Open Questions

Things that couldn't be fully resolved:

1. **Webhook vs Polling for MVP**
   - What we know: Webhooks are push-based (efficient), polling is simpler (no public endpoint needed)
   - What's unclear: Whether Convex scheduler polling adds meaningful latency
   - Recommendation: Start with polling via Convex scheduler; webhooks can be added later if needed

2. **Render limit values for abuse prevention**
   - What we know: Need resolution cap (e.g., 1920x1080), duration cap (e.g., 20 seconds), renders per hour
   - What's unclear: Exact values depend on AWS costs and business model
   - Recommendation: Start conservative (5 renders/hour, 1080p max, 20s max), adjust based on usage

3. **Site deployment strategy**
   - What we know: Site must be deployed to S3 before renders work
   - What's unclear: Whether to auto-deploy on each code change or manual CLI deployment
   - Recommendation: Manual CLI deployment for v1.0; consider CI/CD pipeline for v1.1

## Sources

### Primary (HIGH confidence)
- Remotion Lambda official docs: https://www.remotion.dev/docs/lambda
- renderMediaOnLambda API: https://www.remotion.dev/docs/lambda/rendermediaonlambda
- getRenderProgress API: https://www.remotion.dev/docs/lambda/getrenderprogress
- presignUrl API: https://www.remotion.dev/docs/lambda/presignurl
- Light client docs: https://www.remotion.dev/docs/lambda/light-client
- Webhooks docs: https://www.remotion.dev/docs/lambda/webhooks
- Convex actions docs: https://docs.convex.dev/functions/actions
- @convex-dev/ratelimiter: https://www.convex.dev/components/rate-limiter

### Secondary (MEDIUM confidence)
- Remotion + Next.js patterns: https://www.remotion.dev/docs/miscellaneous/nextjs
- Lambda troubleshooting: https://www.remotion.dev/docs/lambda/troubleshooting/debug
- Convex rate limiting article: https://stack.convex.dev/rate-limiting

### Tertiary (LOW confidence)
- Cost estimation varies by region and configuration (verify with `npx remotion lambda quotas`)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Remotion + Convex documentation
- Architecture: HIGH - Patterns from official docs, verified API signatures
- Pitfalls: HIGH - Documented troubleshooting guides from Remotion

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (Remotion Lambda is stable, 30-day validity reasonable)
