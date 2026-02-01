# Phase 15: Image Upload & Input Bar - Research

**Researched:** 2026-02-01
**Domain:** Convex file storage, EXIF stripping, Claude Vision API, React drag-drop-paste UI
**Confidence:** HIGH

## Summary

Phase 15 adds image upload capabilities and redesigns the input bar to compose all generation controls (prompt, upload, settings, variations, generate) into a unified layout. The phase spans three concerns: (1) the Convex file upload pipeline with EXIF stripping, (2) passing uploaded images to Claude as visual context, and (3) a cohesive input bar UI with drag-drop-paste image attachment.

The standard approach uses Convex's built-in 3-step file upload flow (generateUploadUrl mutation, POST file, save storageId), canvas-based EXIF stripping for all image formats (rather than piexifjs which is JPEG-only), and Claude's base64 image content blocks in the Messages API. For the UI, native HTML5 drag/drop and paste events are sufficient -- no external drag-drop library is needed since this is file attachment, not drag-and-drop reordering.

The existing codebase is well-prepared: the `generations` schema already has a `referenceImageIds` field, the `generateSingleVariation` helper is structured for easy extension to include image content blocks, and the settings panel and hook are already props-driven and composable.

**Primary recommendation:** Use canvas-based toBlob() for EXIF stripping (format-agnostic), Convex storage.getUrl() for URL-based image passing to Claude API, and compose the input bar from existing components with a new image attachment sub-component.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Convex file storage | built-in (1.31.x) | File upload and serving | Native 3-step upload, no additional deps |
| @anthropic-ai/sdk | ^0.71.2 | Claude Vision API calls | Already installed; supports image content blocks |
| HTML5 Canvas API | native | EXIF stripping via re-encode | Format-agnostic (JPEG, PNG, WebP, GIF), zero deps |
| lucide-react | ^0.563.0 | Icons (Image, X, Paperclip) | Already installed in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| piexifjs | 1.0.4 | JPEG-specific EXIF removal | NOT RECOMMENDED -- JPEG-only, unmaintained (7 yrs) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Canvas toBlob EXIF strip | piexifjs | piexifjs is JPEG-only; canvas handles all formats natively |
| Native drag/drop/paste | react-dropzone | Adds dependency for 3 event handlers; overkill for this use case |
| Base64 image to Claude | URL-based image to Claude | URL approach is simpler if Convex URLs are publicly accessible (they are) |

**Installation:**
```bash
# No new packages needed -- all capabilities exist in current stack
```

## Architecture Patterns

### Recommended Project Structure
```
convex/
  files.ts              # NEW: generateUploadUrl mutation
  generateAnimation.ts  # MODIFIED: accept referenceImageIds, fetch images, pass to Claude
  generations.ts        # MODIFIED: store mutation accepts referenceImageIds
  schema.ts             # MODIFIED: referenceImageIds type from v.string() to v.id("_storage")

src/
  hooks/
    use-image-upload.ts         # NEW: upload hook managing File[] state + upload flow
  lib/
    image-utils.ts              # NEW: EXIF strip, resize, validate
  components/
    generation/
      image-attachment.tsx       # NEW: drop zone, thumbnail chips, paste handler
      input-bar.tsx              # NEW: unified input bar composing all controls
      prompt-input.tsx           # MODIFIED or REPLACED by input-bar.tsx
      generation-settings.tsx    # EXISTING: no changes needed
```

### Pattern 1: Convex 3-Step File Upload
**What:** The standard Convex file upload pattern: generate URL, POST file, save storageId
**When to use:** Every time a user attaches an image
**Example:**
```typescript
// Source: https://docs.convex.dev/file-storage/upload-files

// convex/files.ts -- Step 1: Generate upload URL
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Must be logged in");
    return await ctx.storage.generateUploadUrl();
  },
});

// Client -- Step 2 & 3: Upload file, get storageId
const generateUploadUrl = useMutation(api.files.generateUploadUrl);

async function uploadFile(file: File): Promise<Id<"_storage">> {
  const postUrl = await generateUploadUrl();
  const result = await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  const { storageId } = await result.json();
  return storageId;
}
```

### Pattern 2: Canvas-Based EXIF Stripping
**What:** Load image into canvas, re-export as blob to strip all metadata
**When to use:** Before uploading any image to Convex storage
**Example:**
```typescript
// Source: MDN Canvas API / browser native

async function stripExifAndResize(
  file: File,
  maxDimension: number = 1568
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      // Calculate dimensions (preserving aspect ratio)
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      // Re-encode strips all metadata
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        },
        file.type === "image/png" ? "image/png" : "image/jpeg",
        0.92
      );
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });
}
```

