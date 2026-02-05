# Phase 29 Plan 01: Schema Fields and Queries for Refinement Persistence Summary

**One-liner:** Added parentGenerationId self-reference and refinementPrompt fields to generations table with by_parent index, updated mutations, and created chain traversal queries

## What Was Built

### Schema Changes (convex/schema.ts)

Added two new fields to the generations table:
- `parentGenerationId: v.optional(v.id("generations"))` - Self-reference enabling refinement chains
- `refinementPrompt: v.optional(v.string())` - Stores the instruction used to create each refinement

Added new index:
- `.index("by_parent", ["parentGenerationId"])` - Enables efficient child lookups

### Mutation Updates (convex/generations.ts)

Both `createPending` and `store` internalMutations now accept and insert:
- `parentGenerationId` - Links refinements to their parent generation
- `refinementPrompt` - Records the refinement instruction

### New Queries (convex/generations.ts)

**getInternal** - Internal query for actions to read generation data
```typescript
export const getInternal = internalQuery({
  args: { id: v.id("generations") },
  handler: async (ctx, args) => ctx.db.get(args.id)
});
```

**getRefinementChain** - Traverses parent chain to build version history
```typescript
export const getRefinementChain = query({
  args: { generationId: v.id("generations") },
  handler: async (ctx, args) => {
    // Walks up parentGenerationId chain
    // Returns array ordered root (V1) -> current
  }
});
```

**Fixed listByParent** - Now uses proper index instead of filter with type assertion
```typescript
// Before: .filter((q) => q.eq(q.field("parentGenerationId" as any), args.parentId))
// After:  .withIndex("by_parent", (q) => q.eq("parentGenerationId", args.parentId))
```

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Self-referential parentGenerationId | Allows unlimited refinement chain depth with simple traversal |
| Optional fields | Maintains backward compatibility with existing generations |
| by_parent index | O(1) child lookups vs O(n) filter scans |
| getRefinementChain returns root-to-current order | Matches UI display order (V1, V2, V3...) |
| listByParent uses ascending order | Chronological refinement display |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 029e93d | feat | Add parentGenerationId and refinementPrompt fields to schema |
| a47d90a | feat | Add refinement fields to createPending and store mutations |
| b7bcfa0 | feat | Add getRefinementChain, getInternal and fix listByParent |

## Files Modified

| File | Changes |
|------|---------|
| convex/schema.ts | +2 fields, +1 index in generations table |
| convex/generations.ts | +4 args to mutations, +2 new queries, fixed listByParent |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for Plan 29-02: Wire refinement persistence into generate action
- Schema fields exist and are indexed
- Mutations accept the new parameters
- Queries available for UI consumption

## Verification

- [x] `npx convex dev --once` succeeded
- [x] Schema deployed with new fields and index
- [x] All queries compile and are available in Convex dashboard
