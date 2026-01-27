# Phase 3: Preview System - Research

**Researched:** 2026-01-28
**Domain:** Remotion Player, Browser Video Preview, Text Animations
**Confidence:** HIGH

## Summary

This phase implements real-time browser preview of generated animations using Remotion Player. The research covers integrating `@remotion/player` into the existing Next.js 16 App Router application, implementing the four animation styles (fade-in, typewriter, slide-up, scale), and ensuring preview-render parity.

The standard approach is:
1. **Remotion Player**: Use `@remotion/player` v4.x for browser-based preview playback
2. **Animation Compositions**: Create reusable React components for each animation style using `useCurrentFrame()`, `interpolate()`, and `spring()`
3. **Props-to-Preview**: Map the existing `animationProps` schema directly to Player `inputProps`
4. **Client Components**: Use `"use client"` with `next/dynamic` and `ssr: false` to avoid SSR issues

**Primary recommendation:** Install `@remotion/player` and `remotion` core packages, create a dedicated `remotion/` folder for compositions, implement animations using frame-based interpolation, and wrap the Player in a client component with SSR disabled.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @remotion/player | ^4.0.0 | Browser preview playback | Official player component, works with React 19 |
| remotion | ^4.0.0 | Core hooks and utilities | Provides useCurrentFrame, interpolate, spring |
| @remotion/google-fonts | ^4.0.0 | Type-safe font loading | Ensures fonts load before render |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @remotion/bundler | ^4.0.0 | Bundle for rendering | Only needed for Lambda rendering (Phase 5) |
| @remotion/cli | ^4.0.0 | Development studio | Optional: local development preview |

### Already Installed (Compatible)
- React 19.2.3 - Fully compatible with Remotion 4.x
- Next.js 16.1.5 - Works with Remotion via client components
- Zod ^4.3.6 - For props validation

**Installation:**
```bash
npm install remotion @remotion/player @remotion/google-fonts
# Optional for local development studio:
npm install -D @remotion/cli
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── remotion/
│   ├── index.ts                    # registerRoot entry point (for Remotion Studio)
│   ├── Root.tsx                    # Composition registry (for Remotion Studio)
│   ├── compositions/
│   │   └── TextAnimation.tsx       # Main text animation component
│   └── animations/
│       ├── fade-in.ts              # Fade-in animation logic
│       ├── typewriter.ts           # Typewriter animation logic
│       ├── slide-up.ts             # Slide-up animation logic
│       └── scale.ts                # Scale animation logic
├── components/
│   └── preview/
│       ├── preview-player.tsx      # Client component wrapper for Player
│       └── preview-controls.tsx    # Play/pause, replay controls
└── app/
    └── create/
        └── page.tsx                # Uses preview-player after generation
```

### Pattern 1: Client Component with SSR Disabled
**What:** Wrap Remotion Player in a client component using `next/dynamic` with `ssr: false`
**When to use:** Always - Remotion Player requires browser APIs
**Example:**
```typescript
// src/components/preview/preview-player.tsx
"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { TextAnimationProps } from "@/lib/animation-schemas";

// Dynamic import with SSR disabled - prevents window/document errors
const Player = dynamic(
  () => import("@remotion/player").then((mod) => mod.Player),
  { ssr: false, loading: () => <div className="aspect-video bg-black animate-pulse" /> }
);

// Dynamic import for the composition
const TextAnimation = dynamic(
  () => import("@/remotion/compositions/TextAnimation"),
  { ssr: false }
);

interface PreviewPlayerProps {
  animationProps: TextAnimationProps;
}

export function PreviewPlayer({ animationProps }: PreviewPlayerProps) {
  // Memoize inputProps to prevent unnecessary re-renders
  const inputProps = useMemo(() => animationProps, [animationProps]);

  return (
    <Player
      component={TextAnimation}
      inputProps={inputProps}
      durationInFrames={animationProps.durationInFrames}
      fps={animationProps.fps}
      compositionWidth={1920}
      compositionHeight={1080}
      style={{ width: "100%" }}
      controls
      loop
      autoPlay
    />
  );
}
```

### Pattern 2: Frame-Based Animation Composition
**What:** Use `useCurrentFrame()` and `interpolate()` for declarative animations
**When to use:** All animation implementations
**Example:**
```typescript
// src/remotion/compositions/TextAnimation.tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import type { TextAnimationProps } from "@/lib/animation-schemas";

const { fontFamily } = loadFont();

export const TextAnimation: React.FC<TextAnimationProps> = ({
  text,
  style,
  fontFamily: customFont,
  fontSize,
  color,
  backgroundColor,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Select animation based on style prop
  const animatedStyle = getAnimatedStyle(style, frame, fps, durationInFrames);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: backgroundColor || "transparent",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontFamily: customFont || fontFamily,
          fontSize,
          color,
          ...animatedStyle.containerStyle,
        }}
      >
        {animatedStyle.renderText ? animatedStyle.renderText(text) : text}
      </div>
    </AbsoluteFill>
  );
};

export default TextAnimation;
```

