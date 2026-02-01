---
phase: 11-movie-preview-render-export
plan: 03
subsystem: ui
tags: [remotion, render-button, export-zip, movie-export, clip-render, jszip, series]

# Dependency graph
requires:
  - phase: 11-01-movie-preview-player
    provides: MoviePreviewPlayer, validScenes, movie-editor page layout
  - phase: 11-02-render-pipeline
    provides: startMovieRender, startClipRender actions, getByMovie query, renders schema
  - phase: 08-export-polish
    provides: export-project-zip pattern, export-utils (detectUsedAPIs, extractMetadata, downloadBlob)
provides:
  - MovieRenderButton component with progress tracking and MP4 download
  - generateMovieProjectZip multi-composition Remotion project zip generator
  - MovieExportButtons component for Remotion project zip export
  - ClipRenderButton component for single-clip MP4 rendering from create page
  - Export instructions modal after zip download
affects: [12-continuation-generation, lambda-deployment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MovieRenderButton: 3-state render UI (idle/rendering/complete) driven by getByMovie query"
    - "Multi-composition zip export: Scene01..SceneNN + MovieComposition(Series) + Root(Fragment)"
    - "Export instructions modal guiding users through npm install and remotion studio"

key-files:
  created:
    - src/components/movie/movie-render-button.tsx
    - src/lib/export-movie-zip.ts
    - src/components/movie/movie-export-buttons.tsx
    - src/components/render/clip-render-button.tsx
  modified:
    - src/components/movie/movie-editor.tsx
    - src/app/(app)/create/create-page-client.tsx

key-decisions:
  - "Inline progress/download UI in MovieRenderButton rather than reusing RenderProgress/DownloadButton for simplicity"
  - "Duplicate generateTsConfig/generateRemotionConfig helpers rather than modifying export-project-zip.ts"
  - "Export instructions modal shown after successful zip download to guide users"

patterns-established:
  - "MovieRenderButton: reactive render status via useQuery(getByMovie), 3-state UI (idle/rendering/complete)"
  - "ClipRenderButton: optimistic UI with isRendering state + toast (no getByClip query needed)"
  - "Multi-composition zip: individual SceneNN.tsx files + MovieComposition using Series + Root with Fragment"

# Metrics
duration: ~8min
completed: 2026-02-01
---

# Phase 11 Plan 03: Movie Render & Export UI Summary

**MovieRenderButton with reactive progress, multi-composition Remotion zip export with instructions modal, and ClipRenderButton for single-clip MP4 from create page**

## Performance

- **Duration:** ~8 min (including checkpoint review and post-checkpoint fixes)
- **Started:** 2026-02-01
- **Completed:** 2026-02-01
- **Tasks:** 3 auto + 1 checkpoint (approved)
- **Files modified:** 6

## Accomplishments
- MovieRenderButton triggers startMovieRender Lambda action, tracks progress reactively via getByMovie query, and shows download link when complete
- generateMovieProjectZip creates a multi-composition Remotion project with individual Scene files, MovieComposition using Series, and Root registering all compositions
- MovieExportButtons downloads the Remotion project zip with an instructions modal guiding users through setup
- ClipRenderButton on create page triggers startClipRender for individual DynamicCode clips
- Movie editor header cleanly shows Render MP4 + Export Remotion Project controls alongside existing buttons

## Task Commits

Each task was committed atomically:

1. **Task 1: Create MovieRenderButton and export-movie-zip generator** - `091e57f` (feat)
2. **Task 2: Create MovieExportButtons and wire into movie editor** - `854d9d6` (feat)
3. **Task 3: Create ClipRenderButton and wire into create page** - `24cb409` (feat)

Post-checkpoint fixes (applied during review):
4. **Fix: Move useMemo hooks above early returns in MovieEditor** - `6f55581` (fix)
5. **Feature: Add instructions modal after movie project export** - `5efc286` (feat)

## Files Created/Modified
- `src/components/movie/movie-render-button.tsx` - 3-state render button (idle/rendering/complete) using getByMovie query for reactive status
- `src/lib/export-movie-zip.ts` - Multi-composition Remotion zip generator with SceneNN files, MovieComposition(Series), Root(Fragment)
- `src/components/movie/movie-export-buttons.tsx` - Export Remotion Project button with instructions modal after download
- `src/components/render/clip-render-button.tsx` - Single-clip render button using startClipRender action with optimistic UI
- `src/components/movie/movie-editor.tsx` - Added MovieRenderButton + MovieExportButtons in header, fixed useMemo hook ordering
- `src/app/(app)/create/create-page-client.tsx` - Added ClipRenderButton when clip is loaded

## Decisions Made
- Inlined progress/download UI in MovieRenderButton rather than reusing RenderProgress/DownloadButton components -- keeps movie render button self-contained and simpler
- Duplicated generateTsConfig/generateRemotionConfig helpers in export-movie-zip.ts rather than extracting to shared module -- avoids modifying export-project-zip.ts which was not in plan scope
- Added export instructions modal (post-checkpoint enhancement) to guide users through npm install and remotion studio after downloading zip

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] useMemo hooks called after early return in MovieEditor**
- **Found during:** Checkpoint review
- **Issue:** React hooks (useMemo for exportScenes, totalDurationInFrames) were placed after an early return statement, violating Rules of Hooks
- **Fix:** Moved useMemo hooks above the early return to ensure consistent hook call order
- **Files modified:** src/components/movie/movie-editor.tsx
- **Verification:** Build succeeds, no React hook warnings
- **Committed in:** `6f55581`

**2. [Rule 2 - Missing Critical] Export instructions modal for downloaded zip**
- **Found during:** Checkpoint review
- **Issue:** Users downloading the Remotion project zip had no guidance on how to use it (npm install, npx remotion studio)
- **Fix:** Added an instructions modal that appears after successful zip download, showing step-by-step setup instructions
- **Files modified:** src/components/movie/movie-export-buttons.tsx
- **Verification:** Modal appears after zip export with clear setup instructions
- **Committed in:** `5efc286`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both fixes improve correctness and UX. No scope creep.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required. Lambda infrastructure was configured in Phase 5. Actual movie/clip rendering requires AWS Lambda to be deployed with MovieComposition and DynamicCode compositions.

## Next Phase Readiness
- Phase 11 is now complete. All movie preview, render, and export functionality is wired into the UI.
- Phase 12 (Continuation Generation) can proceed -- movie editor and clip library infrastructure are ready
- Lambda bundle deployment must include MovieComposition and DynamicCode compositions for end-to-end rendering
- All v2.0 OUT requirements covered: OUT-01 (movie render), OUT-02 (movie export), OUT-03 (clip render)

---
*Phase: 11-movie-preview-render-export*
*Completed: 2026-02-01*
