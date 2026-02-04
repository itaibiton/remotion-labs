# Requirements: RemotionLab v0.4.0

**Defined:** 2026-02-04
**Core Value:** Users can go from a text prompt to a rendered, downloadable animated video without any coding or motion design knowledge.

## v2.0 Requirements (Complete)

<details>
<summary>v2.0 -- Scenes, Timeline & Movie Editor (15/15 complete)</summary>

### Save & Library

- [x] **SAVE-01**: User can quick-save the current composition as a named clip (code + metadata stored in Convex)
- [x] **SAVE-02**: User can list, open, and delete saved clips from a library page
- [x] **SAVE-03**: Saved clip stores composition code, duration, optional name/thumbnail; can be re-opened in editor and re-rendered

### Timeline & Movie

- [x] **MOVIE-01**: User can create/open a movie with an ordered list of scenes, each referencing a clip
- [x] **MOVIE-02**: Horizontal timeline UI shows scenes in order with duration bars; user can reorder, remove, and add scenes
- [x] **MOVIE-03**: User can preview the full movie (all scenes in sequence) in one Remotion Player via Series composition
- [x] **MOVIE-04**: User can render the full movie to one MP4 via Lambda

### Export

- [x] **OUT-03**: User can export a single clip as MP4 and/or Remotion source without rendering the whole movie
- [x] **OUT-04**: User can export the full movie as one MP4 and/or Remotion project (multi-composition)

### Continuation Generation

- [x] **GEN-06**: User can trigger "Generate next scene" from a clip; system captures the last frame state via code serialization
- [x] **GEN-07**: Claude generates continuation JSX that starts from the previous clip's end state with visual continuity

### UI & Navigation

- [x] **UI-01**: App has a persistent shell with sidebar navigation (Home, Create, Library, Movie, Templates)
- [x] **UI-02**: Create page supports quick-save, "Add to movie," and "Generate next scene" actions
- [x] **UI-03**: Dedicated timeline/movie page for managing scenes and previewing/rendering the full movie
- [x] **UI-04**: Video preview shows a timeline bar with playhead, duration display, and scrub capability

</details>

## v0.2.0 Requirements (Complete)

<details>
<summary>v0.2.0 -- Create Page Overhaul (11/11 complete)</summary>

### Generation Feed

- [x] **FEED-01**: Create page displays all past generations as a scrolling feed (newest first), each row showing variation thumbnails and prompt text
- [x] **FEED-02**: Each generation row shows 1-4 variation previews in a grid layout with the prompt/metadata on the side

### Variations

- [x] **VAR-01**: User can choose number of variations (1-4) per generation; system produces that many distinct compositions from one prompt via parallel Claude calls
- [x] **VAR-02**: User can select a specific variation to preview full-size, edit, save, or use as basis for continuation

### Generation Settings

- [x] **SET-01**: User can configure aspect ratio (portrait 9:16, square 1:1, landscape 16:9) from a settings panel before generating
- [x] **SET-02**: User can configure duration and FPS from the settings panel; settings persist as user defaults via localStorage

### Image Upload

- [x] **UPLOAD-01**: User can attach 1-3 reference images to a prompt; images are uploaded to Convex file storage and passed to Claude as visual context for generation

### Per-Creation Actions

- [x] **ACT-01**: Each generation has extend-next (continuation from end state) and extend-previous (prequel leading into start state) actions
- [x] **ACT-02**: Each generation has save (to clip library), delete (from feed), and rerun (regenerate with same prompt/settings) actions

### Input Bar

- [x] **INPUT-01**: Input bar redesigned with prompt textarea, image upload button, settings toggle button, and variation count selector

### Prequel Generation

- [x] **PREQUEL-01**: System can analyze a clip's code to extract its start state (frame 0 visual state) and generate a prequel animation that ends at that start state

</details>

## v0.3.0 Requirements (Complete)

<details>
<summary>v0.3.0 -- Movie Editor Revamp (12/12 complete)</summary>

### Timeline Interactions

- [x] **TL-01**: Timeline displays clips as proportional-width blocks (width reflects duration relative to total movie length)
- [x] **TL-02**: User can trim clip start/end by dragging handles on timeline clip edges (non-destructive, adjusts visible frame range)
- [x] **TL-03**: User can split a clip at the playhead position via blade tool (keyboard shortcut + button)
- [x] **TL-04**: Timeline has zoom controls (scroll wheel + buttons) to scale the time view
- [x] **TL-05**: Timeline shows a ruler with timecodes and a draggable playhead synced to the preview player
- [x] **TL-06**: Clips snap to adjacent clip edges and playhead during trim/drag operations

### Per-Clip Actions

- [x] **ACT-03**: Each timeline clip has action buttons: generate next, generate previous, re-generate, and edit
- [x] **ACT-04**: Generate next/previous from timeline clip triggers continuation/prequel generation and adds result to movie

### Layout

- [x] **LAYOUT-01**: Movie page uses a full-screen pro layout with resizable panels (preview on top, timeline at bottom)
- [x] **LAYOUT-02**: Panels are resizable via drag handles (user can adjust preview vs timeline proportions)

### Inline Editing

- [x] **EDIT-01**: Selecting a clip opens an inline editing panel with preview player and Monaco code editor
- [x] **EDIT-02**: User can edit clip code in the panel and save changes back to the clip

</details>

