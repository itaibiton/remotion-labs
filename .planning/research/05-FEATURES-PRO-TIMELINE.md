# Feature Landscape: Pro Timeline Editing

**Domain:** AI-powered web video editor with programmatic (Remotion/React) clips
**Researched:** 2026-02-02
**Milestone context:** Adding pro timeline editing to an existing AI animation creation app
**Confidence:** HIGH (cross-referenced Premiere Pro, DaVinci Resolve, CapCut, Canva Video 2.0, Remotion docs, img.ly timeline design guide)

---

## Current State Assessment

The existing timeline is a **card-based storyboard**, not a pro timeline. It renders fixed-size 160x110px thumbnail cards with drag-to-reorder via @dnd-kit. There is no temporal representation -- clip widths do not reflect duration. The data model already has a `durationOverride` field on scenes (unused in UI), and clips reference React component code rather than video files.

**What exists today:**
- Horizontal drag-to-reorder scene cards (storyboard mode) via `@dnd-kit`
- Remotion Player with `<Series>` composition for sequential playback
- Active scene highlighting based on playhead frame position (`useCurrentPlayerFrame` hook)
- Per-scene remove button (hover X icon)
- Per-scene "generate next" button (hover FastForward icon)
- Scene timing computation (cumulative frame offsets in `MoviePreviewPlayer`)
- Movie data model: `scenes: Array<{ clipId, durationOverride? }>` in Convex

**What the Remotion runtime already supports natively (no custom rendering code needed):**
- `<Sequence from={-N}>` trims the start of a clip (skips first N frames of the animation)
- `<Sequence durationInFrames={N}>` trims the end (stops after N frames)
- Nested Sequences for combined trim-start + trim-end
- `<Series.Sequence offset={N}>` for shifting sequences in a Series
- `useCurrentFrame()` returns frame-relative-to-Sequence automatically

This means **non-destructive trimming is architecturally free in Remotion.** The entire effort is in the UI interaction layer and data model, not in the rendering pipeline.

---

## Table Stakes

Features users expect from any editor that calls itself a "timeline." Missing any of these and the product feels like a storyboard tool, not an editor.

### TS-1: Duration-Proportional Clip Blocks

| Aspect | Detail |
|--------|--------|
| **What** | Clip width on the timeline reflects actual duration. A 3s clip is 3x wider than a 1s clip. |
| **Why expected** | Every timeline editor since the 1990s does this. The current fixed-width cards are a storyboard, not a timeline. This is the single change that transforms the mental model. Premiere Pro, DaVinci Resolve, CapCut, Canva Video 2.0 all use proportional width. |
| **Complexity** | Medium |
| **Depends on** | Zoom level system (TS-4) to keep clips usable at different total durations |
| **Implementation note** | `width = (clip.durationInFrames / fps) * pixelsPerSecond` where `pixelsPerSecond` is the zoom factor. Each clip block becomes a flex-none element with a calculated width. Replace the current fixed `w-[160px]` with dynamic sizing. The existing `@dnd-kit` horizontal sorting strategy should work with variable widths. |

### TS-2: Non-Destructive Clip Trimming (In/Out Handles)

| Aspect | Detail |
|--------|--------|
| **What** | Drag handles on the left and right edges of a clip block to adjust which portion of the animation plays. Removes frames from the start or end without altering the source clip. |
| **Why expected** | Table stakes since Premiere 1.0. Every editor from CapCut-tier upward supports edge-drag trimming. Canva Video 2.0 added this in late 2025 as their headline feature upgrade. The img.ly design guide calls trimming "the core editing gesture." |
| **Complexity** | Medium-High |
| **Depends on** | Duration-proportional blocks (TS-1), data model extension |
| **Data model change** | Add `trimStart` (frames to skip from beginning) and `trimEnd` (frames to skip from end) to each scene object. Effective duration = `clip.durationInFrames - trimStart - trimEnd`. The underlying clip document remains untouched -- this is the non-destructive principle. |
| **Remotion mapping** | Inner `<Sequence from={-trimStart}>` trims the animation start; outer `<Sequence durationInFrames={effectiveDuration}>` trims the end. Both are native Remotion primitives. The animation at frame `trimStart` becomes the visible first frame -- the animation does not restart, it picks up mid-progress. |
| **UX pattern (Premiere/CapCut/img.ly)** | Cursor changes to a bracket/resize icon when hovering within ~8px of clip edge. Drag inward to trim. Ghost or "marching ants" outline shows the trimmed-away region (img.ly calls these "triangular grooves" on the handle). Snapping to the playhead position is critical for precision. During trim-drag, show a live preview of the frame at the new in/out point either in the main preview or as a tooltip overlay. Without this live preview, trimming is guess-and-check. |
| **Critical nuance for RemotionLab** | Unlike video file editors where trimming reveals different footage, here trimming reveals different states of the same animation. Trimming the start of a "logo slide-in" animation means the logo appears already mid-slide. Users must be able to see this during the drag. |

