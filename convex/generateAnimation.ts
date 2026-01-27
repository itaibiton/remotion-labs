"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";
import { internal } from "./_generated/api";
import { textAnimationSchema, TextAnimationProps } from "./lib/validation";
import { Id } from "./_generated/dataModel";

/**
 * System prompt for Claude to generate animation properties
 * Instructs Claude to output ONLY valid JSON matching the textAnimationSchema
 */
const SYSTEM_PROMPT = `You are an animation generator that creates text animation properties. You must output ONLY valid JSON - no markdown, no code blocks, no explanations.

The JSON must match this exact schema:
{
  "text": string (1-500 characters, the text to animate),
  "style": "fade-in" | "typewriter" | "slide-up" | "scale",
  "fontFamily": string (default: "Inter"),
  "fontSize": number (12-200, default: 48),
  "color": string (hex format #RRGGBB),
  "backgroundColor": string (optional, hex format #RRGGBB),
  "durationInFrames": number (30-600, default: 90),
  "fps": 30 (always 30)
}

Animation styles:
- "fade-in": Opacity transitions from 0 to 1 over the duration. Good for elegant, subtle reveals.
- "typewriter": Text appears character by character, like typing. Good for quotes, messages, technical content.
- "slide-up": Text slides up from below into position. Good for dynamic, energetic content.
- "scale": Text scales from 0 to 1, growing from the center. Good for impactful, attention-grabbing text.

Rules:
1. Output ONLY the JSON object - no markdown code blocks, no explanations
2. Colors must be valid hex (#RRGGBB format)
3. durationInFrames typically 60-180 (2-6 seconds at 30fps)
4. Choose style based on the prompt's mood and content
5. If no specific text is provided, create appropriate text based on the prompt

Example output:
{"text":"Hello World","style":"fade-in","fontFamily":"Inter","fontSize":64,"color":"#FFFFFF","backgroundColor":"#000000","durationInFrames":90,"fps":30}`;

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

    // Parse JSON response
    let parsedProps: unknown;
    try {
      parsedProps = JSON.parse(textContent.text);
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
