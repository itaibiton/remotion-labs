# Phase 18: Pro Layout - Research

**Researched:** 2026-02-02
**Domain:** Resizable panel layout for full-screen video editor (react-resizable-panels v4 + shadcn/ui + Remotion Player)
**Confidence:** HIGH

## Summary

This phase transforms the existing movie editor page from a scrollable document layout into a full-screen professional editor with resizable panels. The current movie editor (`movie-editor.tsx`) renders Preview Player and Timeline in a vertically stacked flow layout with padding and scrolling. The goal is to replace this with a viewport-filling, non-scrolling layout where Preview (top) and Timeline (bottom) are split by a draggable divider.

The primary library is `react-resizable-panels` (v4.x), which has undergone a **major breaking API rename** in v4. The old exports (`PanelGroup`, `PanelResizeHandle`, `direction` prop) are now `Group`, `Separator`, and `orientation` respectively. The shadcn/ui CLI `npx shadcn@latest add resizable` currently installs v4 but generates v3-incompatible code, so the component wrapper must be written or patched manually to use the v4 API. The current app shell layout (`src/app/(app)/layout.tsx`) already uses `h-screen flex overflow-hidden`, which is the correct foundation for full-viewport panels.

The Remotion Player (`@remotion/player` v4.0.410 already installed) supports responsive sizing via `style={{ width: "100%" }}` and uses CSS `aspect-ratio` to maintain 16:9 proportions. Inside a resizable panel, the Player needs an intermediary container with `position: relative` and constrained dimensions to prevent layout overflow.

**Primary recommendation:** Install `react-resizable-panels@^4.4`, create a v4-compatible shadcn/ui resizable wrapper component, then refactor `movie-editor.tsx` to use a vertical `ResizablePanelGroup` with Preview in the top panel and Timeline in the bottom panel, eliminating all padding/scroll from the movie editor page.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-resizable-panels | ^4.4.2 | Resizable split-panel layout | 2.7M weekly downloads, WAI-ARIA compliant, touch-optimized, SSR-safe. Locked decision from milestone planning. |
| @remotion/player | 4.0.410 (installed) | Video preview player | Already in use; renders composition with responsive width. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.563.0 (installed) | Grip icon for drag handle | The `GripVertical` or `GripHorizontal` icon for the visible resize handle indicator. |
| clsx + tailwind-merge | (installed) | Class merging utility | Already available via `cn()` in `@/lib/utils`. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-resizable-panels v4 | Pin to v3 (0.0.63) | Avoids API rename but misses v4 improvements (flexible units, better SSR, improved constraints). Use v4. |
| Custom CSS resize | Hand-rolled drag logic | react-resizable-panels handles keyboard a11y, touch, constraints, SSR. Never hand-roll. |

**Installation:**
```bash
npm install react-resizable-panels@^4.4.2
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── ui/
│   │   └── resizable.tsx          # NEW - shadcn/ui wrapper for react-resizable-panels v4
│   └── movie/
│       ├── movie-editor.tsx       # MODIFIED - refactored to use ResizablePanelGroup
│       ├── movie-preview-player.tsx # MODIFIED - remove outer wrapper, fill parent panel
│       ├── timeline.tsx           # MINOR CHANGE - remove p-6 padding, fill parent panel
│       └── timeline-scene.tsx     # UNCHANGED
├── app/
│   └── (app)/
│       ├── layout.tsx             # UNCHANGED - already h-screen flex overflow-hidden
│       └── movie/
│           └── [id]/
│               └── page.tsx       # UNCHANGED - renders MovieEditor
```