### Pattern 3: Claude Vision - URL-Based Image Content Blocks
**What:** Pass image URLs (from Convex storage.getUrl) to Claude as content blocks
**When to use:** In the generateAnimation action when referenceImageIds are present
**Example:**
```typescript
// Source: https://platform.claude.com/docs/en/docs/build-with-claude/vision

// In Convex action: build user message content array
const content: Array<{ type: string; source?: any; text?: string }> = [];

// Add reference images first (images before text for best results)
for (const storageId of referenceImageIds) {
  const url = await ctx.storage.getUrl(storageId);
  if (url) {
    content.push({
      type: "image",
      source: { type: "url", url },
    });
  }
}

// Add text prompt after images
content.push({ type: "text", text: prompt });

// Send to Claude
const response = await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 4096,
  system: enhancedPrompt,
  messages: [{ role: "user", content }],
  ...(temperature !== undefined ? { temperature } : {}),
});
```

### Pattern 4: Image Upload Hook
**What:** Custom hook managing attached images state, upload flow, and cleanup
**When to use:** In the input bar component
**Example:**
```typescript
interface AttachedImage {
  id: string;            // Client-side unique ID
  file: File;            // Original file reference
  previewUrl: string;    // Object URL for thumbnail
  storageId?: string;    // Convex storage ID after upload
  status: "pending" | "uploading" | "uploaded" | "error";
}

function useImageUpload(maxImages: number = 3) {
  const [images, setImages] = useState<AttachedImage[]>([]);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const addImages = async (files: File[]) => { /* validate, strip EXIF, add to state */ };
  const removeImage = (id: string) => { /* revoke preview URL, remove from state */ };
  const uploadAll = async (): Promise<string[]> => { /* upload pending, return storageIds */ };
  const clear = () => { /* cleanup all preview URLs, reset state */ };

  return { images, addImages, removeImage, uploadAll, clear };
}
```

### Pattern 5: Unified Input Bar Layout
**What:** Single component composing prompt textarea, image chips, settings toggle, generate button
**When to use:** Replaces current PromptInput + separate settings toggle in create-page-client
**Example:**
```
+------------------------------------------------------+
| [attached image chips with X buttons]                 |
+------------------------------------------------------+
| [prompt textarea                                    ] |
|                                                       |
+------------------------------------------------------+
| [Image+] [Settings] [Variations: 1 2 3 4] [Generate] |
+------------------------------------------------------+
```

### Anti-Patterns to Avoid
- **Uploading to Convex before user submits:** Upload only on generate, not on attach. Keeps state simple, avoids orphaned files.
- **Sending base64 from client to Convex action:** The action should fetch images from storage using getUrl, not receive base64 over the wire (which would bloat the action args).
- **Using piexifjs for all formats:** piexifjs only works on JPEG. PNG, WebP, and GIF images would pass through with metadata intact.
- **Storing raw File objects in React state long-term:** Use URL.createObjectURL for previews and revoke on cleanup to prevent memory leaks.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File upload URL generation | Custom signed URL system | `ctx.storage.generateUploadUrl()` | Convex handles expiration, auth, storage |
| Image serving URLs | Custom CDN or signed URLs | `ctx.storage.getUrl(storageId)` | Returns publicly accessible URL, auto-404 on delete |
| File type detection | Manual magic byte parsing | `file.type` + `accept` attribute on input | Browser handles MIME detection reliably |
| Image thumbnail preview | Canvas-based thumbnail generation | `URL.createObjectURL(file)` | Browser native, zero overhead, auto-GC |
| Drag-drop zone | Custom dragover/drop handler library | Native HTML5 DragEvent API | 3 event handlers (dragOver, dragLeave, drop), trivial |
| Clipboard paste detection | Third-party clipboard library | `onPaste` event + `clipboardData.files` | Native browser API, 5 lines of code |

**Key insight:** Image upload and attachment is well-served by browser-native APIs and Convex built-ins. The only custom code needed is the EXIF-stripping utility and the image attachment UI component.

## Common Pitfalls

### Pitfall 1: EXIF Data Leaking Through
**What goes wrong:** User uploads a photo with GPS coordinates; coordinates persist in Convex storage and are accessible via storage URL.
**Why it happens:** piexifjs only handles JPEG; PNG metadata uses different chunks (tEXt, iTXt, zTXt); WebP has XMP data.
**How to avoid:** Use canvas toBlob re-encoding which strips ALL metadata from ALL formats by re-drawing pixels.
**Warning signs:** Testing only with JPEG images during development.

