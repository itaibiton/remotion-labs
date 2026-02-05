# Phase 26: Modal Content Layout - Research

**Researched:** 2026-02-05
**Domain:** Modal UI layout, detail panels, inline editing patterns
**Confidence:** HIGH

## Summary

Phase 26 implements the content layout within the creation detail modal established in Phase 25. The modal shell already exists with proper dismiss behaviors and responsive video sizing. This phase fills in the stub components: `CreationDetailPanel` (right sidebar with metadata and actions) and `CreationEditBar` (top textarea for inline refinement).

The codebase already has all necessary building blocks: the `PreviewPlayer` component handles all aspect ratios with the `constrained` prop, the action handlers exist in `create-page-client.tsx` (save, delete, rerun, extend next/prev), and the `refine` action in Convex handles prompt-based code refinement. The main work is composing these existing pieces into polished UI components.

**Primary recommendation:** Replace the two stub components with production implementations. `CreationDetailPanel` displays prompt, thumbnail, metadata, and action buttons using existing shadcn components. `CreationEditBar` provides a textarea + submit button that calls the existing `refine` action. No new libraries or patterns needed - this is pure UI composition using established codebase patterns.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | Component composition | Already installed |
| shadcn/ui components | latest | Button, Textarea, Card | Already installed, used throughout |
| lucide-react | latest | Icons | Already used for action icons |
| @remotion/player Thumbnail | latest | Static preview thumbnail | Already used in generation-row.tsx |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | 1.x | Toast notifications | Already used for action feedback |
| convex/react | latest | useMutation, useAction | Already used for data mutations |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Thumbnail component | Static image | Thumbnail provides live frame capture, more dynamic |
| Inline textarea | Popover/dialog | Inline is faster, no extra click to edit |

**Installation:**
```bash
# No new dependencies required - all libraries already installed
```

## Architecture Patterns

### Current Project Structure
```
src/components/creation/
├── creation-modal.tsx          # Modal container (Phase 25, complete)
├── creation-detail-panel.tsx   # STUB - Replace in this phase
├── creation-edit-bar.tsx       # STUB - Replace in this phase
└── variation-stack.tsx         # STUB - Phase 28 (leave as stub)
```

### Pattern 1: Detail Panel Layout
**What:** Right sidebar with stacked sections: prompt, thumbnail, metadata rows, action buttons
**When to use:** Information-dense sidebars in modals
**Example:**
```typescript
// Source: Established codebase pattern from generation-row.tsx, clip-card.tsx
<div className="p-4 space-y-4">
  {/* Prompt section */}
  <div className="space-y-2">
    <h4 className="text-xs font-medium uppercase text-muted-foreground">Prompt</h4>
    <p className="text-sm">{generation.prompt}</p>
  </div>

  {/* Thumbnail */}
  <div className="space-y-2">
    <h4 className="text-xs font-medium uppercase text-muted-foreground">Preview</h4>
    <div className="aspect-video rounded overflow-hidden">
      <Thumbnail component={...} {...props} />
    </div>
  </div>

  {/* Metadata grid */}
  <div className="grid grid-cols-2 gap-2 text-sm">
    <div>
      <span className="text-muted-foreground">Aspect Ratio</span>
      <p>{generation.aspectRatio}</p>
    </div>
    {/* More metadata... */}
  </div>

  {/* Action buttons */}
  <div className="space-y-2 pt-4 border-t">
    <Button variant="outline" size="sm" className="w-full justify-start">
      <Save className="h-4 w-4 mr-2" /> Save to Library
    </Button>
    {/* More actions... */}
  </div>
</div>
```

### Pattern 2: Edit Bar with Submit
**What:** Textarea with inline submit button, similar to InputBar but simpler
**When to use:** Inline refinement prompts
**Example:**
```typescript
// Source: Adapted from InputBar pattern (input-bar.tsx)
const [prompt, setPrompt] = useState("");
const [isRefining, setIsRefining] = useState(false);

const handleSubmit = async () => {
  if (!prompt.trim() || isRefining) return;
  setIsRefining(true);
  try {
    await onRefine(prompt.trim());
    setPrompt("");
  } finally {
    setIsRefining(false);
  }
};

<div className="flex gap-2">
  <Textarea
    value={prompt}
    onChange={(e) => setPrompt(e.target.value)}
    placeholder="Describe changes..."
    className="min-h-[60px] resize-none"
    onKeyDown={(e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    }}
  />
  <Button onClick={handleSubmit} disabled={!prompt.trim() || isRefining}>
    {isRefining ? <Loader2 className="animate-spin" /> : "Send"}
  </Button>
</div>
```

