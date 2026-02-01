"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import * as acorn from "acorn";
import jsx from "acorn-jsx";
import { transform as sucraseTransform } from "sucrase";

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

// ============================================================================
// Aspect Ratio → Dimensions Map
// ============================================================================

const ASPECT_RATIO_MAP: Record<string, { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "1:1": { width: 1080, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
};

// ============================================================================
// Validation Pipeline (inlined for Convex bundler compatibility)
// ============================================================================

// Blocked identifiers - dangerous patterns that must be rejected
const BLOCKED_PATTERNS: ReadonlySet<string> = new Set([
  // Dynamic code execution
  "eval",
  "Function",
  // Module system
  "require",
  "module",
  "exports",
  // Network access
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  // DOM/Browser
  "document",
  "window",
  "location",
  "navigator",
  "localStorage",
  "sessionStorage",
  // Node.js globals
  "process",
  "global",
  "globalThis",
  "__dirname",
  "__filename",
  "Buffer",
  // Timers
  "setTimeout",
  "setInterval",
  // Dangerous APIs
  "Proxy",
  "Reflect",
  "constructor",
  "prototype",
  "__proto__",
]);

// Blocked member patterns
const BLOCKED_MEMBER_PATTERNS: ReadonlyArray<[string, string]> = [
  ["Object", "constructor"],
  ["Function", "prototype"],
  ["Function", "constructor"],
  ["Array", "constructor"],
];

// Allowed import sources
const ALLOWED_IMPORTS: ReadonlySet<string> = new Set([
  "remotion",
  "@remotion/google-fonts",
  "@remotion/animation-utils",
  "@remotion/layout-utils",
  "@remotion/shapes",
  "@remotion/noise",
  "@remotion/paths",
  "@remotion/media-utils",
  "@remotion/transitions",
  "@remotion/motion-blur",
  "@remotion/gif",
  "react",
]);

function isImportAllowed(source: string): boolean {
  if (ALLOWED_IMPORTS.has(source)) return true;
  if (source.startsWith("@remotion/")) return true;
  return false;
}

// Create JSX-enabled parser
const Parser = acorn.Parser.extend(jsx());

type ASTNode = acorn.Node & {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

interface ValidationResult {
  valid: boolean;
  errors: Array<{ line: number; column: number; message: string }>;
}

/**
 * Validates Remotion code against security allowlist
 */
function validateRemotionCode(code: string): ValidationResult {
  const errors: ValidationResult["errors"] = [];

  // Parse the code into AST
  let ast: ASTNode;
  try {
    ast = Parser.parse(code, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true,
    }) as ASTNode;
  } catch (e) {
    const parseError = e as { loc?: { line: number; column: number } };
    return {
      valid: false,
      errors: [
        {
          line: parseError.loc?.line ?? 1,
          column: parseError.loc?.column ?? 0,
          message: "Code contains syntax errors",
        },
      ],
    };
  }

  // Walk AST and validate
  walkNode(ast, errors);

  return { valid: errors.length === 0, errors };
}

function walkNode(node: ASTNode, errors: ValidationResult["errors"]): void {
  if (!node || typeof node !== "object") return;

  switch (node.type) {
    case "ImportDeclaration": {
      const source = node.source?.value;
      if (typeof source === "string" && !isImportAllowed(source)) {
        addError(errors, node, "Code contains unsafe patterns");
      }
      break;
    }
    case "Identifier": {
      const name = node.name;
      if (typeof name === "string" && BLOCKED_PATTERNS.has(name)) {
        addError(errors, node, "Code contains unsafe patterns");
      }
      break;
    }
    case "CallExpression": {
      const callee = node.callee;
      if (
        callee?.type === "Identifier" &&
        (callee.name === "require" ||
          callee.name === "eval" ||
          callee.name === "Function")
      ) {
        addError(errors, node, "Code contains unsafe patterns");
      }
      break;
    }
    case "MemberExpression": {
      const objectName =
        node.object?.type === "Identifier" ? node.object.name : null;
      const propertyName =
        node.property?.type === "Identifier" ? node.property.name : null;
      if (objectName && BLOCKED_PATTERNS.has(objectName) && propertyName) {
        addError(errors, node, "Code contains unsafe patterns");
      }
      if (objectName && propertyName) {
        for (const [blockedObj, blockedProp] of BLOCKED_MEMBER_PATTERNS) {
          if (objectName === blockedObj && propertyName === blockedProp) {
            addError(errors, node, "Code contains unsafe patterns");
            break;
          }
        }
      }
      break;
    }
    case "NewExpression": {
      const callee = node.callee;
      if (callee?.type === "Identifier" && BLOCKED_PATTERNS.has(callee.name)) {
        addError(errors, node, "Code contains unsafe patterns");
      }
      break;
    }
    case "ImportExpression": {
      addError(errors, node, "Code contains unsafe patterns");
      break;
    }
  }

  // Recursively walk children
  for (const key of Object.keys(node)) {
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === "object" && "type" in item) {
          walkNode(item as ASTNode, errors);
        }
      }
    } else if (child && typeof child === "object" && "type" in child) {
      walkNode(child as ASTNode, errors);
    }
  }
}

