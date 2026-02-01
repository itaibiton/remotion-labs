# Phase 16: Per-Creation Actions - Research

**Researched:** 2026-02-01
**Domain:** Feed row action UI, Convex CRUD mutations, React component architecture
**Confidence:** HIGH

## Summary

Phase 16 adds an action bar/overlay to each generation in the feed, providing save, delete, rerun, extend-next, and extend-previous capabilities directly from the feed. This is primarily a frontend UI + light backend phase, not a deep library integration challenge.

The codebase already has almost all backend pieces in place: `clips.save` mutation, `generateAnimation.generate` / `generateVariations` / `generateContinuation` actions, and the feed components (`GenerationRow`, `VariationGrid`). The main gaps are: (1) no `generations.remove` mutation exists, (2) no DropdownMenu UI component exists (only Dialog and AlertDialog), (3) the current `GenerationRow` is a single `<button>` element with no nested action buttons, and (4) the continuation action currently requires a `sourceClipId` (clips table), not a generation ID (generations table) -- this is a critical architectural decision.

**Primary recommendation:** Add a DropdownMenu (via `@radix-ui/react-dropdown-menu` following existing shadcn/ui patterns) as the action trigger on each row, with inline icon buttons for primary actions. Create a `generations.remove` mutation on the backend. For extend-next, save to clips first then navigate to `/create?sourceClipId=X`, matching the existing continuation flow. For extend-previous, just wire the button as a placeholder (Phase 17 builds prequel generation).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@radix-ui/react-dropdown-menu` | ^2.1.16 | Action menu for each generation row | Already used pattern in codebase (Dialog, AlertDialog are Radix); shadcn/ui standard |
| `lucide-react` | ^0.563.0 (installed) | Icon set for action buttons | Already used throughout the project |
| `convex` | ^1.31.6 (installed) | Backend mutations for delete/rerun | Already the backend framework |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@radix-ui/react-tooltip` | ^1.1.8 | Tooltips on icon-only action buttons | Optional -- can use `title` attribute initially |
| `sonner` | ^2.0.7 (installed) | Toast notifications for action feedback | Already used throughout for success/error toasts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DropdownMenu | Inline button row always visible | Dropdown is cleaner for 5+ actions, avoids cluttering compact rows |
| DropdownMenu | Right-click context menu | Less discoverable, not mobile-friendly |

**Installation:**
```bash
npm install @radix-ui/react-dropdown-menu
```

Then create `src/components/ui/dropdown-menu.tsx` following the same shadcn/ui pattern as the existing `dialog.tsx` and `alert-dialog.tsx`.

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    generation/
      generation-row.tsx          # Modified: add action trigger
      generation-row-actions.tsx  # NEW: action bar/dropdown component
      variation-grid.tsx          # Modified: add action trigger per variation
    ui/
      dropdown-menu.tsx           # NEW: shadcn/ui DropdownMenu wrapper
convex/
  generations.ts                  # Modified: add remove mutation
```

### Pattern 1: Action Bar as Separate Component
**What:** Extract the action logic into a dedicated `GenerationRowActions` component that receives the generation data and action callbacks.
**When to use:** Always -- keeps `GenerationRow` focused on display, actions on behavior.
**Example:**
```typescript
interface GenerationRowActionsProps {
  generation: Generation;
  onSave: (generation: Generation) => void;
  onDelete: (generationId: string) => void;
  onRerun: (generation: Generation) => void;
  onExtendNext: (generation: Generation) => void;
  onExtendPrevious: (generation: Generation) => void;
}