### Pattern 3: Action Callbacks from Parent
**What:** Modal passes action handlers down to detail panel, panel calls them
**When to use:** When actions require router access or mutations owned by parent
**Example:**
```typescript
// Source: Pattern from GenerationFeed -> GenerationRow -> GenerationRowActions
interface CreationDetailPanelProps {
  generation: Generation;
  onSave: () => void;
  onDelete: () => void;
  onRerun: () => void;
  onExtendNext: () => void;
  onExtendPrevious: () => void;
}

// Parent (CreationModal) provides handlers:
<CreationDetailPanel
  generation={generation}
  onSave={() => handleSaveGeneration(generation)}
  onDelete={() => handleDeleteGeneration(generation)}
  // ...
/>
```

### Anti-Patterns to Avoid

- **Duplicating action logic:** Don't re-implement save/delete/rerun logic. Lift handlers from create-page-client.tsx or call mutations directly.
- **Hardcoding metadata display:** Use the generation object properties dynamically; don't assume fields exist (optional chaining).
- **Blocking the modal on refinement:** Let refinement happen optimistically; don't close modal or show full-screen loader.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Thumbnail preview | Manual canvas capture | `@remotion/player` Thumbnail component | Already used, handles all edge cases |
| Date formatting | Custom date logic | `formatRelativeTime` from generation-row.tsx | Already implements "2h ago" etc. |
| Toast feedback | console.log | sonner `toast.success/error` | Consistent with rest of app |
| Loading states | Custom spinner | Loader2 from lucide-react | Consistent with rest of app |

**Key insight:** The codebase has well-established patterns for every piece of this UI. Research reveals no gaps - this phase is pure composition.

## Common Pitfalls

### Pitfall 1: Delete Without Confirmation
**What goes wrong:** User accidentally deletes generation, loses work
**Why it happens:** Destructive action without confirmation step
**How to avoid:** Use AlertDialog pattern from GenerationRowActions - show confirmation before delete
**Warning signs:** Missing AlertDialog import, direct mutation call on button click

### Pitfall 2: Textarea Stealing Arrow Key Focus
**What goes wrong:** Arrow keys navigate modal instead of moving cursor in textarea
**Why it happens:** Modal's global keydown handler captures events
**How to avoid:** The modal already guards for this (checks `activeElement instanceof HTMLTextAreaElement`). Ensure textarea is standard HTML textarea.
**Warning signs:** Can't navigate cursor with arrow keys while typing

### Pitfall 3: Stale Generation Data After Refinement
**What goes wrong:** Detail panel shows old prompt/metadata after inline refinement
**Why it happens:** Refinement creates new generation (Phase 27), but modal still shows parent
**How to avoid:** For Phase 26, refinement modifies existing generation in-place (per Phase 26 scope). Actual variation threading is Phase 27/28.
**Warning signs:** Data doesn't update after successful refine call

### Pitfall 4: Missing Disabled States on Actions
**What goes wrong:** User clicks "Save" on failed/pending generation, gets error
**Why it happens:** Actions enabled regardless of generation status
**How to avoid:** Check `generation.status === "success"` and `generation.code` before enabling actions
**Warning signs:** Buttons don't have `disabled` prop based on status

### Pitfall 5: Oversized Thumbnail
**What goes wrong:** Thumbnail fills entire panel, pushes other content below fold
**Why it happens:** Thumbnail container has no size constraints
**How to avoid:** Use fixed aspect ratio container with max-width, e.g., `w-full max-w-[200px]`
**Warning signs:** Need to scroll to see action buttons

## Code Examples

Verified patterns from the existing codebase:

### Thumbnail Component Usage
```typescript
// Source: src/components/generation/generation-row.tsx
import { Thumbnail } from "@remotion/player";
import { DynamicCode } from "@/remotion/compositions/DynamicCode";
import { ASPECT_RATIO_PRESETS, type AspectRatioKey } from "@/lib/aspect-ratios";

const preset = ASPECT_RATIO_PRESETS[aspectRatioKey] ?? ASPECT_RATIO_PRESETS["16:9"];

<Thumbnail
  component={DynamicCode as any}
  inputProps={{ code, durationInFrames, fps }}
  durationInFrames={durationInFrames}
  fps={fps}
  compositionWidth={preset.width}
  compositionHeight={preset.height}
  frameToDisplay={0}
  style={{ width: "100%", height: "100%" }}
/>
```

### formatRelativeTime Utility
```typescript
// Source: src/components/generation/generation-row.tsx (lines 43-58)
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return new Date(timestamp).toLocaleDateString();
  }
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}
```

