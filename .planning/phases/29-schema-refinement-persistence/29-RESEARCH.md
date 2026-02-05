# Phase 29: Schema & Refinement Persistence - Research

**Researched:** 2026-02-05
**Domain:** Convex schema design, parent-child relationships, refinement persistence
**Confidence:** HIGH

## Summary

This phase adds database persistence for refinements by extending the generations schema with self-referential parent-child tracking. The current `refine` action returns results directly without persisting; this phase will make refinements create new generation documents linked to their parent.

The implementation requires:
1. Adding `parentGenerationId` (optional Id reference to self) and `refinementPrompt` fields to the generations schema
2. Adding a `by_parent` index for efficient child queries
3. Creating a new `refineAndPersist` action (or modifying existing `refine`) that persists to database
4. Implementing `getRefinementChain` query for ordered version history traversal

The codebase already has patterns for optional indexed fields (`by_batchId` on optional `batchId`) and parent-child queries (`listByParent` stub exists with type assertion hack).

**Primary recommendation:** Add schema fields with index, create `refineAndPersist` action following `generatePrequel` pattern (pending-then-complete flow), implement chain traversal via iterative parent lookups in application code.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Convex | ^1.31.6 | Database, schema, mutations, queries | Already in use, required |
| convex/values | (bundled) | Schema validators (v.optional, v.id) | Standard Convex validation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @anthropic-ai/sdk | (existing) | Claude API calls | Refinement generation (already used) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate refinements table | Self-referential generations | Same table simpler, generations already has the code/status fields needed |
| Recursive CTE query | Iterative parent traversal | Convex doesn't support recursive queries; app-level iteration is fine for shallow chains |
| Storing full chain array | Just parentGenerationId | Single link simpler, chain query handles traversal |

**Installation:**
```bash
# No new packages needed - all dependencies already present
```

## Architecture Patterns

### Recommended Schema Addition

```typescript
// convex/schema.ts - generations table additions
generations: defineTable({
  // ... existing fields ...

  // Phase 29: Refinement tracking
  parentGenerationId: v.optional(v.id("generations")),  // Self-reference for refinement chain
  refinementPrompt: v.optional(v.string()),             // The instruction used to create this refinement
})
  // ... existing indexes ...
  .index("by_parent", ["parentGenerationId"]),  // NEW: Query children of a generation
```

### Pattern 1: Self-Referential Parent-Child

**What:** A document stores an optional ID reference to another document in the same table.
**When to use:** Refinement chains, version history, tree structures with limited depth.

```typescript
// Source: Convex docs - relationship structures
// A generation can optionally point to its parent
{
  _id: "gen123",
  parentGenerationId: "gen100",  // Points to parent
  refinementPrompt: "make it more blue",
  // ... other fields
}
```

### Pattern 2: Pending-Then-Complete Flow

**What:** Create pending record first, call external API, patch to success/failed.
**When to use:** Any action that calls an external service (Claude API).
**Example:**

```typescript
// Source: convex/generateAnimation.ts generatePrequel pattern (line 1229-1371)
export const refineAndPersist = action({
  args: {
    parentGenerationId: v.id("generations"),
    refinementPrompt: v.string(),
    conversationHistory: v.array(v.object({...})),
  },
  handler: async (ctx, args) => {
    // 1. Get parent generation
    const parent = await ctx.runQuery(internal.generations.getInternal, { id: args.parentGenerationId });

    // 2. Create pending child with parentGenerationId
    const childId = await ctx.runMutation(internal.generations.createPending, {
      userId: identity.tokenIdentifier,
      prompt: args.refinementPrompt,
      parentGenerationId: args.parentGenerationId,  // NEW field
      refinementPrompt: args.refinementPrompt,       // NEW field
      // ... copy settings from parent
    });

    try {
      // 3. Call Claude refine
      const result = await refineCode(client, parent.rawCode, args);

      // 4. Patch to success
      await ctx.runMutation(internal.generations.complete, {
        id: childId,
        status: "success",
        code: result.code,
        rawCode: result.rawCode,
        // ...
      });

      return { id: childId, ...result };
    } catch (e) {
      // 5. Patch to failed (deletes record)
      await ctx.runMutation(internal.generations.complete, {
        id: childId,
        status: "failed",
        errorMessage: e.message,
      });
      throw e;
    }
  },
});
```

