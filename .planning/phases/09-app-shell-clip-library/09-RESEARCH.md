# Phase 9: App Shell & Clip Library - Research

**Researched:** 2026-01-30
**Domain:** Next.js App Shell (sidebar layout), Convex clips table, Remotion Thumbnail, clip save/load lifecycle
**Confidence:** HIGH

## Summary

Phase 9 adds two major features to RemotionLab: (1) a persistent app shell with sidebar navigation across all authenticated pages, and (2) a clip library that lets users save, browse, open, and delete compositions.

The existing codebase has three pages (`/`, `/create`, `/templates`), each with its own header containing `<Link>` to home and `<UserMenu>`. There is no shared layout beyond the root `layout.tsx` which wraps `<Providers>` and `<Toaster>`. The create page manages all state (lastGeneration, editedCode, chatMessages) in React `useState` -- none of this persists beyond the page session. The Convex schema has `users`, `generations`, and `renders` tables but no concept of a saved "clip."

The standard approach is:
1. **App shell**: Use a Next.js `(app)` route group with a shared `layout.tsx` containing sidebar + content area. Move `/create` and `/templates` into `(app)/`. Landing page stays outside.
2. **Clips table**: Add a `clips` table to Convex schema with `userId`, `name`, `code`, `rawCode`, `durationInFrames`, `fps`, `createdAt`, `updatedAt`. Clips are value-copies (not references to generations).
3. **Clip save**: "Save as Clip" button on create page captures current state (rawCode, code, duration, fps) and stores it in Convex.
4. **Library page**: New `/library` page showing clips in a card grid. Each card uses Remotion `<Thumbnail>` for live preview.
5. **Open/delete**: Click opens clip in create page via URL params; delete with confirmation dialog.

**Primary recommendation:** Build the app shell layout first (establishing navigation), then clips CRUD, then the library page, then save/open/delete flows.

## Standard Stack

### Core (No New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.1.5 | Route groups, nested layouts for app shell | Already installed. `(app)` route group is the documented pattern for shared layouts without URL impact. |
| Convex | 1.31.6 | `clips` table, mutations, queries | Already installed. Standard `defineTable` + `mutation` + `query` pattern identical to existing `generations` table. |
| `@remotion/player` (Thumbnail) | 4.0.410 | Clip thumbnails in library grid | Already installed. `<Thumbnail>` component renders a single frame from any composition -- purpose-built for this. |
| lucide-react | 0.563.0 | Sidebar navigation icons | Already installed. Provides Home, Plus, Library, Film, Palette icons. |
| shadcn/ui (Dialog, Card, Button) | latest | Save dialog, clip cards, action buttons | Dialog and Card already installed. May need `input` component for clip name field. |

### Supporting (May Need Adding)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui `input` component | latest | Clip name input in save dialog | Add via `npx shadcn@latest add input` when building save dialog |
| shadcn/ui `dropdown-menu` component | latest | Clip card actions (open, delete, rename) | Add via `npx shadcn@latest add dropdown-menu` when building clip card |
| shadcn/ui `alert-dialog` component | latest | Delete confirmation | Add via `npx shadcn@latest add alert-dialog` when building delete flow |
| shadcn/ui `tooltip` component | latest | Sidebar collapsed state icon labels | Add via `npx shadcn@latest add tooltip` if sidebar has collapsed mode |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Route group `(app)/` | Parallel routes `@sidebar` | Parallel routes are more complex. Route groups are simpler and sufficient for a persistent sidebar. |
| Remotion `<Thumbnail>` for clip previews | Canvas `toDataURL()` capture at save time | Canvas capture is fragile with Remotion's rendering pipeline. `<Thumbnail>` is purpose-built and already installed. |
| Value-copy clips (code stored on clip) | Reference-based clips (store `generationId`, read code from generations) | References break when generations are deleted/modified. Value-copy is safer, as documented in ARCHITECTURE.md. |

**Installation:**
```bash
# No new npm packages required. Only shadcn UI components as needed:
npx shadcn@latest add input
npx shadcn@latest add dropdown-menu
npx shadcn@latest add alert-dialog
```

## Architecture Patterns

### Recommended Project Structure