function addError(
  errors: ValidationResult["errors"],
  node: ASTNode,
  message: string
): void {
  errors.push({
    line: node.loc?.start?.line ?? 1,
    column: node.loc?.start?.column ?? 0,
    message,
  });
}

interface TransformResult {
  success: boolean;
  code?: string;
  error?: string;
}

/**
 * Transforms JSX to JavaScript using sucrase
 */
function transformJSX(jsxCode: string): TransformResult {
  try {
    const result = sucraseTransform(jsxCode, {
      transforms: ["jsx", "typescript"],
      jsxRuntime: "classic",
      production: true,
    });
    return { success: true, code: result.code };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Unknown transformation error";
    return {
      success: false,
      error: `JSX transformation failed: ${error}`,
    };
  }
}

// ============================================================================
// Refinement System Prompt
// ============================================================================

const REFINEMENT_SYSTEM_PROMPT = `You are a Remotion animation code modifier. You receive existing Remotion code and a user request to modify it.

IMPORTANT: Output ONLY the complete modified code. No markdown, no explanations, no code blocks.

Your output must:
1. Be the complete, modified version of the code (not a diff or partial update)
2. Keep the component named "MyComposition"
3. Keep the // DURATION and // FPS comments (update values if the user requests timing changes)
4. Use only these APIs (already available, don't write import statements):
   - React, useState, useEffect, useMemo, useCallback
   - AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Easing, random
   - Audio, Img, staticFile, Video, OffthreadVideo
   - Composition, Still, Series, Loop, Freeze

FORBIDDEN: import/require statements, eval, Function, fetch, document, window, process

Respond ONLY with the complete modified code. No explanations before or after.`;

// ============================================================================
// Continuation System Prompt
// ============================================================================

