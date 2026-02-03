import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";

/**
 * Compute total duration in frames from a scenes array.
 * Uses durationOverride if present, otherwise fetches clip's durationInFrames.
 * Accounts for trimStart/trimEnd (non-destructive trim).
 */
async function computeTotalDuration(
  ctx: { db: { get: (id: any) => Promise<any> } },
  scenes: Array<{ clipId: any; durationOverride?: number; trimStart?: number; trimEnd?: number }>
): Promise<number> {
  let total = 0;
  for (const scene of scenes) {
    let baseDuration: number;
    if (scene.durationOverride) {
      baseDuration = scene.durationOverride;
    } else {
      const clip = await ctx.db.get(scene.clipId);
      baseDuration = clip?.durationInFrames ?? 0;
    }
    const trimStart = scene.trimStart ?? 0;
    const trimEnd = scene.trimEnd ?? 0;
    total += Math.max(0, baseDuration - trimStart - trimEnd);
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
 * Internal query for action use (e.g., startMovieRender).
 * Returns movie with all referenced clip documents.
 */
export const getWithClipsInternal = internalQuery({
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
      sceneClips: clips,
    };
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
 * Insert a scene at a specific position in the movie.
 * Use afterIndex to insert after a scene, or beforeIndex to insert before.
 */
export const insertScene = mutation({
  args: {
    movieId: v.id("movies"),
    clipId: v.id("clips"),
    afterIndex: v.optional(v.number()),  // Insert after this index
    beforeIndex: v.optional(v.number()), // Insert before this index
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const movie = await ctx.db.get(args.movieId);
    if (!movie || movie.userId !== identity.tokenIdentifier) {
      throw new Error("Movie not found");
    }

    const clip = await ctx.db.get(args.clipId);
    if (!clip) throw new Error("Clip not found");

    // Determine insertion index
    let insertAt: number;
    if (args.afterIndex !== undefined) {
      insertAt = args.afterIndex + 1;
    } else if (args.beforeIndex !== undefined) {
      insertAt = args.beforeIndex;
    } else {
      insertAt = movie.scenes.length; // Append by default
    }

    // Clamp to valid range
    insertAt = Math.max(0, Math.min(insertAt, movie.scenes.length));

    // Normalize duration if FPS differs
    const durationOverride =
      clip.fps !== movie.fps
        ? Math.round(clip.durationInFrames * (movie.fps / clip.fps))
        : undefined;

    const newScene = {
      clipId: args.clipId,
      ...(durationOverride !== undefined && { durationOverride }),
    };

    const newScenes = [
      ...movie.scenes.slice(0, insertAt),
      newScene,
      ...movie.scenes.slice(insertAt),
    ];

    const totalDuration = await computeTotalDuration(ctx, newScenes);

    await ctx.db.patch(args.movieId, {
      scenes: newScenes,
      totalDurationInFrames: totalDuration,
      updatedAt: Date.now(),
    });

    return { insertedAt: insertAt };
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

    // Normalize clip duration to movie fps when they differ
    const durationOverride =
      clip.fps !== movie.fps
        ? Math.round(clip.durationInFrames * (movie.fps / clip.fps))
        : undefined;

    const newScenes = [
      ...movie.scenes,
      { clipId: args.clipId, ...(durationOverride !== undefined && { durationOverride }) },
    ];
    const totalDuration = await computeTotalDuration(ctx, newScenes);

    await ctx.db.patch(args.movieId, {
      scenes: newScenes,
      totalDurationInFrames: totalDuration,
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
        trimStart: v.optional(v.number()),
        trimEnd: v.optional(v.number()),
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

/**
 * Trim a scene by setting trimStart and/or trimEnd values.
 * Non-destructive: original clip data is preserved, only playback range changes.
 */
export const trimScene = mutation({
  args: {
    movieId: v.id("movies"),
    sceneIndex: v.number(),
    trimStart: v.optional(v.number()),
    trimEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const movie = await ctx.db.get(args.movieId);
    if (!movie || movie.userId !== identity.tokenIdentifier) {
      throw new Error("Movie not found");
    }

    const scene = movie.scenes[args.sceneIndex];
    if (!scene) throw new Error("Scene not found");

    // Get base duration for validation
    const clip = await ctx.db.get(scene.clipId);
    const baseDuration = scene.durationOverride ?? clip?.durationInFrames ?? 0;
    const trimStart = args.trimStart ?? scene.trimStart ?? 0;
    const trimEnd = args.trimEnd ?? scene.trimEnd ?? 0;

    // Validate: trim values must be non-negative
    if (trimStart < 0 || trimEnd < 0) {
      throw new Error("Trim values must be non-negative");
    }
    // Validate: effective duration must be at least 1 frame
    if (trimStart + trimEnd >= baseDuration) {
      throw new Error("Trim would result in zero or negative duration");
    }

    // Update scene with new trim values
    const newScenes = [...movie.scenes];
    newScenes[args.sceneIndex] = {
      ...scene,
      trimStart: args.trimStart ?? scene.trimStart,
      trimEnd: args.trimEnd ?? scene.trimEnd,
    };

    const totalDuration = await computeTotalDuration(ctx, newScenes);

    await ctx.db.patch(args.movieId, {
      scenes: newScenes,
      totalDurationInFrames: totalDuration,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Split a scene into two at the specified frame position.
 * Creates two scenes from one: both reference the same clipId but with different trim ranges.
 * splitFrame is the frame position in the ORIGINAL clip (not the visible portion).
 */
export const splitScene = mutation({
  args: {
    movieId: v.id("movies"),
    sceneIndex: v.number(),
    splitFrame: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const movie = await ctx.db.get(args.movieId);
    if (!movie || movie.userId !== identity.tokenIdentifier) {
      throw new Error("Movie not found");
    }

    const scene = movie.scenes[args.sceneIndex];
    if (!scene) throw new Error("Scene not found");

    // Get base duration for validation
    const clip = await ctx.db.get(scene.clipId);
    const baseDuration = scene.durationOverride ?? clip?.durationInFrames ?? 0;
    const trimStart = scene.trimStart ?? 0;
    const trimEnd = scene.trimEnd ?? 0;

    // Validate split position is within the visible range (after trimStart, before trimEnd)
    if (args.splitFrame <= trimStart) {
      throw new Error("Split position must be after the trim start");
    }
    if (args.splitFrame >= baseDuration - trimEnd) {
      throw new Error("Split position must be before the trim end");
    }

    // Create two new scenes from the split
    const firstScene = {
      clipId: scene.clipId,
      ...(scene.durationOverride !== undefined && { durationOverride: scene.durationOverride }),
      trimStart: trimStart,
      trimEnd: baseDuration - args.splitFrame,
    };

    const secondScene = {
      clipId: scene.clipId,
      ...(scene.durationOverride !== undefined && { durationOverride: scene.durationOverride }),
      trimStart: args.splitFrame,
      trimEnd: trimEnd,
    };

    // Replace original scene with the two new scenes
    const newScenes = [
      ...movie.scenes.slice(0, args.sceneIndex),
      firstScene,
      secondScene,
      ...movie.scenes.slice(args.sceneIndex + 1),
    ];

    const totalDuration = await computeTotalDuration(ctx, newScenes);

    await ctx.db.patch(args.movieId, {
      scenes: newScenes,
      totalDurationInFrames: totalDuration,
      updatedAt: Date.now(),
    });

    return {
      firstSceneIndex: args.sceneIndex,
      secondSceneIndex: args.sceneIndex + 1,
    };
  },
});