```
src/app/
  layout.tsx                        # Root layout (Providers, Toaster) -- UNCHANGED
  page.tsx                          # Landing page (no sidebar) -- UNCHANGED
  (app)/                            # NEW: Route group for authenticated pages
    layout.tsx                      # NEW: App shell layout (sidebar + content)
    create/
      page.tsx                      # MOVED from src/app/create/page.tsx
      create-page-client.tsx        # MOVED, MODIFIED: remove per-page header, add save button
    templates/
      page.tsx                      # MOVED from src/app/templates/page.tsx, MODIFIED: remove header
    library/
      page.tsx                      # NEW: Clip library page

src/components/
  shell/                            # NEW: App shell components
    sidebar.tsx                     # Sidebar navigation
    app-header.tsx                  # Shared top header bar
  library/                          # NEW: Library components
    clip-card.tsx                   # Individual clip card with thumbnail
    clip-library.tsx                # Grid of clip cards
    save-clip-dialog.tsx            # Modal dialog for naming + saving a clip

convex/
  schema.ts                         # MODIFIED: add clips table
  clips.ts                          # NEW: clips CRUD (save, list, get, update, remove)
```

### Pattern 1: Route Group App Shell

**What:** A `(app)` route group wraps all authenticated pages in a shared layout with sidebar navigation.
**When to use:** When multiple pages need a persistent sidebar/header that doesn't re-mount on navigation.

```typescript
// src/app/(app)/layout.tsx
import { Sidebar } from "@/components/shell/sidebar";
import { AppHeader } from "@/components/shell/app-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col">
      <AppHeader />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**Key detail:** Route groups do NOT affect URLs. Pages inside `(app)/create/` are still accessible at `/create`. The `(app)` folder is purely organizational.

### Pattern 2: Sidebar with Active State

**What:** Client-side sidebar using `usePathname()` for active link highlighting.
**When to use:** For persistent navigation that highlights the current page.

```typescript
// src/components/shell/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Library, Palette, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/create", label: "Create", icon: Plus },
  { href: "/library", label: "Library", icon: Library },
  { href: "/templates", label: "Templates", icon: Palette },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r bg-muted/30 flex flex-col p-4">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

### Pattern 3: Convex Clips CRUD (follows existing generations pattern)

**What:** Mutations and queries for clip save/list/get/update/remove using the same auth pattern as `convex/generations.ts`.
**When to use:** All clip data operations.

```typescript
// convex/clips.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const save = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    rawCode: v.string(),
    durationInFrames: v.number(),
    fps: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    return await ctx.db.insert("clips", {
      userId: identity.tokenIdentifier,
      name: args.name,
      code: args.code,
      rawCode: args.rawCode,
      durationInFrames: args.durationInFrames,
      fps: args.fps,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("clips")
      .withIndex("by_user_updated", (q) =>
        q.eq("userId", identity.tokenIdentifier)
      )
      .order("desc")
      .take(50);
  },
});

export const remove = mutation({
  args: { id: v.id("clips") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const clip = await ctx.db.get(args.id);
    if (!clip || clip.userId !== identity.tokenIdentifier) {
      throw new Error("Clip not found");
    }

    await ctx.db.delete(args.id);
  },
});
```

### Pattern 4: Remotion `<Thumbnail>` for Clip Cards

**What:** Renders a single frame of a clip's code as a static preview image.
**When to use:** Library clip cards showing visual previews.

```typescript
// Source: https://www.remotion.dev/docs/player/thumbnail
import { Thumbnail } from "@remotion/player";
import { DynamicCode } from "@/remotion/compositions/DynamicCode";

<Thumbnail
  component={DynamicCode}
  inputProps={{
    code: clip.code,
    durationInFrames: clip.durationInFrames,
    fps: clip.fps,
  }}
  compositionWidth={1920}
  compositionHeight={1080}
  frameToDisplay={Math.floor(clip.durationInFrames / 2)} // Middle frame
  durationInFrames={clip.durationInFrames}
  fps={clip.fps}
  style={{ width: "100%", borderRadius: 8 }}
/>
```

**Key details:**
- `frameToDisplay` is zero-indexed. Use middle frame for representative thumbnail.
- `durationInFrames` and `fps` are REQUIRED because the component may call `useVideoConfig()`.
- Renders live in the browser. No server-side rendering needed.
- Performance concern: Each `<Thumbnail>` executes the clip's code. For a library with 20+ clips, consider lazy loading (only render thumbnails in viewport).

### Pattern 5: Save Dialog Flow

**What:** Modal dialog for naming and saving a clip from the create page.
**When to use:** When user clicks "Save as Clip" button.

