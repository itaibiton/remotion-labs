import { RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { RENDER_LIMITS } from "./lib/renderLimits";

// Initialize rate limiter with the component
const rateLimiter = new RateLimiter(components.rateLimiter, {
  // 5 renders per hour per user (fixed window)
  renderLimit: {
    kind: "fixed window",
    rate: RENDER_LIMITS.RENDERS_PER_HOUR,
    period: RENDER_LIMITS.RATE_WINDOW_MS,
  },
});

/**
 * Check if user can render (and consume a token if they can)
 * Returns true if allowed, false if rate limited
 */
export const checkRenderQuota = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const result = await rateLimiter.limit(ctx, "renderLimit", {
      key: args.userId,
      throws: false,
    });
    return result.ok;
  },
});

/**
 * Check if user can render without consuming quota
 * Used for UI feedback before render attempt
 */
export const canRender = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const result = await rateLimiter.check(ctx, "renderLimit", {
      key: args.userId,
    });
    return {
      allowed: result.ok,
      retryAfter: result.retryAfter,
    };
  },
});
