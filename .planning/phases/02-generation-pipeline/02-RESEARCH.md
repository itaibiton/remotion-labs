# Phase 2: Generation Pipeline - Research

**Researched:** 2026-01-27
**Domain:** AI Code Generation, Convex Backend, Code Validation
**Confidence:** HIGH

## Summary

This phase implements the core generation pipeline: user enters a text prompt, Claude generates Remotion animation code, system validates the output, and stores the result. The research covers the complete flow from prompt input UX to generation via Claude API, code validation, and error handling.

The standard approach is:
1. **Frontend**: Simple textarea with shadcn/ui, character count, example prompts
2. **Backend**: Convex action calls Claude API, returns generated code
3. **Validation**: Zod schema validation + syntax checking before storage
4. **Storage**: Convex mutation stores generation in database with user association

**Primary recommendation:** Use Convex actions for Claude API calls with Zod-based code validation. Keep generation logic minimal in actions, delegate storage to mutations. Use template-based approach with props rather than arbitrary JSX execution.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | ^0.36+ | Claude API integration | Official SDK with TypeScript, streaming, tool use |
| zod | ^3.23+ | Schema validation | Runtime validation, Remotion integration, structured outputs |
| convex | ^1.31+ | Backend functions | Already in use, actions for external APIs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | ^1.7+ | Toast notifications | Error feedback, generation status |
| @remotion/zod-types | ^4.x | Remotion-specific types | Color, matrix transforms for animation props |

### Already Installed
- shadcn/ui components (Button, Textarea via Radix)
- Clerk authentication
- Convex with Clerk integration
- Tailwind CSS v4

**Installation:**
```bash
npm install @anthropic-ai/sdk
# sonner may need to be added via shadcn CLI if not present
npx shadcn@latest add sonner
```

## Architecture Patterns

### Recommended Project Structure
```
convex/
├── schema.ts              # Add generations table
├── generations.ts         # Mutations: store, list, get
├── generateAnimation.ts   # Action: Claude API call
├── lib/
│   └── validation.ts      # Zod schemas for animation props
│
src/
├── app/
│   └── create/
│       └── page.tsx       # Prompt input UI (enhance existing)
├── components/
│   └── generation/
│       ├── prompt-input.tsx       # Textarea with examples
│       ├── generation-status.tsx  # Progress steps UI
│       └── error-display.tsx      # Error with retry
└── lib/
    └── animation-schemas.ts   # Client-side Zod schemas
```

### Pattern 1: Convex Action for External API
**What:** Use Convex actions for Claude API calls, mutations for database writes
**When to use:** Any external API call (Claude, OpenAI, third-party services)
**Example:**
```typescript
// Source: https://docs.convex.dev/functions/actions
// convex/generateAnimation.ts
"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";

export const generate = action({
  args: {
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      messages: [
        { role: "user", content: buildPrompt(args.prompt) }
      ],
    });

    // Extract code from response
    const code = extractCode(message.content);

    // Validate and store via mutation
    await ctx.runMutation(internal.generations.store, {
      prompt: args.prompt,
      code,
      userId: identity.tokenIdentifier,
    });

    return { code };
  },
});
```

### Pattern 2: Props-Based Animation Generation
**What:** Generate animation props, not arbitrary JSX. Use pre-defined templates.
**When to use:** v1.0 - safer, more predictable than executing arbitrary code
**Example:**
```typescript
// Source: https://www.remotion.dev/docs/schemas
// Zod schema for text animation props
import { z } from "zod";

export const textAnimationSchema = z.object({
  text: z.string().min(1).max(500),
  style: z.enum(["fade-in", "typewriter", "slide-up", "scale"]),
  fontFamily: z.string().default("Inter"),
  fontSize: z.number().min(12).max(200).default(48),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  durationInFrames: z.number().min(30).max(600).default(90),
  fps: z.literal(30),
});

export type TextAnimationProps = z.infer<typeof textAnimationSchema>;
```

