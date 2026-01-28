"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";
import { internal } from "./_generated/api";
import { textAnimationSchema, TextAnimationProps } from "./lib/validation";
import { Id } from "./_generated/dataModel";

/**
 * System prompt for Claude to generate full Remotion JSX code
 * Outputs complete, self-contained Remotion compositions
 */
const SYSTEM_PROMPT = `You are a Remotion animation code generator. You create complete, self-contained Remotion compositions.

IMPORTANT: Output ONLY valid JSX code. No markdown, no explanations, no code blocks.

Your output must:
1. Define a component named "MyComposition"
2. Use only these APIs (already available, don't write import statements):
   - React, useState, useEffect, useMemo, useCallback
   - AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Easing, random
   - Audio, Img, staticFile, Video, OffthreadVideo
   - Composition, Still, Series, Loop, Freeze

3. Set duration and fps via comments at the top:
   // DURATION: 90
   // FPS: 30

4. Create visually interesting animations using Remotion's features

ALLOWED PATTERNS:
- interpolate(frame, [0, 30], [0, 1]) for smooth transitions
- spring({ frame, fps, config: { damping: 10 } }) for physics-based motion
- useCurrentFrame() to get current frame
- useVideoConfig() for { fps, durationInFrames, width, height }
- <AbsoluteFill> for full-screen containers
- <Sequence from={30}> for timed sequences
- Inline styles with transform, opacity, scale
- random(seed) for deterministic randomness (use a string seed like random('my-seed'))

EXAMPLE OUTPUT:
// DURATION: 90
// FPS: 30

const MyComposition = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const scale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a2e' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        opacity,
        transform: \`scale(\${scale})\`,
      }}>
        <h1 style={{ color: '#eee', fontSize: 80 }}>Hello World</h1>
      </div>
    </AbsoluteFill>
  );
};

FORBIDDEN:
- import/require statements (APIs are pre-injected)
- eval, Function, setTimeout, setInterval
- fetch, XMLHttpRequest, WebSocket
- document, window, process
- while(true) or infinite loops

Now generate a Remotion composition based on the user's request.`;

/**
 * Generate text animation properties using Claude API
 * Validates the response and stores the generation in the database
 */
export const generate = action({
  args: {
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    // Check authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be logged in to generate animations");
    }

    // Validate input length
    if (args.prompt.length > 2000) {
      throw new Error("Prompt too long. Please use 2000 characters or less.");
    }

    // Create Anthropic client
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY not configured. Please set it in your Convex environment variables."
      );
    }

    const client = new Anthropic({ apiKey });

    // Call Claude API
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: args.prompt }],
    });

    // Extract text content from response
    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error(
        "Failed to generate animation: No text response from AI. Please try again."
      );
    }

    // Parse JSON response - handle potential markdown code blocks
    let parsedProps: unknown;
    let jsonText = textContent.text.trim();

    // Strip markdown code blocks if present
    if (jsonText.startsWith("```")) {
      // Remove opening ```json or ``` and closing ```
      jsonText = jsonText
        .replace(/^```(?:json)?\s*\n?/, "")
        .replace(/\n?```\s*$/, "")
        .trim();
    }

    try {
      parsedProps = JSON.parse(jsonText);
    } catch {
      throw new Error(
        "Failed to parse AI response. The AI returned invalid JSON. Please try again with a clearer prompt."
      );
    }

    // Validate with Zod schema
    const result = textAnimationSchema.safeParse(parsedProps);
    if (!result.success) {
      const errorMessages = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      throw new Error(
        `Generated animation has invalid properties: ${errorMessages}. Please try again.`
      );
    }

    // Store the successful generation
    const generationId: Id<"generations"> = await ctx.runMutation(
      internal.generations.store,
      {
        userId: identity.tokenIdentifier,
        prompt: args.prompt,
        animationProps: result.data,
        status: "success" as const,
        createdAt: Date.now(),
      }
    );

    return {
      id: generationId,
      animationProps: result.data,
    };
  },
});
