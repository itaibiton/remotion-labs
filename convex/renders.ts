import { v } from "convex/values";
import { query, internalMutation, internalQuery } from "./_generated/server";

// Internal mutation for creating render records (called from action)
export const create = internalMutation({
  args: {
    userId: v.string(),
    generationId: v.optional(v.id("generations")),
    movieId: v.optional(v.id("movies")),
    clipId: v.optional(v.id("clips")),
    renderId: v.string(),
    bucketName: v.string(),
    status: v.union(v.literal("pending"), v.literal("rendering")),
    progress: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("renders", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Internal mutation for updating render state (called from action)
export const update = internalMutation({
  args: {
    id: v.id("renders"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("rendering"),
        v.literal("complete"),
        v.literal("failed")
      )
    ),
    progress: v.optional(v.number()),
    outputUrl: v.optional(v.string()),
    outputSize: v.optional(v.number()),
    error: v.optional(v.string()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(id, cleanUpdates);
  },
});

// Public query for getting render by ID (for progress UI)
export const get = query({
  args: { id: v.id("renders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Public query for getting render by generation (to check if render exists)
export const getByGeneration = query({
  args: { generationId: v.id("generations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("renders")
      .withIndex("by_generation", (q) => q.eq("generationId", args.generationId))
      .order("desc")
      .first();
  },
});

// Public query for user's render history
export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("renders")
      .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
      .order("desc")
      .take(20);
  },
});

// Public query for getting render by movie (to check if movie render exists)
export const getByMovie = query({
  args: { movieId: v.id("movies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("renders")
      .withIndex("by_movie", (q) => q.eq("movieId", args.movieId))
      .order("desc")
      .first();
  },
});

// Internal query for action lookups (authorization checks)
export const getInternal = internalQuery({
  args: { id: v.id("renders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
