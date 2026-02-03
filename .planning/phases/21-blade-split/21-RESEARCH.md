# Phase 21: Blade & Split - Research

**Researched:** 2026-02-03
**Domain:** Timeline blade tool, clip splitting, keyboard shortcuts (React + tinykeys + Convex)
**Confidence:** HIGH

## Summary

Phase 21 implements the blade tool for splitting clips at the playhead position. This is a classic video editor feature where users can divide a single clip into two independent clips, each of which can then be trimmed, reordered, or deleted separately. The blade tool is activated via keyboard shortcut (industry standard: "B" key) or toolbar button.

The implementation leverages the existing non-destructive trim model from Phase 20. When splitting a clip at frame N (relative to the clip's start), the split operation:
1. Modifies the original scene to have `trimEnd = originalDuration - N` (so it ends at the split point)
2. Inserts a new scene immediately after with the same clipId but `trimStart = N` (so it starts at the split point)

This approach is non-destructive (original clip data unchanged), maintains the existing schema (no new fields needed), and produces two independent scenes that can be manipulated separately. The split is purely a "virtual split" via trim metadata.

**Primary recommendation:** Install tinykeys (650B), create a `useBladeMode` hook for keyboard shortcut handling with visual mode indicator, add a blade button to the timeline header, implement a `splitScene` Convex mutation that duplicates the scene and sets trim values. Use "B" as the keyboard shortcut (industry standard from DaVinci Resolve, Final Cut Pro).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tinykeys | 3.0.0 | Keyboard shortcut handling | Locked decision in STATE.md; 650B bundle, cross-platform `$mod` support |
| React state | native | Blade mode toggle | Simple boolean state; no library needed |
| Convex mutations | (installed) | Split scene persistence | Existing pattern for scene operations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.563.0 (installed) | Scissor/blade icon | Toolbar button icon |
| sonner | (installed) | Toast notifications | Success/error feedback on split |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tinykeys | react-hotkeys-hook | react-hotkeys-hook is more React-idiomatic but heavier (3KB vs 650B); tinykeys is locked decision |
| Boolean blade mode | Full tool state machine | Overkill for two modes (select/blade); state machine for 3+ tools |
| Duplicate scene entry | Clone clip in database | Cloning wastes storage; same clipId with different trim is efficient |

**Installation:**
```bash
npm install tinykeys
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── movie/
│   │   ├── movie-editor.tsx          # MODIFIED - add blade mode state + splitScene handler
│   │   ├── timeline.tsx              # MODIFIED - pass blade mode, handle blade clicks
│   │   ├── timeline-scene.tsx        # MODIFIED - show blade cursor, handle blade click
│   │   ├── timeline-toolbar.tsx      # NEW - toolbar with blade toggle button
│   │   └── ...
│   └── ui/
│       └── ...
├── hooks/
│   └── use-blade-mode.ts             # NEW - keyboard shortcut + mode state
└── ...
convex/
└── movies.ts                         # MODIFIED - add splitScene mutation
```

### Pattern 1: Virtual Split via Trim Metadata
**What:** Split creates two scenes referencing the same clip, with complementary trim values that together cover the original duration.
**When to use:** Any blade/split operation.
**Example:**
```typescript
// Before split at frame 60 (playhead position within clip):
// Scene 0: { clipId: "abc", trimStart: 0, trimEnd: 0 }  // 120 frames total

// After split:
// Scene 0: { clipId: "abc", trimStart: 0, trimEnd: 60 }   // First 60 frames
// Scene 1: { clipId: "abc", trimStart: 60, trimEnd: 0 }   // Last 60 frames

// Both scenes reference same clip, no data duplication
// Each can be independently trimmed further, reordered, or deleted
```

### Pattern 2: tinykeys Hook for Blade Mode
**What:** Custom hook that manages blade mode state and keyboard shortcut binding.
**When to use:** Anywhere blade mode needs to be toggled.
**Example:**
```typescript
// Source: https://github.com/jamiebuilds/tinykeys

import { useEffect, useState, useCallback } from "react";
import { tinykeys } from "tinykeys";

export function useBladeMode() {
  const [isBladeMode, setIsBladeMode] = useState(false);

  const toggleBladeMode = useCallback(() => {
    setIsBladeMode((prev) => !prev);
  }, []);

  const exitBladeMode = useCallback(() => {
    setIsBladeMode(false);
  }, []);

  useEffect(() => {
    const unsubscribe = tinykeys(window, {
      // "B" toggles blade mode (industry standard)
      "b": (e) => {
        e.preventDefault();
        toggleBladeMode();
      },
      // "Escape" exits blade mode (back to selection)
      "Escape": () => {
        exitBladeMode();
      },
      // "V" or "A" for selection mode (common alternatives)
      "v": () => exitBladeMode(),
      "a": () => exitBladeMode(),
    });

    return () => unsubscribe();
  }, [toggleBladeMode, exitBladeMode]);

  return { isBladeMode, toggleBladeMode, exitBladeMode };
}
```

### Pattern 3: Blade Click Handler on Timeline
**What:** When blade mode is active, clicking on a clip at a specific position triggers the split at that frame.
**When to use:** Timeline scene click handler in blade mode.
**Example:**
```typescript
// In timeline-scene.tsx or timeline.tsx

const handleBladeClick = useCallback((e: React.MouseEvent, sceneIndex: number) => {
  if (!isBladeMode) return;

  e.stopPropagation();
  e.preventDefault();

  // Calculate frame position from click
  const rect = e.currentTarget.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const frameInScene = Math.round(clickX / scale);

  // Get the scene's absolute start frame in the timeline
  // and the clip's trimStart to calculate actual split point
  const scene = scenes[sceneIndex];
  const trimStart = scene.trimStart ?? 0;
  const splitFrame = trimStart + frameInScene;

  onSplit(sceneIndex, splitFrame);
}, [isBladeMode, scale, scenes, onSplit]);
```

### Pattern 4: Split at Playhead (Alternative to Click)
**What:** When blade mode is active, pressing Enter or clicking a "Split" button splits the clip under the playhead.
**When to use:** For precise splitting at exact playhead position.
**Example:**
```typescript
// Find which scene the playhead is over
function findSceneAtFrame(scenes: Scene[], targetFrame: number): { sceneIndex: number; frameInScene: number } | null {
  let offset = 0;
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const effectiveDuration = scene.baseDuration - (scene.trimStart ?? 0) - (scene.trimEnd ?? 0);
    if (targetFrame >= offset && targetFrame < offset + effectiveDuration) {
      return {
        sceneIndex: i,
        frameInScene: targetFrame - offset + (scene.trimStart ?? 0),
      };
    }
    offset += effectiveDuration;
  }
  return null;
}

// Split at playhead position
function handleSplitAtPlayhead() {
  const location = findSceneAtFrame(scenes, currentFrame);
  if (!location) return;

  onSplit(location.sceneIndex, location.frameInScene);
}
```

### Pattern 5: Visual Blade Mode Indicators
**What:** When blade mode is active, show visual feedback: cursor changes to blade, button is highlighted, optional overlay text.
**When to use:** Any time blade mode is active.
**Example:**
```typescript
// Timeline cursor change
<div
  className={`... ${isBladeMode ? "cursor-crosshair" : "cursor-default"}`}
>

// Or use custom cursor (CSS)
// .blade-mode { cursor: url('/icons/blade-cursor.svg') 12 12, crosshair; }

// Button highlight
<Button
  variant={isBladeMode ? "default" : "outline"}
  onClick={toggleBladeMode}
  title={isBladeMode ? "Exit blade mode (B or Esc)" : "Blade tool (B)"}
>
  <Scissors className="h-4 w-4" />
</Button>
```

### Anti-Patterns to Avoid
- **Creating new clip records on split:** This wastes storage and complicates undo. Same clipId with different trim metadata is the correct approach.
- **Destructive split:** Never modify the original clip's durationInFrames. Split is purely via scene-level metadata.
- **Global keyboard listeners without cleanup:** Always return `unsubscribe()` from useEffect to prevent memory leaks and duplicate handlers.
- **Splitting at clip boundaries:** Don't allow split at frame 0 or last frame of a scene; it would create zero-duration clips.
- **Complex tool state machines for two tools:** Simple boolean for blade mode. Only add state machine if adding more tools (range select, slip, slide, etc.).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keyboard shortcut handling | Custom keydown listener with modifier parsing | tinykeys | Cross-platform `$mod`, sequence support, 650B; locked decision |
| Frame calculation for click position | Complex offset math | Reuse `scale` factor from zoom | Already computed for trim; consistent math |
| Scene duration computation | Manual loop every time | Existing `computeTotalDuration` helper | Already accounts for trim |

**Key insight:** Split is fundamentally two trim operations creating complementary ranges from the same source. The existing trim infrastructure handles 90% of the work.

## Common Pitfalls

### Pitfall 1: Split Creates Zero-Duration Clip
**What goes wrong:** Splitting at frame 0 or the last frame creates a scene with 0 effective frames.
**Why it happens:** No validation on split position.
**How to avoid:** Validate: `splitFrame > trimStart` and `splitFrame < baseDuration - trimEnd`. Reject splits that would leave either resulting scene with < 1 frame.
**Warning signs:** Scenes disappear after split, or timeline shows "0.0s" duration.

### Pitfall 2: Keyboard Shortcuts Active During Text Input
**What goes wrong:** User types "B" in a text field and blade mode activates.
**Why it happens:** Global keyboard listener doesn't check for input focus.
**How to avoid:** Check `document.activeElement` in handler, or use tinykeys on a specific container element instead of window. Alternatively, exclude events from input/textarea/contenteditable.
**Warning signs:** Blade mode toggles when naming a movie or typing in any form field.

### Pitfall 3: Split Position Calculated From Wrong Reference
**What goes wrong:** Split happens at wrong frame because calculation didn't account for existing trimStart.
**Why it happens:** Confusing "frame in visible clip" vs "frame in original clip source".
**How to avoid:** Always add the existing `trimStart` to the click-based frame offset. Split position is relative to the **original** clip, not the visible portion.
**Warning signs:** First split works, but splitting an already-trimmed clip lands in wrong place.

### Pitfall 4: Blade Mode Persists After Split
**What goes wrong:** After splitting, user is still in blade mode and accidentally splits again.
**Why it happens:** Mode not cleared after action.
**How to avoid:** Decision point: either (a) auto-exit blade mode after split (like Final Cut Pro), or (b) stay in blade mode for rapid multiple splits (like DaVinci Resolve). Recommend: stay in blade mode but show clear indicator. User presses Esc/V/A to exit.
**Warning signs:** Users accidentally split multiple times.

### Pitfall 5: Split Mutation Race Condition
**What goes wrong:** Rapid splits create inconsistent state.
**Why it happens:** Multiple mutations in flight with stale scene indices.
**How to avoid:** Use optimistic updates with proper rollback, or disable blade mode during pending mutation.
**Warning signs:** Scenes appear in wrong order or duplicate unexpectedly after rapid clicks.

### Pitfall 6: Timeline Not Scrolling to Show New Clip
**What goes wrong:** After split, one of the resulting clips may be off-screen.
**Why it happens:** No scroll adjustment after split.
**How to avoid:** After split, optionally scroll to keep both resulting clips visible, or at least the playhead in view.
**Warning signs:** User splits and can't find one of the resulting clips.

## Code Examples

### splitScene Mutation (Convex)
```typescript
// convex/movies.ts

/**
 * Split a scene at a specific frame, creating two scenes from one.
 * splitFrame is relative to the ORIGINAL clip (not the visible/trimmed portion).
 */
export const splitScene = mutation({
  args: {
    movieId: v.id("movies"),
    sceneIndex: v.number(),
    splitFrame: v.number(), // Frame position in original clip to split at
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const movie = await ctx.db.get(args.movieId);
    if (!movie || movie.userId !== identity.tokenIdentifier) {
      throw new Error("Movie not found");
    }

    const scene = movie.scenes[args.sceneIndex];
    if (!scene) throw new Error("Scene not found");

    // Get clip to know base duration
    const clip = await ctx.db.get(scene.clipId);
    if (!clip) throw new Error("Clip not found");

    const baseDuration = scene.durationOverride ?? clip.durationInFrames;
    const currentTrimStart = scene.trimStart ?? 0;
    const currentTrimEnd = scene.trimEnd ?? 0;

    // Validate split position
    // Must be > trimStart and < (baseDuration - trimEnd)
    if (args.splitFrame <= currentTrimStart) {
      throw new Error("Split position must be after trim start");
    }
    if (args.splitFrame >= baseDuration - currentTrimEnd) {
      throw new Error("Split position must be before trim end");
    }

    // Create two scenes from the split
    const firstScene = {
      clipId: scene.clipId,
      durationOverride: scene.durationOverride,
      trimStart: currentTrimStart,
      trimEnd: baseDuration - args.splitFrame, // Ends at split point
    };

    const secondScene = {
      clipId: scene.clipId,
      durationOverride: scene.durationOverride,
      trimStart: args.splitFrame, // Starts at split point
      trimEnd: currentTrimEnd,
    };

    // Replace original scene with two new scenes
    const newScenes = [
      ...movie.scenes.slice(0, args.sceneIndex),
      firstScene,
      secondScene,
      ...movie.scenes.slice(args.sceneIndex + 1),
    ];

    // Recompute total duration
    const totalDuration = await computeTotalDuration(ctx, newScenes);

    await ctx.db.patch(args.movieId, {
      scenes: newScenes,
      totalDurationInFrames: totalDuration,
      updatedAt: Date.now(),
    });

    return { firstSceneIndex: args.sceneIndex, secondSceneIndex: args.sceneIndex + 1 };
  },
});
```

### useBladeMode Hook (Complete)
```typescript
// src/hooks/use-blade-mode.ts

import { useEffect, useState, useCallback } from "react";
import { tinykeys } from "tinykeys";

interface UseBladeModeOptions {
  onSplitAtPlayhead?: () => void;
}

export function useBladeMode(options: UseBladeModeOptions = {}) {
  const [isBladeMode, setIsBladeMode] = useState(false);

  const toggleBladeMode = useCallback(() => {
    setIsBladeMode((prev) => !prev);
  }, []);

  const exitBladeMode = useCallback(() => {
    setIsBladeMode(false);
  }, []);

  useEffect(() => {
    const unsubscribe = tinykeys(window, {
      // "B" toggles blade mode (industry standard from DaVinci Resolve, Final Cut Pro)
      "b": (e) => {
        // Don't trigger in text inputs
        if (e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement ||
            (e.target as HTMLElement).isContentEditable) {
          return;
        }
        e.preventDefault();
        toggleBladeMode();
      },
      // "Escape" exits blade mode
      "Escape": (e) => {
        if (isBladeMode) {
          e.preventDefault();
          exitBladeMode();
        }
      },
      // "V" for selection/pointer tool (Premiere Pro convention)
      "v": (e) => {
        if (e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement) {
          return;
        }
        exitBladeMode();
      },
      // "A" for selection tool (DaVinci Resolve convention)
      "a": (e) => {
        if (e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement) {
          return;
        }
        exitBladeMode();
      },
      // "$mod+B" or "Enter" to split at playhead when in blade mode
      "$mod+b": (e) => {
        e.preventDefault();
        if (options.onSplitAtPlayhead) {
          options.onSplitAtPlayhead();
        }
      },
    });

    return () => unsubscribe();
  }, [toggleBladeMode, exitBladeMode, isBladeMode, options]);

  return { isBladeMode, toggleBladeMode, exitBladeMode };
}
```

### Blade Toolbar Button
```typescript
// In timeline-toolbar.tsx or timeline.tsx header

import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BladeButtonProps {
  isBladeMode: boolean;
  onToggle: () => void;
}

export function BladeButton({ isBladeMode, onToggle }: BladeButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isBladeMode ? "default" : "outline"}
            size="sm"
            onClick={onToggle}
            className={isBladeMode ? "bg-primary text-primary-foreground" : ""}
          >
            <Scissors className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isBladeMode ? "Exit blade mode (Esc)" : "Blade tool (B)"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

### Split at Playhead Logic
```typescript
// Helper to find which scene contains a given frame
function findSceneAtFrame(
  scenes: Array<{
    clipId: string;
    clip: { durationInFrames: number } | null;
    durationOverride?: number;
    trimStart?: number;
    trimEnd?: number;
  }>,
  targetFrame: number
): { sceneIndex: number; frameInClip: number } | null {
  let offset = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    if (!scene.clip) continue;

    const baseDuration = scene.durationOverride ?? scene.clip.durationInFrames;
    const trimStart = scene.trimStart ?? 0;
    const trimEnd = scene.trimEnd ?? 0;
    const effectiveDuration = baseDuration - trimStart - trimEnd;

    if (targetFrame >= offset && targetFrame < offset + effectiveDuration) {
      // Found the scene! Now calculate frame position in original clip
      const frameInVisiblePortion = targetFrame - offset;
      const frameInClip = trimStart + frameInVisiblePortion;

      return { sceneIndex: i, frameInClip };
    }

    offset += effectiveDuration;
  }

  return null;
}

