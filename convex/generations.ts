import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================================================
// Pending-generation lifecycle mutations
// ============================================================================

/**
 * Insert a "pending" skeleton row before calling Claude.
 * Returns the generation ID so the action can later patch it to success/failed.
 */
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
    // v0.5 Phase 29: refinement chain tracking
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

/**
 * Patch a pending row to success or delete if failed.
 * Failed generations are removed so they don't clutter the feed.
 */
export const complete = internalMutation({
  args: {
    id: v.id("generations"),
    status: v.union(v.literal("success"), v.literal("failed")),
    code: v.optional(v.string()),
    rawCode: v.optional(v.string()),
    durationInFrames: v.optional(v.number()),
    fps: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, status, ...fields } = args;

    if (status === "failed") {
      // Delete failed generations instead of keeping them
      await ctx.db.delete(id);
      return;
    }

    await ctx.db.patch(id, { status, ...fields });
  },
});

/**
 * Delete pending records older than 5 minutes (orphan cleanup).
 * Called by a cron job.
 */
export const cleanupOrphaned = internalMutation({
  handler: async (ctx) => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    // Clean up orphaned pending generations
    const pending = await ctx.db
      .query("generations")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.lt(q.field("createdAt"), fiveMinutesAgo),
        )
      )
      .collect();

    for (const row of pending) {
      await ctx.db.delete(row._id);
    }

    // Also clean up any old failed generations
    const failed = await ctx.db
      .query("generations")
      .filter((q) => q.eq(q.field("status"), "failed"))
      .collect();

    for (const row of failed) {
      await ctx.db.delete(row._id);
    }
  },
});

/**
 * Internal mutation to store a generation result
 * Called by the generateAnimation action after Claude API response
 */
export const store = internalMutation({
  args: {
    userId: v.string(),
    prompt: v.string(),
    code: v.optional(v.string()),
    rawCode: v.optional(v.string()),
    durationInFrames: v.optional(v.number()),
    fps: v.optional(v.number()),
    status: v.union(v.literal("pending"), v.literal("success"), v.literal("failed")),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    // v0.2 Phase 13: batch/variation tracking
    batchId: v.optional(v.string()),
    variationIndex: v.optional(v.number()),
    variationCount: v.optional(v.number()),
    // v0.2 Phase 13: generation settings
    aspectRatio: v.optional(v.string()),
    durationInSeconds: v.optional(v.number()),
    // v0.2 Phase 15: image upload
    referenceImageIds: v.optional(v.array(v.id("_storage"))),
    // v0.2 Phase 12: continuation tracking
    continuationType: v.optional(v.string()),
    // v0.5 Phase 29: refinement chain tracking
    parentGenerationId: v.optional(v.id("generations")),
    refinementPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const generationId = await ctx.db.insert("generations", {
      userId: args.userId,
      prompt: args.prompt,
      code: args.code,
      rawCode: args.rawCode,
      durationInFrames: args.durationInFrames,
      fps: args.fps,
      status: args.status,
      errorMessage: args.errorMessage,
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
    return generationId;
  },
});

/**
 * Query to list user's generation history
 * Returns 50 most recent generations, ordered by creation time (newest first)
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be logged in to view generation history");
    }

    const generations = await ctx.db
      .query("generations")
      .withIndex("by_user_created", (q) =>
        q.eq("userId", identity.tokenIdentifier)
      )
      .order("desc")
      .take(50);

    return generations;
  },
});

/**
 * Paginated query for the generation feed
 * Returns generations newest-first with cursor-based pagination
 * Filters out failed generations (they should be deleted, but filter just in case)
 */
export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in to view generations");
    }

    const result = await ctx.db
      .query("generations")
      .withIndex("by_user_created", (q) =>
        q.eq("userId", identity.tokenIdentifier)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    // Filter out any failed generations that might still exist
    return {
      ...result,
      page: result.page.filter((gen) => gen.status !== "failed"),
    };
  },
});

/**
 * Public paginated query for the explore feed.
 * Returns all users' successful generations, newest first.
 */
export const listPublicPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("generations")
      .withIndex("by_status_created", (q) => q.eq("status", "success"))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/**
 * Internal query to get a generation by ID.
 * Used by actions that need to read generation data.
 */
export const getInternal = internalQuery({
  args: {
    id: v.id("generations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Query to get a single generation by ID
 */
export const get = query({
  args: {
    id: v.id("generations"),
  },
  handler: async (ctx, args) => {
    const generation = await ctx.db.get(args.id);
    return generation;
  },
});

/**
 * Count pending generations for the current user.
 * Used to show badge in sidebar.
 */
export const countPending = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    const pending = await ctx.db
      .query("generations")
      .withIndex("by_user_created", (q) =>
        q.eq("userId", identity.tokenIdentifier)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return pending.length;
  },
});

/**
 * Remove a generation. Only the owning user can delete their generations.
 * Follows the same pattern as clips.remove.
 */
export const remove = mutation({
  args: {
    id: v.id("generations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const generation = await ctx.db.get(args.id);
    if (!generation || generation.userId !== identity.tokenIdentifier) {
      throw new Error("Generation not found");
    }

    await ctx.db.delete(args.id);
  },
});

/**
 * Query to list all variations (children) of a parent generation.
 * Returns generations that have the specified parentGenerationId.
 */
export const listByParent = query({
  args: {
    parentId: v.id("generations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in to view variations");
    }

    // Use proper index for efficient child lookups
    const generations = await ctx.db
      .query("generations")
      .withIndex("by_parent", (q) => q.eq("parentGenerationId", args.parentId))
      .order("asc")  // Oldest refinement first (chronological)
      .collect();

    return generations;
  },
});

/**
 * Query to get the full refinement chain for a generation.
 * Walks up the parent chain to get version history.
 * Returns array ordered from root (V1) to current, including the requested generation.
 */
export const getRefinementChain = query({
  args: {
    generationId: v.id("generations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in to view refinement chain");
    }

    const chain: Array<typeof generation> = [];
    let generation = await ctx.db.get(args.generationId);

    // Walk up the parent chain
    while (generation) {
      chain.unshift(generation); // Add to front (building root -> current order)

      if (generation.parentGenerationId) {
        generation = await ctx.db.get(generation.parentGenerationId);
      } else {
        break; // Reached the root
      }
    }

    return chain;
  },
});
