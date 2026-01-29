# Feature Landscape: Multi-Scene Movie Editor (v2.0)

**Domain:** AI-powered multi-scene video/animation editor with clip library and timeline
**Researched:** 2026-01-29
**Milestone:** v2.0 Scenes, Timeline & Movie Editor
**Confidence:** HIGH (based on analysis of Canva Video, CapCut, Kapwing, InVideo, Runway, LTX Studio, and Remotion docs)

## Executive Summary

RemotionLab v2.0 evolves from single-clip generation into a multi-scene movie editor. This research surveys how clip libraries, timelines, multi-scene composition, scene continuation, and app shell navigation work across the landscape of web-based video/creative tools.

The key insight: users of tools like Canva Video and CapCut expect a very specific mental model for multi-scene editing. Scenes are visual blocks arranged horizontally. Each scene has a thumbnail. Reordering is drag-and-drop. Preview plays all scenes in sequence. Rendering produces one output file. RemotionLab's unique position is that its "scenes" are AI-generated Remotion code compositions, not video clips -- which creates both unique challenges (no raw video to thumbnail) and unique advantages (programmatic composition via `<Series>`, continuation generation, code-level control).

The feature set below is organized around what users expect from comparable tools, what would differentiate RemotionLab, and what to deliberately avoid in v2.0.

---

## Table Stakes

Features users expect in a multi-scene editing tool. Missing any of these makes the product feel incomplete or broken. These are informed by the common capabilities of Canva Video, CapCut, Kapwing, and InVideo.

### Clip/Asset Library

| Feature | Why Expected | Complexity | Depends On | Notes |
|---------|--------------|------------|------------|-------|
| **Save current composition as a named clip** | Every creative tool lets you save your work. Canva, CapCut, Figma all have project saving. Without this, work is ephemeral and lost on page refresh. | Low | Convex schema (new `clips` table) | Must store: code, rawCode, name, duration, fps, creation date. Prompt is useful metadata but optional. |
| **Clip library list view** | Users need to see all saved clips in one place. Canva has a "Projects" panel, CapCut has "My Projects", Figma has a file browser. Grid view with thumbnails is the standard. | Medium | Save feature, thumbnail generation | Grid of cards with name, duration, created date. Thumbnail is the hard part (see below). |
| **Open a saved clip** | Clicking a clip in the library should load it back into the Create page for editing/refinement. This is fundamental -- save is useless without open. | Low | Clip library, Create page state management | Load rawCode, code, duration, fps back into editor state. |
| **Delete a clip** | Users need to clean up their library. Every file management UI has delete. | Low | Clip library | Soft delete (mark as deleted) is safer than hard delete. Confirmation dialog required. |
| **Rename a clip** | Users name things poorly on first save. Renaming is expected in every asset manager. | Low | Clip library | Inline edit or rename dialog. |
| **Clip thumbnail/preview** | Canva shows scene thumbnails, Final Cut Pro has filmstrip thumbnails, Adobe Premiere Rush has grid thumbnails. Users identify clips visually, not by name. | High | Clip rendering or screenshot | **This is the hardest table-stakes feature.** Options: (a) render a single frame via Remotion's `renderStill()` API, (b) capture from the Player canvas at save time, (c) use a placeholder/icon based on prompt category. Recommend (b) for v2.0 -- canvas capture at save time via `toDataURL()` or similar. |

### Timeline / Movie Editor