function GenerationRowActions({ generation, ...callbacks }: GenerationRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => callbacks.onSave(generation)}>
          <Save className="h-4 w-4 mr-2" />
          Save to Library
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => callbacks.onExtendNext(generation)}>
          <FastForward className="h-4 w-4 mr-2" />
          Extend Next
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => callbacks.onExtendPrevious(generation)}>
          <Rewind className="h-4 w-4 mr-2" />
          Extend Previous
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => callbacks.onRerun(generation)}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Rerun
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => callbacks.onDelete(generation._id)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Pattern 2: Row Layout Change from Button to Div
**What:** The current `GenerationRow` wraps everything in a `<button>` element. This prevents nesting interactive elements (dropdown buttons) inside. Must change to a `<div>` with `onClick` on the main content area, leaving room for the action trigger.
**When to use:** Required -- HTML spec forbids `<button>` inside `<button>`.
**Example:**
```typescript
// BEFORE (current):
<button className="w-full flex flex-row..." onClick={() => onSelect(generation)}>
  {/* thumbnail + metadata */}
</button>

// AFTER (needed):
<div className="w-full flex flex-row... group">
  <div className="flex-1 flex flex-row cursor-pointer" onClick={() => onSelect(generation)}>
    {/* thumbnail + metadata */}
  </div>
  <div className="flex-shrink-0 flex items-center px-2">
    <GenerationRowActions generation={generation} {...actionCallbacks} />
  </div>
</div>
```

### Pattern 3: Extend-Next via Save-Then-Navigate
**What:** The existing continuation flow (`generateContinuation`) requires a `sourceClipId` (clips table ID), not a generation ID. To "extend next" from a feed row, the generation must first be saved as a clip, then the user navigated to `/create?sourceClipId=<clipId>`.
**When to use:** For extend-next action from the feed.
**Flow:**
1. User clicks "Extend Next" on a generation row
2. System saves the generation as a clip (auto-naming from prompt) via `clips.save` mutation
3. System navigates to `/create?sourceClipId=<newClipId>`
4. Existing continuation flow takes over

**Why not add a `generateContinuationFromGeneration` action?** The existing `generateContinuation` action fetches `rawCode` via `clips.getInternal`. Adding a parallel path for generations would duplicate logic. The save-then-navigate approach reuses existing infrastructure with zero backend changes.

### Pattern 4: Rerun = New Generation with Same Params
**What:** "Rerun" creates a new generation using the same prompt and settings as the original. It does NOT modify the original generation.
**When to use:** For the rerun action.
**Implementation:** Extract prompt, aspectRatio, durationInSeconds, fps, variationCount from the generation, then call the same `generate` or `generateVariations` action.

### Pattern 5: Delete with Confirmation
**What:** Delete shows an AlertDialog confirmation (matching existing clip delete pattern in `ClipCard`), then calls a new `generations.remove` mutation.
**When to use:** For delete action -- destructive actions always need confirmation.

### Anti-Patterns to Avoid
- **Nesting buttons inside buttons:** HTML spec violation. GenerationRow must be restructured from `<button>` to `<div>` with separate clickable areas.
- **Inline action state in feed rows:** Don't put action-specific state (isSaving, isDeleting) in the feed component. Keep it in the action component or lift to parent as needed.
- **Calling actions directly from dropdown items without event.stopPropagation:** Dropdown menu items click would bubble to the row's onClick, selecting the generation AND triggering the action. Must use `e.stopPropagation()` or structure the DOM to avoid this.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Action dropdown menu | Custom div with show/hide state | `@radix-ui/react-dropdown-menu` via shadcn/ui | Focus management, keyboard nav, outside-click dismissal, portal rendering, collision avoidance |
| Delete confirmation dialog | Custom modal or `window.confirm()` | Existing `AlertDialog` component | Already in the project, accessible, themed |
| Toast notifications for action results | Custom notification system | `sonner` (already installed and used) | Consistent with rest of app |
| Clip saving | Custom save flow | Existing `SaveClipDialog` or `clips.save` mutation directly | Already built and tested |

**Key insight:** Every backend operation needed for this phase already exists except `generations.remove`. The phase is 90% frontend component work.

## Common Pitfalls

