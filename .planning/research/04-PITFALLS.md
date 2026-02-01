# Pitfalls Research: RemotionLab v0.2.0

**Focus:** Risks, gotchas, and mitigation strategies for Create Page Overhaul
**Researched:** 2026-02-01

## 1. Cost & Latency of Multiple Variations

### Cost Analysis
- Claude Sonnet typical generation: ~2K input + ~3K output tokens
- Per call: ~$0.006 input + ~$0.045 output = ~$0.05 per variation
- 4 variations: ~$0.20 per prompt (without caching)
- With system prompt caching (90% discount on cached reads): ~$0.14 per prompt
- At 100 prompts/day with 4 variations: ~$14-20/day

### Latency
- Single Claude generation: ~5-15 seconds for Remotion JSX
- 4 parallel calls: same 5-15 seconds (parallel, not sequential)
- However: 4 simultaneous actions hit Convex action concurrency limits
- Convex actions run in Node.js runtime; parallel outbound API calls are fine

### Rate Limits
- Claude API: Tier-dependent (Tier 1: 50 RPM, Tier 4: 4000 RPM)
- 4 parallel calls per prompt is fine for any tier
- Risk: burst of multiple users generating 4 variations simultaneously

### Mitigation
- Default to 1 variation (let user opt into 2-4)
- Cache system prompt aggressively (cache_control on system message)
- Show estimated cost/credits per generation in UI
- Existing rate limiter from v1.0 already enforces per-user quotas

## 2. Convex Document Size Limits

### Limits
- Individual document: 1MB max
- Array field: 8,192 entries max, recommended ~10 nested elements
- Individual value: 1MB max

### Risk Assessment
- With Option A (one row per variation), each document has ONE code field
- Typical Remotion JSX: 2-10KB per composition
- Well within 1MB limit
- NO risk with the recommended data model

### If using array approach (NOT recommended)
- 4 variations x 10KB = 40KB — still fine, but harder to manage
- Storing conversation history in the document could grow
- Reference images stored as storageIds (just ID strings), not the actual files

## 3. Image Upload Security

### Risks
- **MIME type spoofing:** User uploads SVG disguised as PNG (SVG can contain JavaScript)
- **EXIF data privacy:** GPS coordinates, device info leaked
- **Large files:** Storage cost, upload timeout
- **Malicious payloads in EXIF:** Embedded scripts in metadata fields

### Mitigations
1. **Client-side validation:**
   - Check file.type against whitelist: image/jpeg, image/png, image/webp, image/gif
   - Check file extension
   - Enforce 10MB max size
   - Strip EXIF metadata using piexifjs or similar (client-side, before upload)

2. **Server-side validation:**
   - Convex mutation validates storageId exists before linking
   - Only image storageIds accepted for referenceImageIds field
   - SVGs explicitly rejected (not in accepted types)

3. **Storage management:**
   - Track which generations reference which storage files
   - Cleanup orphaned files when generations are deleted
   - Monitor total storage per user

### EXIF Stripping
- Use piexifjs or Exif-Stripper library in browser
- Process in the client BEFORE uploading to Convex
- Removes GPS, device info, timestamps
- Does NOT degrade image quality
- Social media platforms (Facebook, Instagram, Twitter) all do this

## 4. Prequel Generation Quality

### Start-State is Easier than End-State
- End-state requires evaluating all interpolations at final frame (complex)
- Start-state is typically the initial values of interpolations (explicit in code)

### Reliable Cases
- `interpolate(frame, [0, duration], [startVal, endVal])` → startVal at frame 0
- `spring({frame, fps, ...})` → starts at `from` value (default 0)
- Static styles → same at all frames
- `translateX: interpolate(frame, [0, 30], [-100, 0])` → starts at -100

### Edge Cases (Lower Reliability)
- **Delayed entry:** Elements that don't appear until frame N have no visual state at frame 0
- **Conditional rendering:** `{frame > 10 && <Element />}` — not visible at frame 0
- **Opacity 0 start:** Element exists but invisible — is it "part of start state"?
- **Complex computed values:** Styles derived from multiple interpolations
- **Sequences:** `<Series>` within a clip where first segment starts at frame 0 but later segments don't