```typescript
// Flow: Create page -> Save dialog -> Convex mutation -> Toast + navigate to library

// 1. Create page exposes current state:
//    - rawCode (editor JSX), code (transformed JS), durationInFrames, fps

// 2. Save dialog collects:
//    - name (defaulting to first 50 chars of last prompt)

// 3. Mutation stores clip with value-copy of code

// 4. On success: toast("Clip saved!"), optionally navigate to /library
```

### Anti-Patterns to Avoid

- **Do NOT move Providers out of root layout.** `<ClerkProvider>` and `<ConvexProviderWithClerk>` must stay in the root `layout.tsx` so they wrap both the landing page and the `(app)` route group. The `(app)/layout.tsx` is ONLY for the sidebar shell.
- **Do NOT store clip code by reference.** Clips must copy `code` and `rawCode` values at save time. Never store just `generationId` and look up code on demand -- see ARCHITECTURE.md rationale.
- **Do NOT render all `<Thumbnail>` components eagerly in the library.** Each one executes arbitrary code. Use intersection observer or pagination for large libraries.
- **Do NOT create a separate header per page inside `(app)`.** The whole point of the app shell is shared header/sidebar. Remove existing per-page headers from create and templates pages.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Clip thumbnail preview | Canvas screenshot at save time | Remotion `<Thumbnail>` component | Remotion rendering pipeline is not reliably captured by `canvas.toDataURL()`. Thumbnail is purpose-built. |
| Active nav link detection | Custom route matching logic | `usePathname()` from `next/navigation` | Built into Next.js, handles all edge cases. |
| Modal dialog | Custom portal + overlay | shadcn/ui `<Dialog>` | Already installed, handles focus trap, escape key, overlay click. |
| Delete confirmation | `window.confirm()` | shadcn/ui `<AlertDialog>` | Consistent styling, accessible, non-blocking. |
| Card layout with hover effects | Custom div + CSS | shadcn/ui `<Card>` | Already installed, consistent design tokens. |

**Key insight:** Everything needed for Phase 9 is either already installed or is a standard shadcn/ui component. No new npm packages are required.

## Common Pitfalls

### Pitfall 1: App Shell Breaking Existing Create Page Flow

**What goes wrong:** Moving `/create` into `(app)/create` changes the layout wrapping, and the create page's per-page header (which includes `<UserMenu>`) creates a double header (one from app shell, one from create page).
**Why it happens:** The current `create-page-client.tsx` has its own `<header>` with logo link and `<UserMenu>`. The `templates/page.tsx` has the same pattern.
**How to avoid:** When moving pages into the `(app)` route group, REMOVE the per-page header blocks from `create-page-client.tsx` and `templates/page.tsx`. The app shell's `<AppHeader>` provides the logo and user menu.
**Warning signs:** Double headers visible. User menu appears twice. Logo link appears in both sidebar area and content area.

### Pitfall 2: Clip Code Round-Trip Integrity

**What goes wrong:** The saved clip's `code` (transformed JS) and `rawCode` (original JSX) get out of sync when the user has been editing in Monaco. The editor state diverges from the last generation.
**Why it happens:** The create page has three code states: `lastGeneration.rawCode` (from Claude), `editedCode` (user edits in Monaco), and `previewCode` (validated/transformed). The "Save" action must capture the RIGHT version.
**How to avoid:** Save should capture `editorCode` (which is `editedCode ?? lastGeneration?.rawCode`) as the rawCode, and `previewCode` (which is `validation.transformedCode ?? lastGeneration?.code`) as the code. This matches what the user sees in the editor and preview.
**Warning signs:** Saved clip opens with code that doesn't match what was visible when saved. Preview shows something different after open.

### Pitfall 3: Convex Authentication Pattern Inconsistency

**What goes wrong:** Clips mutations use `ctx.auth.getUserIdentity()` but get null because the user is authenticated via Clerk but the Convex token hasn't refreshed.
**Why it happens:** Convex uses JWT tokens from Clerk. If there's a race condition during initial page load, the identity may not be available yet.
**How to avoid:** Follow the EXACT same auth pattern as existing `generations.ts` and `renders.ts`: check identity at the top of every mutation/query, throw if null. On the client side, wrap clip operations in `<Authenticated>` from `convex/react`.
**Warning signs:** "Not authenticated" errors on first page load that resolve after a moment.

### Pitfall 4: Library Page Performance with Many Clips

