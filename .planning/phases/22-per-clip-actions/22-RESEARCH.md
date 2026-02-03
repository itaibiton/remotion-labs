# Phase 22: Per-Clip Actions - Research

**Researched:** 2026-02-03
**Domain:** Timeline clip action buttons, generation workflow integration, React component composition (Next.js + Convex + Remotion)
**Confidence:** HIGH

## Summary

Phase 22 adds contextual action buttons to timeline clips on the movie page, enabling users to generate continuations, prequels, and regenerations directly from any clip without leaving the movie editing context. The actions are: "Generate Next", "Generate Previous", "Re-generate", and "Edit". This builds on existing proven infrastructure:

1. **Generation actions already exist:** `generateContinuation` and `generatePrequel` actions in Convex accept a `sourceClipId` and work with the clips table. The create page already uses these successfully.
2. **Per-creation actions pattern exists:** The `GenerationRowActions` component on the create page feed already implements a dropdown menu with Save, Extend Next, Extend Previous, Rerun, and Delete actions.
3. **Timeline scene component exists:** `TimelineScene` already shows hover actions (remove button, generate next button), demonstrating the pattern for clip-level actions.

The key challenge is integrating generation workflows into the movie context:
- **Generate Next/Previous:** Use existing Convex actions, but add the result to the movie automatically (not just as a new clip)
- **Re-generate:** Generate fresh code for the same scene, update the underlying clip
- **Edit:** Open an inline edit panel (side panel or modal) for code editing without full-page navigation

**Primary recommendation:** Extend `TimelineScene` with a dropdown menu (using existing `DropdownMenu` component) that appears on hover/selection. Wire actions to existing Convex actions, with movie-specific wrappers in `MovieEditor` that both generate and insert into the movie. For the edit panel, use a side panel (Sheet component) that slides in from the right, containing a code editor and preview.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Convex actions (installed) | - | generateContinuation, generatePrequel | Already proven; returns code/rawCode for clip creation |
| Convex mutations (installed) | - | clips.save, movies.addScene, movies.insertScene (new) | Existing patterns for persistence |
| @radix-ui/react-dropdown-menu | via shadcn (installed) | Action menu on clips | Already used in GenerationRowActions |
| @radix-ui/react-dialog | via shadcn (installed) | Sheet/side panel for edit | Already installed for dialogs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.563.0 (installed) | Icons for action buttons | FastForward, Rewind, RotateCcw, Pencil |
| sonner | (installed) | Toast notifications | Feedback on generation start/complete/error |
| framer-motion | (installed) | Optional loading states | Pending generation animation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dropdown menu | Inline button row | Dropdown is cleaner for 4+ actions; button row clutters small clips |
| Sheet (side panel) | Full-page navigation | Side panel keeps context; user sees both timeline and edit area |
| Modal dialog for edit | Sheet | Modal is more blocking; sheet allows seeing movie context |
| Action buttons always visible | Hover-reveal | Always visible clutters UI; hover is industry standard for NLE |

**Installation:**
```bash
# No new dependencies required
# Sheet component may need to be generated if not present
npx shadcn-ui@latest add sheet
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── movie/
│   │   ├── movie-editor.tsx          # MODIFIED - add generation handlers, edit panel state
│   │   ├── timeline.tsx              # MODIFIED - pass action handlers to scenes
│   │   ├── timeline-scene.tsx        # MODIFIED - add DropdownMenu with actions
│   │   ├── timeline-scene-actions.tsx # NEW - dropdown menu component (extracted)
│   │   ├── scene-edit-panel.tsx      # NEW - side panel with code editor + preview
│   │   └── ...
│   └── ui/
│       ├── dropdown-menu.tsx         # EXISTING
│       ├── sheet.tsx                 # EXISTING or ADD via shadcn
│       └── ...
├── hooks/
│   └── use-scene-generation.ts       # NEW (optional) - encapsulate generation + insert logic
└── ...
convex/
├── generateAnimation.ts              # EXISTING - continuation/prequel actions
├── clips.ts                          # EXISTING - save mutation
├── movies.ts                         # MODIFIED - add insertScene mutation
└── ...
```