### Mitigation
- **Define "start state" as "what is visible at frame 0"** — ignore invisible elements
- Prompt Claude to identify: "What does the user SEE at the very first frame?"
- For delayed-entry elements: note them as "appears later" in the analysis
- Accept that prequel generation is "best effort" — user can always edit the result
- Show the user a preview of the generated prequel before committing

### Confidence: MEDIUM
Start-state extraction is more reliable than end-state, but edge cases exist. The LLM-based approach (same as continuation) handles most cases well.

## 5. Feed Performance

### Rendering Many Thumbnails
- Each Remotion `<Thumbnail>` creates a mini composition render
- 20+ simultaneous thumbnails = 20+ React render trees

### Performance Concerns
- **Memory:** Each Thumbnail instance maintains its own composition state
- **CPU:** Rendering thumbnails involves evaluating animation code
- **DOM:** Many canvas/div elements in the feed

### Mitigation Strategies
1. **Static image thumbnails:** Generate a PNG at save time (middle frame), use `<img>` in feed instead of live Thumbnail
   - Pro: Massively less expensive than live renders
   - Con: Requires server-side rendering or client-side canvas capture
   - **Recommended for v0.2.0**

2. **Lazy loading:** Only render Thumbnails for visible feed items (Intersection Observer)
3. **Virtualization:** react-virtuoso unmounts off-screen items (cleans up Thumbnail instances)
4. **Thumbnail cache:** Generate once, store as Convex file storage blob

### Recommendation
For feed items: use a **placeholder/icon** during generation, then capture a **static screenshot** when complete. Only render live Remotion Player for the currently selected/expanded variation.

## 6. Migration from v0.1 Create Page

### Backward Compatibility
- Existing generations have no `batchId`, `variationIndex`, `aspectRatio`, `fps`, `durationInSeconds`, or `referenceImageIds`
- All new fields should be `v.optional()` — existing data works as-is

### Display Logic
- Old generations (no batchId): display as single-variation rows in feed
- Old generations (no settings): show "Default" or omit settings display
- No data migration needed — optional fields handle gracefully

### Create Page Transition
- Current create page has Monaco editor, preview, actions
- New create page is feed-based
- **Keep editor accessible** via "Edit" action on a variation
- Consider: separate `/create/editor?gen=xxx` route for full editor mode

### Risk: LOW
Optional fields + client-side null handling means no migration needed.

## 7. Aspect Ratio in Remotion

### How Remotion Handles Aspect Ratios
- Composition defines `width` and `height` props
- Aspect ratio = width/height
- DynamicCode meta-composition currently uses fixed dimensions

### Aspect Ratio Presets
| Preset | Width | Height | Use Case |
|--------|-------|--------|----------|
| Landscape 16:9 | 1920 | 1080 | Default, YouTube |
| Portrait 9:16 | 1080 | 1920 | TikTok, Reels |
| Square 1:1 | 1080 | 1080 | Instagram |

### Lambda Support
- Lambda renders at whatever width/height you specify in `renderMediaOnLambda()`
- No aspect ratio limitation
- Different aspect ratios just mean different pixel dimensions

### Impact on DynamicCode Composition
- Currently: `DynamicCode` has fixed width/height in composition registration
- Need: Pass width/height as inputProps, or register multiple compositions
- **Recommended:** Add `width` and `height` to `DynamicCode` inputProps
- The generated code from Claude should be instructed to fill the given dimensions
- Claude prompt should include the target aspect ratio / dimensions

### Impact on Movie Composition
- All scenes in a movie should share the same aspect ratio
- Enforce at addScene time: reject clips with different aspect ratios
- Or: allow mixed and letterbox/pillarbox non-matching clips
- **Recommended for MVP:** Enforce uniform aspect ratio per movie

## Summary: Risk Matrix

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Variation cost explosion | Medium | Medium | Default to 1, cache prompts |
| Document size limits | Low | Low | One row per variation |
| Image upload security | Medium | Low | EXIF strip, type validation |
| Prequel quality | Medium | Medium | LLM-based, user preview |
| Feed performance (thumbnails) | High | High | Static screenshots, lazy load |
| Migration breaking changes | Low | Low | Optional fields |
| Aspect ratio complexity | Low | Low | Dimension in inputProps |
