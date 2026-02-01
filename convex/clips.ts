import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Save a new clip to the user's library.
 * Stores both the transformed JS (for execution) and raw JSX (for editor display).
 */
export const save = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    rawCode: v.string(),
    durationInFrames: v.number(),
    fps: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const clipId = await ctx.db.insert("clips", {
      userId: identity.tokenIdentifier,
      name: args.name,
      code: args.code,
      rawCode: args.rawCode,
      durationInFrames: args.durationInFrames,
      fps: args.fps,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return clipId;
  },
});

/**
 * List the current user's clips, newest first.
 * Returns empty array if not authenticated (graceful for loading states).
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const clips = await ctx.db
      .query("clips")
      .withIndex("by_user_updated", (q) =>
        q.eq("userId", identity.tokenIdentifier)
      )
      .order("desc")
      .take(50);

    return clips;
  },
});

/**
 * Get a single clip by ID.
 * No auth check -- clips are loaded by ID from URL params on the create page.
 */
export const get = query({
  args: {
    id: v.id("clips"),
  },
  handler: async (ctx, args) => {
    const clip = await ctx.db.get(args.id);
    return clip;
  },
});

/**
 * Remove a clip. Only the owning user can delete their clips.
 */
export const remove = mutation({
  args: {
    id: v.id("clips"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const clip = await ctx.db.get(args.id);
    if (!clip || clip.userId !== identity.tokenIdentifier) {
      throw new Error("Clip not found");
    }

    await ctx.db.delete(args.id);
  },
});