### Pattern 1: Timeline Scene Action Dropdown
**What:** A dropdown menu triggered by a button (three-dot icon or similar) on each timeline clip, containing the four actions.
**When to use:** On every timeline clip.
**Example:**
```typescript
// timeline-scene-actions.tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, FastForward, Rewind, RotateCcw, Pencil } from "lucide-react";

interface TimelineSceneActionsProps {
  clipId: string;
  sceneIndex: number;
  onGenerateNext: (sceneIndex: number) => void;
  onGeneratePrevious: (sceneIndex: number) => void;
  onRegenerate: (sceneIndex: number) => void;
  onEdit: (sceneIndex: number) => void;
  disabled?: boolean;
}

export function TimelineSceneActions({
  clipId,
  sceneIndex,
  onGenerateNext,
  onGeneratePrevious,
  onRegenerate,
  onEdit,
  disabled,
}: TimelineSceneActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          disabled={disabled}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onGenerateNext(sceneIndex)}>
          <FastForward className="h-4 w-4 mr-2" />
          Generate Next
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onGeneratePrevious(sceneIndex)}>
          <Rewind className="h-4 w-4 mr-2" />
          Generate Previous
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onRegenerate(sceneIndex)}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Re-generate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onEdit(sceneIndex)}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Pattern 2: Generate and Insert Workflow
**What:** When "Generate Next" is clicked, the workflow: (1) calls `generateContinuation` action, (2) saves result as new clip, (3) inserts new scene into movie after the source scene.
**When to use:** For "Generate Next" and "Generate Previous" actions.
**Example:**
```typescript
// In movie-editor.tsx

const continuationAction = useAction(api.generateAnimation.generateContinuation);
const prequelAction = useAction(api.generateAnimation.generatePrequel);
const saveClip = useMutation(api.clips.save);
const insertScene = useMutation(api.movies.insertScene); // NEW mutation

const handleGenerateNext = useCallback(async (sceneIndex: number) => {
  const scene = movie?.scenes[sceneIndex];
  if (!scene) return;

  try {
    toast.loading("Generating continuation...", { id: "gen-next" });

    // 1. Generate continuation code
    const result = await continuationAction({
      sourceClipId: scene.clipId,
      prompt: undefined, // Auto-continue
    });

    // 2. Save as new clip
    const newClipId = await saveClip({
      name: `Continuation of Scene ${sceneIndex + 1}`,
      code: result.code,
      rawCode: result.rawCode,
      durationInFrames: result.durationInFrames,
      fps: result.fps,
    });

    // 3. Insert into movie after source scene
    await insertScene({
      movieId: movie!._id,
      clipId: newClipId,
      afterIndex: sceneIndex, // Insert after this scene
    });

    toast.success("Continuation added to movie!", { id: "gen-next" });
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Failed to generate", { id: "gen-next" });
  }
}, [movie, continuationAction, saveClip, insertScene]);

const handleGeneratePrevious = useCallback(async (sceneIndex: number) => {
  const scene = movie?.scenes[sceneIndex];
  if (!scene) return;

  try {
    toast.loading("Generating prequel...", { id: "gen-prev" });

    // 1. Generate prequel code
    const result = await prequelAction({
      sourceClipId: scene.clipId,
      prompt: undefined,
    });

    // 2. Save as new clip
    const newClipId = await saveClip({
      name: `Prequel to Scene ${sceneIndex + 1}`,
      code: result.code,
      rawCode: result.rawCode,
      durationInFrames: result.durationInFrames,
      fps: result.fps,
    });

    // 3. Insert into movie BEFORE source scene
    await insertScene({
      movieId: movie!._id,
      clipId: newClipId,
      beforeIndex: sceneIndex, // Insert before this scene
    });

    toast.success("Prequel added to movie!", { id: "gen-prev" });
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Failed to generate", { id: "gen-prev" });
  }
}, [movie, prequelAction, saveClip, insertScene]);
```

### Pattern 3: Insert Scene Mutation
**What:** New Convex mutation to insert a scene at a specific position (not just append).
**When to use:** For continuation/prequel insertion.
**Example:**
```typescript
// convex/movies.ts - NEW mutation

/**
 * Insert a scene at a specific position in the movie.
 * Use afterIndex to insert after a scene, or beforeIndex to insert before.
 */