| Feature | Why Expected | Complexity | Depends On | Notes |
|---------|--------------|------------|------------|-------|
| **Create / open a movie** | Users need a container concept for multi-scene projects. Canva has "Video" projects, InVideo has "Projects." A movie is an ordered list of scenes. | Low | Convex schema (new `movies` table) | Movie stores: name, scene list (ordered clip references), creation date, total duration. |
| **Horizontal timeline showing scenes in order** | This is THE defining UX pattern of video editors. Canva, CapCut, Kapwing, Clipchamp, Premiere -- all have a horizontal timeline at the bottom of the screen. Scenes/clips appear as blocks proportional to their duration, arranged left to right. | High | Movie data model, UI implementation | The timeline is the most complex UI component in v2.0. Each scene block shows a thumbnail, duration label, and name. Blocks are arranged horizontally. The total timeline width represents the movie duration. |
| **Reorder scenes via drag-and-drop** | Canva lets you drag scenes to reorder. CapCut, Kapwing, and every timeline editor support this. Users expect to rearrange their narrative by dragging. | Medium | Timeline UI, drag-and-drop library | Use a library like `@dnd-kit/core` or `react-beautiful-dnd`. Implement drop indicators (red line or gap) as feedback. Snap behavior when dropping. |
| **Add a clip to the movie** | From the library or from the Create page, users need to add clips to their movie. Canva has "Add page," InVideo lets you add scenes. | Low | Clip library + Movie data model | Two entry points: (1) "Add to movie" button on Create page, (2) drag from library to timeline. |
| **Remove a scene from the movie** | Delete/remove button on timeline scenes. Every timeline editor has this. | Low | Timeline UI | Right-click menu or hover-reveal X button. Scene is removed from movie, not deleted from library. |
| **Scene duration display** | Each scene block in the timeline should show its duration. Canva shows seconds on each scene. CapCut shows timecodes. | Low | Timeline UI | Format as "3.0s" or "0:03" depending on total movie length. |
| **Total movie duration display** | Users need to know how long their movie is. Every video editor shows total duration. | Low | Timeline UI, computed from scenes | Sum of all scene durations minus transition overlap durations. Display prominently. |

### Multi-Scene Preview and Render

| Feature | Why Expected | Complexity | Depends On | Notes |
|---------|--------------|------------|------------|-------|
| **Preview full movie (all scenes in sequence)** | Users need to see the whole movie before rendering. Canva plays all scenes in order. CapCut plays the entire timeline. | High | Remotion `<Series>` composition, DynamicCode extension | Build a `MovieComposition` that wraps all scene codes in `<Series.Sequence>` elements. Each scene executes its own code via `executeCode()`. The Remotion Player renders this composite composition. **This is technically feasible** because Remotion's `<Series>` is designed exactly for sequential playback. |
| **Render full movie to one MP4** | The whole point of multi-scene editing is producing one continuous video. Canva, CapCut, and every editor export a single file from multiple scenes. | High | Movie preview, Lambda render pipeline | Send the composite `MovieComposition` code to Lambda. The `<Series>` approach means Lambda renders a single composition -- no post-concatenation needed. Total `durationInFrames` = sum of all scene durations. |
| **Per-scene export (single clip)** | Users should still be able to export individual clips without rendering the whole movie. InVideo and Kapwing support this. | Low | Existing export pipeline (v1.1) | Already built in v1.1. Just needs to remain accessible from the movie context. |
| **Playhead / scrub bar for movie preview** | Video players have a playhead that shows current position. Users expect to scrub through the timeline. Canva, CapCut, and Kapwing all have scrubbing. | Medium | Remotion Player integration | Remotion Player already has playback controls. The challenge is syncing the Player's current frame with the timeline's visual playhead position so users can see which scene is currently playing. |

### App Shell / Navigation

| Feature | Why Expected | Complexity | Depends On | Notes |
|---------|--------------|------------|------------|-------|
| **Persistent sidebar or top navigation** | Every creative tool (Canva, Figma, CapCut, InVideo) has persistent navigation. The current app has a minimal header with just logo + user menu. With multiple pages (Home, Create, Library, Movie, Templates), users need clear navigation. | Medium | Layout refactor | Sidebar is the dominant pattern for creative tools: Figma uses a left sidebar with tabs (File, Assets), Canva uses a left panel with tool categories, CapCut uses tabbed panels. For RemotionLab, a left sidebar with icon + label navigation works best because the Create page needs maximum horizontal space for the preview + code columns. |
| **Clear page routing** | Users need distinct pages for different activities: creating clips, managing their library, editing movies. Currently everything is on `/create` or `/templates`. | Low | Next.js App Router (already in use) | Routes: `/` (home/dashboard), `/create` (clip creation), `/library` (saved clips), `/movie/[id]` (movie editor with timeline), `/templates` (template gallery). |
| **Breadcrumb or context indicator** | When editing a clip within a movie, users need to know the context: which movie, which scene. Canva shows "Home > Project Name" breadcrumbs. | Low | Navigation state | Simple breadcrumb component in the header area. |

