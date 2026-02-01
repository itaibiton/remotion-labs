"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import {
  renderMediaOnLambda,
  getRenderProgress,
  presignUrl,
} from "@remotion/lambda/client";
import { internal } from "./_generated/api";
import { RENDER_LIMITS, MOVIE_RENDER_LIMITS } from "./lib/renderLimits";
import { Id } from "./_generated/dataModel";

/**
 * Start a render job on Remotion Lambda
 * Checks quota, triggers render, stores job, and schedules polling
 */
export const startRender = action({
  args: {
    generationId: v.id("generations"),
    animationProps: v.object({
      text: v.string(),
      style: v.union(
        v.literal("fade-in"),
        v.literal("typewriter"),
        v.literal("slide-up"),
        v.literal("scale")
      ),
      fontFamily: v.string(),
      fontSize: v.number(),
      color: v.string(),
      backgroundColor: v.optional(v.string()),
      durationInFrames: v.number(),
      fps: v.literal(30),
    }),
  },
  handler: async (ctx, args): Promise<{ renderJobId: Id<"renders">; renderId: string }> => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to render");
    }

    // Check rate limit
    const quotaOk = await ctx.runMutation(internal.userQuotas.checkRenderQuota, {
      userId: identity.tokenIdentifier,
    });
    if (!quotaOk) {
      throw new Error("Render quota exceeded. You can render up to 5 videos per hour. Please try again later.");
    }

    // Validate duration cap
    if (args.animationProps.durationInFrames > RENDER_LIMITS.MAX_DURATION_FRAMES) {
      throw new Error(`Animation too long. Maximum duration is ${RENDER_LIMITS.MAX_DURATION_SECONDS} seconds.`);
    }

    // Get environment variables
    const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME;
    const serveUrl = process.env.REMOTION_SERVE_URL;
    const region = (process.env.REMOTION_AWS_REGION || "us-east-1") as "us-east-1";

    if (!functionName || !serveUrl) {
      throw new Error("Render service not configured. Please contact support.");
    }

    // Trigger Lambda render
    const { renderId, bucketName } = await renderMediaOnLambda({
      region,
      functionName,
      serveUrl,
      composition: "TextAnimation",
      inputProps: args.animationProps,
      codec: "h264",
      timeoutInMilliseconds: RENDER_LIMITS.LAMBDA_TIMEOUT_MS,
    });

    // Store render job in database
    const renderJobId = await ctx.runMutation(internal.renders.create, {
      userId: identity.tokenIdentifier,
      generationId: args.generationId,
      renderId,
      bucketName,
      status: "rendering",
      progress: 0,
    });

    // Schedule first progress poll
    await ctx.scheduler.runAfter(
      RENDER_LIMITS.POLL_INTERVAL_MS,
      internal.triggerRender.pollProgress,
      {
        renderJobId,
        renderId,
        bucketName,
        region,
      }
    );

    return { renderJobId, renderId };
  },
});

/**
 * Poll render progress from Remotion Lambda
 * Updates database and schedules next poll if not complete
 */
