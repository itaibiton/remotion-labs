import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Compute total duration in frames from a scenes array.
 * Uses durationOverride if present, otherwise fetches clip's durationInFrames.
 */
async function computeTotalDuration(
  ctx: { db: { get: (id: any) => Promise<any> } },
  scenes: Array<{ clipId: any; durationOverride?: number }>
): Promise<number> {
  let total = 0;
  for (const scene of scenes) {
    if (scene.durationOverride) {
      total += scene.durationOverride;
    } else {
      const clip = await ctx.db.get(scene.clipId);
      total += clip?.durationInFrames ?? 0;
    }
  }
  return total;
}

/**
 * Create a new empty movie.
 * Returns the new movie ID.
 */
export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const movieId = await ctx.db.insert("movies", {
      userId: identity.tokenIdentifier,
      name: args.name,
      scenes: [],
      totalDurationInFrames: 0,
      fps: 30,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return movieId;
  },
});

/**
 * List the current user's movies, newest first.
 * Returns empty array if not authenticated (graceful for loading states).
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const movies = await ctx.db
      .query("movies")
      .withIndex("by_user_updated", (q) =>
        q.eq("userId", identity.tokenIdentifier)
      )
      .order("desc")
      .take(50);

    return movies;
  },
});

/**
 * Get a single movie by ID.
 * No auth check -- movies are loaded by ID from URL params.
 */
export const get = query({
  args: {
    id: v.id("movies"),
  },
  handler: async (ctx, args) => {
    const movie = await ctx.db.get(args.id);
    return movie;
  },
});

/**
 * Get a movie with all referenced clip documents.
 * Fetches clips in parallel and filters out any deleted clips.
 */
export const getWithClips = query({
  args: {
    id: v.id("movies"),
  },
  handler: async (ctx, args) => {
    const movie = await ctx.db.get(args.id);
    if (!movie) return null;

    const clips = await Promise.all(
      movie.scenes.map((scene) => ctx.db.get(scene.clipId))
    );

    return {
      ...movie,
      // Preserve null entries so sceneClips[i] corresponds to scenes[i]
      sceneClips: clips,
    };
  },
});

/**
 * Add a clip as the last scene in a movie.
 * Enforces uniform fps across all clips in the movie.
 */
export const addScene = mutation({
  args: {
    movieId: v.id("movies"),
    clipId: v.id("clips"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const movie = await ctx.db.get(args.movieId);
    if (!movie || movie.userId !== identity.tokenIdentifier) {
      throw new Error("Movie not found");
    }

    const clip = await ctx.db.get(args.clipId);
    if (!clip) {
      throw new Error("Clip not found");
    }

    // Enforce uniform fps
    if (movie.scenes.length > 0 && clip.fps !== movie.fps) {
      throw new Error("Clip fps must match movie fps");
    }

    const newScenes = [...movie.scenes, { clipId: args.clipId }];
    const totalDuration = await computeTotalDuration(ctx, newScenes);

    await ctx.db.patch(args.movieId, {
      scenes: newScenes,
      totalDurationInFrames: totalDuration,
      fps: clip.fps,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Remove a scene by index from a movie.
 * Recomputes totalDurationInFrames after removal.
 */
export const removeScene = mutation({
  args: {
    movieId: v.id("movies"),
    sceneIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const movie = await ctx.db.get(args.movieId);
    if (!movie || movie.userId !== identity.tokenIdentifier) {
      throw new Error("Movie not found");
    }

    const newScenes = movie.scenes.filter(
      (_, i) => i !== args.sceneIndex
    );
    const totalDuration = await computeTotalDuration(ctx, newScenes);

    await ctx.db.patch(args.movieId, {
      scenes: newScenes,
      totalDurationInFrames: totalDuration,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Reorder scenes by replacing the entire scenes array.
 * Recomputes totalDurationInFrames after reorder.
 */
export const reorderScenes = mutation({
  args: {
    movieId: v.id("movies"),
    sceneOrder: v.array(
      v.object({
        clipId: v.id("clips"),
        durationOverride: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const movie = await ctx.db.get(args.movieId);
    if (!movie || movie.userId !== identity.tokenIdentifier) {
      throw new Error("Movie not found");
    }

    const totalDuration = await computeTotalDuration(ctx, args.sceneOrder);

    await ctx.db.patch(args.movieId, {
      scenes: args.sceneOrder,
      totalDurationInFrames: totalDuration,
      updatedAt: Date.now(),
    });
  },
});
