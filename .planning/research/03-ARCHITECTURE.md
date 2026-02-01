# Architecture Research: RemotionLab v0.2.0

**Focus:** Data model and architectural changes for Create Page Overhaul
**Researched:** 2026-02-01

## 1. Generations Data Model for Variations

### Current State
- `generations` table: one row per generation (userId, prompt, code, rawCode, status, etc.)
- Each generation produces one composition

### Options for Variations

**Option A: One row per variation with batchId (Recommended)**
- Each variation is its own `generations` document
- Add `batchId: v.string()` field linking variations from same prompt
- Add `variationIndex: v.number()` (0-3) for ordering
- Index: `by_batchId` for grouping

**Pros:**
- Each variation has independent status (one can fail while others succeed)
- No document size issues (code stays in individual rows)
- Pagination works naturally (group by batchId in query results)
- Consistent with existing code that expects one code per generation

**Cons:**
- Need to group by batchId when rendering feed
- More documents in table

**Option B: One row with array of variation codes**
- Single generation document with `variations: v.array(v.object({code, rawCode, status}))`

**Cons:**
- Convex recommends ~10 nested elements max
- 4 JSX compositions could hit 1MB document limit
- All variations share one status — can't track individual progress
- Breaking change to existing generation queries

**Option C: Separate variations table**
- `generations` table for the prompt/settings, `variations` table for individual outputs
- Over-engineered for 1-4 items per generation

**Decision: Option A** — One row per variation with batchId. Minimal schema change, works with existing patterns, supports independent status tracking.

### New Schema Fields on generations table
```typescript
generations: defineTable({
  // existing fields...
  batchId: v.optional(v.string()),        // groups variations from same prompt
  variationIndex: v.optional(v.number()), // 0-3 within batch
  variationCount: v.optional(v.number()), // total variations requested (1-4)
  // settings
  aspectRatio: v.optional(v.string()),    // "16:9", "9:16", "1:1"
  fps: v.optional(v.number()),            // 24, 30, 60
  durationInSeconds: v.optional(v.number()), // 1-30
  // upload references
  referenceImageIds: v.optional(v.array(v.id("_storage"))),
  // prequel/continuation tracking
  sourceClipId: v.optional(v.id("clips")),
  continuationType: v.optional(v.union(v.literal("next"), v.literal("previous"))),
})
.index("by_userId", ["userId"])
.index("by_batchId", ["batchId"])
```

## 2. Generation Feed Query

### Feed Structure
The feed displays generations grouped by batch. Query approach:

```typescript
// Paginated query returning individual generation rows
export const listFeed = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    return await ctx.db
      .query("generations")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
```

**Client-side grouping:** Group results by `batchId` for display. Generations without batchId (legacy) display as individual items.

```typescript
// Client-side grouping
const grouped = useMemo(() => {
  const groups = new Map<string, Generation[]>();
  for (const gen of results) {
    const key = gen.batchId ?? gen._id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(gen);
  }
  return Array.from(groups.values());
}, [results]);
```

### Loading States
- `variationIndex: 0` created first, others follow
- Each variation transitions: `pending` → `generating` → `complete` / `failed`
- Feed shows skeleton placeholder for pending variations
- Convex reactive queries auto-update as each variation completes

## 3. Settings Storage

**Dual approach:**
- **User defaults:** Store in localStorage (no server round-trip for settings)
  - `remotionlab-settings: { aspectRatio: "16:9", duration: 5, fps: 30 }`
- **Per-generation:** Store on each generation document
  - Used for display in feed ("Generated at 16:9, 5s, 30fps")
  - Used when rerunning a generation (reuse original settings)

**No Convex user preferences table needed for MVP.** localStorage is sufficient for settings that don't need to sync across devices.

## 4. File Upload Architecture

### Upload Flow
1. User selects/drops image → client creates upload URL via mutation
2. Client POSTs file to upload URL → receives `storageId`
3. `storageId` stored in component state (not yet persisted)
4. On generation submit: `referenceImageIds` array passed to generation action
5. Action fetches image bytes from Convex storage
6. Image passed to Claude API as base64 content block

### Storage Management
- `referenceImageIds` on generation document links to `_storage`
- Images persist as long as referenced by a generation
- When generation is deleted, consider cleanup (delete orphaned storage files)
- Storage limit: no hard limit on Upload URLs; ~2GB practical browser limit

### Security
- Strip EXIF metadata client-side before upload (piexifjs)
- Validate MIME type client-side and server-side
- Accept only: image/jpeg, image/png, image/webp, image/gif
- Max file size: 10MB (enforced client-side, reasonable for reference images)

## 5. Prequel Generation Architecture

### Existing Continuation (Extend Next)
- `generateContinuation` action reads clip code, sends to Claude with CONTINUATION_SYSTEM_PROMPT
- Claude extracts end state (final frame) by reading the code
- Generates new composition starting from that end state

### Prequel (Extend Previous) — New
- Same approach, different direction:
  1. Read clip code to extract **start state** (frame 0)
  2. Send to Claude with PREQUEL_SYSTEM_PROMPT
  3. Claude generates composition that **ends at** the start state

**Start-state extraction is simpler than end-state:**
- Frame 0 state is typically the initial values of interpolations
- `interpolate(frame, [0, ...], [startValue, ...])` → startValue is frame 0
- `spring({frame, ...})` → starts at 0 (default from)
- Static styles (no animation) are the same at frame 0 as any frame
- Elements with `opacity: 0` at frame 0 are invisible (not part of start state)

**PREQUEL_SYSTEM_PROMPT structure:**
```
You are analyzing Remotion animation code to determine what is visible at frame 0 (the very first frame).
For each visible element, describe: position, size, color, opacity, text content, rotation.
Elements that start invisible (opacity 0, off-screen, scale 0) should be noted as "not yet visible."
Then generate a new Remotion composition that ENDS with this exact visual state as its final frame.
```

**Confidence: MEDIUM** — Start-state extraction is more reliable than end-state (initial values are explicit in code), but animations that delay element entry or have conditional logic remain tricky.

## 6. Create Page State Management

### Current State
- Create page shows single generation with code editor + preview
- URL params: `?clipId=xxx` for loading saved clip, `?sourceClipId=xxx` for continuation mode

### New State Model

**URL State (source of truth for selection):**
- `?gen=<generationId>` — selected generation (expanded view)
- `?var=<variationIndex>` — selected variation within generation
- No selection → feed view only (no expanded detail)

**React State (local):**
- Settings panel open/close
- Upload attachments (pre-submit)
- Prompt text

**Convex Reactive State (server):**
- Feed data via `usePaginatedQuery`
- Selected generation detail via `useQuery`

### Page Layout Modes
1. **Feed only** — scrolling feed, no selection → full width feed
2. **Feed + Detail** — feed on left (narrower), detail panel on right with preview/editor/actions
3. **Editor mode** — full editor view when user clicks "Edit" on a variation (similar to current create page)

**Recommendation:** Start with a simpler model — feed view with expandable rows (click to expand inline) rather than a side panel. This avoids complex layout transitions and keeps the Midjourney-like feel of scrolling through results.