**What goes wrong:** The library page loads all 50 clips and renders 50 `<Thumbnail>` components simultaneously. Each thumbnail executes the clip's code via `DynamicCode`, causing the page to freeze.
**Why it happens:** Each `<Thumbnail>` calls `executeCode()` which creates a `new Function()` and executes it. 50 concurrent executions overwhelm the main thread.
**How to avoid:** Limit initial render to visible clips (use CSS grid and let thumbnails load lazily with an IntersectionObserver wrapper). Start with a take(20) limit on the query. Consider pagination for users with many clips.
**Warning signs:** Library page takes 3+ seconds to become interactive. Scrolling through library is janky.

### Pitfall 5: Opening a Clip Loses Create Page State

**What goes wrong:** User is working on the create page, navigates to library, clicks "Open" on a clip, and loses their current in-progress work.
**Why it happens:** The create page stores all state in `useState`. Navigation destroys it. Loading a clip sets new state.
**How to avoid:** Show a confirmation dialog when navigating away from create page with unsaved changes. Use `beforeunload` event and/or a Router guard. When opening a clip, navigate to `/create?clipId=xxx` so the create page loads the clip's data.
**Warning signs:** Users complain about losing work. No "unsaved changes" warning.

## Code Examples

### Convex Schema Addition for Clips

```typescript
// Source: Matches existing schema.ts pattern and ARCHITECTURE.md design
// In convex/schema.ts, add to the defineSchema:

clips: defineTable({
  userId: v.string(),
  name: v.string(),
  code: v.string(),           // Transformed JS (for execution)
  rawCode: v.string(),        // Original JSX (for editor display)
  durationInFrames: v.number(),
  fps: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_updated", ["userId", "updatedAt"]),
```

### App Shell Layout (Server Component wrapping Client Sidebar)

```typescript
// src/app/(app)/layout.tsx
// This is a Server Component. Sidebar is a Client Component (uses usePathname).

import { Sidebar } from "@/components/shell/sidebar";
import { AppHeader } from "@/components/shell/app-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col">
      <AppHeader />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### AppHeader (replaces per-page headers)

```typescript
// src/components/shell/app-header.tsx
"use client";

import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";

export function AppHeader() {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b bg-background">
      <Link href="/" className="text-xl font-bold">
        RemotionLab
      </Link>
      <UserMenu />
    </header>
  );
}
```

### Clip Card Component

```typescript
// src/components/library/clip-card.tsx
"use client";

import { useState } from "react";
import { Thumbnail } from "@remotion/player";
import { DynamicCode } from "@/remotion/compositions/DynamicCode";
import { Card, CardContent } from "@/components/ui/card";
import type { Doc } from "../../convex/_generated/dataModel";

interface ClipCardProps {
  clip: Doc<"clips">;
  onOpen: (clipId: string) => void;
  onDelete: (clipId: string) => void;
}

