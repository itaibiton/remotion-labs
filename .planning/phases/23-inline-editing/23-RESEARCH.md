# Phase 23: Finalization - Research

**Researched:** 2026-02-04
**Domain:** v0.3.0 milestone finalization, verification testing, polish and cleanup
**Confidence:** HIGH

## Summary

Phase 23 is the finalization phase for the v0.3.0 Movie Editor Revamp milestone. Research reveals that the primary requirements (EDIT-01, EDIT-02) were **already implemented in Phase 22** as part of the SceneEditPanel and per-clip actions work. The Phase 22 implementation includes:

1. **SceneEditPanel** (`src/components/movie/scene-edit-panel.tsx`) - A Sheet side panel with Remotion Player preview and Monaco code editor
2. **Edit handler** in MovieEditor that opens the panel for the selected clip
3. **Save functionality** via `clips.update` mutation that persists code changes

This means Phase 23 should focus on:
- **Verification** - Confirming EDIT-01/EDIT-02 work as specified
- **Gap analysis** - Identifying any missing edge cases
- **Polish** - UI/UX improvements, error handling enhancements
- **Technical debt** - Code cleanup, performance profiling
- **Known issues** - Addressing blockers documented in STATE.md

**Primary recommendation:** Treat Phase 23 as a verification and polish phase. Create a testing checklist, fix any discovered gaps, and ensure the milestone is ready for release.

## Verification Tasks

Based on the EDIT-01 and EDIT-02 requirements and Phase 23 success criteria from ROADMAP.md:

### EDIT-01 Verification: Inline Editing Panel
| Criterion | Expected Behavior | Test Method |
|-----------|-------------------|-------------|
| Selection triggers panel | Click "Edit" in dropdown -> Sheet opens | Manual test on movie page |
| Preview shows selected clip only | Player shows clip's code, not full movie | Verify inputProps matches clip |
| Monaco editor displays code | rawCode appears in editor | Visual inspection |
| Panel is positioned correctly | Sheet slides from right, 550px width | Visual inspection |

### EDIT-02 Verification: Edit and Save
| Criterion | Expected Behavior | Test Method |
|-----------|-------------------|-------------|
| Code is editable | Toggle edit mode enables typing | Try editing code |
| Validation runs on edit | Errors show red markers in editor | Introduce syntax error |
| Save persists changes | clips.update mutation called | Check Convex logs |
| Timeline reflects changes | Preview updates after save | Visual inspection |
| Full movie playback reflects changes | Movie composition uses updated code | Play full movie |

### Success Criteria from ROADMAP.md (Phase 23):
1. User selects a clip on the timeline and an inline editing panel appears - **Implemented** (via "Edit" action in dropdown)
2. The editing panel shows a preview player playing only the selected clip - **Implemented** (SceneEditPanel has isolated Player)
3. The editing panel shows a Monaco code editor with the clip's Remotion JSX code - **Implemented** (CodeDisplay component)
4. User can edit the code in the panel and click "Save" to persist changes back to the clip - **Implemented** (handleSaveEdit -> clips.update)
5. Saved code changes are immediately reflected in the timeline preview and full movie playback - **Needs verification** (Convex reactivity should handle this)

## Gap Analysis

### Potential Gaps Identified

| Gap | Description | Impact | Recommendation |
|-----|-------------|--------|----------------|
| No direct clip selection | Edit only accessible via dropdown, not clip click | Minor UX friction | Consider: click-to-select + Edit button as alternative entry point |
| Edit mode not auto-enabled | User must toggle "Edit" button to start editing | Extra click | Consider: auto-enable editing when panel opens |
| No unsaved changes warning | Closing panel discards edits without confirmation | Potential data loss | Add confirmation dialog if hasChanges |
| Keyboard shortcut missing | No keyboard shortcut to open edit panel | Power user friction | Consider: 'E' key when clip selected |
| Duration changes from edit | If user changes durationInFrames in code, timeline may not update | Potential inconsistency | Validate duration extraction or allow duration override |

### REQUIREMENTS.md Status Check

From REQUIREMENTS.md, EDIT-01 and EDIT-02 are marked "Pending" but the implementation exists:

```markdown
| EDIT-01 | Phase 23 | Pending |
| EDIT-02 | Phase 23 | Pending |
```

**Action required:** Update REQUIREMENTS.md to mark these as Complete after verification.

## Polish Items

### UI/UX Improvements

| Item | Current State | Improvement | Priority |
|------|---------------|-------------|----------|
| Panel close button overlap | X button may overlap with SheetTitle | Add padding or position adjustment | Low |
| Editor height fixed at 400px | CodeDisplay has hardcoded height | Make editor fill available space or allow resize | Medium |
| No loading skeleton | Opening panel shows nothing until clip data loads | Add skeleton loader | Low |
| Preview aspect ratio | Preview is 180px tall, may not match clip AR | Calculate preview height from actual AR | Low |
| Error state for save failure | Error thrown but no visual indicator | Show error toast + keep panel open | Medium |

### Error Handling Improvements

| Scenario | Current Handling | Improvement |
|----------|------------------|-------------|
| Save fails (network) | Toast error, re-throws | Keep panel open, let user retry |
| Validation fails | Button disabled | Show clearer message about what's wrong |
| Clip not found | Returns null, panel closes | Show error state in panel |
| Concurrent edit | Last write wins | Consider optimistic locking (updatedAt check) |

## Technical Debt

### Code Cleanup Items

| File | Issue | Action |
|------|-------|--------|
| movie-editor.tsx | Many `as any` casts for Convex IDs | Use proper typing or document why needed |
| scene-edit-panel.tsx | useEffect dependency on `clip?._id` | Consider stable selector pattern |
| timeline-scene.tsx | Conditional action dropdown rendering | Simplify or document the 4-handler requirement |

### Performance Considerations

| Concern | Description | Mitigation |
|---------|-------------|------------|
| Timeline with many clips | Thumbnail rendering for 20+ clips | Profile and consider virtualization |
| Trim + split operations | Complex state updates during drag | Already uses local state for optimistic UI |
| Monaco editor in Sheet | Editor may re-initialize on each open | Verify editor instance is properly cached |
| Live preview during edit | Debounced validation runs on every keystroke | Current 500ms debounce should be sufficient |

### Blockers from STATE.md

These are documented blockers that should be addressed or tracked:

| Blocker | Status | Phase 23 Action |
|---------|--------|-----------------|
| AWS Lambda setup pending | Code complete, untested | Document as known limitation, test in staging |
| Function constructor security | Needs adversarial testing | Out of scope for Phase 23 (security audit later) |
| Claude API cost at scale | Needs usage tracking | Out of scope (future feature) |
| Convex storage URL accessibility | May need base64 fallback | Monitor, implement fallback if issues arise |
| Timeline performance with many clips | Needs profiling | Include performance test in verification |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confirmation dialogs | Custom modal | `AlertDialog` from shadcn | Accessibility, consistent UX |
| Keyboard shortcuts | Manual event listeners | Continue using tinykeys | Already in codebase, works well |
| Code validation | Custom AST logic | Existing useDebouncedValidation | Proven, handles all edge cases |
| Toast notifications | Custom system | Continue using sonner | Already integrated |

## Common Pitfalls

### Pitfall 1: Edit Panel Closes on Successful Save
**What goes wrong:** User saves changes, panel closes, user loses context
**Why it happens:** Current implementation calls `onOpenChange(false)` after save
**Current state:** This is the implemented behavior
**Recommendation:** Keep current behavior (matches modal save patterns). If users want to continue editing, they can reopen.

### Pitfall 2: Timeline Thumbnail Not Updating After Edit
**What goes wrong:** After saving code changes, the timeline thumbnail still shows old frame
**Why it happens:** Remotion Thumbnail component caches rendered frames
**Prevention:** Verify Convex reactivity triggers re-render. If not, add a key prop that changes when clip.updatedAt changes.
**Warning signs:** Edit saves successfully but thumbnail looks identical.

### Pitfall 3: Edit While Generation In Progress
**What goes wrong:** User clicks Edit while a generation is running, potentially editing a clip that's about to be regenerated
**Why it happens:** Actions dropdown disables during generation but clip may be edited
**Prevention:** Consider disabling Edit action during generation (already done - `isGenerating` prop)
**Current state:** Handled correctly.