### Pitfall 1: Button-inside-button HTML violation
**What goes wrong:** Placing action buttons (dropdown trigger, icon buttons) inside the existing `<button>` wrapper of GenerationRow causes invalid HTML and broken click behavior.
**Why it happens:** GenerationRow currently wraps the entire row in a `<button>` for the select-generation click handler.
**How to avoid:** Restructure GenerationRow to use a `<div>` wrapper with a separate clickable content area and an actions area side by side.
**Warning signs:** React hydration warnings about nested buttons; clicks on actions also selecting the generation.

### Pitfall 2: Dropdown menu click propagation
**What goes wrong:** Clicking a dropdown menu item triggers the parent row's onClick handler (selection), causing unintended side effects.
**Why it happens:** Event bubbling from DropdownMenuItem to the row container.
**How to avoid:** Either (a) place the dropdown trigger outside the clickable content area in the DOM, or (b) use `e.stopPropagation()` on the trigger button's click. Approach (a) is more robust.
**Warning signs:** Clicking "Delete" also selects the generation in the preview panel.

### Pitfall 3: Extend-next requiring a clip ID but generation not yet saved
**What goes wrong:** `generateContinuation` requires a `sourceClipId`, but a generation is not a clip. Attempting to use a generation ID as a clip ID will fail.
**Why it happens:** The continuation system was designed around the clips table.
**How to avoid:** Auto-save the generation as a clip first (with auto-generated name from prompt), then navigate with the new clip ID.
**Warning signs:** "Source clip not found" error when clicking Extend Next.

### Pitfall 4: Rerun not preserving all settings
**What goes wrong:** When rerunning a generation, forgetting to pass the same aspectRatio, durationInSeconds, fps, and variationCount results in a generation with default settings instead of matching the original.
**Why it happens:** Not all settings are stored on the generation record (variationCount is stored as variationCount on the record, but batchId-based generations need special handling).
**How to avoid:** Read all available settings from the generation record. For batch variations, detect via batchId/variationCount and call `generateVariations` instead of `generate`.
**Warning signs:** Rerunning a 9:16 5s generation produces a 16:9 3s generation.

### Pitfall 5: Delete not cleaning up related renders
**What goes wrong:** Deleting a generation leaves orphaned render records in the renders table that reference the deleted generation.
**Why it happens:** No cascading delete logic exists.
**How to avoid:** For now, the renders table references `generationId` as optional (`v.optional(v.id("generations"))`). Since generation deletion is a user-facing convenience action (not a data integrity concern), it's acceptable to delete just the generation. The render records have their own `outputUrl` and are independently useful. If needed later, add cleanup.
**Warning signs:** Render history showing entries for deleted generations (minor, not blocking).

## Code Examples

Verified patterns from the existing codebase:

### Convex Delete Mutation (following clips.remove pattern)
```typescript
// convex/generations.ts
export const remove = mutation({
  args: {
    id: v.id("generations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const generation = await ctx.db.get(args.id);
    if (!generation || generation.userId !== identity.tokenIdentifier) {
      throw new Error("Generation not found");
    }

    await ctx.db.delete(args.id);
  },
});
```

### Save Generation as Clip (reusing clips.save)
```typescript
// Client-side: auto-save generation as clip, then navigate
const saveClip = useMutation(api.clips.save);

async function handleExtendNext(generation: Generation) {
  if (!generation.code || !generation.rawCode) return;

  const clipId = await saveClip({
    name: generation.prompt.slice(0, 50) || "Untitled",
    code: generation.code,
    rawCode: generation.rawCode,
    durationInFrames: generation.durationInFrames ?? 90,
    fps: generation.fps ?? 30,
  });

  router.push(`/create?sourceClipId=${clipId}`);
}
```

### DropdownMenu with AlertDialog for Delete Confirmation
```typescript
// Important: AlertDialog must wrap DropdownMenu OR be at sibling level,
// not inside DropdownMenuContent (Radix portals conflict)
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

return (
  <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setShowDeleteConfirm(true)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete generation?</AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
);
```