export const insertScene = mutation({
  args: {
    movieId: v.id("movies"),
    clipId: v.id("clips"),
    afterIndex: v.optional(v.number()),  // Insert after this index
    beforeIndex: v.optional(v.number()), // Insert before this index
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const movie = await ctx.db.get(args.movieId);
    if (!movie || movie.userId !== identity.tokenIdentifier) {
      throw new Error("Movie not found");
    }

    const clip = await ctx.db.get(args.clipId);
    if (!clip) throw new Error("Clip not found");

    // Determine insertion index
    let insertAt: number;
    if (args.afterIndex !== undefined) {
      insertAt = args.afterIndex + 1;
    } else if (args.beforeIndex !== undefined) {
      insertAt = args.beforeIndex;
    } else {
      insertAt = movie.scenes.length; // Append by default
    }

    // Normalize duration if FPS differs
    const durationOverride =
      clip.fps !== movie.fps
        ? Math.round(clip.durationInFrames * (movie.fps / clip.fps))
        : undefined;

    const newScene = {
      clipId: args.clipId,
      ...(durationOverride !== undefined && { durationOverride }),
    };

    const newScenes = [
      ...movie.scenes.slice(0, insertAt),
      newScene,
      ...movie.scenes.slice(insertAt),
    ];

    const totalDuration = await computeTotalDuration(ctx, newScenes);

    await ctx.db.patch(args.movieId, {
      scenes: newScenes,
      totalDurationInFrames: totalDuration,
      updatedAt: Date.now(),
    });

    return { insertedAt: insertAt };
  },
});
```

### Pattern 4: Re-generate Action
**What:** Generate fresh code for the same prompt/context, update the underlying clip. The scene in the movie continues to reference the same clipId.
**When to use:** For "Re-generate" action.
**Example:**
```typescript
// In movie-editor.tsx

const generateAction = useAction(api.generateAnimation.generate);
const updateClip = useMutation(api.clips.update); // NEW mutation

const handleRegenerate = useCallback(async (sceneIndex: number) => {
  const scene = movie?.scenes[sceneIndex];
  const clip = scenesWithClips[sceneIndex]?.clip;
  if (!scene || !clip) return;

  try {
    toast.loading("Regenerating clip...", { id: "regen" });

    // Generate fresh code (could use refine with empty prompt, or full generate)
    // For now, use generate with clip name as prompt
    const result = await generateAction({
      prompt: clip.name || "Animation",
      // Keep same settings
    });

    // Update the existing clip with new code
    await updateClip({
      id: scene.clipId,
      code: result.code,
      rawCode: result.rawCode,
      durationInFrames: result.durationInFrames,
      fps: result.fps,
    });

    toast.success("Clip regenerated!", { id: "regen" });
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Failed to regenerate", { id: "regen" });
  }
}, [movie, scenesWithClips, generateAction, updateClip]);
```

### Pattern 5: Edit Side Panel (Sheet)
**What:** A side panel that slides in from the right, containing a code editor and live preview for the selected clip.
**When to use:** For "Edit" action.
**Example:**
```typescript
// scene-edit-panel.tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CodeDisplay } from "@/components/code-editor/code-display";
import { PreviewPlayer } from "@/components/preview/preview-player";
import { Button } from "@/components/ui/button";

interface SceneEditPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clip: {
    _id: string;
    name: string;
    code: string;
    rawCode: string;
    durationInFrames: number;
    fps: number;
  } | null;
  onSave: (clipId: string, code: string, rawCode: string) => void;
}

export function SceneEditPanel({
  open,
  onOpenChange,
  clip,
  onSave,
}: SceneEditPanelProps) {
  const [editedCode, setEditedCode] = useState(clip?.rawCode ?? "");
  const [isEditing, setIsEditing] = useState(false);

  // Reset when clip changes
  useEffect(() => {
    if (clip) {
      setEditedCode(clip.rawCode);
      setIsEditing(false);
    }
  }, [clip?._id]);

  // Validation hook for live preview
  const validation = useDebouncedValidation(editedCode, 500, !isEditing);
  const previewCode = validation.transformedCode ?? clip?.code ?? "";

  const handleSave = () => {
    if (clip && validation.isValid && validation.transformedCode) {
      onSave(clip._id, validation.transformedCode, editedCode);
      onOpenChange(false);
    }
  };

  if (!clip) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle>Edit: {clip.name}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4 mt-4 h-[calc(100%-80px)]">
          {/* Preview */}
          <div className="h-[200px]">
            <PreviewPlayer
              code={previewCode}
              durationInFrames={clip.durationInFrames}
              fps={clip.fps}
            />
          </div>

          {/* Code editor */}
          <div className="flex-1 min-h-0">
            <CodeDisplay
              code={editedCode}
              originalCode={clip.rawCode}
              isEditing={isEditing}
              onEditToggle={() => setIsEditing(!isEditing)}
              onChange={setEditedCode}
              errors={validation.errors}
              isValid={validation.isValid}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!validation.isValid}>
              Save Changes
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### Anti-Patterns to Avoid
- **Navigating away from movie page:** Keep the user in context. Side panel or modal, never full-page navigation for quick actions.
- **Generating without feedback:** Always show loading toast; generations take 5-15 seconds.
- **Generating without auto-adding to movie:** The whole point is movie-centric workflow. Result MUST be added to movie.
- **Blocking the UI during generation:** Use loading states, not blocking modals. User can continue viewing the timeline.
- **Complex state machines for simple flows:** Each action is a linear workflow; no need for state machine.
- **Mutating clips that don't belong to the scene:** Always use the scene's clipId, never a stale reference.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dropdown menu | Custom hover/click menu | @radix-ui/react-dropdown-menu via shadcn | Accessibility, keyboard navigation, portal handling |
| Side panel | Custom slide-in animation | @radix-ui/react-dialog Sheet variant | Accessible, handles focus trap, escape key |
| Code validation | Manual AST parsing | Existing useDebouncedValidation hook | Already handles debounce, transform, error collection |
| Continuation generation | New endpoint | Existing generateContinuation action | Proven to work, proper prompt engineering |
| Toast notifications | Custom notification system | sonner | Already integrated, nice UX |