const CONTINUATION_SYSTEM_PROMPT = `You are a Remotion animation code generator specializing in scene continuations.
You create compositions that start EXACTLY where a previous composition ended.

You will receive the PREVIOUS SCENE's complete Remotion code. Your job:

STEP 1 - ANALYZE the previous scene's FINAL VISUAL STATE:
- Look at the // DURATION comment to know the total frames (the "last frame" number)
- For each interpolate(frame, [inputStart, inputEnd], [outputStart, outputEnd]):
  At the last frame, if lastFrame >= inputEnd, the output is outputEnd (or clamped if extrapolateRight is 'clamp')
- For each spring({frame, fps, ...}): At the last frame, the value settles to the 'to' param (default 1.0)
- Identify ALL visual properties at the last frame:
  - Positions (transform: translate, top/left, flex alignment)
  - Opacity values
  - Scale values
  - Rotation values
  - Colors (backgroundColor, color, borderColor)
  - Font sizes and text content
  - Which elements are visible (opacity > 0, not clipped by Sequence)

STEP 2 - Add a comment block at the top of your output:
// CONTINUATION FROM PREVIOUS SCENE
// End state: [brief description of the final visual state]
// DURATION: [frames, between 60-180]
// FPS: 30

STEP 3 - GENERATE a new composition where:
- Frame 0 MUST look VISUALLY IDENTICAL to the previous scene's last frame
- Set all initial values (before any interpolation) to match the previous scene's end-state values
- Use the same layout approach (AbsoluteFill, flex centering, etc.) as the previous scene
- Use the same coordinate system and positioning approach
- Keep consistent styling (font families, color palettes) unless the user requests changes
- Then animate FROM those starting values to new values based on the user's prompt
- If no specific user prompt, create a natural, visually interesting continuation

CRITICAL RULES:
- Component must be named "MyComposition"
- Do NOT use import statements (APIs are pre-injected)
- Output ONLY valid JSX code. No markdown, no explanations, no code blocks
- Available APIs: React, useState, useEffect, useMemo, useCallback,
  AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring,
  Sequence, Easing, random, Audio, Img, staticFile, Video, OffthreadVideo,
  Composition, Still, Series, Loop, Freeze
- FORBIDDEN: import/require, eval, Function, setTimeout, setInterval, fetch, XMLHttpRequest, WebSocket, document, window, process
- Use FPS 30. Duration between 60-180 frames.

EXAMPLE:
If the previous scene ends with white text "Hello" at center, opacity 1, scale 1.2,
backgroundColor '#1a1a2e', your continuation should start:

// CONTINUATION FROM PREVIOUS SCENE
// End state: "Hello" centered, white, opacity 1, scale 1.2, bg #1a1a2e
// DURATION: 90
// FPS: 30

const MyComposition = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Start from previous end state
  const opacity = interpolate(frame, [0, 30], [1, 0], { extrapolateRight: 'clamp' });
  const scale = interpolate(frame, [0, 30], [1.2, 0.8], { extrapolateRight: 'clamp' });
  // New element fading in as old fades out
  const newOpacity = interpolate(frame, [15, 45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a2e' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', opacity, transform: \`scale(\${scale})\`,
      }}>
        <h1 style={{ color: '#fff', fontSize: 80 }}>Hello</h1>
      </div>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: newOpacity,
      }}>
        <h1 style={{ color: '#fff', fontSize: 80 }}>World</h1>
      </div>
    </AbsoluteFill>
  );
};

Now generate a continuation based on the user's request.`;

// ============================================================================
// Shared Generation Helper (plain async function, NOT a Convex action)
// ============================================================================

/**
 * Calls Claude API, extracts code, validates, and transforms the result.
 * Used by both `generate` and `generateVariations` actions.
 *
 * @param client - Anthropic SDK client instance
 * @param prompt - User's prompt (sent as user message)
 * @param enhancedPrompt - System prompt with injected settings
 * @param temperature - Optional temperature override (omitted → Claude default)
 * @returns Validated and transformed code with metadata
 */
