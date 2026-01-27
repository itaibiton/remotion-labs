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
});