**Key insight:** This phase is primarily about **wiring** existing infrastructure together in a new context, not building new capabilities. The generation actions, code editor, preview player, dropdown menu, and mutation patterns all exist.

## Common Pitfalls

### Pitfall 1: Dropdown Menu Triggers Clip Drag
**What goes wrong:** Clicking the dropdown menu starts a drag operation instead of opening the menu.
**Why it happens:** The TimelineScene has a drag listener on the main element; dropdown trigger is inside that.
**How to avoid:** Use `e.stopPropagation()` on dropdown trigger click, and ensure the dropdown trigger has `pointer-events: auto` while the sortable area may have specific activator.
**Warning signs:** Menu flashes open then closes as drag starts.

### Pitfall 2: Generated Clip Not Appearing in Timeline
**What goes wrong:** Generation completes but the new scene doesn't show up.
**Why it happens:** Forgot to call insertScene mutation, or called addScene which appends at end.
**How to avoid:** Always use insertScene with correct afterIndex/beforeIndex. Verify with toast that insertion succeeded.
**Warning signs:** Clip appears in library but not in movie; or appears at wrong position.

### Pitfall 3: Edit Panel Shows Stale Data
**What goes wrong:** After saving changes in edit panel, the timeline still shows old thumbnail/duration.
**Why it happens:** Convex reactivity should handle this, but local state in edit panel might be stale.
**How to avoid:** Reset edit panel state when clip prop changes (useEffect on clip._id). Let Convex query drive the timeline data.
**Warning signs:** Have to refresh page to see changes.