### Pattern 3: Claude System Prompt for Animation Generation
**What:** Structured system prompt that guides Claude to output valid animation props
**When to use:** Every generation request
**Example:**
```typescript
// System prompt template
const SYSTEM_PROMPT = `You are an animation code generator for Remotion.
Output ONLY valid JSON matching this schema:
${JSON.stringify(textAnimationSchema.shape)}

Animation styles available:
- fade-in: Opacity 0 to 1 over duration
- typewriter: Text appears character by character
- slide-up: Text slides up from below
- scale: Text scales from 0 to 1

Rules:
1. Output valid JSON only, no markdown or explanation
2. Color must be hex format (#RRGGBB)
3. durationInFrames should be 60-180 for most animations
4. Choose style based on the mood of the prompt

Example output:
{"text":"Hello World","style":"typewriter","fontSize":64,"color":"#FFFFFF","durationInFrames":90,"fps":30}`;
```

### Pattern 4: Generation Status with Steps
**What:** Show progress through generation stages
**When to use:** During generation to keep user informed
**Example:**
```tsx
// Source: Progress indicator best practices
const steps = [
  { id: "analyzing", label: "Analyzing prompt..." },
  { id: "generating", label: "Generating animation..." },
  { id: "validating", label: "Validating code..." },
];

function GenerationStatus({ currentStep }: { currentStep: string }) {
  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const isActive = step.id === currentStep;
        const isComplete = steps.findIndex(s => s.id === currentStep) > i;
        return (
          <div key={step.id} className="flex items-center gap-2">
            {isComplete ? (
              <CheckIcon className="text-green-500" />
            ) : isActive ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Circle className="text-gray-300" />
            )}
            <span className={isActive ? "font-medium" : ""}>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Executing arbitrary JSX from Claude:** Security risk, use props-based generation instead
- **Calling Claude directly from client:** Exposes API key, use Convex action
- **Sequential runQuery/runMutation in actions:** Batch into single operations
- **Not validating generated output:** Always validate with Zod before storage
- **Streaming to database:** Store final result only, not intermediate states

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API streaming | Custom SSE handler | Anthropic SDK `.stream()` | Handles reconnection, parsing, accumulation |
| Form validation | Manual checks | Zod schemas | Runtime type safety, Remotion integration |
| Toast notifications | Custom toast system | Sonner (shadcn) | Stacking, promises, accessibility |
| Rate limiting | Custom counters | Convex scheduler + state | Already built, consistent |
| User context | Manual identity checks | Convex auth helpers | Type-safe, integrated with Clerk |

**Key insight:** Convex + Anthropic SDK handle most complexity. Focus on prompt engineering and UX, not infrastructure.

## Common Pitfalls

### Pitfall 1: Claude API Timeout in Serverless
**What goes wrong:** Claude generation takes 10-30 seconds, serverless functions timeout
**Why it happens:** Default timeouts too short, no timeout configuration
**How to avoid:** Convex actions support 10-minute timeout, sufficient for generation
**Warning signs:** Partial responses, timeout errors in logs

### Pitfall 2: Unbounded Token Usage
**What goes wrong:** Users submit very long prompts, Claude uses many tokens, costs spike
**Why it happens:** No input validation, no max_tokens limit
**How to avoid:**
- Character limit on input (1000-2000 chars)
- Set `max_tokens: 4096` in Claude call
- Track usage per user for future rate limiting
**Warning signs:** Unexpectedly high API bills, slow responses

### Pitfall 3: Invalid Generated Code Reaches Storage
**What goes wrong:** Claude generates malformed JSON or invalid prop values
**Why it happens:** LLM output is probabilistic, can deviate from instructions
**How to avoid:**
- Zod validation before storage
- Try/catch with user-friendly error messages
- Prompt engineering to reduce invalid outputs
**Warning signs:** Database entries with null/undefined values, render failures

### Pitfall 4: Lost User State on Error
**What goes wrong:** User loses prompt text when generation fails
**Why it happens:** Form clears on error, no state preservation
**How to avoid:** Keep prompt in textarea state regardless of outcome
**Warning signs:** User complaints about retyping, form usability issues

### Pitfall 5: Action Side Effects Not Retried
**What goes wrong:** Generation succeeds but storage fails, user sees error
**Why it happens:** Convex doesn't auto-retry actions (unlike mutations)
**How to avoid:** Handle errors explicitly, store in same action flow
**Warning signs:** "Generation failed" errors when Claude succeeded

## Code Examples

### Example 1: Complete Generation Action
```typescript
// convex/generateAnimation.ts
"use node";

import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const textAnimationSchema = z.object({
  text: z.string(),
  style: z.enum(["fade-in", "typewriter", "slide-up", "scale"]),
  fontSize: z.number(),
  color: z.string(),
  backgroundColor: z.string().optional(),
  durationInFrames: z.number(),
  fps: z.literal(30),
});

export const generate = action({
  args: {
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Auth check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be logged in to generate animations");
    }

    // 2. Input validation
    if (args.prompt.length > 2000) {
      throw new Error("Prompt too long. Please use 2000 characters or less.");
    }

    // 3. Call Claude
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: args.prompt }],
    });

    // 4. Extract and parse response
    const textContent = message.content.find(c => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("Generation failed. Please try again.");
    }

    let parsed;
    try {
      parsed = JSON.parse(textContent.text);
    } catch {
      throw new Error("Generation produced invalid output. Please try a different prompt.");
    }

    // 5. Validate with Zod
    const result = textAnimationSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(`Invalid animation: ${result.error.issues[0].message}`);
    }

    // 6. Store via mutation
    const generationId = await ctx.runMutation(internal.generations.store, {
      userId: identity.tokenIdentifier,
      prompt: args.prompt,
      animationProps: result.data,
      createdAt: Date.now(),
    });

    return {
      id: generationId,
      animationProps: result.data,
    };
  },
});
```

### Example 2: Database Schema for Generations
```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_token", ["tokenIdentifier"]),

  generations: defineTable({
    userId: v.string(),
    prompt: v.string(),
    animationProps: v.object({
      text: v.string(),
      style: v.string(),
      fontSize: v.number(),
      color: v.string(),
      backgroundColor: v.optional(v.string()),
      durationInFrames: v.number(),
      fps: v.number(),
    }),
    status: v.union(v.literal("success"), v.literal("failed")),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_created", ["userId", "createdAt"]),
});
```

### Example 3: Prompt Input Component
```tsx
// src/components/generation/prompt-input.tsx
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const EXAMPLE_PROMPTS = [
  "Animated title that says 'Welcome' with a fade-in effect",
  "Kinetic typography: 'Think Different' with bold letters scaling in",
  "Typewriter text revealing 'Hello World' character by character",
];

