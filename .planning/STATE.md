# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-01)

**Release: v0.2.0**
**Core value:** Users can go from a text prompt to a rendered, downloadable animated video without any coding or motion design knowledge.
**Current focus:** v0.2.0 Create Page Overhaul -- Phase 15 complete (image upload & input bar)

## Current Position

Phase: 15 of 17 (Image Upload & Input Bar)
Plan: 3 of 3 in current phase
Status: Phase complete
Last activity: 2026-02-01 -- Completed 15-03-PLAN.md (input bar integration with image upload)

Progress: [##########          ] 62% (8/13 plans)

## Milestone History

| Milestone | Phases | Plans | Requirements | Duration |
|-----------|--------|-------|--------------|----------|
| v1.0 Core Validation | 5 | 12 | 14/14 | 2026-01-27 -> 2026-01-28 |
| v1.1 Full Code Generation | 3 | 10 | 11/11 | 2026-01-28 -> 2026-01-29 |
| v2.0 Scenes & Timeline | 4 | 11 | 15/15 | 2026-01-29 -> 2026-02-01 |
| **Total (shipped)** | **12** | **33** | **40** | 2026-01-27 -> 2026-02-01 |

## Performance Metrics

**Velocity (all milestones):**
- Total plans completed: 38
- Total execution time: ~160.0 min

**v0.2.0 Breakdown:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 09-app-shell-clip-library | 3/3 | 6 min | 2.0 min |
| 10-movie-data-timeline-ui | 3/3 | 7.0 min | 2.3 min |
| 11-movie-preview-render-export | 3/3 | 13 min | 4.3 min |
| 12-continuation-generation | 2/2 | 10 min | 5.0 min |
| 13-generation-feed-settings | 3/3 | 5 min | 1.7 min |
| 14-variations | 2/2 | 6 min | 3.0 min |
| 15-image-upload-input-bar | 3/3 | 8 min | 2.7 min |

## Accumulated Context

### Decisions

All decisions documented in PROJECT.md Key Decisions table.
v0.2.0 decisions:
- Create page IS the history (Midjourney-style scrolling feed)
- One generation row per variation with batchId grouping
- Static screenshots for feed thumbnails (live Player only for selected)
- localStorage for settings defaults, per-generation for display/rerun
- Parallel Claude API calls with temperature 0.9 for variations
- EXIF stripping on client before upload (canvas toBlob, not piexifjs -- format-agnostic)
- Default to 1 variation (users opt into more)
- Prequel uses same LLM code-reading approach as continuation
- Custom useLocalStorage hook (not usehooks-ts) -- one hook not worth a dependency
- GenerationSettingsPanel is presentational (props-driven, parent-controlled state)
- Duration presets [1,2,3,5,10]s and FPS presets [15,24,30,60] as button groups
- All new schema fields v.optional() for backward-compatible evolution
- ASPECT_RATIO_MAP: 16:9=1920x1080, 1:1=1080x1080, 9:16=1080x1920
- Settings injected as system prompt appendix (not user message)
- Feed shown below prompt only when no generation selected (clean home state)
- Settings toggle always visible when not generating
- Feed selection delegates to parent (callback pattern, not internal state)
- Helper function extraction (not ctx.runAction) for Convex action code sharing
- Optional temperature via spread operator to preserve default behavior for single generation
- Consistent createdAt timestamp before Promise.all for feed ordering
- VariationGrid uses stacked layout (metadata top, grid below) for better thumbnail space
- groupByBatch preserves insertion order, only sorts within batches by variationIndex
- First successful variation auto-selected for immediate preview after multi-generation
- Canvas toBlob for EXIF stripping (format-agnostic vs piexifjs JPEG-only)
- URL-based image source for Claude Vision (Convex storage URLs are publicly accessible)
- buildUserContent returns plain string when no images (avoids unnecessary content array)
- useCallback wrapping for all hook methods to enable stable references in consumers
- Sequential uploads in useImageUpload (not Promise.all) to avoid overwhelming Convex endpoint
- ImageAttachment is presentational (props-driven, no internal hook usage)
- Variation selector inline in InputBar toolbar (not in settings panel) for quick access
- Spread operator for optional referenceImageIds to Convex actions (avoids passing undefined)
- InputBar is single composition point for all generation input controls

### Pending Todos

None.

### Blockers/Concerns

- AWS Lambda setup pending -- code integration complete but not tested with real Lambda
- Function constructor security needs adversarial testing before production
- Feed performance with 50+ generations (test early with static thumbnails)
- Claude API cost at scale with 4 variations (implement usage tracking)
- Prequel quality for complex animations (user preview + edit as fallback)
- Convex storage URL accessibility from Claude API servers (may need base64 fallback)

## Session Continuity

Last session: 2026-02-01T21:14Z
Stopped at: Completed 15-03-PLAN.md (input bar integration with image upload)
Resume file: None

Next step: Plan Phase 16 (Per-Creation Actions)

---
*15-03 complete -- 2026-02-01*
*Unified InputBar with drag-drop, paste, image upload, settings toggle, variation selector, and generate button wired into create page*