### Pitfall 4: Re-generate Changes Duration, Breaks Timeline
**What goes wrong:** Regenerating a clip produces different duration, causing timeline to recalculate.
**Why it happens:** This is expected behavior, but might surprise users.
**How to avoid:** Either accept duration changes (the scene's durationOverride will be cleared), or constrain generation to match original duration. Recommend: accept changes but show clear feedback.
**Warning signs:** Timeline "jumps" after regenerate; other clips shift position.

### Pitfall 5: Sheet Panel Blocks Timeline Interaction
**What goes wrong:** With edit panel open, user can't see or interact with timeline.
**Why it happens:** Sheet may cover too much, or focus trap prevents interaction outside.
**How to avoid:** Use a narrower sheet (400-600px), position on right side, keep timeline visible. Consider modal=false on Sheet to allow background interaction.
**Warning signs:** User has to close panel to see what's happening in timeline.

### Pitfall 6: Multiple Generations in Flight
**What goes wrong:** User clicks "Generate Next" multiple times, creating duplicates.
**Why it happens:** No guard against multiple clicks during loading state.
**How to avoid:** Disable actions during pending generation (pass `disabled` prop based on loading state). Use toast ID to replace loading message.
**Warning signs:** Multiple identical scenes appear; duplicate error toasts.

### Pitfall 7: Clip Update Mutation Doesn't Exist
**What goes wrong:** Re-generate action fails because there's no clips.update mutation.
**Why it happens:** Current clips.ts only has save (create) and remove; no update.
**How to avoid:** Add clips.update mutation that patches existing clip. Verify clipId ownership.
**Warning signs:** "Cannot find mutation clips.update" error.

## Code Examples

### clips.update Mutation (New)
```typescript
// convex/clips.ts - add this mutation

/**
 * Update an existing clip's code.
 * Used for regenerate and edit save operations.
 */
export const update = mutation({
  args: {
    id: v.id("clips"),
    code: v.optional(v.string()),
    rawCode: v.optional(v.string()),
    name: v.optional(v.string()),
    durationInFrames: v.optional(v.number()),
    fps: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const clip = await ctx.db.get(args.id);
    if (!clip || clip.userId !== identity.tokenIdentifier) {
      throw new Error("Clip not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.code !== undefined) updates.code = args.code;
    if (args.rawCode !== undefined) updates.rawCode = args.rawCode;
    if (args.name !== undefined) updates.name = args.name;
    if (args.durationInFrames !== undefined) updates.durationInFrames = args.durationInFrames;
    if (args.fps !== undefined) updates.fps = args.fps;

    await ctx.db.patch(args.id, updates);
  },
});
```

### Timeline Scene with Actions Menu
```typescript
// timeline-scene.tsx - add actions dropdown

// In the component, add to the content layer:
{/* Actions menu */}
{clip && (
  <div className="pointer-events-auto absolute top-1 left-1 z-30">
    <TimelineSceneActions
      clipId={clip._id}
      sceneIndex={index}
      onGenerateNext={onGenerateNext}
      onGeneratePrevious={onGeneratePrevious}
      onRegenerate={onRegenerate}
      onEdit={onEdit}
      disabled={isGenerating}
    />
  </div>
)}
```

### Loading State Management
```typescript
// In movie-editor.tsx

const [generatingSceneIndex, setGeneratingSceneIndex] = useState<number | null>(null);

const handleGenerateNext = useCallback(async (sceneIndex: number) => {
  if (generatingSceneIndex !== null) return; // Prevent double-click

  setGeneratingSceneIndex(sceneIndex);
  try {
    // ... generation logic
  } finally {
    setGeneratingSceneIndex(null);
  }
}, [generatingSceneIndex, /* other deps */]);

// Pass to timeline
<Timeline
  // ...
  generatingSceneIndex={generatingSceneIndex}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Navigate to create page for editing | Inline edit panel (Sheet) | Modern NLE pattern | Keeps context, faster workflow |
| Manual copy clip, generate, add to movie | One-click generate + auto-add | This phase | Streamlined workflow |
| Fixed action buttons always visible | Hover-reveal dropdown | Standard NLE UX | Cleaner interface, less clutter |
| Full page reload for generation | Optimistic UI with loading toast | Convex reactivity | Smooth, non-blocking UX |

**Deprecated/outdated:**
- Full-page navigation for quick edits: Breaks context, slow
- Separate "generate" and "add to movie" steps: Too many clicks

## Open Questions

1. **Should "Generate Next" require a prompt?**
   - What we know: Current `generateContinuation` accepts optional prompt; empty prompt auto-continues
   - What's unclear: Whether users want to guide the continuation
   - Recommendation: Default to auto-continue (no prompt). Add optional prompt input later as enhancement.

2. **Should edit panel allow prompt-based refinement?**
   - What we know: The refine action exists and supports multi-turn chat
   - What's unclear: Whether inline chat UI is needed in edit panel
   - Recommendation: Start with code-only editing. Prompt refinement can be added later.

3. **What happens if clip is used in multiple movies?**
   - What we know: Clips are referenced by ID; updating a clip affects all movies using it
   - What's unclear: Whether this is desired behavior
   - Recommendation: For Phase 22, accept this behavior. Future: consider "instance" vs "master" clips.

4. **Should regenerate preserve trim values?**
   - What we know: Regenerate creates new code which may have different duration
   - What's unclear: If trimStart/trimEnd on the scene should reset
   - Recommendation: Reset trim values on regenerate since the clip content changed. Warn user if trim will be lost.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `convex/generateAnimation.ts` - generateContinuation, generatePrequel actions
- Existing codebase: `src/components/generation/generation-row-actions.tsx` - Dropdown menu pattern
- Existing codebase: `src/components/movie/timeline-scene.tsx` - Current timeline clip component
- Existing codebase: `convex/movies.ts` - addScene, reorderScenes patterns
- Existing codebase: `src/components/ui/dropdown-menu.tsx` - Radix-based dropdown

### Secondary (MEDIUM confidence)
- [shadcn/ui Sheet component](https://ui.shadcn.com/docs/components/sheet) - Side panel pattern
- Existing codebase: `src/hooks/use-debounced-validation.ts` - Code validation hook

### Tertiary (LOW confidence)
- Industry NLE patterns (DaVinci Resolve, Premiere Pro) - Context menu on clips

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components already in codebase; no new dependencies
- Architecture: HIGH - Direct reuse of existing patterns with minor adaptations
- Pitfalls: HIGH - Based on similar patterns already implemented (feed actions, timeline trim)

**Research date:** 2026-02-03
**Valid until:** 2026-03-05 (30 days - patterns are stable, codebase is well-understood)
