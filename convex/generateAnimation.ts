"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import * as acorn from "acorn";
import jsx from "acorn-jsx";
import { transform as sucraseTransform } from "sucrase";

// Model configuration with fallback
const PRIMARY_MODEL = "claude-sonnet-4-5-20250929";
const FALLBACK_MODEL = "claude-3-5-sonnet-20241022";

/**
 * Retry helper with exponential backoff and model fallback for handling API overload errors
 */
async function withRetry<T>(
  fn: (model: string) => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1500
): Promise<T> {
  let lastError: Error | undefined;
  let currentModel = PRIMARY_MODEL;

  for (let attempt = 0; attempt <= maxRetries * 2; attempt++) {
    // Switch to fallback model after first round of retries
    if (attempt === maxRetries + 1) {
      console.log(`[withRetry] Switching to fallback model: ${FALLBACK_MODEL}`);
      currentModel = FALLBACK_MODEL;
    }

    console.log(`[withRetry] Attempt ${attempt + 1} with model: ${currentModel}`);

    try {
      const result = await fn(currentModel);
      console.log(`[withRetry] Success on attempt ${attempt + 1}`);
      return result;
    } catch (error: unknown) {
      lastError = error as Error;

      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorString = String(error);

      console.log(`[withRetry] Error on attempt ${attempt + 1}:`, errorMessage.substring(0, 150));

      // Check for overload/rate limit errors (529, 429)
      const isRetryable = errorString.includes("529") ||
                          errorString.includes("overloaded") ||
                          errorString.includes("Overloaded") ||
                          errorString.includes("429") ||
                          errorString.includes("rate_limit");

      if (!isRetryable) {
        console.log(`[withRetry] Error not retryable, throwing immediately`);
        throw error;
      }

      if (attempt === maxRetries * 2) {
        console.log(`[withRetry] All retries exhausted, throwing`);
        throw error;
      }

      // Shorter backoff: 1.5s, 3s, 4.5s + jitter
      const jitter = Math.random() * 500;
      const delay = baseDelayMs * (1 + (attempt % (maxRetries + 1))) + jitter;
      console.log(`[withRetry] Waiting ${Math.round(delay)}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Remotion Best Practices from Official Remotion Skills
 * Source: https://github.com/remotion-dev/skills
 *
 * Restructured for clarity with prioritized critical rules at top.
 */
const REMOTION_BEST_PRACTICES = `
<critical_rules>
## CRITICAL: These rules MUST be followed or the video will not render

1. ALL animations MUST use useCurrentFrame() - CSS animations/Tailwind animate classes are FORBIDDEN
2. interpolate() inputRange MUST be strictly increasing: [0, 30, 60] ✓ | [0, 60, 30] ✗
3. ALWAYS add extrapolation to interpolate:
   interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
4. Use random('seed-string') instead of Math.random() for deterministic renders
5. NO CSS transitions, NO Tailwind animation classes - they don't render in video
6. NO import/require statements - APIs are pre-injected as globals
</critical_rules>

<spring_presets>
## Spring Configurations (choose based on desired feel)

| Preset | Config | Use For |
|--------|--------|---------|
| Smooth | { damping: 200 } | Subtle reveals, professional motion (DEFAULT) |
| Snappy | { damping: 20, stiffness: 200 } | UI elements, quick responses |
| Bouncy | { damping: 8 } | Playful, energetic animations |
| Heavy | { damping: 15, stiffness: 80, mass: 2 } | Slow, weighted motion |

Default to SMOOTH (damping: 200) unless the user requests bouncy/playful.
</spring_presets>

<timing_patterns>
## Animation Timing (in seconds, multiply by fps for frames)

- Fade in: 0.3-0.5s (9-15 frames at 30fps)
- Slide/move: 0.4-0.8s (12-24 frames)
- Scale: 0.3-0.6s (9-18 frames)
- Stagger delay: 0.1-0.2s between elements (3-6 frames)
- Hold/pause: 1-2s for readability
</timing_patterns>

<structure>
## Code Structure Pattern

const MyComposition = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // 1. Define all animations upfront with extrapolation
  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slideUp = spring({
    frame,
    fps,
    config: { damping: 200 }, // Smooth, no bounce
  });

  // 2. Return JSX with animations applied
  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a2e' }}>
      <div style={{ opacity: fadeIn, transform: \`translateY(\${(1 - slideUp) * 50}px)\` }}>
        Content here
      </div>
    </AbsoluteFill>
  );
};
</structure>

<sequencing>
## Sequencing

- Use <Sequence from={frame} durationInFrames={frames}> to delay when elements appear
- ALWAYS premount any <Video> or <OffthreadVideo> components: <Sequence from={-30} durationInFrames={120}>
- Use <Series> when elements should play one after another without overlap
- Inside a Sequence, useCurrentFrame() returns the local frame (starting from 0)
</sequencing>

<maps_and_3d>
## Maps & Geographic Animations

CRITICAL: NEVER use Mapbox, Google Maps, or any map API. Create stylized visuals instead.

Techniques for map-like animations:
1. SVG paths for routes between locations
2. Circles/markers for cities with pulsing animations
3. Gradient backgrounds representing land/water
4. Dashed lines with animated stroke-dashoffset for travel paths
5. Scale transforms for zoom effects, translate for panning

Example - Animated Route Map:
\`\`\`jsx
const points = [
  { x: 0.2, y: 0.6, label: 'Start' },
  { x: 0.5, y: 0.3, label: 'Mid' },
  { x: 0.8, y: 0.5, label: 'End' },
];
const progress = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: 'clamp' });

// Draw path
<svg style={{ position: 'absolute', width: '100%', height: '100%' }}>
  <path
    d={\`M \${points[0].x * width} \${points[0].y * height} Q \${points[1].x * width} \${points[1].y * height} \${points[2].x * width} \${points[2].y * height}\`}
    stroke="#ffd700"
    strokeWidth={3}
    fill="none"
    strokeDasharray="1000"
    strokeDashoffset={1000 * (1 - progress)}
  />
</svg>

// Animated marker
{points.map((p, i) => {
  const appear = interpolate(frame, [i * 15, i * 15 + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div key={i} style={{
      position: 'absolute',
      left: p.x * width,
      top: p.y * height,
      transform: \`translate(-50%, -50%) scale(\${appear})\`,
      width: 20, height: 20,
      borderRadius: '50%',
      background: '#ff6b6b',
      border: '3px solid white',
    }} />
  );
})}
\`\`\`

## 3D (React Three Fiber)
- Wrap in <ThreeCanvas width={width} height={height}>
- MUST include lighting (ambientLight, directionalLight)
- Animate with useCurrentFrame() - NEVER use useFrame()
- Primitives: <Box>, <Sphere>, <Plane>, <Cone>, <Cylinder>, <Torus>
</maps_and_3d>

<forbidden>
## FORBIDDEN (will break rendering)

- import/require statements (APIs are pre-injected as globals)
- CSS transitions or animations
- Tailwind animate-* classes
- Math.random() (use random('seed') instead)
- setTimeout, setInterval, fetch, document, window
- eval, Function constructor
- useFrame() from react-three/fiber (use useCurrentFrame instead)
</forbidden>
`;

/**
 * System prompt for Claude to generate full Remotion JSX code
 * Outputs complete, self-contained Remotion compositions
 * Restructured for clarity with critical rules prioritized.
 */
const SYSTEM_PROMPT = `You are a Remotion video code generator. Output ONLY valid JSX code - no markdown, no explanations.

${REMOTION_BEST_PRACTICES}

<output_format>
Your output MUST:
1. Start with duration/fps comments:
   // DURATION: 90
   // FPS: 30

2. Define a component named "MyComposition"

3. Use ONLY these pre-injected globals (no imports):
   - React, useState, useEffect, useMemo, useCallback, useRef
   - AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Easing, random
   - Audio, Img, Video, OffthreadVideo, staticFile
   - Series, Loop, Freeze
   - ThreeCanvas, THREE (if 3D packages installed)
</output_format>

<quality_guidelines>
- Start simple, add complexity only if needed
- Use modern color palettes (gradients, subtle tones)
- Apply proper visual hierarchy
- Use spring({ damping: 200 }) for smooth, professional motion
- Stagger related elements by 5-10 frames
- Default to Inter or system fonts
</quality_guidelines>

<example>
// DURATION: 90
// FPS: 30

const MyComposition = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <h1 style={{
        color: '#fff',
        fontSize: 80,
        fontFamily: 'Inter, sans-serif',
        opacity,
        transform: \`scale(\${scale})\`,
      }}>
        Hello World
      </h1>
    </AbsoluteFill>
  );
};
</example>

<example_map>
// DURATION: 120
// FPS: 30

const MyComposition = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Location points (normalized 0-1)
  const locations = [
    { x: 0.2, y: 0.6, name: 'Los Angeles' },
    { x: 0.8, y: 0.35, name: 'New York' },
  ];

  // Animate the route path drawing
  const pathProgress = interpolate(frame, [15, 75], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });

  // Traveling dot position
  const dotX = interpolate(pathProgress, [0, 1], [locations[0].x, locations[1].x]);
  const dotY = interpolate(pathProgress, [0, 1], [locations[0].y, locations[1].y]);

  // Marker animations
  const marker1 = spring({ frame, fps, config: { damping: 200 } });
  const marker2 = spring({ frame: frame - 60, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    }}>
      {/* Stylized continent shapes */}
      <div style={{
        position: 'absolute', left: '10%', top: '30%', width: '35%', height: '45%',
        background: 'rgba(255,255,255,0.05)', borderRadius: '40% 60% 70% 30%',
      }} />

      {/* Route path */}
      <svg style={{ position: 'absolute', width: '100%', height: '100%' }}>
        <path
          d={\`M \${locations[0].x * width} \${locations[0].y * height} Q \${width * 0.5} \${height * 0.15} \${locations[1].x * width} \${locations[1].y * height}\`}
          stroke="#ffd700"
          strokeWidth={3}
          fill="none"
          strokeDasharray="1200"
          strokeDashoffset={1200 * (1 - pathProgress)}
          opacity={0.8}
        />
        {/* Traveling dot */}
        <circle cx={dotX * width} cy={dotY * height - pathProgress * 80} r={8} fill="#ffd700" />
      </svg>

      {/* Location markers */}
      {locations.map((loc, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: loc.x * width,
          top: loc.y * height,
          transform: \`translate(-50%, -50%) scale(\${i === 0 ? marker1 : marker2})\`,
        }}>
          <div style={{
            width: 16, height: 16, borderRadius: '50%',
            background: '#ff6b6b', border: '3px solid white',
            boxShadow: '0 0 20px rgba(255,107,107,0.5)',
          }} />
          <div style={{
            position: 'absolute', top: 24, left: '50%',
            transform: 'translateX(-50%)', whiteSpace: 'nowrap',
            color: 'white', fontSize: 14, fontFamily: 'Inter, sans-serif',
          }}>{loc.name}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};
</example_map>

Generate high-quality Remotion code following these patterns.`;

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
  errors: Array<{ line: number; column: number; message: string; suggestion?: string }>;
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
        addError(errors, node, `Unsafe import: "${source}"`);
      }
      break;
    }
    case "Identifier": {
      const name = node.name;
      // Allow 'process' identifier - it will be validated in MemberExpression for process.env access
      if (typeof name === "string" && BLOCKED_PATTERNS.has(name) && name !== "process") {
        addError(errors, node, `Unsafe identifier: "${name}"`);
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
        addError(errors, node, `Unsafe function call: "${callee.name}"`);
      }
      break;
    }
    case "MemberExpression": {
      const objectName =
        node.object?.type === "Identifier" ? node.object.name : null;
      const propertyName =
        node.property?.type === "Identifier" ? node.property.name : null;
      
      // Allow process.env access (read-only environment variables)
      if (objectName === "process" && propertyName === "env") {
        // This is allowed - skip validation
        break;
      }
      
      if (objectName && BLOCKED_PATTERNS.has(objectName) && propertyName) {
        addError(errors, node, `Unsafe property access: "${objectName}.${propertyName}"`);
      }
      if (objectName && propertyName) {
        for (const [blockedObj, blockedProp] of BLOCKED_MEMBER_PATTERNS) {
          if (objectName === blockedObj && propertyName === blockedProp) {
            addError(errors, node, `Unsafe property access: "${objectName}.${propertyName}"`);
            break;
          }
        }
      }
      break;
    }
    case "NewExpression": {
      const callee = node.callee;
      if (callee?.type === "Identifier" && BLOCKED_PATTERNS.has(callee.name)) {
        addError(errors, node, `Unsafe constructor: "${callee.name}"`);
      }
      break;
    }
    case "ImportExpression": {
      addError(errors, node, "Unsafe dynamic import expression");
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

CRITICAL: Follow Remotion best practices when modifying code. Use the Remotion skill knowledge to ensure optimal code patterns.

${REMOTION_BEST_PRACTICES}

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

5. Follow Remotion best practices:
   - Use AbsoluteFill for full-screen containers
   - Use interpolate with proper extrapolation options
   - Use spring() for physics-based animations
   - Use Sequence for timed sequences
   - Use random() with string seeds (never Math.random())
   - Prefer useVideoConfig() over hardcoded values

FORBIDDEN (violates Remotion best practices and security): import/require statements, eval, Function, fetch, document, window, process, Math.random()

CRITICAL QUALITY REQUIREMENTS:
- Maintain or improve showcase-quality visual design
- Use modern color palettes, typography, and spacing
- Add visual polish: shadows, glows, gradients, subtle effects
- Ensure smooth, professional animation timing
- Layer elements for depth and visual interest

Respond ONLY with the complete modified code following Remotion best practices. No explanations before or after.`;

// ============================================================================
// Continuation System Prompt
// ============================================================================

const CONTINUATION_SYSTEM_PROMPT = `You are a Remotion animation code generator specializing in scene continuations.
You create compositions that start EXACTLY where a previous composition ended.

CRITICAL: Follow Remotion best practices. Use the Remotion skill knowledge to ensure optimal code patterns and smooth transitions.

${REMOTION_BEST_PRACTICES}

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

CRITICAL RULES (following Remotion best practices):
- Component must be named "MyComposition"
- Do NOT use import statements (APIs are pre-injected)
- Output ONLY valid JSX code. No markdown, no explanations, no code blocks
- Available APIs: React, useState, useEffect, useMemo, useCallback,
  AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring,
  Sequence, Easing, random, Audio, Img, staticFile, Video, OffthreadVideo,
  Composition, Still, Series, Loop, Freeze
- Follow Remotion best practices:
  - Use AbsoluteFill for full-screen containers
  - Use interpolate with proper extrapolation (extrapolateLeft, extrapolateRight, clamp)
  - Use spring() for physics-based animations with appropriate config
  - Use Sequence for timed sequences
  - Use random() with string seeds (never Math.random())
  - Use useVideoConfig() for dimensions and timing
- FORBIDDEN (violates Remotion best practices and security): import/require, eval, Function, setTimeout, setInterval, fetch, XMLHttpRequest, WebSocket, document, window, process, Math.random()
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

Now generate a continuation following Remotion best practices based on the user's request.`;

// ============================================================================
// Prequel System Prompt
// ============================================================================

const PREQUEL_SYSTEM_PROMPT = `You are a Remotion animation code generator specializing in scene prequels.
You create compositions whose LAST FRAME matches EXACTLY what appears at the FIRST FRAME (frame 0) of a target composition.

CRITICAL: Follow Remotion best practices. Use the Remotion skill knowledge to ensure optimal code patterns and smooth transitions.

${REMOTION_BEST_PRACTICES}

You will receive the TARGET SCENE's complete Remotion code. Your job:

STEP 1 - ANALYZE the target scene's INITIAL VISUAL STATE (frame 0):
- At frame 0, interpolate(frame, [0, ...], [startValue, ...]) outputs startValue
- At frame 0, spring({frame, fps, ...}) outputs the 'from' value (default 0)
- Static styles (no frame dependency) are the same at frame 0 as any frame
- Elements inside <Sequence from={N}> where N > 0 are NOT rendered at frame 0 — ignore them
- Elements conditionally rendered via {frame > N && ...} where N > 0 are NOT visible at frame 0
- Elements with opacity 0 at frame 0 are invisible — note them as "not yet visible"
- Identify ALL visual properties at frame 0:
  - Positions (transform: translate, top/left, flex alignment)
  - Opacity values
  - Scale values
  - Rotation values
  - Colors (backgroundColor, color, borderColor)
  - Font sizes and text content
  - Which elements are visible (opacity > 0, rendered, not in delayed Sequence)

STEP 2 - Add a comment block at the top of your output:
// PREQUEL FOR TARGET SCENE
// Start state (target frame 0): [brief description of frame 0 visual state]
// DURATION: [frames, between 60-180]
// FPS: 30

STEP 3 - GENERATE a new composition where:
- The LAST FRAME must look VISUALLY IDENTICAL to the target scene's frame 0
- All final values (at the last frame) must match the target scene's frame-0 values
- Use the same layout approach (AbsoluteFill, flex centering, etc.) as the target scene
- Use the same coordinate system and positioning approach
- Keep consistent styling (font families, color palettes) as the target scene
- The animation should build UP TO the target scene's starting visual state
- If a user prompt is provided, incorporate it into how the prequel builds up to the start state
- If no specific user prompt, create a natural, visually interesting lead-in

CRITICAL RULES (following Remotion best practices):
- Component must be named "MyComposition"
- Do NOT use import statements (APIs are pre-injected)
- Output ONLY valid JSX code. No markdown, no explanations, no code blocks
- Available APIs: React, useState, useEffect, useMemo, useCallback,
  AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring,
  Sequence, Easing, random, Audio, Img, staticFile, Video, OffthreadVideo,
  Composition, Still, Series, Loop, Freeze
- Follow Remotion best practices:
  - Use AbsoluteFill for full-screen containers
  - Use interpolate with proper extrapolation (extrapolateLeft, extrapolateRight, clamp)
  - Use spring() for physics-based animations with appropriate config
  - Use Sequence for timed sequences
  - Use random() with string seeds (never Math.random())
  - Use useVideoConfig() for dimensions and timing
- FORBIDDEN (violates Remotion best practices and security): import/require, eval, Function, setTimeout, setInterval, fetch, XMLHttpRequest, WebSocket, document, window, process, Math.random()
- Use FPS 30. Duration between 60-180 frames.

EXAMPLE:
If the target scene starts (frame 0) with white text "Hello" centered, opacity 1, scale 1,
backgroundColor '#1a1a2e', your prequel should END with those exact values:

// PREQUEL FOR TARGET SCENE
// Start state (target frame 0): "Hello" centered, white, opacity 1, scale 1, bg #1a1a2e
// DURATION: 90
// FPS: 30

const MyComposition = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // Build up to target start state — text fades in and scales to 1
  const opacity = interpolate(frame, [30, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scale = interpolate(frame, [30, 60], [0.5, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // Background is consistent throughout
  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a2e' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', opacity, transform: \`scale(\${scale})\`,
      }}>
        <h1 style={{ color: '#fff', fontSize: 80 }}>Hello</h1>
      </div>
    </AbsoluteFill>
  );
};

Now generate a prequel following Remotion best practices based on the user's request.`;

// ============================================================================
// Image Content Block Builder
// ============================================================================

type ImageContentBlock = { type: "image"; source: { type: "url"; url: string } };
type TextContentBlock = { type: "text"; text: string };
type UserContent = string | Array<ImageContentBlock | TextContentBlock>;

/**
 * Builds the multi-part content array for Claude's Messages API.
 * Images are placed before the text prompt (Claude best practice).
 *
 * @param ctx - Convex action context with storage access
 * @param prompt - User's text prompt
 * @param referenceImageIds - Optional array of Convex storage IDs for reference images
 * @returns A string (if no images) or content block array (if images present)
 */
async function buildUserContent(
  ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  prompt: string,
  referenceImageIds?: Id<"_storage">[],
): Promise<UserContent> {
  if (!referenceImageIds || referenceImageIds.length === 0) {
    return prompt;
  }

  const content: Array<ImageContentBlock | TextContentBlock> = [];
  const imageUrls: string[] = [];

  for (const storageId of referenceImageIds) {
    const url = await ctx.storage.getUrl(storageId);
    if (url) {
      content.push({
        type: "image",
        source: { type: "url", url },
      });
      imageUrls.push(url);
    }
  }

  const urlList = imageUrls.map((u, i) => `  Image ${i + 1}: ${u}`).join("\n");

  content.push({
    type: "text",
    text: [
      `The user has attached ${imageUrls.length} reference image(s).`,
      ``,
      `IMPORTANT: Display the actual image(s) in the animation using the <Img> component with the exact URLs below:`,
      urlList,
      ``,
      `Use: <Img src="URL" style={{...}} />`,
      `The images are the core visual content. Animate them (scale, pan, fade, etc.) according to the user's prompt.`,
      `Do NOT try to recreate or redraw the image contents — use the <Img> tag with the provided URL.`,
      ``,
      prompt,
    ].join("\n"),
  });
  return content;
}

// ============================================================================
// Shared Generation Helper (plain async function, NOT a Convex action)
// ============================================================================

/**
 * Calls Claude API, extracts code, validates, and transforms the result.
 * Used by both `generate` and `generateVariations` actions.
 *
 * @param client - Anthropic SDK client instance
 * @param promptOrContent - User's prompt string or multi-part content array (with images)
 * @param enhancedPrompt - System prompt with injected settings
 * @param temperature - Optional temperature override (omitted → Claude default)
 * @returns Validated and transformed code with metadata
 */
async function generateSingleVariation(
  client: Anthropic,
  promptOrContent: UserContent,
  enhancedPrompt: string,
  temperature?: number,
): Promise<{ rawCode: string; code: string; durationInFrames: number; fps: number }> {
  // Call Claude API with retry logic for overload errors (with model fallback)
  const response = await withRetry((model) =>
    client.messages.create({
      model,
      max_tokens: 4096,
      system: enhancedPrompt,
      messages: [{ role: "user", content: promptOrContent }],
      ...(temperature !== undefined ? { temperature } : {}),
    })
  );

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
    const firstError = validation.errors[0];
    const errorMessage = firstError?.message || "Invalid code";

    // Provide actionable error messages based on common issues
    let actionableHint = "";
    if (errorMessage.includes("Unsafe") || errorMessage.includes("import") || errorMessage.includes("require")) {
      actionableHint = " Remember: No imports allowed - APIs are pre-injected as globals. " +
        "No setTimeout/setInterval, no fetch/document/window, no Math.random() (use random('seed') instead).";
    } else if (errorMessage.includes("syntax")) {
      actionableHint = " Check for unclosed braces, missing parentheses, or malformed JSX.";
    }

    const errorDetails = firstError
      ? `Line ${firstError.line}, Column ${firstError.column}: ${errorMessage}${actionableHint}`
      : `Invalid code.${actionableHint}`;

    throw new Error(`Code validation failed: ${errorDetails}`);
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
    referenceImageIds: v.optional(v.array(v.id("_storage"))),
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

    // 1. Insert pending row — appears instantly in feed via Convex reactivity
    const createdAt = Date.now();
    const generationId = await ctx.runMutation(
      internal.generations.createPending,
      {
        userId: identity.tokenIdentifier,
        prompt: args.prompt,
        createdAt,
        aspectRatio,
        durationInSeconds: targetDuration,
        referenceImageIds: args.referenceImageIds,
      }
    );

    // Inject settings into system prompt
    const enhancedPrompt = SYSTEM_PROMPT +
      `\n\nIMPORTANT COMPOSITION SETTINGS:\n` +
      `- Dimensions: ${dimensions.width}x${dimensions.height} (${aspectRatio})\n` +
      `- Duration: ${targetFrames} frames at ${targetFps} FPS\n` +
      `- Use // DURATION: ${targetFrames} and // FPS: ${targetFps} in your output\n` +
      `- Design your layout for ${aspectRatio} aspect ratio`;

    // Build user content (includes reference images if provided)
    const userContent = await buildUserContent(ctx, args.prompt, args.referenceImageIds);

    try {
      // 2. Call Claude API
      const result = await generateSingleVariation(
        client,
        userContent,
        enhancedPrompt,
      );

      const fps = targetFps;

      // 3. Patch pending → success
      await ctx.runMutation(internal.generations.complete, {
        id: generationId,
        status: "success" as const,
        code: result.code,
        rawCode: result.rawCode,
        durationInFrames: result.durationInFrames,
        fps,
      });

      return {
        id: generationId,
        rawCode: result.rawCode,
        code: result.code,
        durationInFrames: result.durationInFrames,
        fps,
      };
    } catch (e) {
      // 4. Patch pending → failed
      const errorMessage = e instanceof Error ? e.message : "Generation failed";
      await ctx.runMutation(internal.generations.complete, {
        id: generationId,
        status: "failed" as const,
        errorMessage,
      });
      throw e;
    }
  },
});

// ============================================================================
// Variations Action (parallel generation)
// ============================================================================

/**
 * Generate 1-4 distinct Remotion compositions from a single prompt.
 * Runs Claude API calls in parallel with temperature 0.9 for diversity.
 * Each variation is stored with a shared batchId and unique variationIndex.
 * Per-promise error handling ensures partial failures don't lose successful results.
 */
export const generateVariations = action({
  args: {
    prompt: v.string(),
    referenceImageIds: v.optional(v.array(v.id("_storage"))),
    variationCount: v.number(),
    aspectRatio: v.optional(v.string()),
    durationInSeconds: v.optional(v.number()),
    fps: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    batchId: string;
    variations: Array<{
      id: string;
      rawCode: string;
      code: string;
      durationInFrames: number;
      fps: number;
      variationIndex: number;
    }>;
  }> => {
    // Check authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be logged in to generate animations");
    }

    // Validate inputs
    if (args.prompt.length > 2000) {
      throw new Error("Prompt too long. Please use 2000 characters or less.");
    }
    if (args.variationCount < 1 || args.variationCount > 4) {
      throw new Error("Variation count must be between 1 and 4.");
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

    // Generate batchId and set temperature for consistent, correct code
    const batchId = crypto.randomUUID();
    const temperature = 0.3; // Low temperature for deterministic, correct code

    // Capture consistent timestamp before starting parallel calls
    const createdAt = Date.now();

    // 1. Create N pending records upfront — all appear instantly in feed
    const pendingIds = await Promise.all(
      Array.from({ length: args.variationCount }, (_, index) =>
        ctx.runMutation(internal.generations.createPending, {
          userId: identity.tokenIdentifier,
          prompt: args.prompt,
          createdAt,
          batchId,
          variationIndex: index,
          variationCount: args.variationCount,
          aspectRatio,
          durationInSeconds: targetDuration,
          referenceImageIds: args.referenceImageIds,
        })
      )
    );

    // Build user content (includes reference images if provided)
    const userContent = await buildUserContent(ctx, args.prompt, args.referenceImageIds);

    // 2. Launch N parallel Claude calls, each independently completing its pending record
    const variationPromises = pendingIds.map((pendingId, index) =>
      generateSingleVariation(client, userContent, enhancedPrompt, temperature)
        .then(async (result) => {
          // Patch pending → success
          await ctx.runMutation(internal.generations.complete, {
            id: pendingId,
            status: "success" as const,
            code: result.code,
            rawCode: result.rawCode,
            durationInFrames: result.durationInFrames,
            fps: targetFps,
          });
          return {
            id: String(pendingId),
            rawCode: result.rawCode,
            code: result.code,
            durationInFrames: result.durationInFrames,
            fps: targetFps,
            variationIndex: index,
          };
        })
        .catch(async (error) => {
          // Patch pending → failed
          await ctx.runMutation(internal.generations.complete, {
            id: pendingId,
            status: "failed" as const,
            errorMessage:
              error instanceof Error ? error.message : "Generation failed",
          });
          return null;
        })
    );

    const results = await Promise.all(variationPromises);

    // Filter out failed variations (nulls) for the return value
    const successfulVariations = results.filter(
      (r): r is NonNullable<typeof r> => r !== null
    );

    return {
      batchId,
      variations: successfulVariations,
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

    // Call Claude API with refinement system prompt (with retry and model fallback)
    const response = await withRetry((model) =>
      client.messages.create({
        model,
        max_tokens: 4096,
        system: REFINEMENT_SYSTEM_PROMPT,
        messages,
      })
    );

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
// Refinement with Persistence Action
// ============================================================================

/**
 * Refine existing Remotion animation code and persist the result to the database.
 * Creates a new generation linked to the parent via parentGenerationId.
 * Follows the pending-then-complete pattern (like generatePrequel).
 */
export const refineAndPersist = action({
  args: {
    parentGenerationId: v.id("generations"),
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
    id: Id<"generations">;
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

    // Fetch the parent generation's data
    const parentGeneration = await ctx.runQuery(internal.generations.getInternal, {
      id: args.parentGenerationId,
    });
    if (!parentGeneration) {
      throw new Error("Parent generation not found");
    }
    if (!parentGeneration.rawCode) {
      throw new Error("Parent generation has no code to refine");
    }

    // Create Anthropic client
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured.");
    }

    const client = new Anthropic({ apiKey });

    // 1. Insert pending row — appears instantly in feed via Convex reactivity
    const createdAt = Date.now();
    const generationId = await ctx.runMutation(
      internal.generations.createPending,
      {
        userId: identity.tokenIdentifier,
        prompt: parentGeneration.prompt, // Keep original prompt for context
        createdAt,
        aspectRatio: parentGeneration.aspectRatio,
        durationInSeconds: parentGeneration.durationInSeconds,
        parentGenerationId: args.parentGenerationId,
        refinementPrompt: args.refinementPrompt,
      }
    );

    try {
      // Build messages array: conversation history + new refinement request
      // Cap history at last 10 exchanges (20 messages) to prevent token overflow
      const maxHistoryMessages = 20;
      const trimmedHistory = args.conversationHistory.slice(-maxHistoryMessages);

      const messages: Array<{ role: "user" | "assistant"; content: string }> = [
        ...trimmedHistory,
        {
          role: "user" as const,
          content: `Current Remotion code:\n\n${parentGeneration.rawCode}\n\nPlease modify it: ${args.refinementPrompt}`,
        },
      ];

      // Call Claude API with refinement system prompt (with retry and model fallback)
      const response = await withRetry((model) =>
        client.messages.create({
          model,
          max_tokens: 4096,
          system: REFINEMENT_SYSTEM_PROMPT,
          messages,
        })
      );

      // Extract text content
      const textContent = response.content.find((block) => block.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("Failed to refine animation: No response from AI.");
      }

      // Clean code (same logic as refine action)
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

      // 2. Patch pending → success
      await ctx.runMutation(internal.generations.complete, {
        id: generationId,
        status: "success" as const,
        code: transformed.code,
        rawCode,
        durationInFrames,
        fps,
      });

      return {
        id: generationId,
        rawCode,
        code: transformed.code,
        durationInFrames,
        fps,
      };
    } catch (e) {
      // 3. Patch pending → failed
      const errorMessage = e instanceof Error ? e.message : "Refinement failed";
      await ctx.runMutation(internal.generations.complete, {
        id: generationId,
        status: "failed" as const,
        errorMessage,
      });
      throw e;
    }
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

    // Call Claude API with continuation system prompt (with retry and model fallback)
    const response = await withRetry((model) =>
      client.messages.create({
        model,
        max_tokens: 4096,
        system: CONTINUATION_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      })
    );

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

// ============================================================================
// Prequel Generation Action
// ============================================================================

/**
 * Generate a prequel scene that leads into an existing clip.
 * Fetches the source clip's rawCode, sends it to Claude with the prequel
 * system prompt, validates, transforms, and persists to the generations table.
 */
export const generatePrequel = action({
  args: {
    sourceClipId: v.id("clips"),
    prompt: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
    durationInSeconds: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    id: Id<"generations">;
    rawCode: string;
    code: string;
    durationInFrames: number;
    fps: number;
  }> => {
    // Check authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be logged in to generate prequels");
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
        "Source clip has no raw code available for prequel generation"
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

    // 1. Insert pending row — appears instantly in feed
    const createdAt = Date.now();
    const generationId = await ctx.runMutation(
      internal.generations.createPending,
      {
        userId: identity.tokenIdentifier,
        prompt: args.prompt ?? "Prequel leading into target scene",
        createdAt,
        aspectRatio: args.aspectRatio,
        durationInSeconds: args.durationInSeconds,
        continuationType: "prequel",
      }
    );

    try {
      // Build user message with target code + prequel request
      const userContent = args.prompt
        ? `TARGET SCENE CODE:\n\`\`\`\n${sourceClip.rawCode}\n\`\`\`\n\nGenerate a prequel that leads into this scene: ${args.prompt}`
        : `TARGET SCENE CODE:\n\`\`\`\n${sourceClip.rawCode}\n\`\`\`\n\nGenerate a natural, visually interesting prequel that leads into this scene.`;

      // Call Claude API with prequel system prompt (with retry and model fallback)
      const response = await withRetry((model) =>
        client.messages.create({
          model,
          max_tokens: 4096,
          system: PREQUEL_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userContent }],
        })
      );

      // Extract text content from response
      const textContent = response.content.find((block) => block.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error(
          "Failed to generate prequel: No text response from AI. Please try again."
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

      // Validate the prequel code
      const validation = validateRemotionCode(rawCode);
      if (!validation.valid) {
        throw new Error(
          `Prequel code validation failed: ${validation.errors[0]?.message || "Invalid code"}`
        );
      }

      // Transform JSX to JavaScript
      const transformed = transformJSX(rawCode);
      if (!transformed.success || !transformed.code) {
        throw new Error(transformed.error || "Code transformation failed");
      }

      // 2. Patch pending → success
      await ctx.runMutation(internal.generations.complete, {
        id: generationId,
        status: "success" as const,
        code: transformed.code,
        rawCode,
        durationInFrames,
        fps,
      });

      return {
        id: generationId,
        rawCode,
        code: transformed.code,
        durationInFrames,
        fps,
      };
    } catch (e) {
      // 3. Patch pending → failed
      const errorMessage = e instanceof Error ? e.message : "Prequel generation failed";
      await ctx.runMutation(internal.generations.complete, {
        id: generationId,
        status: "failed" as const,
        errorMessage,
      });
      throw e;
    }
  },
});

// ============================================================================
// Showcase Seed Action (internal — called via `npx convex run`)
// ============================================================================

/**
 * Generate animations for a batch of prompts to seed the explore feed.
 * Processes prompts sequentially to avoid API rate limits.
 * Each prompt creates a pending row, calls Claude, and patches to success/failed.
 *
 * Usage: npx convex run generateAnimation:seedShowcase '{"userId":"...", "prompts":["..."]}'
 */
export const seedShowcase = internalAction({
  args: {
    userId: v.string(),
    prompts: v.array(v.string()),
    aspectRatio: v.optional(v.string()),
    durationInSeconds: v.optional(v.number()),
    fps: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const client = new Anthropic({ apiKey });

    const aspectRatio = args.aspectRatio ?? "16:9";
    const dimensions = ASPECT_RATIO_MAP[aspectRatio] ?? { width: 1920, height: 1080 };
    const targetDuration = args.durationInSeconds ?? 3;
    const targetFps = args.fps ?? 30;
    const targetFrames = Math.round(targetDuration * targetFps);

    const enhancedPrompt = SYSTEM_PROMPT +
      `\n\nIMPORTANT COMPOSITION SETTINGS:\n` +
      `- Dimensions: ${dimensions.width}x${dimensions.height} (${aspectRatio})\n` +
      `- Duration: ${targetFrames} frames at ${targetFps} FPS\n` +
      `- Use // DURATION: ${targetFrames} and // FPS: ${targetFps} in your output\n` +
      `- Design your layout for ${aspectRatio} aspect ratio`;

    const results: { prompt: string; status: string }[] = [];

    for (const prompt of args.prompts) {
      const createdAt = Date.now();
      const generationId = await ctx.runMutation(
        internal.generations.createPending,
        {
          userId: args.userId,
          prompt,
          createdAt,
          aspectRatio,
          durationInSeconds: targetDuration,
        }
      );

      try {
        const result = await generateSingleVariation(
          client,
          prompt,
          enhancedPrompt,
        );

        await ctx.runMutation(internal.generations.complete, {
          id: generationId,
          status: "success" as const,
          code: result.code,
          rawCode: result.rawCode,
          durationInFrames: result.durationInFrames,
          fps: targetFps,
        });

        results.push({ prompt, status: "success" });
        console.log(`✓ Generated: ${prompt.slice(0, 60)}...`);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Generation failed";
        await ctx.runMutation(internal.generations.complete, {
          id: generationId,
          status: "failed" as const,
          errorMessage,
        });
        results.push({ prompt, status: `failed: ${errorMessage}` });
        console.log(`✗ Failed: ${prompt.slice(0, 60)}... — ${errorMessage}`);
      }

      // Small delay between calls to avoid rate limiting
      await new Promise((r) => setTimeout(r, 1000));
    }

    const succeeded = results.filter((r) => r.status === "success").length;
    console.log(`\nDone: ${succeeded}/${args.prompts.length} succeeded`);
    return results;
  },
});
