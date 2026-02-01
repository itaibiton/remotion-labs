---
phase: 11-movie-preview-render-export
verified: 2026-02-01T21:30:00Z
status: passed
score: 11/11 must-haves verified
re_verification: false
---

# Phase 11: Movie Preview, Render & Export Verification Report

**Phase Goal:** Users can preview a full movie as one continuous video, render it to MP4, and export individual clips or the entire movie

**Verified:** 2026-02-01T21:30:00Z

**Status:** PASSED

**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can click Preview on the movie page and watch all scenes play in sequence in one player | ✓ VERIFIED | MoviePreviewPlayer renders all validScenes in Player with MovieComposition; appears above timeline when scenes exist |
| 2 | User can scrub through the full movie preview and see the corresponding scene highlighted on the timeline | ✓ VERIFIED | useCurrentPlayerFrame tracks frame position, computes activeSceneIndex, passes to Timeline via onActiveSceneChange callback; TimelineScene shows ring-2 ring-primary when isActive=true |
| 3 | User can render the full movie to a single MP4 and download it | ✓ VERIFIED | MovieRenderButton calls startMovieRender action, queries getByMovie for progress, shows download link when complete; action uses MovieComposition with scenes array |
| 4 | User can export a single clip as MP4 or Remotion source from the library or create page | ✓ VERIFIED | ClipRenderButton on create page calls startClipRender action with DynamicCode composition; ExportButtons (from phase 8) handles Remotion source export |
| 5 | User can export the full movie as one MP4 or as a multi-composition Remotion project zip | ✓ VERIFIED | MovieRenderButton handles MP4 render; MovieExportButtons calls generateMovieProjectZip, generates Scene01..SceneNN files + MovieComposition(Series) + Root + config files, downloads zip with instructions modal |

**Score:** 5/5 truths verified

### Required Artifacts

#### Plan 11-01 Artifacts (Movie Preview Player)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/hooks/use-current-player-frame.ts` | useSyncExternalStore-based hook for tracking Player frame | ✓ VERIFIED | 45 lines; exports useCurrentPlayerFrame; uses useSyncExternalStore with frameupdate event subscription; no stubs |
| `src/components/movie/movie-preview-player.tsx` | Player wrapping MovieComposition with frame-to-scene mapping | ✓ VERIFIED | 87 lines; exports MoviePreviewPlayer; renders Player with MovieComposition, computes sceneTimings and activeSceneIndex, calls onActiveSceneChange; no stubs |
| `src/components/movie/movie-editor.tsx` | Movie editor with preview player above timeline, activeSceneIndex state | ✓ VERIFIED | Modified; imports MoviePreviewPlayer, MovieRenderButton, MovieExportButtons; state activeSceneIndex, renders preview above timeline, passes activeSceneIndex to Timeline |
| `src/components/movie/timeline.tsx` | Timeline with activeSceneIndex prop | ✓ VERIFIED | Modified; accepts activeSceneIndex prop, passes isActive={index === activeSceneIndex} to TimelineScene |
| `src/components/movie/timeline-scene.tsx` | TimelineScene with isActive prop for visual highlight | ✓ VERIFIED | Modified; accepts isActive prop, renders ring-2 ring-primary when isActive=true |

#### Plan 11-02 Artifacts (Render Pipeline Backend)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `convex/schema.ts` | Updated renders table with optional movieId | ✓ VERIFIED | movieId: v.optional(v.id("movies")), clipId: v.optional(v.id("clips")), by_movie index |
| `convex/renders.ts` | Updated create mutation, getByMovie query | ✓ VERIFIED | create accepts optional movieId/clipId; exports getByMovie query with by_movie index |
| `convex/triggerRender.ts` | startMovieRender and startClipRender actions | ✓ VERIFIED | startMovieRender: fetches movie via getWithClipsInternal, validates MOVIE_RENDER_LIMITS, renders MovieComposition; startClipRender: fetches clip via clips.getInternal, renders DynamicCode |
| `convex/movies.ts` | Internal getWithClipsInternal query | ✓ VERIFIED | exports getWithClipsInternal internalQuery; fetches movie + all clip documents |
| `convex/clips.ts` | Internal getInternal query | ✓ VERIFIED | exports getInternal internalQuery; returns clip by ID |
| `convex/lib/renderLimits.ts` | MOVIE_RENDER_LIMITS export | ✓ VERIFIED | exports MOVIE_RENDER_LIMITS with MAX_DURATION_SECONDS: 120, LAMBDA_TIMEOUT_MS: 240000, MAX_SCENES: 20 |