## v0.4.0 Requirements -- Creation Detail Modal Revamp

Requirements for the Creation Detail Modal Revamp milestone. Each maps to roadmap phases 24-28.

### Modal Route & Navigation

- [ ] **NAV-01**: Clicking a creation in the feed navigates to `/create/[id]` as an intercepting modal (sidebar stays visible)
- [ ] **NAV-02**: Direct URL access to `/create/[id]` works (refresh, bookmark, shared link)
- [ ] **NAV-03**: Pressing Escape closes the modal and returns to the feed
- [ ] **NAV-04**: Clicking outside the modal closes it and returns to the feed
- [ ] **NAV-05**: Arrow keys navigate between creations (left/right to prev/next in feed)

### Modal Layout & UI

- [ ] **UI-01**: Modal displays large preview player in center area
- [ ] **UI-02**: Details panel on right shows prompt text, thumbnail, metadata (aspect ratio, duration, FPS, timestamp)
- [ ] **UI-03**: Details panel includes action buttons (save to library, delete, rerun, extend next/prev)
- [ ] **UI-04**: Edit textarea at top of modal for inline refinement prompts

### Variation Threading

- [ ] **VAR-01**: Submitting an edit creates a new generation linked to the parent via `parentGenerationId`
- [ ] **VAR-02**: Variations display in a scrollable vertical stack below the current creation
- [ ] **VAR-03**: Each variation shows full-size preview (not thumbnails)
- [ ] **VAR-04**: Each variation has its own action buttons (save, delete, extend, etc.)

## Future Requirements

Deferred to v0.5+. Tracked but not in current roadmap.

### Transitions

- **TRANS-01**: User can add transitions (fade, slide, wipe) between scenes via TransitionSeries
- **TRANS-02**: User can choose transition type and duration from presets

### Polish

- **POLISH-01**: User can duplicate a scene on the timeline
- **POLISH-02**: Scene-aware prompt context (Claude knows about surrounding scenes when generating)

### Feed Enhancement

- **FEED-03**: Feed supports infinite scroll with virtualization for 100+ generations
- **FEED-04**: Feed has date-based navigation (jump to specific day's generations)

### Timeline Advanced

- **TL-07**: Undo/redo for timeline operations
- **TL-08**: Speed/retime control for clips

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Audio/music tracks on timeline | Visual-only for now; audio adds multi-track complexity |
| Multi-track timeline | Single-track scenes are sufficient; multi-track is editor scope creep |
| Real-time collaboration | Solo creation first; Convex reactive queries enable later |
| Sharing/publishing movies | Distribution feature, not creation; export MP4 suffices |
| Payments/subscriptions | Focus on core value first |
| Undo/redo (v0.4) | Adds significant state complexity; defer to v0.5 |
| Speed/retime control (v0.4) | No native Remotion support for code compositions; needs prototyping |
| Tool modes (Premiere-style blade/select toggle) | Contextual interactions (hover = trim) are better for content creators |
| Filmstrip thumbnail strips on clips | Performance risk with DynamicCode rendering; defer to polish phase |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FEED-01 | Phase 13 | Complete |
| FEED-02 | Phase 13 | Complete |
| SET-01 | Phase 13 | Complete |
| SET-02 | Phase 13 | Complete |
| VAR-01 (v0.2) | Phase 14 | Complete |
| VAR-02 (v0.2) | Phase 14 | Complete |
| UPLOAD-01 | Phase 15 | Complete |
| INPUT-01 | Phase 15 | Complete |
| ACT-01 | Phase 16 | Complete |
| ACT-02 | Phase 16 | Complete |
| PREQUEL-01 | Phase 17 | Complete |
| LAYOUT-01 | Phase 18 | Complete |
| LAYOUT-02 | Phase 18 | Complete (adapted to fixed layout per user request) |
| TL-01 | Phase 19 | Complete |
| TL-05 | Phase 19 | Complete |
| TL-02 | Phase 20 | Complete |
| TL-04 | Phase 20 | Complete |
| TL-06 | Phase 20 | Complete |
| TL-03 | Phase 21 | Complete |
| ACT-03 | Phase 22 | Complete |
| ACT-04 | Phase 22 | Complete |
| EDIT-01 | Phase 23 | Complete |
| EDIT-02 | Phase 23 | Complete |
| NAV-01 | Phase 24 | Complete |
| NAV-02 | Phase 24 | Complete |
| NAV-03 | Phase 25 | Pending |
| NAV-04 | Phase 25 | Pending |
| NAV-05 | Phase 25 | Pending |
| UI-01 (v0.4) | Phase 26 | Pending |
| UI-02 (v0.4) | Phase 26 | Pending |
| UI-03 (v0.4) | Phase 26 | Pending |
| UI-04 (v0.4) | Phase 26 | Pending |
| VAR-01 (v0.4) | Phase 27 | Pending |
| VAR-02 (v0.4) | Phase 28 | Pending |
| VAR-03 (v0.4) | Phase 28 | Pending |
| VAR-04 (v0.4) | Phase 28 | Pending |

**Coverage:**
- v0.2.0 requirements: 11/11 complete
- v0.3.0 requirements: 12/12 complete
- v0.4.0 requirements: 13/13 mapped (2 complete)
- Mapped to phases: 13/13
- Unmapped: 0

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-04 -- Phase 24 complete (NAV-01, NAV-02).*