---

## Differentiators

Features that would set RemotionLab apart from Canva Video, CapCut, and other tools. These are not expected but would be highly valued, especially given RemotionLab's unique AI-code-generation approach.

| Feature | Value Proposition | Complexity | Depends On | Notes |
|---------|-------------------|------------|------------|-------|
| **"Generate next scene" continuation** | No other tool in this space lets you say "now generate the next scene that continues from where this one left off." LTX Studio has multi-scene storyboards but requires manual prompting for each scene. Runway Gen-4 has character consistency but not scene-to-scene code continuation. RemotionLab can analyze the last frame's visual state from JSX code (positions, colors, text, transforms) and pass it as context to Claude for the next generation. | High | Code serialization, Claude prompt engineering | **This is RemotionLab's biggest differentiator.** The approach: (1) Parse the current clip's JSX to extract end-state (final interpolated values, positions, styles), (2) Include this state description in the prompt for the next scene, (3) Claude generates code that starts from that visual state. Confidence: MEDIUM -- the serialization is the hard part (static analysis of interpolate() outputs, spring() results). |
| **"Add to movie" from Create page** | One-click workflow: generate a clip, preview it, click "Add to movie" -- it appears in the timeline. Seamless flow from creation to composition. No other AI video tool has this tight integration between generation and sequencing. | Low | Movie data model, Create page actions | Button in the Create page render controls area. Opens a movie picker if user has multiple movies, or adds to default movie. |
| **Scene-aware prompt context** | When generating a scene for a movie, the system automatically includes movie context: "This is scene 3 of 5. Previous scenes cover [topics]. Generate a scene about [prompt] that fits the narrative." | Medium | Movie context + generation pipeline | Enhances Claude's ability to generate cohesive multi-scene content. Prompt engineering challenge, not a technical one. |
| **Transitions between scenes** | Remotion has `<TransitionSeries>` with built-in transitions (fade, wipe, slide, custom). Canva and CapCut both offer transitions. Adding transition support between timeline scenes would feel polished and professional. | Medium | `<TransitionSeries>` from `@remotion/transitions` | Remotion's transition system handles the timing overlap automatically. User picks a transition type between two scenes. The total duration adjusts (overlap reduces total). Recommend starting with 3-4 transitions: fade, slide, wipe, none. |
| **Quick-save from any state** | Auto-save or one-click save at any point during creation/editing. Current workflow has no persistence -- if you navigate away, your work is gone. This is table-stakes UX but a differentiator in the AI video space where most tools treat each generation as disposable. | Low | Save infrastructure | Save button in the header or Cmd+S shortcut. Creates or updates a clip in the library. |
| **Movie-level export as Remotion project** | Export the entire movie as a standalone Remotion project (multiple scene files + a Main composition using `<Series>`). No other tool exports multi-scene programmatic video projects. Power users could take the project into their own IDE. | Medium | Existing export pipeline + multi-file scaffolding | Extend the JSZip export to include: each scene as `Scene01.tsx`, `Scene02.tsx`, etc., plus a `Main.tsx` that imports and sequences them with `<Series>`. Already have the single-file export; this is an extension. |
| **Timeline playhead synced to scene highlight** | As the movie plays, the currently-playing scene is highlighted in the timeline, and a playhead moves across the timeline proportionally. Canva and CapCut both do this. It connects the preview to the timeline visually. | Medium | Player frame tracking + timeline UI | Read `currentFrame` from the Remotion Player and map it to the timeline position. Highlight the active scene block. This requires knowing the frame ranges for each scene (easily computed from the `<Series>` structure). |
| **Duplicate scene** | Copy an existing scene in the timeline. Canva supports Cmd+D to duplicate a scene. Useful for creating variations. | Low | Timeline UI + clip cloning | Create a copy of the clip in the library (new ID, "(Copy)" suffix) and insert it after the original in the timeline. |

