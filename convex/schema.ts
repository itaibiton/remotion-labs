import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_token", ["tokenIdentifier"]),

  generations: defineTable({
    userId: v.string(),
    prompt: v.string(),
    // v1.1: Full Remotion JSX code (transformed to JS)
    code: v.optional(v.string()),
    // v1.1: Original JSX code before transformation (for editor display)
    rawCode: v.optional(v.string()),
    // v1.0 legacy: Animation props for fixed templates (deprecated)
    animationProps: v.optional(v.object({
      text: v.string(),
      style: v.string(),
      color: v.string(),
      backgroundColor: v.string(),
      fontFamily: v.string(),
      fontSize: v.number(),
      durationInFrames: v.number(),
      fps: v.number(),
    })),
    // v1.1: Extracted from code generation
    durationInFrames: v.optional(v.number()),
    fps: v.optional(v.number()),
    status: v.union(v.literal("success"), v.literal("failed")),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    // v0.2 Phase 13: batch/variation tracking
    batchId: v.optional(v.string()),
    variationIndex: v.optional(v.number()),
    variationCount: v.optional(v.number()),
    // v0.2 Phase 13: generation settings
    aspectRatio: v.optional(v.string()),  // "16:9" | "1:1" | "9:16"
    durationInSeconds: v.optional(v.number()),
    // v0.2 Phase 15: image upload (placeholder)
    referenceImageIds: v.optional(v.array(v.string())),
    // v0.2 Phase 12: continuation tracking
    continuationType: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_batchId", ["batchId"]),

  clips: defineTable({
    userId: v.string(),
    name: v.string(),
    code: v.string(),           // Transformed JS (for execution/preview)
    rawCode: v.string(),        // Original JSX (for editor display)
    durationInFrames: v.number(),
    fps: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"]),

  movies: defineTable({
    userId: v.string(),
    name: v.string(),
    scenes: v.array(v.object({
      clipId: v.id("clips"),
      durationOverride: v.optional(v.number()),
    })),
    totalDurationInFrames: v.number(),
    fps: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"]),

  renders: defineTable({
    userId: v.string(),
    generationId: v.optional(v.id("generations")),
    movieId: v.optional(v.id("movies")),
    clipId: v.optional(v.id("clips")),
    renderId: v.string(), // Remotion Lambda render ID
    bucketName: v.string(), // S3 bucket
    status: v.union(
      v.literal("pending"),
      v.literal("rendering"),
      v.literal("complete"),
      v.literal("failed")
    ),
    progress: v.number(), // 0-100
    outputUrl: v.optional(v.string()), // Presigned download URL
    outputSize: v.optional(v.number()), // Bytes
    error: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_generation", ["generationId"])
    .index("by_movie", ["movieId"])
    .index("by_status", ["status"]),
});