### Pitfall 2: Memory Leaks from Object URLs
**What goes wrong:** `URL.createObjectURL()` creates blob URLs that persist until explicitly revoked or page unload.
**Why it happens:** Attaching/removing images in a session without calling `URL.revokeObjectURL()`.
**How to avoid:** Revoke in `removeImage()` handler and in cleanup effect: `useEffect(() => () => images.forEach(img => URL.revokeObjectURL(img.previewUrl)), [])`.
**Warning signs:** Memory usage climbing during extended create page sessions.

### Pitfall 3: Upload URL Expiration
**What goes wrong:** User attaches images, walks away, comes back 2 hours later, hits generate -- upload fails.
**Why it happens:** Convex upload URLs expire after 1 hour.
**How to avoid:** Generate upload URL immediately before each POST, not on image attach. The pattern is: user hits Generate -> uploadAll() generates fresh URLs -> POST files -> submit generation.
**Warning signs:** Intermittent upload failures in production.

### Pitfall 4: Schema Mismatch for referenceImageIds
**What goes wrong:** Current schema has `referenceImageIds: v.optional(v.array(v.string()))` but Convex storage IDs should be typed as `v.id("_storage")`.
**Why it happens:** Placeholder field added in Phase 13 with generic string type.
**How to avoid:** Update schema to `v.optional(v.array(v.id("_storage")))` in this phase. Update `generations.store` mutation args to match.
**Warning signs:** TypeScript errors when passing `Id<"_storage">` to string fields.

### Pitfall 5: Image Size Exceeding Claude API Limits
**What goes wrong:** Large images (>5MB) get rejected by Claude API, or images >8000px in any dimension are rejected.
**Why it happens:** User uploads high-resolution photos directly from camera.
**How to avoid:** Client-side resize to max 1568px on longest edge before upload (matches Claude's recommendation for optimal TTFT). This also reduces storage costs and upload time.
**Warning signs:** Claude API errors about image size or dimensions.

### Pitfall 6: Paste Handler Conflicts
**What goes wrong:** Pasting text (not images) triggers the image handler, or paste handler on textarea conflicts with normal text paste.
**Why it happens:** `onPaste` fires for all paste events, not just images.
**How to avoid:** Check `event.clipboardData.files.length > 0` and filter by MIME type before processing. Only call `event.preventDefault()` when files are present.
**Warning signs:** Text paste stops working in the prompt textarea.

### Pitfall 7: Orphaned Storage Files
**What goes wrong:** Images uploaded to Convex storage but generation fails or user navigates away -- files persist indefinitely with no reference.
**Why it happens:** Upload happens before generation document is created.
**How to avoid:** Option A: Upload at generation time (recommended). Option B: Implement a cleanup cron that deletes unreferenced storage files. For MVP, upload at generation time is simplest and avoids orphans entirely.
**Warning signs:** Storage usage growing with no corresponding generations.

## Code Examples

### Convex generateUploadUrl Mutation
```typescript
// convex/files.ts
// Source: https://docs.convex.dev/file-storage/upload-files
import { mutation } from "./_generated/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in to upload files");
    }
    return await ctx.storage.generateUploadUrl();
  },
});
```

### Claude Vision with URL-Based Images (Convex Action)
```typescript
// Source: https://platform.claude.com/docs/en/docs/build-with-claude/vision

// Inside generateSingleVariation or similar, build content array:
type ContentBlock =
  | { type: "image"; source: { type: "url"; url: string } }
  | { type: "text"; text: string };

async function buildUserContent(
  ctx: ActionCtx,
  prompt: string,
  referenceImageIds?: Id<"_storage">[]
): Promise<ContentBlock[]> {
  const content: ContentBlock[] = [];

  if (referenceImageIds?.length) {
    // Images first, then text (Claude best practice)
    for (let i = 0; i < referenceImageIds.length; i++) {
      const url = await ctx.storage.getUrl(referenceImageIds[i]);
      if (url) {
        if (referenceImageIds.length > 1) {
          content.push({ type: "text", text: `Reference image ${i + 1}:` });
        }
        content.push({ type: "image", source: { type: "url", url } });
      }
    }
  }

  content.push({ type: "text", text: prompt });
  return content;
}
```

### Client-Side Image Validation
```typescript
// src/lib/image-utils.ts

const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DIMENSION = 1568; // Claude's recommended max for optimal TTFT
const MAX_IMAGES = 3;

interface ValidationResult {
  valid: boolean;
  error?: string;
}

function validateImageFile(file: File): ValidationResult {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return { valid: false, error: `Unsupported format: ${file.type}. Use JPEG, PNG, WebP, or GIF.` };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max 10MB.` };
  }
  return { valid: true };
}
```

### Drop Zone + Paste Handler
```typescript
// Drag-drop: native HTML5 API
const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(true);
};

const handleDragLeave = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(false);
};

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(false);
  const files = Array.from(e.dataTransfer.files).filter(f =>
    ACCEPTED_TYPES.has(f.type)
  );
  if (files.length > 0) addImages(files);
};