---

## Anti-Features

Features to deliberately NOT build in v2.0. These are common mistakes or scope-creep traps. Each has a clear rationale and an alternative approach.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full multi-track timeline** | Canva Video 2.0 and CapCut have multi-track timelines (video track + audio track + text track + overlay tracks). This is enormously complex to build and unnecessary for RemotionLab's use case where each "scene" is a self-contained Remotion composition. Multi-track implies layer-by-layer control which conflicts with the AI-generated-code model. | **Single-track timeline.** One horizontal track of scenes in sequence. Each scene is a complete composition. Layering happens WITHIN each scene's code, not across timeline tracks. |
| **Audio/music tracks** | Audio adds a second dimension to the timeline (sync, volume curves, trimming). CapCut and Canva both handle audio but it is a separate engineering challenge. Remotion supports audio but the generation pipeline does not produce audio code. | **Visual-only for v2.0.** Sound design is a future milestone. The timeline should be structured to accommodate audio later (leave space for a second track row) but do not implement it now. |
| **Drag-and-drop visual timeline editor** | Full drag-and-drop timeline editing (trimming via handles, split at playhead, ripple edit, roll edit) is what makes tools like Premiere Pro and DaVinci Resolve take years to build. CapCut's desktop editor has 15+ interaction types on the timeline. | **Simplified timeline with reorder only.** Scenes are blocks that can be reordered via drag-and-drop. Duration is set per-scene (not adjusted by dragging handles). No splitting, no trimming, no ripple editing. Each scene has a fixed duration from its Remotion composition. |
| **AI-generated video (Sora/Runway style)** | Runway Gen-4 and Sora generate actual video pixels from prompts. This is a fundamentally different technology (diffusion models) from RemotionLab's code-generation approach. Trying to compete on pixel generation is a losing battle against well-funded incumbents. | **Lean into code generation as the differentiator.** RemotionLab generates deterministic, editable, exportable Remotion code. This is a strength: users get source code they own, not opaque video files. |
| **Real-time collaboration** | Figma's multiplayer is legendary but took years and CRDT technology to build. For a single-person creative tool, collaboration is premature. | **Solo creation first.** Movie state in Convex supports real-time sync naturally (reactive queries) so collaboration can be layered on later, but do not build UI for it now. |
| **Brand kits (saved colors/fonts/logos)** | InVideo and Canva both have brand kit features. This requires asset management, font handling, color palette storage, and prompt injection. It is a valuable feature but not part of the core multi-scene editing loop. | **Defer to v3.0.** The clip library provides a foundation for "saved creative assets" that brand kits could extend later. |
| **Shareable movie links / public gallery** | Sharing and publishing are distribution features, not creation features. Building a sharing system requires public URLs, access control, embed support, and potentially CDN-hosted rendered videos. | **Focus on creation in v2.0.** Users can export their movie as MP4 and share via their own channels. |
| **Custom transitions (code-based)** | Remotion supports fully custom transition presentations. Exposing this to users means building a code editor for transition logic -- too much complexity for too little value in v2.0. | **Preset transitions only.** Offer 3-5 built-in transition types from `@remotion/transitions` (fade, slide, wipe, none). Users pick from a dropdown. |
| **Scene-level duration editing via timeline drag** | Premiere Pro lets you drag scene edges to trim duration. For RemotionLab, scene duration is determined by the Remotion composition's `durationInFrames`. Allowing timeline-drag duration changes would require modifying the generated code to match -- a brittle and confusing coupling. | **Duration set in scene settings, not timeline.** Users change a scene's duration via a properties panel or dialog, not by dragging timeline handles. The code regenerates or adjusts to match the new duration. |
| **Undo/redo for timeline operations** | Full undo/redo for reorder, add, remove, and duration changes is complex state management (command pattern, history stack). | **Simple operations with confirmation.** Removing a scene shows a confirmation. Reordering is instant and obvious. Undo can be added incrementally later. |
| **Storyboard view (alternative to timeline)** | Storyboard Pro and LTX Studio have storyboard views (grid of scene thumbnails with annotations). This is a different layout of the same data as the timeline. Building two views is double the work for marginal value at this stage. | **Timeline is the primary view.** The library page serves as the "overview of all clips" view. The timeline is for sequencing. No need for a storyboard-specific layout. |

