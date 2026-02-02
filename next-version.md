# Next Version: Scenes, Timeline & Movie Editor (v1.2 / v2.0)

**Purpose:** Guideline for GSD planner to implement multi-scene movies, timeline, quick save, and continuation-based generation.

---

## Current State (Baseline)

- **Generation:** AI generates 2D motion animations via Remotion + Claude. Full JSX code generation, AST validation, sandboxed execution, Monaco editor, chat refinement.
- **UI:** Single create flow only. Very basic UI: no app shell sidebar, no dedicated pages beyond `/`, `/create`, `/templates`.
- **Video:** No timeline on the video preview. No video editor. No concept of "scenes" or "movie."
- **Output:** User can render one video and download it, or export source code. No way to save a clip for reuse or combine clips.

**Gap:** After generating a video, the user cannot save it as a reusable asset, combine it with other clips into a movie, or generate a "next scene" that continues from the exact end state of the previous one.

---

## Goal (GSD)

**Users can save generated clips, arrange them on a timeline into a full movie, and generate new clips that continue exactly from how a previous clip ended — with export per clip or full movie.**

---

## Scenarios (User Flows for GSD)

1. **Quick save a clip**  
   User generates (or edits) an animation, is happy with it → one action (e.g. "Save clip" / keyboard shortcut) saves the current composition (code + metadata, optional thumbnail) to their library. No need to render first.

2. **Use a clip as a scene in a movie**  
   User has saved clips (or just generated one). They open a "movie" or "project" view, see a timeline. They add a saved clip (or the current one) as a scene. Scenes are ordered; each has a fixed duration (from the clip). Timeline shows all scenes in sequence.

3. **Export a single clip**  
   From the library or from the timeline, user can export one clip: render that clip to MP4 and/or export its Remotion source, without rendering the whole movie.

4. **Export the full movie**  
   User has multiple scenes on the timeline. They trigger "Render movie" → system composes all scenes in order (Remotion sequence) and renders one MP4 (and/or exports project). Same pipeline as current single-clip render, but input is N clips.

5. **Generate next scene from end of previous**  
   User has a clip (saved or current). They choose "Generate next scene" (or equivalent). System captures the **exact end frame** of that clip (last frame state: positions, styles, text, etc.) and passes it to Claude as context. Claude generates Remotion JSX for a new clip that starts where the previous one ended (visual continuity). New clip can be saved and/or added to timeline.

---

## Deliverables (Requirements for GSD Planner)

### Save & library

- **SAVE-01:** User can quick-save the current composition as a named clip (code + metadata stored in Convex; optional thumbnail).
- **SAVE-02:** User can list, open, and delete saved clips from a library (sidebar or dedicated page).
- **SAVE-03:** Saved clip stores: composition code, duration, optional name/thumbnail; can be re-opened in editor and re-rendered.

### Timeline & movie

- **MOVIE-01:** User can create/open a "movie" (project) that has an ordered list of scenes. Each scene references a clip (saved or in-memory).
- **MOVIE-02:** Timeline UI shows scenes in order; each scene shows duration (and optionally thumbnail). User can reorder scenes, remove a scene, add a saved clip or current clip as a scene.
- **MOVIE-03:** User can preview the full movie (all scenes in sequence) in one Remotion Player (e.g. `<Sequence>` of clip compositions).
- **MOVIE-04:** User can render the full movie to one MP4 (and/or export full project); same Lambda/rendering pipeline as today, input = movie composition.

### Export

- **OUT-03:** User can export a single clip (from library or from timeline) as MP4 and/or as Remotion source, without rendering the whole movie.
- **OUT-04:** User can export the full movie as one MP4 and/or as Remotion project (multi-composition).

### Continuation generation

- **GEN-06:** User can trigger "Generate next scene" from a clip (current or saved). System computes or stores the **last frame state** of that clip (serializable description: elements, positions, styles, text content).
- **GEN-07:** When generating next scene, Claude receives the end state as context and generates Remotion JSX that **starts** with that state (same positions/styles), then continues the animation. New clip is valid Remotion code and can be saved/added to timeline.

### UI & navigation

- **UI-01:** App has a persistent shell: sidebar (or top nav) with navigation to: Home, Create, Library (saved clips), Movie/Project (timeline), and optionally Templates.
- **UI-02:** Create page remains the main place to generate and edit a single clip; from here user can quick-save, "Add to movie," or "Generate next scene."
- **UI-03:** Dedicated timeline/movie page where user manages scenes and previews/renders the full movie.
- **UI-04:** Video preview (single clip or movie) shows a simple timeline (playhead, duration, optional scrub) so user can see position in time.

---

## Technical Hints (for Plans)

- **End-state capture:** Options: (a) render last frame to image + pass to Claude as reference, (b) extract from Remotion composition props/state at end frame (if available), (c) run composition to end and capture DOM/style snapshot then serialize. Planner should pick one and document.
- **Movie composition:** Remotion `<Sequence>` with each clip’s composition; durations from clips. One root "Movie" composition that renders all sequences.
- **Persistence:** Clips and movies as Convex documents; clip = { userId, name, code, duration, thumbnail?, createdAt }; movie = { userId, name, sceneIds[] or inline clip refs, order }.
- **Existing:** Keep current create flow, generation pipeline, AST validation, sandbox, Monaco, render/export. Extend schema and UI; add timeline and movie composition.

---

## Out of Scope (this version)

- Audio/music tracks on timeline
- Visual drag-and-drop timeline (can be simple list + reorder first)
- Collaboration / sharing movies
- Payments

---

## Success Criteria (for GSD Verification)

1. User can quick-save a generated clip and see it in a library.
2. User can add clips to a movie and see them on a timeline in order.
3. User can preview the full movie and render it to one MP4.
4. User can export one clip (MP4 or source) without rendering the movie.
5. User can generate a "next scene" that starts from the exact end of a previous clip and save/add it to the movie.

---

## Reference

- **PROJECT:** `.planning/PROJECT.md` — constraints, stack, key decisions.
- **ROADMAP:** `.planning/ROADMAP.md` — phase numbering, plan naming.
- **STATE:** `.planning/STATE.md` — current milestone; next step = new milestone from this doc.

Use this document as the single source of truth for the next GSD milestone (v1.2 or v2.0): break into phases and plans, then execute in order.
