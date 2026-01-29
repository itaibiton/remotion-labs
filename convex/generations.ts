import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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
    status: v.union(v.literal("success"), v.literal("failed")),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
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
