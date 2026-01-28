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
    status: v.union(v.literal("success"), v.literal("failed")),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_created", ["userId", "createdAt"]),

  renders: defineTable({
    userId: v.string(),
    generationId: v.id("generations"),
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
    .index("by_status", ["status"]),
});