### GenerationFeed Callback Threading
```typescript
// GenerationFeed must pass action callbacks down to rows
interface GenerationFeedProps {
  onSelectGeneration: (generation: any) => void;
  // NEW callbacks for per-row actions:
  onSaveToLibrary: (generation: any) => void;
  onDelete: (generationId: string) => void;
  onRerun: (generation: any) => void;
  onExtendNext: (generation: any) => void;
  onExtendPrevious: (generation: any) => void;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Individual @radix-ui packages | Unified `radix-ui` package available | 2025 | Either works; project uses individual packages already, keep consistent |
| `onClick` on DropdownMenuItem | `onSelect` on DropdownMenuItem | Radix convention | `onSelect` is the canonical Radix event; `onClick` works but `onSelect` handles keyboard activation too |

**Deprecated/outdated:**
- None relevant -- the Radix primitive API for dropdown-menu has been stable since v2.0.

## Open Questions

Things that couldn't be fully resolved:

1. **Should "Extend Next" auto-save or prompt for a name?**
   - What we know: The existing "Save as Clip" flow uses a dialog with name input. Auto-saving with the prompt as name is faster for extend-next UX.
   - What's unclear: Whether users expect to name the clip before extending.
   - Recommendation: Auto-save silently with prompt text as name (truncated to 50 chars). Show a toast "Saved as clip and opening continuation..." for transparency. This matches the Midjourney-style fast workflow.

2. **Should VariationGrid get per-variation actions or per-batch actions?**
   - What we know: VariationGrid shows 2-4 thumbnails for a batch. Each thumbnail is clickable to select that variation.
   - What's unclear: Whether actions should apply to individual variations (save V2 specifically) or the whole batch.
   - Recommendation: Per-variation actions. Each thumbnail in the grid should have its own action dropdown (or at minimum, a hover overlay with actions). The user typically wants to save/extend a specific variation, not all of them.

3. **Extend-previous button behavior before Phase 17**
   - What we know: Phase 17 builds prequel generation. Phase 16 adds the button.
   - What's unclear: Should the button be disabled, hidden, or show a "coming soon" tooltip?
   - Recommendation: Show the button as disabled with a tooltip "Coming soon" or simply don't render it until Phase 17. A disabled placeholder adds visual noise for no benefit. Better to add it in Phase 17 when the feature is ready.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `convex/generations.ts`, `convex/clips.ts`, `convex/generateAnimation.ts` - confirmed existing mutations and actions
- Codebase analysis: `src/components/generation/generation-row.tsx`, `generation-feed.tsx`, `variation-grid.tsx` - confirmed current component structure
- Codebase analysis: `src/components/library/clip-card.tsx` - confirmed existing delete-with-AlertDialog pattern
- Codebase analysis: `src/components/library/save-clip-dialog.tsx` - confirmed existing save-clip pattern
- Codebase analysis: `convex/schema.ts` - confirmed table schemas and fields available
- Codebase analysis: `package.json` - confirmed installed Radix packages and versions

### Secondary (MEDIUM confidence)
- [shadcn/ui Dropdown Menu docs](https://ui.shadcn.com/docs/components/dropdown-menu) - component API and installation
- [@radix-ui/react-dropdown-menu npm](https://www.npmjs.com/package/@radix-ui/react-dropdown-menu) - version 2.1.16 current
- [Convex Writing Data docs](https://docs.convex.dev/database/writing-data) - delete mutation patterns

### Tertiary (LOW confidence)
- None -- all findings verified against codebase or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use or standard Radix/shadcn additions
- Architecture: HIGH - patterns derived directly from existing codebase conventions (ClipCard, SaveClipDialog, etc.)
- Pitfalls: HIGH - identified from actual code inspection (button nesting, clip ID requirement, settings preservation)

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (stable domain, no fast-moving dependencies)