// Paste: native clipboard API
const handlePaste = (e: React.ClipboardEvent) => {
  const files = Array.from(e.clipboardData.files).filter(f =>
    ACCEPTED_TYPES.has(f.type)
  );
  if (files.length > 0) {
    e.preventDefault(); // Only prevent default when we have image files
    addImages(files);
  }
  // If no image files, let the paste event proceed normally (text paste)
};
```

### Image Thumbnail Chip Component
```typescript
// Thumbnail chip with remove button
function ImageChip({ image, onRemove }: { image: AttachedImage; onRemove: () => void }) {
  return (
    <div className="relative group inline-flex items-center gap-1 rounded-md border bg-muted/50 p-1">
      <img
        src={image.previewUrl}
        alt="Attached"
        className="h-10 w-10 rounded object-cover"
      />
      {image.status === "uploading" && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
      <button
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| piexifjs for EXIF removal | Canvas toBlob re-encoding | Always available | Handles all formats, not just JPEG |
| Base64 image to Claude API | URL-based image source | Claude API 2024+ | Simpler, no encoding overhead on server |
| Separate prompt + settings | Unified input bar | UX trend 2024-2025 | ChatGPT, Midjourney style unified input |
| File upload via HTTP actions | generateUploadUrl 3-step | Convex standard | Simpler, no CORS config, no 20MB limit |

**Deprecated/outdated:**
- piexifjs: Last published ~7 years ago, JPEG-only, v2.0 perpetually in development. Use canvas approach instead.
- `v.string()` for storage IDs: Should use `v.id("_storage")` for type safety and Convex's referential integrity.

## Open Questions

1. **Convex storage.getUrl() accessibility from Claude API servers**
   - What we know: Convex docs state `getUrl` returns publicly accessible URLs that work in `<img>` tags. Claude's URL-based image source requires a publicly accessible URL.
   - What's unclear: Whether Convex storage URLs have CORS or referrer restrictions that might prevent Claude's servers from fetching them. The URLs work in browsers, but Claude fetches server-side.
   - Recommendation: Test URL-based approach first. If Claude rejects URLs, fall back to base64 encoding (fetch blob in Convex action, convert to base64, send as base64 content block). Both approaches are straightforward to implement.

2. **Upload timing: on attach vs on generate**
   - What we know: Uploading on generate avoids orphaned files. Uploading on attach gives immediate feedback.
   - What's unclear: Whether upload latency on generate (1-3 images * upload time) noticeably delays the generation start.
   - Recommendation: Upload on generate for MVP (simplest, no orphans). If user testing shows the delay is noticeable, switch to upload-on-attach with a cleanup mechanism.

3. **GIF handling through canvas**
   - What we know: Canvas toBlob converts GIFs to static images (first frame only). GIF is a supported Claude format.
   - What's unclear: Whether users expect animated GIF reference images to remain animated.
   - Recommendation: For reference images, static first frame is fine. Claude only sees a static image anyway. Accept GIF but note the EXIF-strip process converts to static.

## Sources

### Primary (HIGH confidence)
- Convex file storage docs: https://docs.convex.dev/file-storage/upload-files -- 3-step upload flow, generateUploadUrl
- Convex file serving docs: https://docs.convex.dev/file-storage/serve-files -- storage.getUrl, public URLs
- Convex StorageActionWriter API: https://docs.convex.dev/api/interfaces/server.StorageActionWriter -- ctx.storage.get returns Blob
- Claude Vision docs: https://platform.claude.com/docs/en/docs/build-with-claude/vision -- image content blocks (base64 + URL), limits, formats
- MDN Canvas toBlob: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob -- EXIF stripping via re-encoding
- Existing codebase: convex/schema.ts (referenceImageIds field), convex/generateAnimation.ts (generation actions), src/components/generation/ (existing UI)

### Secondary (MEDIUM confidence)
- piexifjs GitHub: https://github.com/hMatoba/piexifjs -- JPEG-only limitation confirmed, v1.0.4 recommended
- Claude API image limits: 5MB per image API / 8000px max dimension / up to 100 images per request

### Tertiary (LOW confidence)
- Convex storage URL public accessibility from external servers (confirmed for browsers, unverified for server-to-server fetch by Claude API)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all tools are built-in (Convex storage, Canvas API, Anthropic SDK already installed)
- Architecture: HIGH - follows established Convex patterns, existing codebase is well-prepared with schema fields
- Pitfalls: HIGH - EXIF, memory leaks, upload timing are well-documented browser concerns
- Claude Vision integration: MEDIUM - URL vs base64 approach may need runtime validation

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days -- stable domain, no fast-moving dependencies)