### TS-3: Playhead with Frame-Accurate Scrubbing

| Aspect | Detail |
|--------|--------|
| **What** | A vertical line on the timeline that shows current playback position. Click or drag anywhere on the timeline ruler to scrub to that frame. Synchronized bidirectionally with the Remotion Player. |
| **Why expected** | The Remotion Player already has a built-in scrub bar, but it is inside the player chrome -- not on the timeline itself. Pro editors synchronize a timeline playhead with the preview monitor. Without a timeline playhead, there is no spatial connection between "where am I in time" and "which part of which clip is playing." |
| **Complexity** | Medium |
| **Depends on** | Duration-proportional blocks (TS-1), Remotion Player ref for `seekTo()` |
| **UX pattern (Premiere/DaVinci/CapCut)** | Thin vertical line (red in Premiere, blue in CapCut, white in DaVinci) spanning the full height of the timeline tracks area. Frame number or timecode displayed above in the ruler. Drag the playhead to scrub. Click on the ruler to jump. Current frame updates the preview in real-time. |
| **Implementation note** | Use `playerRef.current?.seekTo(frame)` for programmatic control. The existing `useCurrentPlayerFrame` hook already reads the Player's frame. For the reverse direction (timeline click updates Player), calculate `frame = (clickX / timelineWidth) * totalDurationInFrames` adjusted for scroll offset and zoom. |
| **Bidirectional sync** | Player playing forward moves the playhead across the timeline. Dragging the playhead on the timeline scrubs the Player. Both must be smooth (requestAnimationFrame) and avoid feedback loops. |

### TS-4: Timeline Zoom and Horizontal Scroll