// Usage in movie-editor.tsx
const handleSplitAtPlayhead = useCallback(async () => {
  const location = findSceneAtFrame(scenesWithClips, currentFrame);
  if (!location) {
    toast.error("No clip at playhead position");
    return;
  }

  try {
    await splitScene({
      movieId: movie!._id as any,
      sceneIndex: location.sceneIndex,
      splitFrame: location.frameInClip,
    });
    toast.success("Clip split");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Failed to split clip");
  }
}, [currentFrame, scenesWithClips, movie, splitScene]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Destructive clip copying on split | Virtual split via trim metadata | Always best practice | No storage waste, easy undo |
| Custom key listener with modifier parsing | tinykeys with `$mod` | ~2020 | Cross-platform, tiny bundle |
| Complex tool state machine | Simple boolean for 2 modes | When limited tools | Simpler code, less overhead |
| Click-only blade activation | Keyboard shortcut primary + button fallback | Industry standard | Faster workflow for power users |

**Deprecated/outdated:**
- Creating new clip database records for each split: Wastes storage, complicates relationships
- Using `react-hotkeys` (old unmaintained version): Use `react-hotkeys-hook` or `tinykeys`

## Open Questions

1. **Should blade mode auto-exit after split?**
   - What we know: DaVinci Resolve stays in blade mode; Final Cut Pro exits
   - What's unclear: Which UX is better for this app's users
   - Recommendation: Stay in blade mode (allows rapid multiple splits); clear visual indicator and Esc to exit

2. **Click-to-split vs playhead-split**
   - What we know: Both patterns exist in professional editors
   - What's unclear: Which should be primary for this app
   - Recommendation: Implement both. Playhead split (Cmd+B) for precision; click split for quick cuts. Click is more intuitive for beginners.

3. **Should split preserve selection/focus on first or second resulting clip?**
   - What we know: After split, user needs to know which clips resulted
   - What's unclear: Which clip should be "selected" or focused
   - Recommendation: Don't auto-select either; keep playhead at split point. User can then work with either clip.

4. **Minimum clip duration after split**
   - What we know: Must be at least 1 frame technically
   - What's unclear: Is 1 frame useful or confusing?
   - Recommendation: Technical minimum of 1 frame; don't add artificial UX minimum. Users can delete tiny clips if unwanted.

## Sources

### Primary (HIGH confidence)
- [tinykeys GitHub](https://github.com/jamiebuilds/tinykeys) - API documentation, React hook pattern, key syntax
- Existing codebase: `convex/movies.ts` - trimScene mutation pattern for split implementation
- Existing codebase: `timeline-trim-handle.tsx` - Pointer capture and frame calculation patterns
- Existing codebase: `use-current-player-frame.ts` - Current frame tracking for playhead position

### Secondary (MEDIUM confidence)
- [DaVinci Resolve keyboard shortcuts](https://www.storyblocks.com/resources/blog/davinci-resolve-keyboard-shortcuts) - "B" for blade tool standard
- [Final Cut Pro editing tools](https://support.apple.com/guide/final-cut-pro/cut-clips-in-two-ver4e30479/mac) - Blade tool behavior reference
- WebSearch verified: Industry standard is "B" key for blade tool across major NLEs

### Tertiary (LOW confidence)
- Community patterns for blade tool UX (click vs playhead split preferences)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - tinykeys is locked decision, API verified via GitHub docs
- Architecture: HIGH - Builds directly on Phase 20 trim infrastructure
- Pitfalls: HIGH - Based on trim mutation experience + standard NLE behavior research

**Research date:** 2026-02-03
**Valid until:** 2026-03-05 (30 days - patterns are stable, tinykeys is mature)