const MAX_CHARS = 2000;
const WARN_CHARS = 1500;

interface PromptInputProps {
  onSubmit: (prompt: string) => Promise<void>;
  isGenerating: boolean;
  disabled?: boolean;
}

export function PromptInput({ onSubmit, isGenerating, disabled }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");

  const charCount = prompt.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isNearLimit = charCount > WARN_CHARS;

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isOverLimit || isGenerating) return;
    await onSubmit(prompt);
  }, [prompt, isOverLimit, isGenerating, onSubmit]);

  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="relative">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the animation you want to create..."
          className="min-h-[120px] resize-none pr-16"
          disabled={disabled || isGenerating}
        />
        <div
          className={`absolute bottom-2 right-2 text-sm ${
            isOverLimit ? "text-red-500" : isNearLimit ? "text-yellow-500" : "text-gray-400"
          }`}
        >
          {charCount}/{MAX_CHARS}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-gray-500">Try:</span>
        {EXAMPLE_PROMPTS.map((example, i) => (
          <button
            key={i}
            onClick={() => handleExampleClick(example)}
            className="text-sm text-blue-600 hover:underline"
            disabled={isGenerating}
          >
            {example.slice(0, 30)}...
          </button>
        ))}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!prompt.trim() || isOverLimit || isGenerating || disabled}
        className="w-full"
      >
        {isGenerating ? "Generating..." : "Generate Animation"}
      </Button>
    </div>
  );
}
```

### Example 4: Error Handling with Retry
```tsx
// src/components/generation/error-display.tsx
"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorDisplayProps {
  message: string;
  onRetry: () => void;
  retryCount: number;
  maxRetries?: number;
}