| Aspect | Detail |
|--------|--------|
| **What** | Zoom in or out to see more or fewer frames on screen. Horizontal scroll to navigate along the timeline when zoomed in. |
| **Why expected** | Without zoom, either short clips are invisible slivers or long movies overflow the viewport. Every pro editor has this. DaVinci Resolve has three zoom modes (Full Extent, Detail, Custom). |
| **Complexity** | Medium |
| **Depends on** | Duration-proportional blocks (TS-1) |
| **UX patterns (DaVinci/Premiere/CapCut)** | Ctrl+Plus/Minus for keyboard zoom. Alt/Option+ScrollWheel for mouse zoom. Shift+ScrollWheel for horizontal scroll (or native horizontal scroll on trackpad). "Fit to view" button (DaVinci's Z key) that auto-sizes the timeline to show all clips. Zoom slider in timeline toolbar for direct control. |
| **Zoom model** | Single state value: `pixelsPerSecond`. Minimum zoom shows the entire timeline within the viewport. Maximum zoom shows individual frames. Store in component state (ephemeral UI state, not persisted to DB). Clip widths derive from `(durationInSeconds) * pixelsPerSecond`. |
| **Zoom centering** | Zoom should center on the playhead position, not on the left edge of the viewport. DaVinci Resolve has an explicit "zoom around mouse pointer" vs "zoom around playhead" setting. For simplicity, zoom around playhead. When the user zooms in, the playhead stays visually in place and the surrounding clips expand. |
| **Scroll behavior** | Native horizontal scroll via `overflow-x: auto` on the timeline container. On trackpad, horizontal two-finger scroll works natively. On mouse, Shift+ScrollWheel for horizontal scroll. The playhead position determines auto-scroll during playback: if the playhead moves past the right edge of the viewport, the timeline scrolls to follow. |

### TS-5: Split / Blade Tool

| Aspect | Detail |
|--------|--------|
| **What** | Cut a clip into two clips at the current playhead position. |
| **Why expected** | Core editing primitive in every editor. CapCut puts a split button in the toolbar above the timeline. Premiere Pro uses `C` key (Razor) or `Ctrl+K` (split at playhead). DaVinci Resolve offers both blade mode and split-clip command. |
| **Complexity** | Medium-High |
| **Depends on** | Trimming data model (TS-2), playhead (TS-3) |
| **Behavior (from Premiere/DaVinci research)** | Place playhead at desired frame within a clip. Press split button or keyboard shortcut. The single scene entry splits into two scene entries, both referencing the same underlying clip but with different trim values. |
| **Split math** | Given a scene with `trimStart=S`, `trimEnd=E`, and the user splits at frame `F` (relative to the trimmed clip start, where F=0 is the first visible frame): Scene A gets `trimStart=S, trimEnd = clip.durationInFrames - S - F`. Scene B gets `trimStart = S + F, trimEnd = E`. Both reference the same `clipId`. |
| **Critical nuance for RemotionLab** | Unlike traditional editors where splitting a video reveals the same footage from two angles, here each "clip" is a React component with animation state tied to `useCurrentFrame()`. Splitting at frame 45 of a 90-frame clip means Scene B starts with the animation already at frame 45 (it does not restart). This is correct behavior because Remotion's `<Sequence from={-45}>` shifts the frame reference. But it may surprise users who expect each piece to "start fresh." Consider a tooltip or first-time explanation. |
| **Post-split selection** | The first clip (left side) should remain selected (DaVinci's pattern). No gap is created because `<Series>` is inherently gap-free. |
| **Tool mode vs. action** | Do NOT implement as a persistent tool mode (AF-3). Implement as a one-shot action: button click or keyboard shortcut splits at playhead. No "blade cursor" that stays active. CapCut and Canva both use the action approach. |

### TS-6: Clip Selection and Active State

| Aspect | Detail |
|--------|--------|
| **What** | Click a clip to select it. Selected clip gets a distinct visual highlight. Selection is the target for contextual actions (delete, split, properties). |
| **Complexity** | Low |
| **Depends on** | Nothing (enhances existing `activeSceneIndex`) |
| **UX pattern** | Click to select (bold ring highlight). Click empty timeline area to deselect. Must be visually distinct from the existing playhead-based "active scene" highlight. Recommendation: playhead highlight = subtle bottom border or slight background tint. User selection = bold colored ring (primary color) + visible trim handles. |
| **Implementation note** | Add a `selectedSceneIndex` state separate from `activeSceneIndex`. Active = which scene the playhead is in (automatic). Selected = which scene the user clicked (manual). They may differ. |

### TS-7: Per-Clip Context Menu

| Aspect | Detail |
|--------|--------|
| **What** | Right-click (or kebab/meatball menu button) on a clip shows contextual actions. |
| **Why expected** | Standard pattern in every desktop-class editor. NN/g research confirms context menus are critical for discoverability in object-dense UIs. The current hover-reveal buttons (X and FastForward) are limited to two actions and not discoverable. |
| **Complexity** | Low-Medium |
| **Depends on** | Clip selection (TS-6) |
| **UX patterns (NN/g, Audacity, Premiere)** | Right-click triggers a floating menu at cursor position. Keep to 6-10 items maximum. Group destructive actions at bottom in red/danger color. Show keyboard shortcuts inline for every action (e.g., "Split at Playhead  Ctrl+K"). Order items by frequency of use. |
| **Recommended actions for RemotionLab** | Split at Playhead (Ctrl+K), Duplicate (Ctrl+D), Open in Editor (navigate to clip's code), Extend Next (existing continuation feature), Extend Previous (existing prequel feature), separator, Remove from Timeline (Delete/Backspace). |
| **Implementation** | Use Radix UI `ContextMenu` (likely already available via shadcn/ui) for accessible, keyboard-navigable right-click menus. Provide both right-click AND a visible kebab button for discoverability (especially for trackpad users who may not know right-click gestures). |

### TS-8: Timeline Ruler with Time Markings

| Aspect | Detail |
|--------|--------|
| **What** | A horizontal ruler above the clip blocks showing seconds or frames. Tick marks scale with zoom level. |
| **Why expected** | Users need temporal reference. Without time markings, proportional clip blocks are abstract colored rectangles with no meaning. |
| **Complexity** | Low-Medium |
| **Depends on** | Zoom system (TS-4) |
| **UX pattern (img.ly guide, Premiere)** | Numeric labels at major intervals (every 5 seconds at default zoom). Subdivision dots between labels (4 dots between 5-second marks = 1 dot per second). At higher zoom, show every second. At maximum zoom, show individual frame numbers. Fractional seconds (e.g., "4.2s") when zoomed into sub-second precision. |
| **Implementation note** | Calculate tick positions from zoom level: `majorInterval = chooseInterval(pixelsPerSecond)` where intervals are [1s, 2s, 5s, 10s, 30s, 1min]. Render as a fixed-height div above the clip track with absolutely positioned tick marks and labels. The ruler scrolls horizontally with the clip track. |

---

## Differentiators

Features that set RemotionLab apart from traditional video editors. These leverage the unique "clips are React code" paradigm and the AI generation pipeline.

### D-1: Inline Code Preview on Hover/Select

| Aspect | Detail |
|--------|--------|
| **What** | When selecting a clip on the timeline, show a preview of the React/JSX source code that generates the animation. Either in a collapsible panel below the timeline or as a slide-out panel. |
| **Value** | No other video editor has this because no other editor's clips are code. This is RemotionLab's core identity -- the bridge between visual timeline editing and code editing. It answers "what does this clip actually do?" without leaving the timeline. |
| **Complexity** | Low-Medium |
| **Notes** | The existing clip data already stores `rawCode` (original JSX). Show a truncated, syntax-highlighted preview. Could use a lightweight code viewer (read-only Monaco or Shiki for syntax highlighting). Link to full editor for modifications. |

### D-2: AI Re-Generate from Timeline

| Aspect | Detail |
|--------|--------|
| **What** | Right-click a clip on the timeline and choose "Regenerate" to have AI create a new variation in-place, without navigating away from the timeline. Optionally support "Regenerate with prompt" for directed changes. |
| **Value** | Bridges timeline editing and AI generation. Traditional editors require switching to a separate tool or importing new media. RemotionLab can do it contextually because the clip IS code that AI can regenerate. |
| **Complexity** | Medium |
| **Notes** | The "rerun" and "variation" actions already exist on the create page. This brings them into the timeline context. Could show a small prompt input inline or use the original prompt as the default. After regeneration completes, the new code replaces the old code in the clip (or creates a new clip version). |

### D-3: Animated Thumbnail Filmstrip on Clip Blocks

| Aspect | Detail |
|--------|--------|
| **What** | Instead of a single static thumbnail per clip, show a filmstrip of multiple frames across the clip block (like Premiere Pro's clip thumbnails). Sample frames at 0%, 25%, 50%, 75%, 100% of the animation. |
| **Value** | Since clips are Remotion compositions, arbitrary frames can be rendered with `<Thumbnail frameToDisplay={N}>` from `@remotion/player`. A filmstrip gives instant visual understanding of the animation arc without playing it. This is standard in Premiere Pro but rare in web editors. |
| **Complexity** | Medium |
| **Notes** | Rendering 5 Thumbnail components per clip could be expensive with many clips. Lazy-render only visible clips (IntersectionObserver). The current `TimelineScene` already renders one `<Thumbnail>` at the midpoint -- extending to multiple frames is architecturally straightforward. Width-proportional layout means wider clips naturally have room for more frame samples. |

### D-4: Snapping System

| Aspect | Detail |
|--------|--------|
| **What** | When trimming or splitting, elements snap to the playhead, to other clip boundaries, and to time markers. Visual indicator (dotted vertical line) shows the snap target. |
| **Value** | Elevates the feel from "web app" to "real editor." The img.ly design guide emphasizes: "Video editing must feel precise, even on a small screen." Snapping is what makes trimming feel confident rather than approximate. |
| **Complexity** | Medium |
| **Notes** | Snap targets: playhead position, clip start/end boundaries, ruler major ticks. Only snap to currently visible elements (viewport-aware snapping per img.ly guidance -- snapping to offscreen elements creates confusion). Snap threshold: ~8px. Visual feedback: a dotted vertical line appears when within snap distance. |

### D-5: Speed / Retime Control per Clip

| Aspect | Detail |
|--------|--------|
| **What** | Adjust playback speed of a clip (0.5x, 0.75x, 1x, 1.5x, 2x). The clip block on the timeline visually resizes to reflect the new effective duration. |
| **Value** | Useful for AI-generated animations that feel too fast or too slow. Unlike traditional video where speed changes affect audio pitch, Remotion code animations have no audio by default, making speed changes clean and artifact-free. DaVinci Resolve's "retime control" and Final Cut's "retime editor" are the pro references for this. |
| **Complexity** | Medium-High |
| **Data model** | Add `playbackRate` to the scene object. Effective duration = `(clip.durationInFrames - trimStart - trimEnd) / playbackRate`. |
| **Remotion concern** | There is no native "playback rate" for code-based compositions. This would need to be implemented by wrapping the clip in a component that scales `useCurrentFrame()` by the rate. For example, a wrapper that provides `Math.floor(frame * playbackRate)` to the inner component. This needs investigation and prototyping before committing. |

### D-6: Keyboard Shortcut System

| Aspect | Detail |
|--------|--------|
| **What** | Comprehensive keyboard shortcuts for all common timeline actions, displayed inline in context menus and in a discoverable shortcut reference. |
| **Value** | Separates a toy from a tool. Pro users and content creators who edit frequently rely on shortcuts. The pattern of showing shortcuts in context menus (NN/g: "Users learn by osmosis when the UI keeps whispering the answer") means users learn shortcuts passively. |
| **Complexity** | Low-Medium |
| **Recommended shortcuts** | Space = play/pause, K = pause (pro editors), J/L = reverse/forward playback, Ctrl+K = split at playhead, Delete/Backspace = remove selected clip, Ctrl+D = duplicate, Ctrl+Z / Ctrl+Shift+Z = undo/redo (future), Left/Right arrow = step one frame, Shift+Left/Right = step 10 frames, Ctrl+Plus/Minus = zoom, Z = fit timeline to view, Home/End = jump to start/end. |

---

## Anti-Features

Features to explicitly NOT build in this milestone. Common mistakes in this domain that would add significant complexity without proportional value for RemotionLab's target audience (content creators and marketers, not professional video editors).

### AF-1: Multi-Track Layered Timeline

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Multiple parallel tracks (V1, V2, A1, A2) like Premiere Pro or DaVinci Resolve | Massively increases complexity: vertical space management, track headers, layer ordering, composite blending, z-index management. RemotionLab clips are self-contained animations that include their own layering internally (each clip IS a React component tree). The target audience does not need to overlay separate clips on parallel tracks. Canva only added multi-track in late 2025 and it was described as their most complex feature release ever. | Keep the single-track linear timeline. Scenes play sequentially via `<Series>`. Internal composition layering happens within each clip's code. Multi-track is a future milestone if demand emerges. |

### AF-2: Ripple / Rolling / Slip / Slide Edit Modes

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Advanced trim modes (ripple edit, rolling edit, slip tool, slide tool) as separate tools like Premiere Pro | These tools exist because traditional NLEs have gaps between clips that need sophisticated management. RemotionLab's `<Series>` composition is inherently gap-free -- clips are always contiguous. Ripple and rolling edits solve problems that do not exist in this model. Slip and slide tools require understanding "source media range vs. timeline range" which is a professional concept that confuses the target audience. | Simple edge-drag trimming (TS-2) is sufficient. When a clip is trimmed shorter, the next clip automatically starts earlier because `<Series>` has no gaps. This IS implicit ripple behavior. No tool-mode switching needed. |

### AF-3: Persistent Tool Mode Switcher

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| A toolbar where you switch between selection tool, blade tool, hand tool, zoom tool, etc. (Premiere/DaVinci paradigm) | Tool mode switching is an NLE paradigm from the 1990s. Modern web editors (CapCut, Canva) have moved to contextual interactions where the cursor behavior changes based on position: hover near edge = trim cursor, hover middle = move/select cursor. Mode-based tools confuse casual users ("why can I not select anything? Oh, I am in blade mode"). The ScreenFlow documentation specifically warns users "remember to switch back to the Select Tool after using the Blade Tool." | Contextual cursor changes: hover clip edge = trim cursor, hover clip middle = drag/select cursor. Split via button or shortcut (one-shot action). Zoom via scroll/keyboard. No persistent modes. |

### AF-4: Transition Editor Between Clips

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Drag-and-drop transitions (fade, wipe, dissolve) between clips | Transitions between AI-generated Remotion compositions are technically non-trivial. They require overlapping two compositions and blending them, which means changing from `<Series>` to overlapping `<Sequence>` elements or switching to `<TransitionSeries>`. This changes the duration computation model (total duration shrinks by the overlap amount). It is a substantial feature that deserves its own milestone. | Defer to a future milestone. Hard cuts between scenes for now. Document that transitions require `<TransitionSeries>` from `@remotion/transitions` and changes to the duration computation. |

### AF-5: Audio Waveform Display and Audio Editing

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Showing audio waveforms on the timeline, audio level adjustment, separate audio tracks | RemotionLab clips are code-based animations with no inherent audio content (unless the generated code explicitly includes `<Audio>` tags, which is rare). There are no audio files to visualize. Adding audio editing introduces an entirely separate data pipeline (audio file import, waveform extraction, volume curves, sync) that is orthogonal to timeline editing. | Defer. Audio is a separate milestone that addresses audio generation, import, and mixing. The single-track timeline structure can be extended with an audio track later without architectural changes. |

### AF-6: Full Undo/Redo System

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Complete undo/redo stack for all timeline operations (reorder, trim, split, delete, add) | A proper undo/redo system for a Convex-backed real-time database requires careful architecture: either a command pattern with inverse operations, an operation log with replay capability, or full state snapshots. This is significant infrastructure work that would delay the core timeline features. | Defer to a subsequent milestone. For now, all operations are individually reversible by the user: trimming can be un-trimmed (drag handles back out), splits create two clips that can be individually deleted, removed clips can be re-added from the library. The Convex data model preserves original clip documents, so nothing is permanently destructive. |

### AF-7: Clip Repositioning with Gaps

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Dragging a clip to an arbitrary timeline position, creating gaps between clips | RemotionLab uses `<Series>` which is inherently gap-free. Allowing arbitrary positioning would require switching to `<Sequence from={absoluteFrame}>` for each clip, which is a fundamentally different composition model. Gaps add complexity (what fills the gap? black frames? adjustable?) without value for sequential scene composition. | Keep drag-to-reorder (already built with @dnd-kit). Clips always fill the timeline contiguously. Reorder changes the sequence, not the absolute positions. |

### AF-8: Properties Inspector Panel

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| A side panel showing all properties of a selected clip (position, scale, rotation, opacity, effects) like Premiere's Effect Controls or Final Cut's Inspector | RemotionLab clips are opaque code units -- their "properties" ARE their source code. There is no standardized property set to expose because each clip is a unique React component. Building a generic property inspector would require parsing JSX AST to extract animatable values, which is the hardest unsolved problem in the app. | For this milestone, show basic metadata only: clip name, original duration, effective (trimmed) duration, trim start/end values, original prompt. For code-level editing, provide a "Open in Editor" action that navigates to the code editor. A full property inspector is a future AI-assisted milestone. |

---

## Feature Dependencies

```
TS-1: Duration-Proportional Blocks
 |
 +-- TS-4: Zoom & Scroll (needs proportional blocks to be meaningful)
 |    |
 |    +-- TS-8: Ruler with Time Markings (scales with zoom)
 |
 +-- TS-2: Trim Handles (needs proportional blocks to show trimmed regions)
 |    |
 |    +-- TS-5: Split Tool (needs trim data model from TS-2)
 |    |
 |    +-- D-5: Speed Control (extends trim data model with playbackRate)
 |
 +-- TS-3: Playhead (needs proportional blocks for frame-accurate positioning)
 |    |
 |    +-- TS-5: Split Tool (splits at playhead position)
 |    |
 |    +-- D-4: Snapping (snaps to playhead and clip boundaries)
 |
 +-- D-3: Filmstrip Thumbnails (needs proportional width for multiple frame samples)

TS-6: Clip Selection (independent foundation, enhances existing activeSceneIndex)
 |
 +-- TS-7: Context Menu (needs a selection target for contextual actions)
 |    |
 |    +-- D-2: AI Regenerate (action item in context menu)
 |
 +-- D-1: Code Preview (shows code for selected clip)

D-6: Keyboard Shortcuts (independent, enhances all features)
```

---

## Recommended Phase Structure

### Phase 1: Timeline Foundation (must ship as one unit)

These features are coupled and meaningless without each other.

1. **TS-1: Duration-Proportional Blocks** -- The paradigm shift from storyboard to timeline
2. **TS-4: Zoom & Scroll** -- Without zoom, proportional blocks break at edge cases
3. **TS-8: Ruler with Time Markings** -- Without markings, proportional blocks lack context
4. **TS-3: Playhead** -- Must sync with Remotion Player for the timeline to be functional
5. **TS-6: Clip Selection** -- Foundational interaction for all subsequent features

This phase transforms the existing storyboard into a real timeline. It does not add new editing capabilities but provides the foundation for all of them.

### Phase 2: Core Editing Operations

These are the editing features that justify calling it a "pro" timeline.

6. **TS-2: Trim Handles** -- The flagship editing feature, requires data model migration
7. **TS-5: Split Tool** -- Natural companion to trimming, builds on the same data model
8. **TS-7: Context Menu** -- Discoverability layer that surfaces all actions

### Phase 3: Polish and Differentiation

Quality-of-life and unique features that elevate beyond basic functionality.

9. **D-6: Keyboard Shortcuts** -- Quality-of-life for power users
10. **D-4: Snapping** -- Precision feel
11. **D-3: Filmstrip Thumbnails** -- Visual upgrade leveraging Remotion's Thumbnail component
12. **D-1: Code Preview on Select** -- Unique to RemotionLab

### Defer to Post-Milestone

- **D-2: AI Regenerate from Timeline** -- Requires integration with the generation pipeline in a timeline context; significant backend and UX work
- **D-5: Speed / Retime Control** -- Requires Remotion prototyping for frame-scaling on code-based compositions; uncertain complexity
- **AF-1 through AF-8** -- Explicitly out of scope as documented above

---

## Data Model Evolution

### Current schema (movies table)

```typescript
scenes: v.array(v.object({
  clipId: v.id("clips"),
  durationOverride: v.optional(v.number()),
}))
```

### Required schema for pro timeline

```typescript
scenes: v.array(v.object({
  clipId: v.id("clips"),
  trimStart: v.optional(v.number()),     // frames trimmed from animation start (default 0)
  trimEnd: v.optional(v.number()),       // frames trimmed from animation end (default 0)
  playbackRate: v.optional(v.number()),  // speed multiplier (default 1.0, reserved for D-5)
  // durationOverride is deprecated in favor of trimStart/trimEnd
  durationOverride: v.optional(v.number()),
}))
```

### Duration computation

```
effectiveDuration = clip.durationInFrames - (trimStart ?? 0) - (trimEnd ?? 0)
totalMovieDuration = sum of all scenes' effectiveDuration
```

The existing `computeTotalDuration` function in `convex/movies.ts` already supports `durationOverride`. It needs to be updated to compute from `trimStart`/`trimEnd` instead, falling back to the clip's full `durationInFrames` when no trims are set.

### Split operation data flow

Splitting scene at playhead frame `F` (where F is relative to the trimmed start):

```
Original scene: { clipId: X, trimStart: S, trimEnd: E }
Effective duration: clip.durationInFrames - S - E

After split at frame F:
  Scene A: { clipId: X, trimStart: S, trimEnd: clip.durationInFrames - S - F }
  Scene B: { clipId: X, trimStart: S + F, trimEnd: E }

Verification:
  Scene A effective = clip.durationInFrames - S - (clip.durationInFrames - S - F) = F
  Scene B effective = clip.durationInFrames - (S + F) - E = clip.durationInFrames - S - F - E
  Total = F + (clip.durationInFrames - S - F - E) = clip.durationInFrames - S - E = original effective duration
```

### Remotion composition update

```typescript
// MovieComposition.tsx evolution
<Series>
  {scenes.map((scene, index) => {
    const effectiveDuration = scene.clip.durationInFrames
      - (scene.trimStart ?? 0)
      - (scene.trimEnd ?? 0);

    return (
      <Series.Sequence key={index} durationInFrames={effectiveDuration}>
        {/* Inner sequence with negative from trims the animation start */}
        <Sequence from={-(scene.trimStart ?? 0)} durationInFrames={effectiveDuration}>
          <DynamicCode
            code={scene.clip.code}
            durationInFrames={scene.clip.durationInFrames}
            fps={scene.clip.fps}
          />
        </Sequence>
      </Series.Sequence>
    );
  })}
</Series>
```

---

## Competitive Position Summary

| Editor | Timeline Model | Trim Style | Split | Zoom | Context Actions | Target |
|--------|---------------|-----------|-------|------|----------------|--------|
| Premiere Pro | Multi-track, mode-based | Edge drag + ripple/roll/slip | Razor tool (C) or Ctrl+K | Ctrl+/-, Alt+Scroll, Z | Full right-click | Professional editors |
| DaVinci Resolve | Multi-track, mode-based | Edge drag + ripple/roll/slip | Blade mode or Ctrl+B | Ctrl+/-, Alt+Scroll, Z | Full right-click | Professional editors |
| CapCut | Multi-track, contextual | Edge drag, Delete L/R buttons | Split button in toolbar | Pinch, scroll | Toolbar above timeline | Content creators |
| Canva Video 2.0 | Multi-track (new 2025) | Edge drag | Split button | Basic zoom | Minimal context menu | Non-technical creators |
| **RemotionLab (target)** | **Single-track, contextual** | **Edge drag handles** | **Button + Ctrl+K** | **Ctrl+/-, scroll, fit-to-view** | **Right-click + kebab + shortcuts** | **Content creators / marketers** |

RemotionLab should aim for the **CapCut/Canva tier of usability** (contextual interactions, no tool modes, clean UI) combined with **DaVinci-tier keyboard shortcuts** for power users, plus **unique code-aware differentiators** (code preview, AI regenerate) that no competitor can match.

---

## Sources

### Verified -- HIGH confidence
- [Remotion `<Sequence>` documentation](https://www.remotion.dev/docs/sequence) -- Trimming via negative `from`, `durationInFrames`
- [Remotion `<Series>` documentation](https://www.remotion.dev/docs/series) -- Sequential composition, offset prop
- [Remotion: Building a Timeline](https://www.remotion.dev/docs/building-a-timeline) -- Data model recommendations, Track/Item types
- [Adobe Premiere Pro Tools Panel](https://helpx.adobe.com/premiere/desktop/get-started/tour-the-workspace/tools-panel-and-options-panel.html) -- Razor, selection, trim tools
- [Adobe Premiere Pro Trim Mode](https://helpx.adobe.com/premiere-pro/using/trim-mode-editing.html) -- Edge trim, ripple, roll edit UX

### Cross-Referenced -- MEDIUM confidence
- [img.ly: Designing a Timeline for Video Editing](https://img.ly/blog/designing-a-timeline-for-mobile-video-editing/) -- Comprehensive UX patterns: trim handles, snapping, zoom, ruler design, gesture coordination, anti-patterns
- [Canva Video Timeline (Design School)](https://www.canva.com/design-school/resources/video-timeline) -- Multi-track timeline added 2025, trimming, splitting
- [CapCut Split Video Guide](https://www.capcut.com/resource/split-video-into-parts) -- Split tool workflow
- [DaVinci Resolve Zoom](https://createdtech.com/davinci-resolve-2-ways-to-zoom-in-on-the-timeline/) -- Three zoom modes, keyboard shortcuts, zoom centering
- [NN/g: Designing Effective Contextual Menus](https://www.nngroup.com/articles/contextual-menus-guidelines/) -- 10-12 items, destructive at bottom, shortcuts inline, frequency ordering
- [Non-linear editing (Wikipedia)](https://en.wikipedia.org/wiki/Non-linear_editing) -- Non-destructive editing data model: pointer-based EDL, in/out points
- [Blackmagic Forum: Split Clip vs Razor](https://forum.blackmagicdesign.com/viewtopic.php?f=21&t=213431) -- Post-split selection behavior, auto-selector tracks

### Community/Blog -- LOW confidence (pattern reference only)
- [DEV Community: Web Video Editor with Remotion](https://dev.to/sambowenhughes/building-a-web-based-video-editor-with-remotion-nextjs-and-tailwind-css-pfg)
- [Filmora: Timeline in Video Editing 2026 Guide](https://filmora.wondershare.com/video-editing-tips/what-is-timeline-in-video-editing.html)
- [Icons8 Blog: Hotkeys vs Context Menus](https://blog.icons8.com/articles/the-ux-dilemma-hotkeys-vs-context-menus/)
- [Audacity GitHub: Context menu UX discussion](https://github.com/audacity/audacity/discussions/867)

---

*Research completed: 2026-02-02*
*Milestone: Pro Timeline Editing*
*Feeds into: Requirements definition, phase planning, architecture for timeline rewrite*