---

## Feature Dependencies

```
                    +------------------+
                    |  App Shell /     |
                    |  Navigation      |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
              v                             v
    +---------+---------+         +---------+---------+
    |   Clip Library    |         |   Movie Editor    |
    |  (Save, List,     |         |  (Create movie,   |
    |   Open, Delete)   |         |   Timeline UI)    |
    +---------+---------+         +---------+---------+
              |                             |
              +----------+------------------+
                         |
                         v
              +----------+-----------+
              | Add Clip to Movie    |
              | (Bridge between      |
              |  Library & Movie)    |
              +----------+-----------+
                         |
              +----------+-----------+
              |                      |
              v                      v
    +---------+---------+  +---------+---------+
    | Movie Preview     |  | Scene Reorder     |
    | (Series comp,     |  | (Drag-and-drop)   |
    | Player integration)|  |                   |
    +---------+---------+  +-------------------+
              |
              v
    +---------+---------+
    | Movie Render      |
    | (Lambda, full     |
    |  movie to MP4)    |
    +---------+---------+
              |
              v
    +---------+---------+
    | Continuation      |
    | Generation        |
    | (End-state        |
    |  serialization)   |
    +-------------------+
```

**Dependency Chain:**
1. **App Shell** must exist before Library and Movie pages can be navigated to
2. **Clip Library** (save/open) must exist before clips can be added to movies
3. **Movie data model** must exist before Timeline UI can render
4. **Timeline UI** must exist before reorder, preview, and render can work
5. **Movie Preview** requires the `<Series>`-based MovieComposition
6. **Movie Render** extends the existing Lambda pipeline with MovieComposition
7. **Continuation Generation** is independent of Timeline but requires a saved clip to analyze

**Parallel Tracks:**
- Clip Library and App Shell can be built in parallel
- Movie data model and Timeline UI can be built sequentially within one phase
- Continuation Generation is independent infrastructure that can be developed in parallel with Timeline
- Transitions between scenes can be layered on after basic `<Series>` preview works

---

## MVP Recommendation for v2.0

### Phase 1: Foundation (App Shell + Clip Library)

Build the structural foundation:

1. **App Shell** with sidebar navigation (Home, Create, Library, Movie, Templates)
2. **Clip Save** -- quick-save from Create page to Convex
3. **Clip Library page** -- grid view with name, duration, date, thumbnail placeholder
4. **Clip Open** -- load a saved clip back into Create page
5. **Clip Delete/Rename** -- basic library management

Rationale: Users need to save work before they can compose it. The app shell provides the navigation structure for all subsequent features.

### Phase 2: Movie Editor Core (Timeline + Preview)

Build the movie creation and preview loop:

1. **Movie data model** -- Convex schema for movies with ordered scene references
2. **Movie page** (`/movie/[id]`) with horizontal timeline
3. **Add clip to movie** -- from Library or Create page
4. **Reorder scenes** -- drag-and-drop on timeline
5. **Remove scene** from timeline
6. **Movie preview** -- `<Series>`-based MovieComposition in Remotion Player
7. **Playhead / scene highlight** -- sync Player position to timeline

Rationale: This is the core value of v2.0. Without this, there is no multi-scene editing.

### Phase 3: Movie Render + Continuation

Complete the pipeline and add the differentiator:

1. **Movie render to MP4** -- send MovieComposition to Lambda
2. **Movie export** -- full Remotion project with multiple scene files
3. **Continuation generation** -- end-state serialization + Claude prompt context
4. **"Generate next scene"** button on Create page and timeline