#### Plan 11-03 Artifacts (Render & Export UI)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/movie/movie-render-button.tsx` | Button triggering startMovieRender with progress tracking | ✓ VERIFIED | 101 lines; uses useAction(startMovieRender), useQuery(getByMovie); 3-state UI (idle/rendering/complete with download); no stubs |
| `src/lib/export-movie-zip.ts` | Multi-composition Remotion project zip generator | ✓ VERIFIED | 272 lines; exports generateMovieProjectZip; generates SceneNN files, MovieComposition with Series, Root with Fragment, config files; uses detectUsedAPIs and extractMetadata |
| `src/components/movie/movie-export-buttons.tsx` | Export Remotion Project button with instructions modal | ✓ VERIFIED | 199 lines; exports MovieExportButtons; calls generateMovieProjectZip, downloads blob, shows instructions dialog with setup steps |
| `src/components/render/clip-render-button.tsx` | Single-clip render button using startClipRender | ✓ VERIFIED | 57 lines; exports ClipRenderButton; uses useAction(startClipRender); optimistic UI with toast feedback |
| `src/app/(app)/create/create-page-client.tsx` | Create page with ClipRenderButton wired | ✓ VERIFIED | Modified; imports and renders ClipRenderButton at line 376-379; disabled when no clipId |

**All artifacts verified:** 15/15

### Key Link Verification

#### Plan 11-01 Key Links

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| MoviePreviewPlayer | useCurrentPlayerFrame | useCurrentPlayerFrame(playerRef) | ✓ WIRED | Import present, hook called with playerRef at line 26 |
| MoviePreviewPlayer | MovieComposition | Player component prop | ✓ WIRED | component={MovieComposition as any}, inputProps={{ scenes }} at lines 75-76 |
| movie-editor | MoviePreviewPlayer | onActiveSceneChange callback | ✓ WIRED | onActiveSceneChange={setActiveSceneIndex} at line 202 |
| movie-editor | Timeline | activeSceneIndex prop | ✓ WIRED | activeSceneIndex={activeSceneIndex} passed at line 208 |

#### Plan 11-02 Key Links

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| startMovieRender | movies.getWithClipsInternal | ctx.runQuery(internal.movies.getWithClipsInternal) | ✓ WIRED | Line 220 fetches movie with clips |
| startMovieRender | renders.create | ctx.runMutation with movieId | ✓ WIRED | Line 271 creates render record with movieId |
| startMovieRender | MOVIE_RENDER_LIMITS | Validation checks | ✓ WIRED | Lines 240, 246 validate MAX_SCENES and MAX_DURATION_FRAMES |

#### Plan 11-03 Key Links

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| MovieRenderButton | startMovieRender | useAction(api.triggerRender.startMovieRender) | ✓ WIRED | Line 19 imports action, line 30 calls it |
| MovieRenderButton | getByMovie | useQuery(api.renders.getByMovie) | ✓ WIRED | Line 24 queries render status for progress tracking |
| MovieExportButtons | generateMovieProjectZip | Function call | ✓ WIRED | Line 51 calls generateMovieProjectZip with movie data |
| movie-editor | MovieRenderButton | Rendered in header controls | ✓ WIRED | Lines 161-164 render MovieRenderButton |
| movie-editor | MovieExportButtons | Rendered in header controls | ✓ WIRED | Lines 165-171 render MovieExportButtons |
| create-page-client | ClipRenderButton | Rendered in controls | ✓ WIRED | Lines 376-379 render ClipRenderButton when clipId exists |

