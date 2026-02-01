# Stack Research: RemotionLab v0.2.0

**Focus:** Libraries, APIs, and stack additions for Create Page Overhaul
**Researched:** 2026-02-01

## 1. Image/File Upload with Convex

**Convex File Storage** supports two upload methods:

### Upload URLs (Recommended)
- 3-step process: generate URL -> POST file -> persist storageId
- No hard file size limit; practical limit is 2-min POST timeout
- Browser may cap at ~2GB
- Upload URLs expire after 1 hour
- The generating mutation controls access permissions

### HTTP Actions
- Single-step but limited to 20MB request size
- Requires CORS configuration

**Recommendation:** Use Upload URLs for image uploads. Generate URL via mutation (with auth check), POST file from client, save `storageId` to generation document.

**Storage IDs:** Type `Id<"_storage">`, stored as field on document. Retrieve URL via `ctx.storage.getUrl(storageId)`.

## 2. Claude API Vision/Image Input

Claude supports multipart messages with image content blocks:
- Formats: JPEG, PNG, GIF, WebP
- Max image size: 20MB per image
- Encoding: base64 data or URL reference
- Token cost: ~1,600 tokens for a 1024x1024 image (estimated)

**Integration pattern for RemotionLab:**
1. User uploads image to Convex file storage
2. On generation, action fetches image bytes from Convex storage
3. Pass image as base64 content block alongside text prompt to Claude
4. Claude uses image as visual reference for code generation

**Prompt caching:** System prompt can be cached (90% cost reduction on reads). With 1-4 variations sharing the same system prompt, cache hits are likely.

## 3. Multiple Variations (Parallel Generation)

### Approaches Researched

**Option A: Parallel Claude API calls (Recommended)**
- Fire 1-4 independent calls with the same prompt
- Use `temperature: 0.8-1.0` for meaningful variation
- Each call produces a distinct composition
- Latency = single call latency (parallel, not sequential)
- Cost = N x single call cost

**Option B: Single call asking for multiple outputs**
- Ask Claude to generate N different compositions in one response
- Risk: outputs may be too similar, or response truncated
- Lower cost but higher latency for one large response
- Parsing multiple code blocks from one response is fragile

**Option C: Batch API**
- 50% cost discount but up to 24 hours processing time
- Not suitable for interactive generation

**Industry patterns:**
- Midjourney generates 4 images per prompt by default (parallel workers)
- DALL-E generates 1-4 images via parallel model calls
- Stable Diffusion uses different seeds for variations

**Recommendation:** Option A (parallel calls). Use `temperature: 0.9` for meaningful variation while maintaining quality. Fire N parallel Convex actions. Each variation gets its own document row.

### Cost Implications
- Claude Sonnet: ~$3/M input, ~$15/M output tokens
- Typical Remotion JSX generation: ~2K input + ~3K output tokens
- Per generation (4 variations): ~$0.20 (without caching)
- With system prompt caching: ~$0.14 per generation
- Rate limits: Check per-minute token limits; 4 parallel calls should be fine

## 4. Infinite Scroll / Virtualized List

### Libraries Compared

| Library | Size | Features | Recommendation |
|---------|------|----------|----------------|
| **react-virtuoso** | ~15KB | Variable height items, endless scroll, grid, SSR-friendly | **Recommended** |
| @tanstack/virtual | ~10KB | Headless, flexible, framework-agnostic | Good alternative |
| react-window | ~6KB | Fixed/variable height, lightweight | Simpler but less featured |

**react-virtuoso** is the best fit because:
- Built-in `endReached` callback for infinite scroll
- `increaseViewportBy` prop for pre-rendering outside viewport
- Variable height items (generation rows have different sizes based on variation count)
- Custom Header/Footer components for loading states
- Works with `"use client"` in Next.js App Router

**Integration with Convex pagination:**
- Server: paginated query using `paginationOptsValidator` + `.paginate()`
- Client: `usePaginatedQuery` hook returns `{ results, status, loadMore }`
- Status values: `"LoadingFirstPage"`, `"CanLoadMore"`, `"LoadingMore"`, `"Exhausted"`
- Wire `loadMore` to react-virtuoso's `endReached` callback

**Note:** react-virtuoso is NOT needed for MVP if generation count stays under ~100. Simple scrollable div with Convex's `usePaginatedQuery` may suffice initially. Add virtualization when performance becomes an issue.

## 5. Convex Pagination

Convex provides first-class pagination:

```typescript
// Server
export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("generations")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// Client
const { results, status, loadMore } = usePaginatedQuery(
  api.generations.list,
  {},
  { initialNumItems: 20 }
);
```

**Key gotcha:** Page sizes are reactive — if items are added/removed, page sizes may change. This is a feature (real-time updates) but affects scroll position.

**Recommendation:** Use `usePaginatedQuery` with `initialNumItems: 20`, load more on scroll. No need for external pagination library.

## Summary: New Dependencies for v0.2.0

| Package | Purpose | Size | Priority |
|---------|---------|------|----------|
| None (built-in) | Convex file storage for uploads | 0 | P0 |
| None (built-in) | Convex pagination for feed | 0 | P0 |
| react-virtuoso | Feed virtualization (if needed) | ~15KB | P2 (defer) |
| piexifjs or similar | EXIF stripping on upload | ~5KB | P1 |

**Minimal new dependencies.** The existing stack (Convex, Claude API, Next.js) handles most v0.2 features natively.