Rationale: Render completes the creation-to-delivery loop. Continuation is the killer feature that makes RemotionLab unique.

### Defer to v2.1+

- Transitions between scenes (needs basic `<Series>` working first)
- Scene-aware prompt context (prompt engineering, low risk)
- Movie-level export as Remotion project
- Timeline playhead sync (polish feature)
- Duplicate scene

---

## User Expectations from Comparable Tools

### Canva Video
- **Scenes as pages:** Each scene is a "page" that can be designed independently. Scenes appear as thumbnails in a bottom strip. Click to select, drag to reorder.
- **Timeline below canvas:** A horizontal timeline at the bottom shows all scenes with proportional widths. Transitions appear as "+" buttons between scenes.
- **Add scene:** "Add new page" button at the end of the timeline. Each new page defaults to 5 seconds.
- **Split scene:** Playhead at a point, click split. Creates two scenes from one.
- **Keyboard shortcuts:** Cmd+D to duplicate, S to split, Delete to remove.
- **No code visibility:** Pure WYSIWYG. Users never see code.

### CapCut
- **Multi-track timeline:** Bottom timeline with video, audio, text, and effects tracks. Each track can have multiple clips.
- **Compound clips:** Multiple timeline elements can be grouped into a single compound clip for cleaner organization.
- **Clip library:** "My Projects" with thumbnails, searchable. Stock media library with millions of assets.
- **Drag-and-drop:** Everything is drag-and-drop. Clips from library to timeline, effects to clips, transitions between clips.
- **Properties panel:** Right side panel shows properties (scale, position, rotation, opacity) for the selected clip.

### Kapwing
- **Scene-based structure:** Scenes are added to the timeline. Each scene can contain multiple layers (text, images, video).
- **Snap mode:** Clips snap together magnetically when dragged close. Ripple editing closes gaps automatically.
- **AI assistant (Kai):** Built-in AI that can generate scenes from text prompts, assemble footage with voiceover and subtitles.
- **Collaborative:** Team workspaces for shared editing.
- **Web-first:** Runs entirely in the browser with no downloads.

### InVideo AI
- **Two products:** InVideo AI (prompt-based, generates entire videos from text) and InVideo Studio (traditional timeline editor with templates).
- **Script-to-video:** AI breaks a script into scenes, selects stock footage, adds voiceover and subtitles. Users can edit individual scenes by re-prompting.
- **Prompt-based editing:** "Delete scene 2" or "change accent to British" as natural language commands.
- **Template-heavy:** 5,000+ templates organized by category (ads, intros, social posts).

### Runway
- **AI generation focus:** Text-to-video and image-to-video generation. Not a traditional editor.
- **Character consistency:** Gen-4 maintains character appearance across multiple generated clips via reference image anchoring.
- **Flow (storyboard tool):** Arrange generated clips into a narrative timeline with "ingredients" (consistent visual elements).
- **Short clips:** Maximum 16 seconds per generation. Longer content requires stitching multiple clips.
- **No code:** Pure AI pixel generation. No source code access.

### LTX Studio
- **Script-to-storyboard:** AI breaks a script into scenes, generates thumbnails for each, maintains character consistency via "Elements" (reusable character/object definitions).
- **Scene-level editing:** Each scene can be regenerated independently while maintaining consistency with others.
- **Retake feature:** Select a segment within a video and regenerate just that moment while preserving surrounding footage.
- **End-to-end pipeline:** Script to storyboard to animated storyboard to final video, all in one web-based tool.

### Key Takeaway for RemotionLab

RemotionLab sits in a unique position: it is not a traditional video editor (like Canva/CapCut), not a pure AI video generator (like Runway/Sora), and not a script-to-video pipeline (like InVideo AI/LTX Studio). It is a **code-based motion graphics editor with AI generation**. This means:

1. **Simpler timeline than Canva/CapCut:** No multi-track, no audio, no layer management on the timeline. Scenes are self-contained code compositions.
2. **More control than Runway/Sora:** Users get editable source code, not opaque video files.
3. **More flexible than InVideo AI:** Users can edit code directly, not just re-prompt.
4. **Continuation generation is unique:** No comparable tool can analyze the end-state of one code composition to generate a visually continuous next scene.