export const pollProgress = internalAction({
  args: {
    renderJobId: v.id("renders"),
    renderId: v.string(),
    bucketName: v.string(),
    region: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME;
    if (!functionName) {
      await ctx.runMutation(internal.renders.update, {
        id: args.renderJobId,
        status: "failed",
        error: "Render service not configured",
      });
      return;
    }

    try {
      const progress = await getRenderProgress({
        renderId: args.renderId,
        bucketName: args.bucketName,
        functionName,
        region: args.region as "us-east-1",
      });

      // Check for fatal error
      if (progress.fatalErrorEncountered) {
        await ctx.runMutation(internal.renders.update, {
          id: args.renderJobId,
          status: "failed",
          error: progress.errors?.[0]?.message ?? "Render failed",
          completedAt: Date.now(),
        });
        return;
      }

      // Check if complete
      if (progress.done && progress.outputFile) {
        // Generate presigned URL for download (1 hour expiry)
        const outputUrl = await presignUrl({
          region: args.region as "us-east-1",
          bucketName: args.bucketName,
          objectKey: progress.outKey!,
          expiresInSeconds: 3600,
          checkIfObjectExists: true,
        });

        await ctx.runMutation(internal.renders.update, {
          id: args.renderJobId,
          status: "complete",
          progress: 100,
          outputUrl: outputUrl ?? undefined,
          outputSize: progress.outputSizeInBytes ?? undefined,
          completedAt: Date.now(),
        });
        return;
      }

      // Update progress and schedule next poll
      const progressPercent = Math.round((progress.overallProgress ?? 0) * 100);
      await ctx.runMutation(internal.renders.update, {
        id: args.renderJobId,
        progress: progressPercent,
      });

      // Schedule next poll
      await ctx.scheduler.runAfter(
        RENDER_LIMITS.POLL_INTERVAL_MS,
        internal.triggerRender.pollProgress,
        {
          renderJobId: args.renderJobId,
          renderId: args.renderId,
          bucketName: args.bucketName,
          region: args.region,
        }
      );
    } catch (error) {
      // Handle polling errors
      await ctx.runMutation(internal.renders.update, {
        id: args.renderJobId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error during render",
        completedAt: Date.now(),
      });
    }
  },
});

/**
 * Start a movie render job on Remotion Lambda
 * Fetches all scenes, validates limits, triggers Lambda with MovieComposition
 */
export const startMovieRender = action({
  args: {
    movieId: v.id("movies"),
  },
  handler: async (ctx, args): Promise<{ renderJobId: Id<"renders">; renderId: string }> => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to render");
    }

    // Check rate limit
    const quotaOk = await ctx.runMutation(internal.userQuotas.checkRenderQuota, {
      userId: identity.tokenIdentifier,
    });
    if (!quotaOk) {
      throw new Error("Render quota exceeded. You can render up to 5 videos per hour. Please try again later.");
    }

    // Fetch movie with clips
    const movie = await ctx.runQuery(internal.movies.getWithClipsInternal, {
      id: args.movieId,
    });
    if (!movie) {
      throw new Error("Movie not found");
    }

    // Build scenes array from clips (skip nulls for deleted clips)
    const scenes = movie.sceneClips
      .filter((clip: any): clip is NonNullable<typeof clip> => clip !== null)
      .map((clip: any) => ({
        code: clip.code as string,
        durationInFrames: clip.durationInFrames as number,
        fps: clip.fps as number,
      }));

    if (scenes.length === 0) {
      throw new Error("Movie has no valid scenes");
    }

    if (scenes.length > MOVIE_RENDER_LIMITS.MAX_SCENES) {
      throw new Error(`Movie has too many scenes. Maximum is ${MOVIE_RENDER_LIMITS.MAX_SCENES} scenes.`);
    }

    // Validate total duration
    const totalFrames = scenes.reduce((sum: number, s: { durationInFrames: number }) => sum + s.durationInFrames, 0);
    if (totalFrames > MOVIE_RENDER_LIMITS.MAX_DURATION_FRAMES) {
      throw new Error(`Movie too long. Maximum duration is ${MOVIE_RENDER_LIMITS.MAX_DURATION_SECONDS} seconds.`);
    }

    // Get environment variables
    const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME;
    const serveUrl = process.env.REMOTION_SERVE_URL;
    const region = (process.env.REMOTION_AWS_REGION || "us-east-1") as "us-east-1";

    if (!functionName || !serveUrl) {
      throw new Error("Render service not configured. Please contact support.");
    }

    // Trigger Lambda render with MovieComposition
    const { renderId, bucketName } = await renderMediaOnLambda({
      region,
      functionName,
      serveUrl,
      composition: "MovieComposition",
      inputProps: { scenes },
      codec: "h264",
      timeoutInMilliseconds: MOVIE_RENDER_LIMITS.LAMBDA_TIMEOUT_MS,
    });

    // Store render job in database (with movieId instead of generationId)
    const renderJobId = await ctx.runMutation(internal.renders.create, {
      userId: identity.tokenIdentifier,
      movieId: args.movieId,
      renderId,
      bucketName,
      status: "rendering",
      progress: 0,
    });

    // Schedule first progress poll
    await ctx.scheduler.runAfter(
      MOVIE_RENDER_LIMITS.POLL_INTERVAL_MS,
      internal.triggerRender.pollProgress,
      {
        renderJobId,
        renderId,
        bucketName,
        region,
      }
    );

    return { renderJobId, renderId };
  },
});