### Pattern 3: Iterative Chain Traversal

**What:** Walk up parent chain iteratively to build ordered history.
**When to use:** `getRefinementChain` query to return original -> V1 -> V2 -> ... order.

```typescript
// Source: Application-level pattern (Convex has no recursive queries)
export const getRefinementChain = query({
  args: { generationId: v.id("generations") },
  handler: async (ctx, args) => {
    const chain: Doc<"generations">[] = [];
    let currentId: Id<"generations"> | undefined = args.generationId;

    // Walk up to find root (max 50 iterations for safety)
    const ancestors: Doc<"generations">[] = [];
    for (let i = 0; i < 50 && currentId; i++) {
      const gen = await ctx.db.get(currentId);
      if (!gen) break;
      ancestors.push(gen);
      currentId = gen.parentGenerationId;
    }

    // Reverse to get root-first order: original -> V1 -> V2 -> ...
    return ancestors.reverse();
  },
});
```

### Anti-Patterns to Avoid

- **Storing denormalized chain arrays:** Don't store `chainIds: ["root", "v1", "v2"]` on each document. Single `parentGenerationId` link is simpler and consistent.
- **Deep recursion without limits:** Always cap iteration (50 is reasonable for refinement chains).
- **Querying without index:** Always use `.withIndex("by_parent")` not `.filter()` for parent lookups.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ID validation | Manual string checks | `v.id("generations")` validator | Convex validates table membership |
| Transaction isolation | Manual locking | Convex mutations (automatic) | Mutations are transactions |
| Optional field handling | null checks everywhere | `v.optional()` + TypeScript | Schema enforces, TS infers |

**Key insight:** Convex handles schema validation, transactions, and reactivity. Focus on the business logic (creating child records, traversing chain).

## Common Pitfalls

### Pitfall 1: Type Assertion Hack in listByParent

**What goes wrong:** Current code uses `q.field("parentGenerationId" as any)` because field doesn't exist in schema yet.
**Why it happens:** Query was written before schema update (Phase 27 comment).
**How to avoid:** Add schema field FIRST, then remove type assertion.
**Warning signs:** TypeScript errors when you remove `as any`.

### Pitfall 2: Missing Index on parentGenerationId

**What goes wrong:** `listByParent` query scans entire table instead of using index.
**Why it happens:** Forgot to add `.index("by_parent", ["parentGenerationId"])`.
**How to avoid:** Always add index when adding a field used in queries.
**Warning signs:** Slow queries as table grows, Convex dashboard showing full scans.

### Pitfall 3: Forgetting to Pass parentGenerationId to createPending

**What goes wrong:** Refinement created but not linked to parent.
**Why it happens:** `createPending` mutation needs updated args.
**How to avoid:** Update both createPending args AND the handler to accept/insert the field.
**Warning signs:** `listByParent` returns empty, children have `undefined` parentGenerationId.

### Pitfall 4: Infinite Loop in Chain Traversal

**What goes wrong:** Circular reference causes infinite loop.
**Why it happens:** Data corruption or bug that sets parentGenerationId to self.
**How to avoid:** Cap iterations (50), check for self-reference, use Set to detect cycles.
**Warning signs:** Query hangs, Convex function timeout.

### Pitfall 5: Copying Wrong Settings from Parent

**What goes wrong:** Refinement has different aspectRatio/fps than parent, breaks UI.
**Why it happens:** Forgot to copy parent settings to child.
**How to avoid:** Explicitly copy `aspectRatio`, `fps`, `durationInSeconds` from parent.
**Warning signs:** Refined video displays at wrong size or speed.

## Code Examples