### Pattern 1: v4-Compatible shadcn/ui Resizable Wrapper
**What:** A wrapper component in `src/components/ui/resizable.tsx` that maps `react-resizable-panels` v4 exports (`Group`, `Panel`, `Separator`) to the shadcn/ui naming convention (`ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle`).
**When to use:** Always. All panel usage goes through this wrapper for consistent styling and API stability.
**Example:**
```typescript
// Source: shadcn/ui resizable component updated for react-resizable-panels v4
// https://github.com/shadcn-ui/ui/issues/9136
"use client"

import * as React from "react"
import { GripHorizontal } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"
import { cn } from "@/lib/utils"

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Group>) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full aria-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    />
  )
}

function ResizablePanel({
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Panel>) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & {
  withHandle?: boolean
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(
        "bg-border focus-visible:ring-ring relative flex w-full items-center justify-center focus-visible:ring-1 focus-visible:outline-none",
        "aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-2 aria-[orientation=horizontal]:after:w-full",
        "aria-[orientation=vertical]:h-full aria-[orientation=vertical]:w-px aria-[orientation=vertical]:after:top-0 aria-[orientation=vertical]:after:h-full aria-[orientation=vertical]:after:w-2",
        "[&[aria-orientation=horizontal]>div]:rotate-90",
        "after:absolute after:inset-y-0 after:left-1/2 after:-translate-x-1/2",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-sm border">
          <GripHorizontal className="size-2.5" />
        </div>
      )}
    </ResizablePrimitive.Separator>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
```

### Pattern 2: Vertical Split Editor Layout
**What:** A vertical `ResizablePanelGroup` with two panels -- Preview (top, default ~65%) and Timeline (bottom, default ~35%).
**When to use:** The movie editor page.
**Example:**
```typescript
// Source: react-resizable-panels v4 API
// https://github.com/bvaughn/react-resizable-panels
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"

// Inside MovieEditor return:
<ResizablePanelGroup orientation="vertical">
  <ResizablePanel defaultSize="65%" minSize="30%">
    {/* Preview Player area */}
    <div className="h-full flex items-center justify-center bg-black/5 overflow-hidden">
      <MoviePreviewPlayer ... />
    </div>
  </ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel defaultSize="35%" minSize="15%">
    {/* Timeline area */}
    <div className="h-full overflow-y-auto">
      <Timeline ... />
    </div>
  </ResizablePanel>
</ResizablePanelGroup>
```

### Pattern 3: Remotion Player Inside Resizable Panel
**What:** The Remotion Player must fill the available panel space while maintaining 16:9 aspect ratio. Use an intermediary container with `aspect-ratio` and `max-height: 100%; max-width: 100%` to center-fit the player.
**When to use:** Always when placing the Remotion Player inside a flex/resizable container.
**Example:**
```typescript
// Source: https://www.remotion.dev/docs/player/scaling
<div className="h-full w-full relative flex items-center justify-center">
  <div
    style={{
      aspectRatio: "1920 / 1080",
      maxHeight: "100%",
      maxWidth: "100%",
    }}
  >
    <Player
      component={MovieComposition}
      compositionWidth={1920}
      compositionHeight={1080}
      style={{ width: "100%" }}
      controls
      loop
    />
  </div>
</div>
```

### Anti-Patterns to Avoid
- **Setting overflow on Panel directly:** Panel uses `overflow: hidden` by default and it cannot be overridden via props or className. Use an inner wrapper `<div>` with `overflow-y: auto` instead.
- **Using `direction` prop instead of `orientation`:** v4 renamed `direction` to `orientation`. Using `direction` will silently fail or error.
- **Using `PanelGroup`/`PanelResizeHandle` imports directly:** v4 renamed these to `Group`/`Separator`. The shadcn wrapper handles this, but if importing directly, use the new names.
- **Percentage-only sizes:** v4 supports pixels (`"200px"`), percentages (`"50%"`), and other units. But for a responsive layout, percentages are still recommended for `defaultSize`/`minSize`/`maxSize`.
- **Forgetting the full height chain:** Every ancestor element between `<body>` and `<ResizablePanelGroup>` must have full height set. A single missing `h-full` breaks the layout.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Draggable panel divider | Custom mousedown/mousemove handler | react-resizable-panels `Separator` | Handles keyboard a11y, touch, cursor styles, min/max constraints |
| Aspect-ratio responsive video | Custom ResizeObserver + manual calculation | CSS `aspect-ratio` + `max-height/max-width` | Native CSS, zero JS, works in all modern browsers |
| Panel layout persistence | Custom localStorage + state management | `useDefaultLayout` hook from react-resizable-panels | Built-in debounced persistence with SSR flicker prevention |
| Full-viewport layout | Manual `position: fixed` or `100vh` hacks | Tailwind `h-screen` + flex + `overflow-hidden` | Already in place in the app shell; works with Next.js |

