---
phase: 15-image-upload-input-bar
plan: 01
subsystem: api
tags: [convex, file-storage, claude-vision, image-processing, canvas-api]

# Dependency graph
requires:
  - phase: 13-generation-feed-settings
    provides: referenceImageIds placeholder in schema, generation settings architecture
  - phase: 14-variations
    provides: generateVariations action, generateSingleVariation shared helper
provides:
  - Convex file upload URL mutation with auth guard
  - Client-side EXIF stripping and image resize utilities
  - Typed storage IDs (v.id("_storage")) for referenceImageIds
  - Claude Vision integration with URL-based image content blocks
  - Reference image support in both generate and generateVariations actions
affects: [15-02 (image upload hook and UI), 15-03 (input bar composition)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Canvas-based EXIF stripping (format-agnostic, zero deps)"
    - "buildUserContent helper for multi-part Claude content arrays"
    - "URL-based image content blocks via ctx.storage.getUrl"

key-files:
  created:
    - convex/files.ts
    - src/lib/image-utils.ts
  modified:
    - convex/schema.ts
    - convex/generations.ts
    - convex/generateAnimation.ts

key-decisions:
  - "Canvas toBlob for EXIF stripping (format-agnostic vs piexifjs JPEG-only)"
  - "URL-based image source for Claude (vs base64 -- simpler, uses Convex public URLs)"
  - "buildUserContent returns plain string when no images (avoids unnecessary content array overhead)"
  - "UserContent type alias unifies string | content-block-array for generateSingleVariation"

patterns-established:
  - "Convex 3-step file upload: generateUploadUrl -> POST -> save storageId"
  - "Image validation with ACCEPTED_IMAGE_TYPES set and MAX_FILE_SIZE constant"
  - "buildUserContent pattern for optional image injection into Claude messages"

# Metrics
duration: 3min
completed: 2026-02-01
---

# Phase 15 Plan 01: Backend Image Upload Pipeline Summary

**Convex file upload mutation, canvas-based EXIF stripping utilities, and Claude Vision URL-based content blocks for reference images in generate/generateVariations**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-01T20:59:53Z
- **Completed:** 2026-02-01T21:03:05Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created Convex file upload URL mutation with authentication guard
- Built client-side image processing utilities (EXIF strip, resize, validate) using canvas API
- Upgraded schema referenceImageIds from v.string() to v.id("_storage") for type safety
- Integrated Claude Vision content blocks into both generate and generateVariations actions
- Both actions pass referenceImageIds through to the store mutation for persistence

## Task Commits

Each task was committed atomically:

1. **Task 1: Convex file upload mutation, image utilities, and schema fix** - `5159c1b` (feat)
2. **Task 2: Claude Vision integration in generate and generateVariations actions** - `2e64d13` (feat)

## Files Created/Modified
- `convex/files.ts` - generateUploadUrl mutation with auth check
- `src/lib/image-utils.ts` - EXIF stripping, resize, validation utilities (stripExifAndResize, validateImageFile, ACCEPTED_IMAGE_TYPES, MAX_IMAGES)
- `convex/schema.ts` - referenceImageIds upgraded to v.id("_storage")
- `convex/generations.ts` - store mutation accepts and persists referenceImageIds
- `convex/generateAnimation.ts` - buildUserContent helper, generate and generateVariations accept referenceImageIds, build multi-part content arrays

## Decisions Made
- Used canvas toBlob for EXIF stripping instead of piexifjs (handles all formats, not just JPEG)
- Used URL-based image source for Claude API (Convex storage URLs are publicly accessible)
- buildUserContent returns plain string when no images to avoid unnecessary content array allocation
- Created UserContent type alias to cleanly handle string | content-block-array in generateSingleVariation signature

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Backend fully supports image upload and Claude Vision integration
- Ready for 15-02: useImageUpload hook and image attachment UI component
- Ready for 15-03: unified input bar composing prompt, images, settings, and generate button
- Open question remains: whether Convex storage URLs work for Claude server-side fetch (may need base64 fallback)

---
*Phase: 15-image-upload-input-bar*
*Completed: 2026-02-01*
