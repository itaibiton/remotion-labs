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
// Generation Action
// ============================================================================

/**
 * Generate Remotion animation code using Claude API
 * Validates and transforms the code before storage
 */
export const generate = action({
  args: {
    prompt: v.string(),
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
    const fps = 30; // Always 30 fps for consistency

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

    // Store the successful generation
    const generationId: Id<"generations"> = await ctx.runMutation(
      internal.generations.store,
      {
        userId: identity.tokenIdentifier,
        prompt: args.prompt,
        code: transformed.code,
        rawCode,
        durationInFrames,
        fps,
        status: "success" as const,
        createdAt: Date.now(),
      }
    );

    return {
      id: generationId,
      rawCode,
      code: transformed.code,
      durationInFrames,
      fps,
    };
  },
});
