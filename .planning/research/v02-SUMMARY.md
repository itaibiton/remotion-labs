# Research Summary: RemotionLab v0.2.0

**Project:** RemotionLab v0.2.0 — Create Page Overhaul
**Domain:** AI-powered animation generation with Midjourney-style UX
**Researched:** 2026-02-01
**Confidence:** HIGH

## Executive Summary

RemotionLab v0.2.0 transforms the Create page from a single-generation editor into a Midjourney-style scrolling feed of all generations, with each prompt producing 1-4 variations, configurable settings (aspect ratio, duration, FPS), image upload for reference-based generation, and per-creation actions (extend next/prev, save, delete, rerun). The redesign also introduces prequel generation — a novel feature where the system generates an animation that leads INTO an existing clip's start state.

The recommended technical approach requires **minimal new dependencies**. Convex's built-in file storage handles image uploads, pagination handles the feed, and parallel Claude API calls produce variations. The main data model change is adding `batchId` and `variationIndex` fields to the existing generations table (one row per variation). The highest-risk area is feed performance with many Remotion thumbnails — mitigated by using static screenshots instead of live renders for feed items.

## Key Findings

### Stack (01-STACK.md)
- **Image upload:** Convex file storage with Upload URLs (3-step: generate URL → POST → persist storageId). No file size hard limit, 2-min timeout.
- **Claude vision:** Base64 image content blocks alongside text prompt. ~1,600 tokens per 1024x1024 image.
- **Variations:** Parallel Claude API calls with temperature 0.9. Cost ~$0.14-0.20 per 4-variation prompt with caching.
- **Feed pagination:** Convex `usePaginatedQuery` with `loadMore` — no external library needed.
- **Virtualization:** react-virtuoso recommended IF feed grows large; defer for MVP (simple scroll sufficient for <100 items).
- **New dependencies:** Minimal — only piexifjs for EXIF stripping. Everything else uses existing stack.

### Features (02-FEATURES.md)
- **Generation feed:** Scrolling feed, newest first. Each row = variation grid (left) + prompt/settings (right).
- **Variation selection:** Click thumbnail to expand. Badges V1-V4. Selected variation is target for all actions.
- **Settings panel:** Toggled from input bar via gear icon. Aspect ratio (3 presets), duration (slider), FPS (dropdown). Persist in localStorage.
- **Per-creation actions:** Extend next, extend previous, save, delete, rerun, edit, add to movie. Hover overlay for quick actions, action bar for full actions.
- **Prequel generation:** Novel feature — no competitor offers it. UX: "Extend Previous" button, generates animation ending at clip's start state.
- **Image upload:** Paperclip/image icon in input bar. Drag-drop, click, paste support. Thumbnail chip preview. Max 1-3 images, 10MB each.

### Architecture (03-ARCHITECTURE.md)
- **Data model:** One row per variation with `batchId` grouping (Option A). Client-side grouping by batchId for feed display.
- **New fields:** `batchId`, `variationIndex`, `variationCount`, `aspectRatio`, `fps`, `durationInSeconds`, `referenceImageIds`, `continuationType`.
- **Feed query:** Paginated by userId, descending order. Group by batchId client-side.
- **Settings storage:** localStorage for user defaults, per-generation for display/rerun.
- **File upload flow:** Client → upload URL → POST → storageId → generation action → fetch bytes → Claude API.
- **Prequel architecture:** Same LLM code-reading approach as continuation. Extract frame-0 state. PREQUEL_SYSTEM_PROMPT. Confidence: MEDIUM (simpler than end-state).
- **Page state:** URL params for selection (`?gen=`, `?var=`). Feed with expandable rows (inline expand, not side panel).

### Pitfalls (04-PITFALLS.md)
- **Cost:** 4 variations = ~$0.20/prompt. Mitigate: default to 1, cache system prompts.
- **Document size:** No risk with one-row-per-variation model.
- **Upload security:** EXIF stripping (piexifjs), MIME validation, size limits. SVGs rejected.
- **Prequel quality:** Start-state easier than end-state. Edge cases: delayed entry, conditional rendering. "Best effort" with user preview.
- **Feed performance:** HIGHEST RISK. Many Remotion Thumbnails = memory/CPU intensive. Mitigate: static screenshots for feed, live Player only for selected item.
- **Migration:** No data migration needed. All new fields are optional. Old generations display as single-variation rows.
- **Aspect ratio:** Pass width/height as inputProps to DynamicCode. Lambda supports any dimensions. Enforce uniform ratio per movie.

## Recommendations

### Architecture Decisions
1. **One generation row per variation** with batchId grouping — simplest, most compatible
2. **Static screenshots for feed thumbnails** — critical for performance
3. **localStorage for settings defaults** — no server round-trip needed
4. **Inline expandable rows** in feed — simpler than side-panel layout
5. **EXIF stripping on client** before upload — privacy protection
6. **Default to 1 variation** — let users opt into more (cost control)

### Implementation Order (suggested phases)
1. **Generation data model + settings + feed UI** — foundation for everything
2. **Variations (parallel generation)** — core Midjourney-like feature
3. **Image upload** — enhances generation quality
4. **Input bar redesign** — new prompt experience
5. **Per-creation actions** — extend next/prev, save, delete, rerun
6. **Prequel generation** — novel feature, builds on continuation

### Critical Risks to Monitor
- Feed performance with 50+ generations (test early with static thumbnails)
- Claude API cost at scale with 4 variations (implement usage tracking)
- Prequel quality for complex animations (user preview + edit as fallback)
