import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query, mutation, internalMutation } from "./_generated/server";
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
    });
  },
});

/**
 * Patch a pending row to success or failed once the Claude call finishes.
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
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

/**
 * Mark pending records older than 5 minutes as failed (orphan cleanup).
 * Called by a cron job.
 */
export const cleanupOrphaned = internalMutation({
  handler: async (ctx) => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
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
      await ctx.db.patch(row._id, {
        status: "failed",
        errorMessage: "Generation timed out",
      });
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

    return await ctx.db
      .query("generations")
      .withIndex("by_user_created", (q) =>
        q.eq("userId", identity.tokenIdentifier)
      )
      .order("desc")
      .paginate(args.paginationOpts);
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