export function ErrorDisplay({
  message,
  onRetry,
  retryCount,
  maxRetries = 3
}: ErrorDisplayProps) {
  const canRetry = retryCount < maxRetries;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="text-red-500 mt-0.5" size={20} />
        <div>
          <p className="text-red-800 font-medium">Generation failed</p>
          <p className="text-red-600 text-sm mt-1">{message}</p>
        </div>
      </div>

      {canRetry ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="w-full"
        >
          <RefreshCw className="mr-2" size={16} />
          Try Again ({maxRetries - retryCount} attempts remaining)
        </Button>
      ) : (
        <p className="text-sm text-gray-600">
          Try simplifying your prompt or describing a different animation.
        </p>
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Toast component | Sonner | 2025 | Better accessibility, promise support |
| OpenAI for generation | Claude Sonnet 4.5 | 2025-2026 | Better code generation, structured outputs |
| Arbitrary JSX execution | Props-based templates | Best practice | Security, predictability |
| Sequential API calls | Batched Convex operations | Convex best practice | Performance, consistency |

**Deprecated/outdated:**
- shadcn/ui Toast: Replaced by Sonner, import from `@/components/ui/sonner`
- `client.beta.messages` for tools: Now stable in main `client.messages`

## Open Questions

1. **Streaming vs. Non-streaming**
   - What we know: Anthropic SDK supports both, streaming provides better UX
   - What's unclear: Whether to show partial generation or wait for completion
   - Recommendation: Start non-streaming (simpler), add streaming in future iteration

2. **Retry behavior for API failures**
   - What we know: Anthropic SDK auto-retries on 429/500 errors (2 times)
   - What's unclear: Should we add app-level retries beyond SDK behavior?
   - Recommendation: Rely on SDK retries, surface clear error to user if still fails

3. **Animation type expansion**
   - What we know: Phase 2 focuses on text/typography only
   - What's unclear: Schema structure for future animation types
   - Recommendation: Use discriminated union pattern, extensible from start

## Sources

### Primary (HIGH confidence)
- [Anthropic TypeScript SDK GitHub](https://github.com/anthropics/anthropic-sdk-typescript) - SDK usage, streaming, error handling
- [Convex Actions Documentation](https://docs.convex.dev/functions/actions) - External API patterns
- [Convex Best Practices](https://docs.convex.dev/understanding/best-practices/) - Code organization, security
- [Claude API Streaming](https://platform.claude.com/docs/en/api/messages-streaming) - Event types, response format
- [Remotion Schemas Documentation](https://www.remotion.dev/docs/schemas) - Zod integration, prop validation

### Secondary (MEDIUM confidence)
- [Remotion Prompt-to-Motion Graphics Template](https://github.com/remotion-dev/template-prompt-to-motion-graphics) - Reference architecture
- [Convex + Clerk Authentication Best Practices](https://stack.convex.dev/authentication-best-practices-convex-clerk-and-nextjs) - Auth patterns
- [Zod for TypeScript AI Development](https://workos.com/blog/zod-for-typescript) - Structured output validation

### Tertiary (LOW confidence)
- [LLM Code Generation Security 2026](https://brightsec.com/blog/the-2026-state-of-llm-security-key-findings-and-benchmarks/) - Security considerations (general, not Remotion-specific)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official docs, established patterns
- Architecture: HIGH - Convex and Anthropic patterns well-documented
- Pitfalls: MEDIUM - Based on community patterns and known issues
- Code examples: HIGH - Verified against current SDK versions

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (30 days - stable domain, slow-moving APIs)