**All key links verified:** 13/13

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| MOVIE-03: User can preview the full movie in one Remotion Player via Series composition | ✓ SATISFIED | MoviePreviewPlayer renders all scenes in Player with MovieComposition; MovieComposition uses Series (verified in phase 10); preview appears above timeline |
| MOVIE-04: User can render the full movie to one MP4 via Lambda | ✓ SATISFIED | startMovieRender action triggers Lambda with MovieComposition; MovieRenderButton shows progress and download |
| OUT-03: User can export a single clip as MP4 and/or Remotion source | ✓ SATISFIED | ClipRenderButton renders DynamicCode clip to MP4; ExportButtons (phase 8) exports Remotion source |
| OUT-04: User can export the full movie as one MP4 and/or Remotion project | ✓ SATISFIED | MovieRenderButton handles MP4 render; MovieExportButtons exports multi-composition Remotion project zip |

**Requirements coverage:** 4/4 satisfied

### Anti-Patterns Found

No blocking anti-patterns detected. All files substantive with real implementations.

Minor findings:
- MoviePreviewPlayer returns null for empty movies (line 63): This is a proper guard clause, not a stub
- Type casts `as any` used throughout for Convex ID types: Acceptable workaround for Convex v1 type limitations

### Human Verification Required

#### 1. Movie Preview Visual Playback

**Test:** Navigate to a movie page with 2+ scenes. Click play on the preview player.

**Expected:**
- All scenes play in sequence without gaps
- Scrubbing updates the active scene highlight on the timeline in real-time
- Active scene block shows a colored ring during playback

**Why human:** Visual continuity and real-time frame tracking must be observed by a human

#### 2. Movie Render to MP4

**Test:** Click "Render MP4" on a movie with 2+ scenes. Wait for render to complete (requires Lambda setup).

**Expected:**
- Progress updates in real-time (0% → 100%)
- Download button appears when complete
- Downloaded MP4 plays all scenes in sequence

**Why human:** End-to-end Lambda rendering requires AWS configuration and takes time; progress polling must be observed

#### 3. Movie Remotion Project Export

**Test:** Click "Export Remotion Project" on a movie with 2+ scenes. Unzip the downloaded file.

**Expected:**
- Zip contains Scene01.tsx, Scene02.tsx, ..., MovieComposition.tsx, Root.tsx, index.ts, package.json, tsconfig.json, remotion.config.ts
- Run `npm install && npx remotion studio` in the unzipped directory
- Remotion Studio shows both individual scenes and the Movie composition
- Movie composition plays all scenes in sequence using Series

**Why human:** Multi-file zip structure and Remotion project validity must be verified manually

#### 4. Single Clip Render from Create Page

**Test:** On the create page, generate or load a clip. Click "Render MP4".

**Expected:**
- Toast message confirms render started
- Render action triggers without errors
- (If Lambda configured) MP4 download becomes available

**Why human:** Optimistic UI feedback and async render trigger must be observed

---

## Summary

**Phase 11 is COMPLETE.** All must-haves verified:

✓ **Plan 11-01:** Movie preview player plays all scenes in sequence with frame-synced timeline highlighting
✓ **Plan 11-02:** Movie render pipeline backend supports multi-scene Lambda rendering with MOVIE_RENDER_LIMITS
✓ **Plan 11-03:** Render and export UI wired into movie editor and create page

**Build status:** ✓ npm run build succeeds, no TypeScript errors

**Human verification:** 4 items require manual testing (visual playback, Lambda rendering, exported project validity, create page render button)

---

_Verified: 2026-02-01T21:30:00Z_
_Verifier: Claude (gsd-verifier)_