### Action Button with Confirmation
```typescript
// Source: src/components/generation/generation-row-actions.tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel, ... } from "@/components/ui/alert-dialog";

const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

<Button variant="outline" onClick={() => setShowDeleteConfirm(true)}>
  <Trash2 className="h-4 w-4" /> Delete
</Button>

<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete generation?</AlertDialogTitle>
      <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction variant="destructive" onClick={() => onDelete()}>
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Refine Action Call
```typescript
// Source: src/app/(app)/create/create-page-client.tsx (handleRefine)
const refine = useAction(api.generateAnimation.refine);

const handleRefine = async (prompt: string) => {
  const result = await refine({
    currentCode: generation.rawCode,
    refinementPrompt: prompt,
    conversationHistory: [], // or previous messages
  });
  // result contains: rawCode, code, durationInFrames, fps
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Modal with state-controlled content | URL-controlled modal via intercepting routes | Phase 24/25 | Bookmarkable URLs, proper navigation |
| Separate detail page | Modal overlay with sidebar visible | Phase 25 | Faster context switching |
| Manual thumbnail capture | Remotion Thumbnail component | Established | Consistent frame rendering |

**Current in this project:**
- Modal shell complete (Phase 25)
- PreviewPlayer handles all aspect ratios with `constrained` prop
- Action handlers exist and are tested
- Stub components in place, ready for replacement

## Open Questions

1. **Refinement Data Flow in Phase 26 vs Phase 27**
   - What we know: Phase 26 scope is "inline refinement" - textarea submits, refinement happens
   - What's unclear: Should refinement update the current generation in-place, or create a new one?
   - Recommendation: For Phase 26, call refine action but don't save result to DB. Show refined preview in modal. Phase 27 handles actual variation threading with parentId linkage.

2. **Action Handlers Location**
   - What we know: `create-page-client.tsx` has all action handlers (save, delete, rerun, extend)
   - What's unclear: Should modal import these handlers or duplicate logic?
   - Recommendation: Pass handlers as props from the modal's parent (the intercepting route page). For delete/rerun that navigate away, close modal first.

3. **Thumbnail vs Live Preview in Detail Panel**
   - What we know: Detail panel shows "thumbnail" per spec
   - What's unclear: Should it be static Thumbnail or small PreviewPlayer?
   - Recommendation: Use static Thumbnail for performance. Live preview is in the main content area.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/components/creation/creation-modal.tsx` - Modal shell layout
- Existing codebase: `src/components/generation/generation-row.tsx` - Thumbnail usage, formatRelativeTime
- Existing codebase: `src/components/generation/generation-row-actions.tsx` - Action button patterns
- Existing codebase: `src/app/(app)/create/create-page-client.tsx` - Action handler implementations
- Existing codebase: `src/components/generation/input-bar.tsx` - Textarea + submit pattern
- Existing codebase: `convex/generateAnimation.ts` - Refine action API

### Secondary (MEDIUM confidence)
- shadcn/ui documentation - Component APIs for Button, Textarea, AlertDialog
- Remotion documentation - Thumbnail component props

### Tertiary (LOW confidence)
- None - all patterns verified in codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, all libraries in use
- Architecture: HIGH - Patterns established in codebase, just composing
- Pitfalls: HIGH - Common issues identified from existing implementations

**Research date:** 2026-02-05
**Valid until:** 60 days (stable patterns, UI composition only)

---

## Implementation Summary

### Files to Modify

1. **`src/components/creation/creation-detail-panel.tsx`**
   - Replace stub with full implementation
   - Sections: Prompt, Thumbnail, Metadata (aspect ratio, duration, FPS, timestamp), Action buttons
   - Props: generation, onSave, onDelete, onRerun, onExtendNext, onExtendPrevious

2. **`src/components/creation/creation-edit-bar.tsx`**
   - Replace stub with full implementation
   - Textarea + Submit button
   - Props: generationId, initialPrompt, onRefine
   - Calls refine action, shows loading state

3. **`src/components/creation/creation-modal.tsx`**
   - Wire up action handlers to detail panel
   - Wire up refine callback to edit bar
   - Handle refinement result (update local state or navigate to new generation)

### Reusable Code to Extract (Optional)

- `formatRelativeTime` is duplicated in generation-row.tsx and variation-grid.tsx
- Consider extracting to `src/lib/date-utils.ts` for reuse in detail panel

### No Changes Needed

- `variation-stack.tsx` - Remains stub until Phase 28
- `preview-player.tsx` - Already supports constrained mode
- Convex actions/mutations - All APIs exist