**Key insight:** The combination of react-resizable-panels + CSS aspect-ratio + the existing `h-screen flex overflow-hidden` app shell means zero custom layout math is needed. The entire pro layout can be built declaratively with props and CSS.

## Common Pitfalls

### Pitfall 1: v4 API Mismatch
**What goes wrong:** Using shadcn CLI `add resizable` generates code referencing `PanelGroup`, `PanelResizeHandle`, and `direction` -- all renamed in v4.
**Why it happens:** The shadcn/ui CLI template was not updated for react-resizable-panels v4 at the time of the v4 release. A fix PR (#9461) was submitted Jan 26, 2026, but may not yet be in the latest CLI release.
**How to avoid:** Do NOT use `npx shadcn@latest add resizable`. Instead, manually create `src/components/ui/resizable.tsx` with the v4-compatible code from the Code Examples section.
**Warning signs:** TypeScript errors like `Property 'PanelGroup' does not exist on type 'typeof import("react-resizable-panels")'`.

### Pitfall 2: Panel Content Overflow Clipping
**What goes wrong:** Content inside panels (especially the timeline with horizontal scroll) gets clipped because Panel applies `overflow: hidden` by default. The `overflow` style cannot be overridden on Panel directly.
**Why it happens:** react-resizable-panels v4 sets `overflow: hidden` on Panel and Group to prevent scrollbar flicker during resize.
**How to avoid:** Always add an inner wrapper `<div>` inside each `<ResizablePanel>` with the desired overflow behavior (e.g., `overflow-y-auto` for the timeline panel, `overflow-hidden` for the preview panel).
**Warning signs:** Scrollable content (like the timeline's horizontal scene strip) becomes unscrollable after adding panels.

### Pitfall 3: Remotion Player Overflows Panel
**What goes wrong:** The Remotion Player renders at its full composition size (1920x1080) and overflows the panel container.
**Why it happens:** Without proper constraints, `style={{ width: "100%" }}` makes the player fill width but the height is calculated from aspect ratio, which can exceed the panel height.
**How to avoid:** Use the intermediary container pattern from the Remotion docs: a wrapper with `aspect-ratio: 1920/1080`, `max-height: 100%`, `max-width: 100%` inside a `relative` positioned parent.
**Warning signs:** Player extends beyond the panel boundary, causing layout overflow or visible scrollbars.

### Pitfall 4: Broken Height Chain
**What goes wrong:** Panels don't fill the viewport. Everything collapses to zero height or content-height.
**Why it happens:** A single ancestor element in the DOM tree between `<body>` and `<ResizablePanelGroup>` is missing `height: 100%` / `h-full`.
**How to avoid:** Audit the full DOM chain: `body > div#root > AppLayout(h-screen flex) > main(flex-1) > MovieEditor(flex-1 h-full) > ResizablePanelGroup`. The current app shell already has `h-screen flex overflow-hidden` on the outer div and `flex-1 overflow-y-auto` on main. The movie editor page needs to ensure the ResizablePanelGroup receives full height. The `overflow-y-auto` on `<main>` should be changed to `overflow-hidden` for the movie editor route (or the movie editor itself should handle overflow).
**Warning signs:** Panels are tiny or zero-height; content appears below the fold.

### Pitfall 5: Header Takes Space from Panel Layout
**What goes wrong:** The movie editor header (title, buttons) consumes vertical space, leaving less room for the resizable panels than expected.
**Why it happens:** The current movie-editor.tsx has a header section with `border-b px-6 py-4`. This header sits above the resizable panel area, consuming ~60px.
**How to avoid:** Keep the header but make the resizable panel area fill the remaining space. Use a flex-col layout: header at the top (flex-shrink-0), ResizablePanelGroup below (flex-1 min-h-0). The `min-h-0` is critical in flexbox to allow the panel group to shrink below its content size.
**Warning signs:** Resizable panels are shorter than expected; dragging the handle cannot reach the bottom of the viewport.

## Code Examples

### Complete Resizable Wrapper (v4-compatible)
```typescript
// src/components/ui/resizable.tsx
// Source: Community-verified v4 fix from https://github.com/shadcn-ui/ui/issues/9136
"use client"

import * as React from "react"
import { GripHorizontal } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"
import { cn } from "@/lib/utils"

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Group>) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full aria-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    />
  )
}

function ResizablePanel({
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Panel>) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & {
  withHandle?: boolean
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(
        "bg-border focus-visible:ring-ring relative flex w-full items-center justify-center focus-visible:ring-1 focus-visible:outline-none",
        "aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-2 aria-[orientation=horizontal]:after:w-full",
        "aria-[orientation=vertical]:h-full aria-[orientation=vertical]:w-px aria-[orientation=vertical]:after:top-0 aria-[orientation=vertical]:after:h-full aria-[orientation=vertical]:after:w-2",
        "[&[aria-orientation=horizontal]>div]:rotate-90",
        "after:absolute after:inset-y-0 after:left-1/2 after:-translate-x-1/2",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-sm border">
          <GripHorizontal className="size-2.5" />
        </div>
      )}
    </ResizablePrimitive.Separator>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
```

### Movie Editor Layout Skeleton
```typescript
// Refactored movie-editor.tsx return (scenes present)
// Source: react-resizable-panels v4 + Remotion Player sizing docs
<div className="flex-1 flex flex-col h-full">
  {/* Header - fixed height, won't resize */}
  <div className="border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
    {/* ... title, buttons ... */}
  </div>

  {/* Resizable panel area - fills remaining space */}
  <div className="flex-1 min-h-0">
    <ResizablePanelGroup orientation="vertical">
      <ResizablePanel defaultSize="65%" minSize="30%">
        {/* Inner wrapper handles overflow */}
        <div className="h-full w-full flex items-center justify-center p-4 overflow-hidden">
          <div style={{
            aspectRatio: "1920 / 1080",
            maxHeight: "100%",
            maxWidth: "100%",
          }}>
            <MoviePreviewPlayer ... />
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize="35%" minSize="15%">
        {/* Inner wrapper for timeline scrolling */}
        <div className="h-full overflow-y-auto p-4">
          <Timeline ... />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  </div>
</div>
```

### Remotion Player Responsive Container
```typescript
// Inside the preview panel - centers player with correct aspect ratio
// Source: https://www.remotion.dev/docs/player/scaling
<div className="h-full w-full relative flex items-center justify-center bg-black/5">
  <div
    style={{
      aspectRatio: `${compositionWidth} / ${compositionHeight}`,
      maxHeight: "100%",
      maxWidth: "100%",
    }}
  >
    <Player
      ref={playerRef}
      component={MovieComposition}
      inputProps={{ scenes }}
      durationInFrames={totalDurationInFrames}
      fps={fps}
      compositionWidth={1920}
      compositionHeight={1080}
      style={{ width: "100%" }}
      controls
      loop
    />
  </div>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `PanelGroup` export | `Group` export | react-resizable-panels v4.0.0 (late 2025) | Must use new import name |
| `PanelResizeHandle` export | `Separator` export | react-resizable-panels v4.0.0 | Must use new import name |
| `direction` prop | `orientation` prop | react-resizable-panels v4.0.0 | Aligns with WAI-ARIA `orientation` attribute |
| `autoSaveId` prop for persistence | `useDefaultLayout` hook | react-resizable-panels v4.0.0 | Hook-based API with built-in debouncing |
| `onLayout` callback | `onLayoutChanged` callback | react-resizable-panels v4.0.0 | Fires after pointer release, not during drag |
| `data-[panel-group-direction=vertical]` CSS selector | `aria-[orientation=vertical]` CSS selector | react-resizable-panels v4.0.0 | Uses ARIA attributes instead of custom data attributes |
| Percentage-only sizes | Flexible units (px, %, em, rem, vh, vw) | react-resizable-panels v4.0.0 | More control over panel constraints |

**Deprecated/outdated:**
- `autoSaveId` prop: Replaced by `useDefaultLayout` hook in v4.
- `data-panel-group-direction` CSS selector: Replaced by `aria-orientation` in v4.
- `onLayout` callback on PanelGroup: Replaced by `onLayoutChanged` on Group.
- shadcn CLI `npx shadcn@latest add resizable`: Currently broken with v4 (generates v3 code). Manually create the component instead.

## Open Questions

1. **shadcn CLI fix availability**
   - What we know: PR #9461 was submitted Jan 26, 2026, to fix the v4 compatibility issue in shadcn/ui CLI.
   - What is unclear: Whether the fix is merged and released in the latest `shadcn@latest` CLI.
   - Recommendation: Do not rely on CLI. Manually create the resizable wrapper using verified v4-compatible code from this research.

2. **Layout persistence across sessions**
   - What we know: v4 provides `useDefaultLayout` hook for localStorage-based persistence.
   - What is unclear: Whether the phase requirements call for cross-session persistence (the success criteria say "persist visually during the session" -- not across sessions).
   - Recommendation: Skip `useDefaultLayout` for now. The `defaultSize` prop on panels provides session-stable layout that won't reset on re-render. Persistence is a future enhancement.

3. **Main element overflow-y-auto conflict**
   - What we know: The app shell `<main>` has `overflow-y-auto`, which allows page scrolling. The movie editor needs `overflow-hidden` to prevent the page from scrolling.
   - What is unclear: Whether changing the `<main>` overflow will affect other pages.
   - Recommendation: Do NOT change the app shell layout. Instead, ensure `movie-editor.tsx` renders as `h-full overflow-hidden` to contain its own scrolling, and the ResizablePanelGroup inside it will manage overflow. The app `<main className="flex-1 overflow-y-auto">` combined with the editor's `h-full` should work because the editor content exactly fills the viewport with no overflow. Validate during implementation.

## Sources

### Primary (HIGH confidence)
- [react-resizable-panels GitHub](https://github.com/bvaughn/react-resizable-panels) - v4.5.6 (latest Jan 30, 2026), API components, breaking changes
- [react-resizable-panels CHANGELOG](https://github.com/bvaughn/react-resizable-panels/blob/main/CHANGELOG.md) - v4 migration details
- [Remotion Player Sizing docs](https://www.remotion.dev/docs/player/scaling) - Responsive player container pattern
- [shadcn/ui Resizable docs](https://ui.shadcn.com/docs/components/resizable) - Component wrapper pattern, installation

### Secondary (MEDIUM confidence)
- [shadcn/ui Issue #9136](https://github.com/shadcn-ui/ui/issues/9136) - v4 compatibility bug report with community fix code
- [shadcn/ui Issue #9197](https://github.com/shadcn-ui/ui/issues/9197) - Additional v4 compatibility details
- [react-resizable-panels overflow examples](https://react-resizable-panels.vercel.app/examples/overflow) - Overflow handling patterns

### Tertiary (LOW confidence)
- [Medium article (Jan 2026)](https://medium.com/@rivainasution/shadcn-ui-react-series-part-8-resizable-let-users-control-space-not-you-03c018dc85c2) - Confirms v4 API changes, community usage patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - react-resizable-panels is a locked decision; version and API verified via GitHub and npm
- Architecture: HIGH - Pattern verified against official Remotion docs and react-resizable-panels examples; existing codebase analyzed
- Pitfalls: HIGH - v4 breaking changes verified across multiple sources (GitHub issues, changelog, community reports); overflow behavior documented in official examples

**Research date:** 2026-02-02
**Valid until:** 2026-03-04 (30 days -- library is stable, v4 API settled)