### Pattern 3: Animation Style Implementations
**What:** Separate animation logic per style type
**When to use:** Implementing fade-in, typewriter, slide-up, scale
**Example:**
```typescript
// src/remotion/animations/index.ts
import { interpolate, spring, Easing } from "remotion";

interface AnimatedStyle {
  containerStyle: React.CSSProperties;
  renderText?: (text: string) => React.ReactNode;
}

export function getAnimatedStyle(
  style: "fade-in" | "typewriter" | "slide-up" | "scale",
  frame: number,
  fps: number,
  durationInFrames: number
): AnimatedStyle {
  switch (style) {
    case "fade-in":
      return {
        containerStyle: {
          opacity: interpolate(frame, [0, 30], [0, 1], {
            extrapolateRight: "clamp",
          }),
        },
      };

    case "typewriter":
      return {
        containerStyle: {},
        renderText: (text: string) => {
          // Characters revealed over 80% of duration, then hold
          const revealDuration = Math.floor(durationInFrames * 0.8);
          const charsToShow = Math.floor(
            interpolate(frame, [0, revealDuration], [0, text.length], {
              extrapolateRight: "clamp",
            })
          );
          return text.slice(0, charsToShow);
        },
      };

    case "slide-up":
      return {
        containerStyle: {
          transform: `translateY(${interpolate(
            frame,
            [0, 30],
            [100, 0],
            { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
          )}px)`,
          opacity: interpolate(frame, [0, 20], [0, 1], {
            extrapolateRight: "clamp",
          }),
        },
      };

    case "scale":
      const scaleValue = spring({
        frame,
        fps,
        config: { stiffness: 100, damping: 10 },
      });
      return {
        containerStyle: {
          transform: `scale(${scaleValue})`,
        },
      };

    default:
      return { containerStyle: {} };
  }
}
```

### Pattern 4: PlayerRef for External Controls
**What:** Use ref to control Player from sibling components
**When to use:** Custom replay buttons, external play/pause controls
**Example:**
```typescript
// src/components/preview/preview-controls.tsx
"use client";

import { useCallback } from "react";
import type { PlayerRef } from "@remotion/player";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";

interface PreviewControlsProps {
  playerRef: React.RefObject<PlayerRef | null>;
}

export function PreviewControls({ playerRef }: PreviewControlsProps) {
  const handleReplay = useCallback(() => {
    playerRef.current?.seekTo(0);
    playerRef.current?.play();
  }, [playerRef]);

  const handleToggle = useCallback(() => {
    playerRef.current?.toggle();
  }, [playerRef]);

  return (
    <div className="flex gap-2">
      <Button onClick={handleToggle} variant="outline" size="sm">
        <Play className="w-4 h-4" />
      </Button>
      <Button onClick={handleReplay} variant="outline" size="sm">
        <RotateCcw className="w-4 h-4" />
      </Button>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **SSR with Remotion Player:** Always use `ssr: false` with `next/dynamic` - Player requires browser APIs
- **CSS transitions for animations:** Use `interpolate()` / `spring()` - CSS transitions cause flickering during render
- **Re-rendering Player on every frame:** Separate Player and controls, use refs for communication
- **Inline inputProps object:** Always `useMemo()` inputProps to prevent unnecessary re-renders
- **Per-character opacity for typewriter:** Use string slicing, not individual character opacity

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Easing curves | Custom bezier math | `Easing` from remotion | Tested, matches CSS timing functions |
| Spring physics | Custom spring simulation | `spring()` from remotion | Physics-accurate, tested |
| Frame timing | requestAnimationFrame loops | `useCurrentFrame()` | Syncs with Remotion's render cycle |
| Video player controls | Custom play/pause logic | Player `controls` prop or `PlayerRef` | Handles edge cases, accessibility |
| Font loading | CSS @font-face with manual waiting | `@remotion/google-fonts` | Type-safe, auto-waits for load |
| Layering/positioning | Manual absolute positioning | `AbsoluteFill` | Handles full-bleed, flex centering |

**Key insight:** Remotion provides all animation primitives. Focus on composition design and style implementation, not low-level timing.

## Common Pitfalls

### Pitfall 1: SSR Hydration Errors
**What goes wrong:** "window is not defined" or hydration mismatch errors
**Why it happens:** Remotion Player uses browser APIs, Next.js pre-renders on server
**How to avoid:** Always use `next/dynamic` with `ssr: false` for Player component
**Warning signs:** Errors on page load, content mismatch between server and client

### Pitfall 2: Player Re-renders on Every Frame Update
**What goes wrong:** Sluggish performance, high CPU usage during playback
**Why it happens:** State updates for current time propagate to Player parent, triggering re-render
**How to avoid:**
- Keep Player in isolated component
- Use `playerRef` for external controls
- Memoize `inputProps` with `useMemo()`
**Warning signs:** Frame drops, stuttering playback

### Pitfall 3: Fonts Not Loaded Before Render
**What goes wrong:** Flash of unstyled text, wrong font in preview
**Why it happens:** Font loading is async, component renders before font ready
**How to avoid:** Use `@remotion/google-fonts` - Remotion auto-waits from v2.2+
**Warning signs:** Text briefly shows in wrong font, then shifts

### Pitfall 4: Animation Values Exceed Bounds
**What goes wrong:** Opacity > 1, translateY keeps increasing after animation completes
**Why it happens:** Default extrapolation extends values beyond input range
**How to avoid:** Always use `extrapolateRight: "clamp"` in `interpolate()` options
**Warning signs:** Elements becoming invisible, continuing to move after they should stop

### Pitfall 5: Preview-Render Differences
**What goes wrong:** Lambda render looks different from browser preview
**Why it happens:** Lambda uses headless Chromium without GPU acceleration
**How to avoid:**
- Avoid heavy GPU-accelerated CSS (box-shadow, blur, gradients)
- Test with simple compositions first
- Use solid colors over gradients where possible
**Warning signs:** Shadows, blurs, gradients look different in final video

### Pitfall 6: Typewriter Animation Flicker
**What goes wrong:** Characters appear/disappear randomly during playback
**Why it happens:** Using per-character opacity instead of string slicing
**How to avoid:** Always use `text.slice(0, charsToShow)` for typewriter effect
**Warning signs:** Characters flickering, inconsistent reveal order

## Code Examples

### Example 1: Complete Text Animation Composition
```typescript
// src/remotion/compositions/TextAnimation.tsx
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily: interFont } = loadFont();