---

## Technical Considerations for Remotion Integration

### Multi-Scene Preview via `<Series>`

Remotion's `<Series>` component is purpose-built for sequential composition. The MovieComposition pattern:

```typescript
// Pseudocode for MovieComposition
const MovieComposition: React.FC<{ scenes: SceneData[] }> = ({ scenes }) => {
  return (
    <Series>
      {scenes.map((scene, i) => (
        <Series.Sequence key={i} durationInFrames={scene.durationInFrames}>
          <DynamicCode code={scene.code} ... />
        </Series.Sequence>
      ))}
    </Series>
  );
};
```

This works because:
- `<Series.Sequence>` accepts `durationInFrames` per scene
- `DynamicCode` already executes arbitrary Remotion code
- The Remotion Player renders the composite composition
- Lambda renders the same composition to MP4

**Key constraint:** Only the last `<Series.Sequence>` may have `Infinity` duration. All others must have positive integer durations. This is already satisfied because each saved clip has an explicit `durationInFrames`.

### Transitions via `<TransitionSeries>`

If transitions are added later, swap `<Series>` for `<TransitionSeries>`:

```typescript
<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={scene1.duration}>
    <DynamicCode code={scene1.code} ... />
  </TransitionSeries.Sequence>
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: 15 })}
  />
  <TransitionSeries.Sequence durationInFrames={scene2.duration}>
    <DynamicCode code={scene2.code} ... />
  </TransitionSeries.Sequence>
</TransitionSeries>
```

Total duration = sum of scene durations minus sum of transition durations.

### Thumbnail Generation

Options for clip thumbnails (from most to least ideal):

1. **Canvas capture at save time** (recommended for v2.0): When the user saves a clip, capture the Player's canvas at a representative frame (e.g., 50% through the animation) using `canvas.toDataURL()`. Store as a base64 data URL or upload to Convex file storage. Low complexity, instant, no server cost.

2. **Remotion `renderStill()` API**: Server-side rendering of a single frame. Higher quality but requires server infrastructure and has latency. Better for v2.1+.

3. **Placeholder based on prompt category**: Simple colored card with the clip name and an icon. Zero infrastructure cost but poor visual identification. Use as fallback only.

### Continuation Generation (End-State Serialization)

The approach for "Generate next scene" is to analyze the current clip's JSX code and extract the visual state at the final frame. This is a static analysis problem:

1. **Parse the JSX AST** (already have acorn + acorn-jsx)
2. **Find `interpolate()` calls** and compute their output at `frame = durationInFrames - 1`
3. **Find `spring()` calls** and compute their settled value
4. **Extract final CSS properties** (transform, opacity, color, position)
5. **Serialize as a description** for Claude's next-scene prompt

Example serialized state:
```
End state of previous scene:
- Title "HELLO" at position (960, 400), opacity 1.0, scale 1.2, color #FF6B35
- Background: linear gradient from #1A1A2E to #16213E
- Circle at (200, 600), radius 80px, color #E94560, opacity 0.7
```

**Confidence: MEDIUM.** Static analysis of interpolate/spring outputs is tractable for simple cases but may struggle with complex nested animations. A pragmatic v1 of this feature could ask the user to describe the end state rather than auto-extracting it. Alternatively, capture the last frame's DOM and extract styles.

---

## Sources