async function generateSingleVariation(
  client: Anthropic,
  prompt: string,
  enhancedPrompt: string,
  temperature?: number,
): Promise<{ rawCode: string; code: string; durationInFrames: number; fps: number }> {
  // Call Claude API (only include temperature if explicitly provided)
  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    system: enhancedPrompt,
    messages: [{ role: "user", content: prompt }],
    ...(temperature !== undefined ? { temperature } : {}),
  });

  // Extract text content from response
  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error(
      "Failed to generate animation: No text response from AI. Please try again."
    );
  }

  // Extract code from response - handle potential markdown code blocks
  let code = textContent.text.trim();

  // Strip markdown code blocks if present
  if (code.startsWith("```")) {
    code = code
      .replace(/^```(?:jsx|tsx|javascript|typescript)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "")
      .trim();
  }

  // Preserve original JSX for editor display (before any transformation)
  const rawCode = code;

  // Extract metadata from comments
  const durationMatch = code.match(/\/\/\s*DURATION:\s*(\d+)/);
  const fpsMatch = code.match(/\/\/\s*FPS:\s*(\d+)/);

  const rawDuration = durationMatch ? parseInt(durationMatch[1]) : 90;
  const rawFps = fpsMatch ? parseInt(fpsMatch[1]) : 30;

  // Clamp values for safety
  const durationInFrames = Math.min(Math.max(rawDuration, 30), 600);
  const fps = Math.min(Math.max(rawFps, 15), 60);

  // Validate the code
  const validation = validateRemotionCode(code);
  if (!validation.valid) {
    throw new Error(
      `Code validation failed: ${validation.errors[0]?.message || "Invalid code"}`
    );
  }

  // Transform JSX to JavaScript
  const transformed = transformJSX(code);
  if (!transformed.success || !transformed.code) {
    throw new Error(transformed.error || "Code transformation failed");
  }

  return {
    rawCode,
    code: transformed.code,
    durationInFrames,
    fps,
  };
}

// ============================================================================
// Generation Action
// ============================================================================

/**
 * Generate Remotion animation code using Claude API
 * Validates and transforms the code before storage
 */
export const generate = action({
  args: {
    prompt: v.string(),
    aspectRatio: v.optional(v.string()),
    durationInSeconds: v.optional(v.number()),
    fps: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    id: Id<"generations">;
    rawCode: string;
    code: string;
    durationInFrames: number;
    fps: number;
  }> => {
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

    // Resolve generation settings with defaults
    const aspectRatio = args.aspectRatio ?? "16:9";
    const dimensions = ASPECT_RATIO_MAP[aspectRatio] ?? { width: 1920, height: 1080 };
    const targetDuration = args.durationInSeconds ?? 3;
    const targetFps = args.fps ?? 30;
    const targetFrames = Math.round(targetDuration * targetFps);

    // Inject settings into system prompt
    const enhancedPrompt = SYSTEM_PROMPT +
      `\n\nIMPORTANT COMPOSITION SETTINGS:\n` +
      `- Dimensions: ${dimensions.width}x${dimensions.height} (${aspectRatio})\n` +
      `- Duration: ${targetFrames} frames at ${targetFps} FPS\n` +
      `- Use // DURATION: ${targetFrames} and // FPS: ${targetFps} in your output\n` +
      `- Design your layout for ${aspectRatio} aspect ratio`;

    // Call the shared helper (no temperature override → uses Claude default)
    const result = await generateSingleVariation(
      client,
      args.prompt,
      enhancedPrompt,
    );

    // Use the caller's target FPS (overrides whatever Claude put in comments)
    const fps = targetFps;

    // Store the successful generation with settings metadata
    const generationId: Id<"generations"> = await ctx.runMutation(
      internal.generations.store,
      {
        userId: identity.tokenIdentifier,
        prompt: args.prompt,
        code: result.code,
        rawCode: result.rawCode,
        durationInFrames: result.durationInFrames,
        fps,
        status: "success" as const,
        createdAt: Date.now(),
        aspectRatio,
        durationInSeconds: targetDuration,
      }
    );

    return {
      id: generationId,
      rawCode: result.rawCode,
      code: result.code,
      durationInFrames: result.durationInFrames,
      fps,
    };
  },
});

// ============================================================================
// Refinement Action (multi-turn chat)
// ============================================================================

/**
 * Refine existing Remotion animation code via multi-turn conversation with Claude.
 * Sends conversation history + current code, returns modified code.
 * Does NOT persist to database -- the caller manages local state updates.
 */