export interface TextAnimationProps {
  text: string;
  style: "fade-in" | "typewriter" | "slide-up" | "scale";
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor?: string;
  durationInFrames: number;
  fps: 30;
}

export const TextAnimation: React.FC<TextAnimationProps> = ({
  text,
  style,
  fontFamily,
  fontSize,
  color,
  backgroundColor,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation calculations
  const fadeInOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  const slideUpY = interpolate(frame, [0, 30], [100, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const scaleValue = spring({
    frame,
    fps,
    config: { stiffness: 100, damping: 10 },
  });

  // Typewriter: reveal characters over 80% of duration
  const revealDuration = Math.floor(durationInFrames * 0.8);
  const charsToShow = Math.floor(
    interpolate(frame, [0, revealDuration], [0, text.length], {
      extrapolateRight: "clamp",
    })
  );
  const typewriterText = text.slice(0, charsToShow);

  // Build style based on animation type
  const getTextStyle = (): React.CSSProperties => {
    switch (style) {
      case "fade-in":
        return { opacity: fadeInOpacity };
      case "typewriter":
        return {}; // Text content changes, not style
      case "slide-up":
        return {
          opacity: fadeInOpacity,
          transform: `translateY(${slideUpY}px)`,
        };
      case "scale":
        return { transform: `scale(${scaleValue})` };
      default:
        return {};
    }
  };

  const displayText = style === "typewriter" ? typewriterText : text;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: backgroundColor || "#000000",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontFamily: fontFamily || interFont,
          fontSize,
          color,
          textAlign: "center",
          maxWidth: "80%",
          ...getTextStyle(),
        }}
      >
        {displayText}
        {style === "typewriter" && (
          <span
            style={{
              opacity: frame % 30 < 15 ? 1 : 0, // Blinking cursor
              marginLeft: 2,
            }}
          >
            |
          </span>
        )}
      </div>
    </AbsoluteFill>
  );
};

export default TextAnimation;
```

### Example 2: Preview Player with Controls
```typescript
// src/components/preview/preview-player.tsx
"use client";

import dynamic from "next/dynamic";
import { useRef, useMemo, useCallback, useState, useEffect } from "react";
import type { PlayerRef } from "@remotion/player";
import type { TextAnimationProps } from "@/lib/animation-schemas";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";

const Player = dynamic(
  () => import("@remotion/player").then((mod) => mod.Player),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-video bg-black rounded-lg animate-pulse" />
    ),
  }
);

const TextAnimation = dynamic(
  () => import("@/remotion/compositions/TextAnimation"),
  { ssr: false }
);

interface PreviewPlayerProps {
  animationProps: TextAnimationProps;
  className?: string;
}