### Video Editor UX Patterns
- [Canva Video Timeline](https://www.canva.com/design-school/resources/video-timeline) - Timeline interaction patterns
- [Canva Create and Edit Videos](https://www.canva.com/help/creating-and-editing-videos/) - Scene management workflow
- [CapCut Timeline Guide](https://filmora.wondershare.com/advanced-video-editing/capcut-timeline.html) - Multi-track timeline features
- [CapCut Compound Clips](https://tourboxtech.com/en/news/capcut-what-is-a-compound-clip.html) - Grouping pattern
- [Kapwing Timeline Tutorial](https://www.kapwing.com/help/timeline-tutorial/) - Snap mode, ripple editing
- [InVideo Features & Pricing](https://ampifire.com/blog/invideo-ai-features-pricing-what-can-this-text-to-video-generator-do/) - AI video generation workflow

### AI Scene Continuation
- [Runway Gen-4 Character Consistency](https://venturebeat.com/ai/runways-gen-4-ai-solves-the-character-consistency-challenge-making-ai-filmmaking-actually-useful) - Reference image anchoring
- [ByteDance StoryMem](https://the-decoder.com/bytedances-storymem-gives-ai-video-models-a-memory-so-characters-stop-shapeshifting-between-scenes/) - Memory-based consistency
- [LTX Studio Features 2026](https://ltx.studio/blog/top-ltx-studio-features) - Multi-scene storyboard, Elements system
- [AI Video Consistency Techniques](https://arxiv.org/html/2512.16954v1) - Multi-stage pipeline for character stability

### Remotion Documentation (HIGH confidence)
- [Remotion Series](https://www.remotion.dev/docs/series) - Sequential composition API
- [Remotion TransitionSeries](https://www.remotion.dev/docs/transitions/transitionseries) - Transitions between sequences
- [Combining Compositions](https://www.remotion.dev/docs/miscellaneous/snippets/combine-compositions) - Multi-scene video patterns

### Timeline UX & Drag-and-Drop
- [Drag-and-Drop UX Best Practices](https://smart-interface-design-patterns.com/articles/drag-and-drop-ux/) - Visual feedback, reorder patterns
- [Designing Timeline for Video Editing](https://img.ly/blog/designing-a-timeline-for-mobile-video-editing/) - Timeline-specific UX research
- [React Video Editor Timeline](https://www.reactvideoeditor.com/features/timeline) - React timeline implementation reference

### App Shell & Navigation
- [Figma Left Sidebar](https://help.figma.com/hc/en-us/articles/360039831974-View-layers-and-pages-in-the-left-sidebar) - Creative tool navigation pattern
- [Mantine AppShell](https://mantine.dev/core/app-shell/) - App shell component reference
- [Storyboard Pro Thumbnails View](https://docs.toonboom.com/help/storyboard-pro-24/storyboard/reference/views/thumbnails-view.html) - Scene panel navigation

### Clip Library Patterns
- [Final Cut Pro Browser Views](https://support.apple.com/guide/final-cut-pro/intro-to-browser-views-verd00d3ae7/mac) - Grid vs list view, filmstrip thumbnails
- [Adobe Premiere Rush Preview](https://helpx.adobe.com/ph_fil/premiere-rush/how-to/preview-video-clip.html) - Grid view with expand-to-preview
- [Camtasia Library](https://www.techsmith.com/learn/tutorials/camtasia/library/) - Reusable assets across projects

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Table Stakes Features | HIGH | Consistent patterns across Canva, CapCut, Kapwing, InVideo. Well-documented UX patterns. |
| Timeline UX | HIGH | Horizontal single-track timeline is a solved design pattern. Many references available. |
| Remotion Multi-Scene | HIGH | Official documentation for `<Series>` and `<TransitionSeries>` confirms technical feasibility. |
| Continuation Generation | MEDIUM | End-state serialization from code is novel. Static analysis approach is tractable but unproven at scale. Fallback approaches exist. |
| App Shell Navigation | HIGH | Sidebar navigation is the dominant pattern in creative tools. Well-understood implementation. |
| Clip Thumbnails | MEDIUM | Canvas capture at save time is pragmatic but untested with the current DynamicCode/Player setup. May need Remotion-specific approach. |
| Anti-Features | HIGH | Clear rationale for each exclusion. Aligns with PROJECT.md out-of-scope list. |

---
*Research completed: 2026-01-29*
*Previous version: 2026-01-28 (v1.1 Full Code Generation focus)*
*This version: v2.0 Multi-Scene Movie Editor focus*
*Feeds into: Requirements definition, Phase planning for v2.0*