### Schema Update

```typescript
// convex/schema.ts - BEFORE (current)
generations: defineTable({
  userId: v.string(),
  prompt: v.string(),
  code: v.optional(v.string()),
  rawCode: v.optional(v.string()),
  // ... other fields
  continuationType: v.optional(v.string()),
})
  .index("by_user", ["userId"])
  .index("by_user_created", ["userId", "createdAt"])
  .index("by_batchId", ["batchId"])
  .index("by_status_created", ["status", "createdAt"]),

// convex/schema.ts - AFTER (Phase 29)
generations: defineTable({
  userId: v.string(),
  prompt: v.string(),
  code: v.optional(v.string()),
  rawCode: v.optional(v.string()),
  // ... other fields
  continuationType: v.optional(v.string()),
  // Phase 29: Refinement tracking
  parentGenerationId: v.optional(v.id("generations")),
  refinementPrompt: v.optional(v.string()),
})
  .index("by_user", ["userId"])
  .index("by_user_created", ["userId", "createdAt"])
  .index("by_batchId", ["batchId"])
  .index("by_status_created", ["status", "createdAt"])
  .index("by_parent", ["parentGenerationId"]),  // NEW
```

### Updated createPending Mutation

```typescript
// convex/generations.ts - createPending update
export const createPending = internalMutation({
  args: {
    userId: v.string(),
    prompt: v.string(),
    createdAt: v.number(),
    batchId: v.optional(v.string()),
    variationIndex: v.optional(v.number()),
    variationCount: v.optional(v.number()),
    aspectRatio: v.optional(v.string()),
    durationInSeconds: v.optional(v.number()),
    referenceImageIds: v.optional(v.array(v.id("_storage"))),
    continuationType: v.optional(v.string()),
    // Phase 29 additions
    parentGenerationId: v.optional(v.id("generations")),
    refinementPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("generations", {
      userId: args.userId,
      prompt: args.prompt,
      status: "pending",
      createdAt: args.createdAt,
      batchId: args.batchId,
      variationIndex: args.variationIndex,
      variationCount: args.variationCount,
      aspectRatio: args.aspectRatio,
      durationInSeconds: args.durationInSeconds,
      referenceImageIds: args.referenceImageIds,
      continuationType: args.continuationType,
      parentGenerationId: args.parentGenerationId,
      refinementPrompt: args.refinementPrompt,
    });
  },
});
```

### Fixed listByParent Query (Remove Type Hack)

```typescript
// convex/generations.ts - listByParent fixed
export const listByParent = query({
  args: {
    parentId: v.id("generations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in to view variations");
    }

    // Now uses proper index (no type assertion needed)
    const generations = await ctx.db
      .query("generations")
      .withIndex("by_parent", (q) => q.eq("parentGenerationId", args.parentId))
      .order("asc")  // Oldest refinement first (chronological)
      .collect();

    return generations;
  },
});
```

### getRefinementChain Query

```typescript
// convex/generations.ts - NEW query
export const getRefinementChain = query({
  args: {
    generationId: v.id("generations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in to view refinement chain");
    }

    // Walk up the parent chain to find all ancestors
    const ancestors: Doc<"generations">[] = [];
    let currentId: Id<"generations"> | undefined = args.generationId;
    const seen = new Set<string>();  // Cycle detection

    for (let i = 0; i < 50 && currentId; i++) {
      if (seen.has(currentId)) break;  // Cycle detected
      seen.add(currentId);

      const gen = await ctx.db.get(currentId);
      if (!gen) break;

      ancestors.push(gen);
      currentId = gen.parentGenerationId;
    }

    // Reverse to get chronological order: original -> V1 -> V2 -> current
    return ancestors.reverse();
  },
});
```

### refineAndPersist Action Skeleton

