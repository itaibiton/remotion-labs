# Architecture Research: Full Code Generation

**Domain:** AI-Powered Video Creation Platform (v1.1 - Full Code Generation)
**Researched:** 2026-01-28
**Confidence:** MEDIUM (core patterns verified, code execution approach requires validation)

## Executive Summary

v1.1 adds full code generation: Claude produces Remotion JSX code instead of just props. The core challenge is that **Lambda requires pre-bundled compositions** - you cannot `bundle()` at runtime per Remotion's official documentation. This research identifies three architectural approaches with a recommended path.

## Current Architecture (v1.0)

```
User Prompt
    |
    v
[Claude API] -- generates --> JSON Props (TextAnimationProps)
    |
    v
[Convex Storage] -- stores --> { text, style, fontSize, color, ... }
    |
    v
[Remotion Player] -- renders --> Fixed TextAnimation composition
    |
    v
[Remotion Lambda] -- renders --> Same TextAnimation composition
```

**Key characteristic:** Claude outputs structured data, not code. The `TextAnimation` composition is pre-bundled and accepts props.

## The Challenge

**Desired v1.1 flow:**
```
User Prompt
    |
    v
[Claude API] -- generates --> Remotion JSX Code
    |
    v
[???] -- executes --> Dynamic composition
    |
    v
[Player + Lambda] -- renders --> Video
```

**Core problem:** Lambda uses a pre-deployed Serve URL (via `deploySite()`). The composition must exist in the bundle before rendering. You cannot:
- Call `bundle()` at runtime (explicitly not recommended per Remotion docs)
- Call `bundle()` in serverless (not supported)
- Pass arbitrary JSX code to Lambda and have it execute

## Three Architectural Approaches

### Approach A: Flexible Composition with Rich Props (Recommended)

**Concept:** Create a powerful `DynamicComposition` that accepts structured scene descriptions. Claude generates complex props, not raw code.

```typescript
// What Claude generates:
{
  scenes: [
    {
      type: "text",
      text: "Hello World",
      animation: {
        type: "spring",
        from: { scale: 0, opacity: 0 },
        to: { scale: 1, opacity: 1 },
        config: { stiffness: 100, damping: 10 }
      },
      style: { fontSize: 64, color: "#FFFFFF", fontFamily: "Inter" },
      position: { x: "center", y: "center" },
      duration: 30
    },
    {
      type: "shape",
      shape: "circle",
      animation: { type: "interpolate", ... },
      ...
    }
  ],
  transitions: [
    { from: 0, to: 1, type: "fade", duration: 15 }
  ],
  settings: { backgroundColor: "#000000" }
}
```

**How it works:**
1. Claude outputs structured JSON describing scenes, animations, timing
2. `DynamicComposition` interprets this JSON and renders accordingly
3. Same bundle works for Player and Lambda
4. No code execution needed

**Pros:**
- No security concerns (no code execution)
- Same bundle works everywhere
- Faster generation (JSON smaller than code)
- Easier to validate/sanitize

**Cons:**
- Limited to what DynamicComposition supports
- Need to anticipate and implement all animation patterns
- Complex composition code to maintain

**Build order:**
1. Design DynamicComposition schema (scene types, animation types)
2. Implement DynamicComposition renderer
3. Update Claude prompt to output new schema
4. Update Player integration
5. Redeploy Lambda bundle (once, with new composition)

### Approach B: Client-Side Transpilation with Sandpack Preview