/**
 * Start a single clip render job on Remotion Lambda
 * Renders a DynamicCode composition for an individual clip from the library
 */
export const startClipRender = action({
  args: {
    clipId: v.id("clips"),
  },
  handler: async (ctx, args): Promise<{ renderJobId: Id<"renders">; renderId: string }> => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to render");
    }

    // Check rate limit
    const quotaOk = await ctx.runMutation(internal.userQuotas.checkRenderQuota, {
      userId: identity.tokenIdentifier,
    });
    if (!quotaOk) {
      throw new Error("Render quota exceeded. You can render up to 5 videos per hour. Please try again later.");
    }

    // Fetch clip
    const clip = await ctx.runQuery(internal.clips.getInternal, {
      id: args.clipId,
    });
    if (!clip) {
      throw new Error("Clip not found");
    }

    // Validate duration against single-clip limits
    if (clip.durationInFrames > RENDER_LIMITS.MAX_DURATION_FRAMES) {
      throw new Error(`Clip too long. Maximum duration is ${RENDER_LIMITS.MAX_DURATION_SECONDS} seconds.`);
    }

    // Get environment variables
    const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME;
    const serveUrl = process.env.REMOTION_SERVE_URL;
    const region = (process.env.REMOTION_AWS_REGION || "us-east-1") as "us-east-1";

    if (!functionName || !serveUrl) {
      throw new Error("Render service not configured. Please contact support.");
    }

    // Trigger Lambda render with DynamicCode composition
    const { renderId, bucketName } = await renderMediaOnLambda({
      region,
      functionName,
      serveUrl,
      composition: "DynamicCode",
      inputProps: {
        code: clip.code,
        durationInFrames: clip.durationInFrames,
        fps: clip.fps,
      },
      codec: "h264",
      timeoutInMilliseconds: RENDER_LIMITS.LAMBDA_TIMEOUT_MS,
    });

    // Store render job in database (with clipId)
    const renderJobId = await ctx.runMutation(internal.renders.create, {
      userId: identity.tokenIdentifier,
      clipId: args.clipId,
      renderId,
      bucketName,
      status: "rendering",
      progress: 0,
    });

    // Schedule first progress poll
    await ctx.scheduler.runAfter(
      RENDER_LIMITS.POLL_INTERVAL_MS,
      internal.triggerRender.pollProgress,
      {
        renderJobId,
        renderId,
        bucketName,
        region,
      }
    );

    return { renderJobId, renderId };
  },
});

/**
 * Regenerate presigned URL for download
 * Used when original URL expires
 */
export const refreshDownloadUrl = action({
  args: { renderJobId: v.id("renders") },
  handler: async (ctx, args): Promise<{ outputUrl: string | undefined }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated");
    }

    // Get the render job
    const render = await ctx.runQuery(internal.renders.getInternal, {
      id: args.renderJobId,
    });

    if (!render || render.userId !== identity.tokenIdentifier) {
      throw new Error("Render not found");
    }

    if (render.status !== "complete") {
      throw new Error("Render not complete");
    }

    // Return existing URL if still valid
    return { outputUrl: render.outputUrl };
  },
});