```typescript
// convex/generateAnimation.ts - NEW action
export const refineAndPersist = action({
  args: {
    parentGenerationId: v.id("generations"),
    refinementPrompt: v.string(),
    conversationHistory: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    ),
  },
  handler: async (ctx, args): Promise<{
    id: Id<"generations">;
    rawCode: string;
    code: string;
    durationInFrames: number;
    fps: number;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be logged in to refine animations");
    }

    // 1. Get parent generation to copy settings and code
    const parent = await ctx.runQuery(internal.generations.getInternal, {
      id: args.parentGenerationId,
    });
    if (!parent || !parent.rawCode) {
      throw new Error("Parent generation not found or has no code");
    }

    // 2. Create pending child with link to parent
    const createdAt = Date.now();
    const childId = await ctx.runMutation(internal.generations.createPending, {
      userId: identity.tokenIdentifier,
      prompt: parent.prompt,  // Keep original prompt
      createdAt,
      aspectRatio: parent.aspectRatio,
      durationInSeconds: parent.durationInSeconds,
      parentGenerationId: args.parentGenerationId,
      refinementPrompt: args.refinementPrompt,
    });

    try {
      // 3. Call existing refine logic (Claude API)
      // ... (reuse REFINEMENT_SYSTEM_PROMPT and Claude call pattern)

      // 4. Patch to success
      await ctx.runMutation(internal.generations.complete, {
        id: childId,
        status: "success",
        code: result.code,
        rawCode: result.rawCode,
        durationInFrames: result.durationInFrames,
        fps: result.fps,
      });

      return { id: childId, ...result };
    } catch (e) {
      await ctx.runMutation(internal.generations.complete, {
        id: childId,
        status: "failed",
        errorMessage: e instanceof Error ? e.message : "Refinement failed",
      });
      throw e;
    }
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `refine` returns without persist | `refineAndPersist` creates DB record | Phase 29 | Refinements have permanent history |
| `listByParent` with type hack | Proper `withIndex("by_parent")` | Phase 29 | Type-safe, indexed queries |
| No chain query | `getRefinementChain` | Phase 29 | UI can show version history |

**Deprecated/outdated:**
- Existing `refine` action: Keep for backwards compatibility (inline preview) but add `refineAndPersist` for save flow

## Open Questions

1. **Keep both refine and refineAndPersist?**
   - What we know: Current `refine` is used for live preview before saving
   - What's unclear: Should save flow call `refineAndPersist` directly, or call `refine` then persist separately?
   - Recommendation: Create `refineAndPersist` for clean atomic operation; UI calls it when user confirms refinement

2. **Internal query for parent lookup?**
   - What we know: `refineAndPersist` needs to read parent generation
   - What's unclear: Use existing `get` query or create `getInternal` internal query
   - Recommendation: Create `getInternal` (internal query) to allow action to read generation without auth check

## Sources

### Primary (HIGH confidence)

- `/Users/Kohelet/Code/remotionlab/convex/schema.ts` - Current schema structure, existing index patterns
- `/Users/Kohelet/Code/remotionlab/convex/generations.ts` - Existing mutations (createPending, complete), listByParent stub
- `/Users/Kohelet/Code/remotionlab/convex/generateAnimation.ts` - Refine action pattern, generatePrequel pending-complete flow
- https://docs.convex.dev/database/schemas - Optional fields, index definitions
- https://docs.convex.dev/database/reading-data - withIndex query pattern, ordering

### Secondary (MEDIUM confidence)

- https://stack.convex.dev/relationship-structures-let-s-talk-about-schemas - Parent-child relationship patterns in Convex
- https://docs.convex.dev/database/document-ids - v.id() validator for foreign keys

### Tertiary (LOW confidence)

- WebSearch for recursive queries - Confirmed Convex doesn't support CTEs; application-level iteration required

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing Convex patterns already in codebase
- Architecture: HIGH - Follows established pending-complete flow pattern
- Pitfalls: HIGH - Derived from actual code issues (type hack, missing index)
- Chain traversal: MEDIUM - App-level iteration is standard but untested in this codebase

**Research date:** 2026-02-05
**Valid until:** 30 days (Convex patterns stable)