export const refine = action({
  args: {
    currentCode: v.string(),
    refinementPrompt: v.string(),
    conversationHistory: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    ),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    rawCode: string;
    code: string;
    durationInFrames: number;
    fps: number;
  }> => {
    // Check authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be logged in to refine animations");
    }

    // Create Anthropic client
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured.");
    }

    const client = new Anthropic({ apiKey });

    // Build messages array: conversation history + new refinement request
    // Cap history at last 10 exchanges (20 messages) to prevent token overflow
    const maxHistoryMessages = 20;
    const trimmedHistory = args.conversationHistory.slice(-maxHistoryMessages);

    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      ...trimmedHistory,
      {
        role: "user" as const,
        content: `Current Remotion code:\n\n${args.currentCode}\n\nPlease modify it: ${args.refinementPrompt}`,
      },
    ];

    // Call Claude API with refinement system prompt
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      system: REFINEMENT_SYSTEM_PROMPT,
      messages,
    });

    // Extract text content
    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("Failed to refine animation: No response from AI.");
    }

    // Clean code (same logic as generate action)
    let rawCode = textContent.text.trim();
    if (rawCode.startsWith("```")) {
      rawCode = rawCode
        .replace(/^```(?:jsx|tsx|javascript|typescript)?\s*\n?/, "")
        .replace(/\n?```\s*$/, "")
        .trim();
    }

    // Extract metadata
    const durationMatch = rawCode.match(/\/\/\s*DURATION:\s*(\d+)/);
    const fpsMatch = rawCode.match(/\/\/\s*FPS:\s*(\d+)/);
    const rawDuration = durationMatch ? parseInt(durationMatch[1]) : 90;
    const durationInFrames = Math.min(Math.max(rawDuration, 30), 600);
    const fps = fpsMatch ? Math.min(Math.max(parseInt(fpsMatch[1]), 15), 60) : 30;

    // Validate the refined code
    const validation = validateRemotionCode(rawCode);
    if (!validation.valid) {
      throw new Error(
        `Refined code validation failed: ${validation.errors[0]?.message || "Invalid code"}`
      );
    }

    // Transform JSX to JavaScript
    const transformed = transformJSX(rawCode);
    if (!transformed.success || !transformed.code) {
      throw new Error(transformed.error || "Code transformation failed");
    }

    return {
      rawCode,
      code: transformed.code,
      durationInFrames,
      fps,
    };
  },
});

// ============================================================================
// Continuation Generation Action
// ============================================================================

/**
 * Generate a continuation scene from an existing clip.
 * Fetches the source clip's rawCode, sends it to Claude with the continuation
 * system prompt, validates and transforms the output.
 * Does NOT persist to database -- returns result directly like refine.
 */
export const generateContinuation = action({
  args: {
    sourceClipId: v.id("clips"),
    prompt: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    rawCode: string;
    code: string;
    durationInFrames: number;
    fps: number;
  }> => {
    // Check authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be logged in to generate continuations");
    }

    // Fetch the source clip's raw JSX
    const sourceClip = await ctx.runQuery(internal.clips.getInternal, {
      id: args.sourceClipId,
    });
    if (!sourceClip) {
      throw new Error("Source clip not found");
    }
    if (!sourceClip.rawCode) {
      throw new Error(
        "Source clip has no raw code available for continuation"
      );
    }

    // Create Anthropic client
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY not configured. Please set it in your Convex environment variables."
      );
    }

    const client = new Anthropic({ apiKey });

    // Build user message with previous code + continuation request
    const userContent = args.prompt
      ? `PREVIOUS SCENE CODE:\n\`\`\`\n${sourceClip.rawCode}\n\`\`\`\n\nGenerate the next scene: ${args.prompt}`
      : `PREVIOUS SCENE CODE:\n\`\`\`\n${sourceClip.rawCode}\n\`\`\`\n\nGenerate a natural, visually interesting continuation.`;

    // Call Claude API with continuation system prompt
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      system: CONTINUATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    // Extract text content from response
    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error(
        "Failed to generate continuation: No text response from AI. Please try again."
      );
    }

    // Clean code -- strip markdown code blocks if present
    let rawCode = textContent.text.trim();
    if (rawCode.startsWith("```")) {
      rawCode = rawCode
        .replace(/^```(?:jsx|tsx|javascript|typescript)?\s*\n?/, "")
        .replace(/\n?```\s*$/, "")
        .trim();
    }

    // Extract metadata from comments
    const durationMatch = rawCode.match(/\/\/\s*DURATION:\s*(\d+)/);
    const rawDuration = durationMatch ? parseInt(durationMatch[1]) : 90;

    // Clamp values for safety
    const durationInFrames = Math.min(Math.max(rawDuration, 30), 600);
    const fps = 30; // Always 30 fps for consistency

    // Validate the continuation code
    const validation = validateRemotionCode(rawCode);
    if (!validation.valid) {
      throw new Error(
        `Continuation code validation failed: ${validation.errors[0]?.message || "Invalid code"}`
      );
    }

    // Transform JSX to JavaScript
    const transformed = transformJSX(rawCode);
    if (!transformed.success || !transformed.code) {
      throw new Error(transformed.error || "Code transformation failed");
    }

    return {
      rawCode,
      code: transformed.code,
      durationInFrames,
      fps,
    };
  },
});