export function PreviewPlayer({ animationProps, className }: PreviewPlayerProps) {
  const playerRef = useRef<PlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  // Memoize to prevent re-renders
  const inputProps = useMemo(() => animationProps, [animationProps]);

  // Listen to player events
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);

    return () => {
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
    };
  }, []);

  const handleToggle = useCallback(() => {
    playerRef.current?.toggle();
  }, []);

  const handleReplay = useCallback(() => {
    playerRef.current?.seekTo(0);
    playerRef.current?.play();
  }, []);

  return (
    <div className={className}>
      <div className="relative rounded-lg overflow-hidden shadow-lg">
        <Player
          ref={playerRef}
          component={TextAnimation}
          inputProps={inputProps}
          durationInFrames={animationProps.durationInFrames}
          fps={animationProps.fps}
          compositionWidth={1920}
          compositionHeight={1080}
          style={{ width: "100%" }}
          controls={false}
          loop
          autoPlay
        />
      </div>

      <div className="flex justify-center gap-2 mt-4">
        <Button onClick={handleToggle} variant="outline" size="sm">
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>
        <Button onClick={handleReplay} variant="outline" size="sm">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
```

### Example 3: Remotion Registration Files (Optional - for Studio)
```typescript
// src/remotion/index.ts
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);

// src/remotion/Root.tsx
import { Composition } from "remotion";
import { TextAnimation, TextAnimationProps } from "./compositions/TextAnimation";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TextAnimation"
        component={TextAnimation}
        durationInFrames={90}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          text: "Hello World",
          style: "fade-in",
          fontFamily: "Inter",
          fontSize: 64,
          color: "#FFFFFF",
          backgroundColor: "#000000",
          durationInFrames: 90,
          fps: 30,
        } satisfies TextAnimationProps}
      />
    </>
  );
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React 18 types | React 19 types | Remotion 4.0.236+ | Fixed ref typing errors |
| Manual font waiting | Auto font waiting | Remotion 2.2+ | Fonts load before render automatically |
| Separate bundle configs | Shared component imports | Remotion 4.x | Same composition works in Player and Studio |
| window checks | next/dynamic ssr:false | Next.js 13+ App Router | Cleaner SSR handling |

**Deprecated/outdated:**
- `<Composition>` wrapper in Player: Pass component directly to Player, not wrapped
- Manual `delayRender` for fonts: Use `@remotion/google-fonts` instead
- Class components: Function components with hooks are standard

## Open Questions

1. **Video dimensions for preview**
   - What we know: Composition is 1920x1080, Player scales to container width
   - What's unclear: Should we match user's device/viewport?
   - Recommendation: Use 1920x1080 for parity with render, scale via CSS width: 100%

2. **Font availability for custom fonts**
   - What we know: `@remotion/google-fonts` handles Google Fonts; schema allows custom fontFamily
   - What's unclear: Should v1.0 restrict to Google Fonts only?
   - Recommendation: Default to Inter, allow Google Fonts list, defer custom fonts to v2

3. **Preview persistence across navigation**
   - What we know: Player state resets on unmount
   - What's unclear: Should we cache/restore preview state if user navigates away?
   - Recommendation: Don't persist for v1.0; user can regenerate from history

## Sources

### Primary (HIGH confidence)
- [Remotion Player Documentation](https://www.remotion.dev/docs/player/player) - Player API, props, events
- [Remotion React 19 Guide](https://www.remotion.dev/docs/react-19) - Version compatibility
- [Remotion Animating Properties](https://www.remotion.dev/docs/animating-properties) - interpolate, spring usage
- [Remotion Player Best Practices](https://www.remotion.dev/docs/player/best-practices) - Performance patterns
- [Next.js App Dir Template](https://github.com/remotion-dev/template-next-app-dir) - Reference implementation

### Secondary (MEDIUM confidence)
- [Remotion Code Sharing](https://www.remotion.dev/docs/player/integration) - File structure patterns
- [Remotion Sequence](https://www.remotion.dev/docs/sequence) - Timing compositions
- [Remotion Timeout Handling](https://www.remotion.dev/docs/timeout) - delayRender patterns
- [GitHub remotion-dev/typewriter](https://github.com/remotion-dev/typewriter) - Typewriter reference

### Tertiary (LOW confidence)
- [GitHub Issues #4262](https://github.com/remotion-dev/remotion/issues/4262) - Preview vs render differences
- [skills.sh Remotion Best Practices](https://skills.sh/remotion-dev/skills/remotion-best-practices) - Community patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official template uses same versions, React 19 confirmed compatible
- Architecture: HIGH - Pattern from official Next.js App Dir template
- Animation implementations: MEDIUM - Based on docs, not production-tested
- Pitfalls: MEDIUM - Based on documentation and community issues

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - stable domain, Remotion 4.x is mature)