export function ClipCard({ clip, onOpen, onDelete }: ClipCardProps) {
  const [isMounted, setIsMounted] = useState(false);

  // SSR guard for Thumbnail (uses browser APIs)
  useEffect(() => setIsMounted(true), []);

  return (
    <Card
      className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
      onClick={() => onOpen(clip._id)}
    >
      <CardContent className="p-0">
        {/* Thumbnail preview */}
        <div className="aspect-video rounded-t-xl overflow-hidden bg-black">
          {isMounted && clip.code && (
            <Thumbnail
              component={DynamicCode}
              inputProps={{
                code: clip.code,
                durationInFrames: clip.durationInFrames,
                fps: clip.fps,
              }}
              compositionWidth={1920}
              compositionHeight={1080}
              frameToDisplay={Math.floor(clip.durationInFrames / 2)}
              durationInFrames={clip.durationInFrames}
              fps={clip.fps}
              style={{ width: "100%" }}
            />
          )}
        </div>

        {/* Clip info */}
        <div className="p-3">
          <p className="font-medium text-sm truncate">{clip.name}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {(clip.durationInFrames / clip.fps).toFixed(1)}s
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Save Clip Dialog

```typescript
// src/components/library/save-clip-dialog.tsx
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SaveClipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rawCode: string;
  code: string;
  durationInFrames: number;
  fps: number;
  defaultName: string;
}

export function SaveClipDialog({
  open, onOpenChange, rawCode, code, durationInFrames, fps, defaultName,
}: SaveClipDialogProps) {
  const [name, setName] = useState(defaultName);
  const [isSaving, setIsSaving] = useState(false);
  const saveClip = useMutation(api.clips.save);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await saveClip({ name: name.trim(), code, rawCode, durationInFrames, fps });
      toast.success("Clip saved!");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save clip");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Clip</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <label className="text-sm font-medium">Clip Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="My Animation"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Opening a Clip from Library

```typescript
// In the library page, when a clip is clicked:
import { useRouter } from "next/navigation";

const router = useRouter();

function handleOpenClip(clipId: string) {
  router.push(`/create?clipId=${clipId}`);
}

// In create-page-client.tsx, read clipId from URL params and load:
// The server component (page.tsx) reads searchParams.clipId
// Then passes it to CreatePageClient
// On mount, CreatePageClient uses useQuery(api.clips.get, { id: clipId })
// to fetch the clip and populate lastGeneration state.
```

## State of the Art

| Old Approach (current) | New Approach (Phase 9) | Impact |
|------------------------|------------------------|--------|
| Per-page headers with logo + UserMenu | Shared `<AppHeader>` in app shell layout | Eliminates duplicate code, provides consistent navigation |
| No persistent navigation | Sidebar with active state highlighting | Users can navigate between Create, Library, Templates without losing context |
| Ephemeral generation state (lost on navigate) | Saved clips in Convex | Users can save and revisit work |
| No clip concept | Clips table with CRUD | Foundation for Phase 10 movies (clips are building blocks of movies) |

**Existing patterns that carry forward unchanged:**
- `DynamicCode` composition works as-is for `<Thumbnail>` (same `component` prop pattern as `<Player>`)
- `executeCode()` works as-is for clip thumbnails
- Convex auth pattern (`ctx.auth.getUserIdentity()`) is identical across all tables
- `<Providers>` in root layout wraps everything -- no change needed

## Open Questions

1. **Should "Save" create a new clip every time, or support overwriting?**
   - Recommendation: Always create a new clip (immutable saves). "Save" = new document. This avoids complexity of dirty state tracking and is safer for future movie references. The milestone ARCHITECTURE.md recommends this approach.
   - Risk if ignored: If clips are mutable and referenced by movies, editing a clip changes all movies using it.

2. **How should the create page load a clip from the library?**
   - Recommendation: URL search params (`/create?clipId=xxx`). The server component reads `clipId`, client component fetches clip data and populates state.
   - Alternative: React context or global store. But URL params are simpler, shareable, and work with browser back/forward.

3. **Should the landing page (`/`) also get the sidebar?**
   - Recommendation: No. The landing page is a marketing/hero page for unauthenticated users. Keep it outside the `(app)` route group. Authenticated users navigating to `/` see the landing page without sidebar, but can click "Start Creating" to enter the app shell at `/create`.

4. **What happens to existing `/create` and `/templates` routes when moved to `(app)/`?**
   - The URLs remain `/create` and `/templates` (route groups don't affect URLs). No external links break. The only change is the layout wrapper (sidebar appears).

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/app/layout.tsx`, `src/app/create/create-page-client.tsx`, `src/app/templates/page.tsx`, `convex/schema.ts`, `convex/generations.ts`, `convex/renders.ts` -- read in full
- Milestone research: `.planning/research/ARCHITECTURE.md`, `.planning/research/STACK.md`, `.planning/research/PITFALLS.md`, `.planning/research/FEATURES.md` -- read in full
- [Remotion Thumbnail docs](https://www.remotion.dev/docs/player/thumbnail) -- verified via WebSearch
- [Next.js Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) -- verified via WebSearch
- [Next.js Layouts and Pages](https://nextjs.org/docs/app/getting-started/layouts-and-pages) -- verified via WebSearch

### Secondary (MEDIUM confidence)
- [Convex Mutations](https://docs.convex.dev/functions/mutation-functions) -- follows existing codebase patterns exactly
- [Convex Best Practices](https://docs.convex.dev/understanding/best-practices/) -- array size limits, indexing

### Tertiary (LOW confidence)
- None -- all findings verified against codebase and official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new packages needed, all patterns verified against existing codebase
- Architecture: HIGH -- route groups and nested layouts are documented Next.js patterns; Convex schema follows existing tables
- Pitfalls: HIGH -- identified from real codebase analysis (per-page headers, code state management, Thumbnail performance)
- Code examples: HIGH -- based on existing codebase patterns (auth, schema, Player) and official Remotion Thumbnail docs

**Research date:** 2026-01-30
**Valid until:** 2026-03-01 (stable -- no fast-moving dependencies)