### Pitfall 4: Code Editor Focus Trap
**What goes wrong:** Sheet focus trap prevents Monaco editor keyboard shortcuts from working
**Why it happens:** Radix focus trap captures Tab, Escape, etc.
**Prevention:** Monaco should handle its own keyboard events. Test: Tab indentation, Ctrl+Z undo.
**Warning signs:** Can't indent code with Tab, Escape closes panel instead of exiting multi-cursor.

## Code Examples

### Pattern: Confirmation Dialog for Unsaved Changes
```typescript
// Add to scene-edit-panel.tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const [showDiscardDialog, setShowDiscardDialog] = useState(false);

const handleOpenChange = (open: boolean) => {
  if (!open && hasChanges) {
    setShowDiscardDialog(true);
    return;
  }
  onOpenChange(open);
};

// In JSX
<AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Discard changes?</AlertDialogTitle>
      <AlertDialogDescription>
        You have unsaved changes. Are you sure you want to close?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={() => {
        setShowDiscardDialog(false);
        onOpenChange(false);
      }}>
        Discard
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Pattern: Update Thumbnail on Clip Change
```typescript
// In timeline-scene.tsx, add key to force re-render
<Thumbnail
  key={`thumb-${clip._id}-${clip.updatedAt ?? 0}`}
  component={DynamicCode}
  // ...rest of props
/>
```

## Open Questions

1. **Should clip selection be separate from Edit action?**
   - What we know: Currently Edit is only accessible via dropdown menu
   - What's unclear: Whether users expect clicking a clip to select it (highlight) vs open edit
   - Recommendation: Keep current dropdown pattern for Phase 23. Selection behavior can be added in v0.4.

2. **Should editor auto-save on close?**
   - What we know: Current behavior requires explicit Save click
   - What's unclear: User expectation (auto-save vs explicit save)
   - Recommendation: Keep explicit save. Users may want to cancel edits.

3. **Should generated clips be editable?**
   - What we know: All clips can be edited
   - What's unclear: Whether editing generated code breaks continuation context
   - Recommendation: Allow editing but document that continuations use stored code snapshots.

## Testing Checklist for Phase 23

### Functional Tests
- [ ] Open movie page with 2+ scenes
- [ ] Hover over clip, click dropdown, click Edit
- [ ] Verify panel opens with correct clip name
- [ ] Verify preview shows clip animation
- [ ] Toggle Edit mode in CodeDisplay
- [ ] Make a small code change (e.g., change a color)
- [ ] Verify preview updates after debounce
- [ ] Click Save, verify toast success
- [ ] Close panel, verify timeline thumbnail updates
- [ ] Play full movie, verify change is reflected
- [ ] Test with invalid code, verify Save is disabled
- [ ] Test closing panel with unsaved changes

### Edge Case Tests
- [ ] Edit clip that appears multiple times in timeline (if possible)
- [ ] Edit very long clip code (>1000 lines)
- [ ] Edit immediately after generation completes
- [ ] Rapid open/close of edit panel
- [ ] Edit while movie is playing

### Performance Tests
- [ ] Create movie with 10+ clips, verify timeline responsiveness
- [ ] Open edit panel, verify no lag
- [ ] Type rapidly in editor, verify debounce works

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/components/movie/scene-edit-panel.tsx` - Full implementation
- Existing codebase: `src/components/movie/movie-editor.tsx` - Handler wiring
- Existing codebase: `convex/clips.ts` - update mutation
- Existing codebase: `.planning/phases/22-per-clip-actions/22-02-SUMMARY.md` - Implementation record

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` - Blockers and decisions
- `.planning/REQUIREMENTS.md` - Requirement definitions
- `.planning/ROADMAP.md` - Success criteria

## Metadata

**Confidence breakdown:**
- Verification tasks: HIGH - Based on implemented code and documented requirements
- Gap analysis: HIGH - Direct comparison of implementation vs requirements
- Polish items: MEDIUM - Based on code review, not user feedback
- Known issues: HIGH - Documented in STATE.md

**Research date:** 2026-02-04
**Valid until:** 2026-02-11 (7 days - this is a verification/polish phase, findings are immediate)