**Concept:** Use Sandpack (CodeSandbox's engine) for browser preview. For Lambda rendering, maintain a library of pre-bundled composition "templates" that Claude can select from.

```
[Claude] -- generates --> JSX Code (for preview)
                     \--> Template ID + Props (for render)

[Sandpack iframe] -- executes --> Live preview in browser
[Lambda] -- uses --> Pre-bundled template composition
```

**How it works:**
1. Claude generates full JSX code for preview flexibility
2. Sandpack runs code in sandboxed iframe for instant preview
3. For Lambda render, Claude also outputs template ID + props
4. Lambda renders using pre-built template with passed props

**Pros:**
- Maximum preview flexibility (any valid Remotion code)
- Sandpack handles sandboxing
- Clear separation: preview = flexible, render = templated

**Cons:**
- Preview and render may not match exactly
- Need to maintain template library
- User sees code that can't actually render on Lambda
- Two systems to maintain

**Build order:**
1. Integrate Sandpack with Remotion Player
2. Create template library (expand beyond TextAnimation)
3. Update Claude to output dual format (code + template)
4. Handle preview/render mismatch UX

### Approach C: Dynamic Bundle Deployment (Complex)

**Concept:** When Claude generates new code, dynamically create and deploy a new bundle to S3, then render from that bundle.

```
[Claude] -- generates --> JSX Code
    |
    v
[Server Process] -- runs --> bundle() + deploySite()
    |
    v
[New Serve URL in S3] -- stored --> Convex
    |
    v
[Lambda] -- uses --> New Serve URL
```

**How it works:**
1. Claude generates Remotion composition code
2. Server-side process (not serverless) bundles the code
3. Deploys bundle to S3 via `deploySite()`
4. Lambda renders using new serve URL

**Pros:**
- True full code generation
- Exact match between preview and render
- Maximum flexibility

**Cons:**
- Requires long-running server (not serverless)
- `bundle()` takes 10-60 seconds
- High latency for user experience
- Complex infrastructure
- Code execution security concerns
- Each generation creates new S3 objects (storage costs)

**Build order:**
1. Set up long-running server (EC2, Railway, etc.)
2. Implement code validation/sandboxing
3. Implement bundle + deploy pipeline
4. Integrate with Convex for orchestration
5. Handle cleanup of old bundles

## Recommendation

**Start with Approach A (Flexible Composition).**

Rationale:
1. **Security:** No code execution means no sandbox escape risks
2. **Architecture:** Works with existing Convex + Lambda setup
3. **Complexity:** Incremental change, not architectural overhaul
4. **User value:** Users get dynamic animations without seeing code
5. **Path forward:** Can add Approach B's preview later if needed

The key insight: **Users want dynamic animations, not necessarily to see/write code.** A well-designed DynamicComposition can produce infinite variety without code execution.

## Detailed Design: Approach A

### New Schema

```typescript
// New type for dynamic animations
interface DynamicAnimationProps {
  // Scenes are rendered sequentially
  scenes: Scene[];

  // Global settings
  settings: {
    width: number;        // 1920 default
    height: number;       // 1080 default
    fps: number;          // 30 default
    backgroundColor: string;
  };

  // Transitions between scenes
  transitions?: Transition[];
}

type Scene = TextScene | ShapeScene | ImageScene | GroupScene;

interface TextScene {
  type: "text";
  id: string;
  text: string;
  style: TextStyle;
  position: Position;
  animation: Animation;
  startFrame: number;
  durationFrames: number;
}

interface ShapeScene {
  type: "shape";
  id: string;
  shape: "rectangle" | "circle" | "ellipse" | "line" | "path";
  shapeProps: ShapeProps;
  style: ShapeStyle;
  position: Position;
  animation: Animation;
  startFrame: number;
  durationFrames: number;
}

interface Animation {
  type: "spring" | "interpolate" | "sequence";
  properties: AnimatedProperty[];
}

interface AnimatedProperty {
  property: "opacity" | "scale" | "x" | "y" | "rotation" | "width" | "height";
  from: number;
  to: number;
  timing?: {
    delay?: number;
    easing?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
  };
  // For spring animations
  springConfig?: {
    stiffness?: number;
    damping?: number;
    mass?: number;
  };
}
```

### Migration Path

**Phase 1: Extend TextAnimation**
- Add more animation types (bounce, wave, glitch)
- Add position control (not just centered)
- Add multiple text elements
- Keep backwards compatible

**Phase 2: Add Shape Support**
- Rectangle, circle, line primitives
- Animated shapes
- Layer ordering

**Phase 3: Add Scene Sequencing**
- Multiple scenes in sequence
- Transitions between scenes
- Timeline control

**Phase 4: Enable User Code View**
- Show generated props as "pseudo-code"
- Allow users to edit props
- Consider future code export

### Component Boundaries

```
src/remotion/
  compositions/
    TextAnimation.tsx       # Keep for backwards compat
    DynamicComposition.tsx  # New: renders any scene type

  renderers/
    TextRenderer.tsx        # Handles TextScene
    ShapeRenderer.tsx       # Handles ShapeScene
    ImageRenderer.tsx       # Handles ImageScene
    GroupRenderer.tsx       # Handles GroupScene

  animations/
    springAnimation.ts      # Spring physics helpers
    interpolateAnimation.ts # Interpolation helpers
    sequenceAnimation.ts    # Sequential animation helpers

  types/
    scenes.ts               # Scene type definitions
    animations.ts           # Animation type definitions
```

### Data Flow Changes

**Before (v1.0):**
```
Claude -> TextAnimationProps -> Store -> Render
```

**After (v1.1):**
```
Claude -> DynamicAnimationProps -> Validate -> Store -> Render
                                      |
                                      v
                               [Zod schema validation]
                               [Scene count limits]
                               [Duration limits]
```

### Integration Points

| Component | Change Required | Effort |
|-----------|-----------------|--------|
| `generateAnimation.ts` | New system prompt, new validation | High |
| `schema.ts` | New animationProps type | Medium |
| `preview-player.tsx` | Use DynamicComposition | Low |
| `triggerRender.ts` | Composition ID change | Low |
| `remotion/` | New compositions, renderers | High |
| Lambda bundle | Redeploy with new composition | Low |

### Suggested Build Order

1. **Design scene schema** - Define all scene types, animations, props
2. **Implement DynamicComposition** - Core renderer with basic scenes
3. **Implement TextRenderer** - Port TextAnimation logic
4. **Update Claude prompt** - Generate new schema format
5. **Update validation** - Zod schemas for new types
6. **Add ShapeRenderer** - Basic shape support
7. **Add animations library** - Reusable animation helpers
8. **Deploy new Lambda bundle** - One-time deployment
9. **Add user code view** - Read-only props display
10. **Add props editing** - User can tweak values

## Security Considerations

### Even with Approach A, validate strictly:

```typescript
// convex/lib/validation.ts
import { z } from "zod";

const MAX_SCENES = 20;
const MAX_DURATION_FRAMES = 900; // 30 seconds at 30fps
const MAX_TEXT_LENGTH = 1000;

const sceneSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    text: z.string().max(MAX_TEXT_LENGTH),
    // ... rest of schema
  }),
  // ... other scene types
]);

export const dynamicAnimationSchema = z.object({
  scenes: z.array(sceneSchema).max(MAX_SCENES),
  settings: z.object({
    width: z.number().min(100).max(4096),
    height: z.number().min(100).max(4096),
    fps: z.literal(30),
    backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  }),
}).refine(
  (data) => {
    const totalFrames = data.scenes.reduce(
      (sum, scene) => sum + scene.durationFrames, 0
    );
    return totalFrames <= MAX_DURATION_FRAMES;
  },
  { message: "Total animation duration exceeds limit" }
);
```

### If later adding code preview (Approach B):

- Use Sandpack for browser sandboxing
- Never execute user code server-side
- Never send user code to Lambda
- Clear separation: code is preview-only

## Future Considerations

### Path to Full Code Generation (if needed later)

If business needs require true code generation:

1. **Start with read-only code view** - Show what code would look like
2. **Add Sandpack preview** - Code runs in sandboxed iframe
3. **Evaluate Cloud IDE approach** - Consider StackBlitz WebContainers
4. **Consider dedicated render server** - Not serverless, can bundle

### Alternative: Code Export Feature

Instead of executing user code, offer export:
- User generates animation via prompts
- User clicks "Export Code"
- Download Remotion project zip
- User runs locally or on their infrastructure

This provides full code access without execution risks.

## Sources

### Remotion (HIGH confidence - official documentation)
- [bundle() documentation](https://www.remotion.dev/docs/bundle) - "bundle() cannot be called in a serverless function"
- [deploySite()](https://www.remotion.dev/docs/lambda/deploysite) - Bundle deployment to S3
- [Serve URL terminology](https://www.remotion.dev/docs/terminology/serve-url) - "URL under which a Remotion Bundle is hosted"
- [Passing props](https://www.remotion.dev/docs/passing-props) - InputProps pattern
- [Parameterized rendering](https://www.remotion.dev/docs/parameterized-rendering) - Dynamic content via props
- [Player component](https://www.remotion.dev/docs/player/player) - Client-side preview

### Sandpack/Code Execution (MEDIUM confidence)
- [Sandpack documentation](https://sandpack.codesandbox.io/) - Browser-based code execution
- [Sandpack GitHub](https://github.com/codesandbox/sandpack) - Implementation details
- [JavaScript sandboxing patterns](https://dev.to/leapcell/a-deep-dive-into-javascript-sandboxing-97b) - Security considerations

### Architecture Patterns (MEDIUM confidence)
- [a16z Developer Patterns](https://a16z.com/nine-emerging-developer-patterns-for-the-ai-era/) - AI code generation patterns
- [React security practices](https://snyk.io/blog/10-react-security-best-practices/) - Never eval untrusted code

---
*Architecture research for: RemotionLab v1.1 - Full Code Generation*
*Researched: 2026-01-28*
*Previous version: 2026-01-27 (v1.0 architecture)*
