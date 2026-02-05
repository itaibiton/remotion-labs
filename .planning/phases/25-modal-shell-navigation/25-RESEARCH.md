# Phase 25: Modal Shell & Navigation - Research

**Researched:** 2026-02-05
**Domain:** Modal dismiss behaviors, keyboard navigation, Next.js routing patterns
**Confidence:** HIGH

## Summary

Phase 25 focuses on implementing proper modal shell behaviors and keyboard navigation for the creation detail modal. The codebase already has substantial infrastructure from Phase 24: a `CreationModal` component using Radix Dialog, parallel routes (`@modal` slot), and intercepting routes (`(.)create/[id]`). The current implementation already includes arrow key navigation between creations and basic dismiss handling.

The key work for this phase is to verify and polish the existing implementation against the success criteria: Escape closes modal (NAV-03), clicking backdrop closes modal (NAV-04), and arrow keys navigate between creations (NAV-05). The existing code has these behaviors, but they need verification and potential refinement.

**Primary recommendation:** Verify existing behaviors work correctly, add boundary handling for arrow navigation (wrap or stop at edges), ensure focus management and accessibility compliance, and consolidate keyboard handling using the project's existing `tinykeys` pattern.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @radix-ui/react-dialog | ^1.1.15 | Modal primitive with accessibility | Already installed, provides onEscapeKeyDown, onPointerDownOutside, focus trapping |
| Next.js App Router | 16.1.5 | Parallel routes, intercepting routes | Already using for modal routing |
| tinykeys | ^3.0.0 | Keyboard shortcut binding | Already used in project (use-blade-mode.ts) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-visually-hidden | (via shadcn) | Accessible hidden content | Already used for DialogTitle |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tinykeys | raw addEventListener | tinykeys provides cleaner syntax, modifier support, already in codebase |
| Radix Dialog | cmdk or custom | Radix already installed, provides all needed accessibility |

**Installation:**
```bash
# No new dependencies required
```

## Architecture Patterns

### Current Project Structure
```
src/
├── app/(app)/
│   ├── @modal/
│   │   ├── default.tsx                 # Returns null for non-modal routes
│   │   └── (.)create/[id]/page.tsx     # Intercepting route modal
│   ├── create/[id]/
│   │   ├── page.tsx                    # Full-page fallback
│   │   └── creation-detail-page.tsx    # Full-page component
│   └── layout.tsx                      # Renders modal slot
├── components/creation/
│   └── creation-modal.tsx              # Modal container component
└── hooks/
    └── use-blade-mode.ts               # Example of tinykeys usage
```

### Pattern 1: Radix Dialog with URL-Controlled State
**What:** Modal is always `open={true}` since URL controls visibility. Close triggers `router.back()`.
**When to use:** When modal state is derived from URL (intercepting routes pattern).
**Example:**
```typescript
// Source: Current codebase pattern (creation-modal.tsx)
<Dialog open onOpenChange={(open) => !open && handleClose()}>
  <DialogContent
    onEscapeKeyDown={handleClose}
    onPointerDownOutside={handleClose}
  >
    {/* content */}
  </DialogContent>
</Dialog>
```

### Pattern 2: Arrow Key Navigation with Input Guard
**What:** Window-level keydown listener that skips when focused on input/textarea.
**When to use:** Gallery/carousel navigation in modals.
**Example:**
```typescript
// Source: Current codebase pattern (creation-modal.tsx)
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const activeEl = document.activeElement;
    if (activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement) {
      return; // Don't capture when typing
    }

    if (e.key === "ArrowLeft") {
      // Navigate to previous
    } else if (e.key === "ArrowRight") {
      // Navigate to next
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [deps]);
```

### Pattern 3: router.replace for Inter-Modal Navigation
**What:** Use `router.replace()` instead of `router.push()` when navigating between modals.
**When to use:** Arrow key navigation between items to avoid history stack accumulation.
**Example:**
```typescript
// Source: Current codebase (creation-modal.tsx line 73)
// Prevents "back" from cycling through every visited modal
router.replace(`/create/${nextGen._id}`);
```

### Anti-Patterns to Avoid

- **Using router.push() for modal-to-modal navigation:** Creates history stack trap where "back" cycles through every visited modal instead of closing.
- **Not guarding keyboard handlers for input focus:** Causes arrow keys to navigate while user is typing.
- **Missing default.tsx in @modal slot:** Causes 404 on hard navigation.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Focus trapping in modal | Manual focus management | Radix Dialog (built-in) | Handles edge cases, tab cycling, screen readers |
| Escape key handling | Raw keydown listener | Radix `onEscapeKeyDown` | Fires at correct time, integrates with Dialog state |
| Backdrop click detection | Click handler on overlay | Radix `onPointerDownOutside` | Handles pointer events correctly, prevents focus issues |
| Complex keyboard shortcuts | Multiple addEventListener calls | tinykeys | Cleaner syntax, modifier support, single cleanup |

**Key insight:** Radix Dialog already implements WAI-ARIA dialog accessibility patterns including focus trapping, Escape key handling, and backdrop click. The arrow key navigation for gallery-style browsing is outside Radix scope but should use the project's existing keyboard handling patterns.

## Common Pitfalls

### Pitfall 1: History Stack Trap with Modal Navigation
**What goes wrong:** User navigates between multiple creations, then clicks back - goes through every modal instead of closing.
**Why it happens:** Using `router.push()` for modal-to-modal navigation adds entries to history stack.
**How to avoid:** Use `router.replace()` for arrow key navigation between creations (already implemented in codebase).
**Warning signs:** Back button doesn't close modal immediately; cycles through previous views.

### Pitfall 2: Arrow Keys Captured While Typing
**What goes wrong:** User types in edit textarea, arrow keys navigate away instead of moving cursor.
**Why it happens:** Window-level keydown handler doesn't check for focused input elements.
**How to avoid:** Check `document.activeElement` before handling arrow keys (already implemented).
**Warning signs:** Cannot use arrow keys to navigate within text fields.

### Pitfall 3: Missing Boundary Handling in Navigation
**What goes wrong:** Navigating past first/last item causes error or unexpected behavior.
**Why it happens:** Index calculation doesn't handle array bounds.
**How to avoid:** Check bounds before navigation; decide wrap vs. stop behavior.
**Warning signs:** Console errors on edge navigation, or silent failures.

### Pitfall 4: Focus Lost After Modal Operations
**What goes wrong:** After closing modal or navigating between items, focus is lost or unpredictable.
**Why it happens:** Radix manages focus on close, but custom navigation may not.
**How to avoid:** Let Radix handle focus on close; for navigation, focus remains in modal naturally.
**Warning signs:** Need to click or tab to continue using keyboard.

### Pitfall 5: Escape Key Conflicts
**What goes wrong:** Multiple components listen for Escape, causing double-handling.
**Why it happens:** Both Radix Dialog and custom handlers respond to same key.
**How to avoid:** Use Radix's `onEscapeKeyDown` prop, don't add separate window listener for Escape.
**Warning signs:** Modal closes twice (animation restarts), or doesn't close at all.

### Pitfall 6: Query Fetching on Navigation
**What goes wrong:** Each arrow key navigation re-fetches entire generation list.
**Why it happens:** Convex query in useEffect dependencies or poor query caching.
**How to avoid:** Query for `allGenerations` is separate from current item; Convex handles caching.
**Warning signs:** Visible delay or loading states on each navigation.

## Code Examples

Verified patterns from the existing codebase:

### Modal Close Handler
```typescript
// Source: src/components/creation/creation-modal.tsx
const handleClose = useCallback(() => {
  router.back();
}, [router]);

// In JSX:
<Dialog open onOpenChange={(open) => !open && handleClose()}>
  <DialogContent
    onPointerDownOutside={handleClose}
    onEscapeKeyDown={handleClose}
  >
```

### Arrow Key Navigation with Bounds Check
```typescript
// Source: src/components/creation/creation-modal.tsx (lines 44-76)
const handleKeyDown = (e: KeyboardEvent) => {
  const activeEl = document.activeElement;
  if (activeEl instanceof HTMLInputElement ||
      activeEl instanceof HTMLTextAreaElement) {
    return;
  }

  const currentIndex = allGenerations.findIndex(
    (g) => g._id === generationId
  );
  if (currentIndex === -1) return;

  let nextIndex: number | null = null;

  if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    nextIndex = currentIndex - 1;
  } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    nextIndex = currentIndex + 1;
  }

  // Boundary check (stop at edges, don't wrap)
  if (nextIndex !== null && nextIndex >= 0 && nextIndex < allGenerations.length) {
    e.preventDefault();
    const nextGen = allGenerations[nextIndex];
    if (nextGen) {
      router.replace(`/create/${nextGen._id}`);
    }
  }
};
```

### tinykeys Usage Pattern (for reference)
```typescript
// Source: src/hooks/use-blade-mode.ts
import { tinykeys } from "tinykeys";

useEffect(() => {
  const isInputElement = (e: KeyboardEvent): boolean => {
    const target = e.target as HTMLElement;
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target.isContentEditable
    );
  };

  const unsubscribe = tinykeys(window, {
    Escape: (e: KeyboardEvent) => {
      if (isInputElement(e)) return;
      exitBladeMode();
    },
    ArrowLeft: (e: KeyboardEvent) => {
      if (isInputElement(e)) return;
      e.preventDefault();
      navigatePrev();
    },
  });

  return unsubscribe;
}, [deps]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| window.addEventListener for Escape | Radix `onEscapeKeyDown` prop | Radix 1.0+ | Better integration, no cleanup needed for that specific handler |
| Manual focus trap | Radix built-in focus management | Radix 1.0+ | Less code, better accessibility |
| Separate modal state + URL sync | URL-controlled modal via intercepting routes | Next.js 13+ | Single source of truth |

**Current in this project:**
- Already using Radix Dialog events for Escape and backdrop
- Already using `router.replace()` for modal-to-modal navigation
- Already guarding keyboard handlers for input elements

## Open Questions

1. **Wrap vs. Stop at Boundaries**
   - What we know: Current implementation stops at boundaries (doesn't navigate past first/last)
   - What's unclear: User preference for wrap-around behavior
   - Recommendation: Keep current "stop at edges" behavior; wrap can feel disorienting

2. **Visual Feedback at Boundaries**
   - What we know: No visual feedback when at first/last item
   - What's unclear: Whether users need indication that they're at the edge
   - Recommendation: Optional enhancement - brief animation or disabled-state styling

3. **Up/Down Arrow Keys**
   - What we know: Current code handles ArrowUp/ArrowDown same as Left/Right
   - What's unclear: Whether vertical arrows should have different behavior (e.g., scroll content)
   - Recommendation: Keep current behavior for Phase 25; reconsider if scroll conflicts arise

## Sources

### Primary (HIGH confidence)
- [Radix Dialog Documentation](https://www.radix-ui.com/primitives/docs/components/dialog) - Props for onEscapeKeyDown, onPointerDownOutside, accessibility features
- [Next.js Parallel Routes](https://nextjs.org/docs/app/api-reference/file-conventions/parallel-routes) - Modal patterns, router.back() for closing
- Existing codebase: `src/components/creation/creation-modal.tsx` - Current implementation patterns
- Existing codebase: `src/hooks/use-blade-mode.ts` - tinykeys usage pattern

### Secondary (MEDIUM confidence)
- [GitHub Discussion #59466](https://github.com/vercel/next.js/discussions/59466) - History stack trap with modal navigation, router.replace solution
- [Next.js Intercepting Routes](https://nextjs.org/docs/app/api-reference/file-conventions/intercepting-routes) - Soft navigation, URL masking

### Tertiary (LOW confidence)
- [Community Modal Patterns](https://dev.to/adityabhattad/one-practical-application-of-nextjs-parallel-and-intercepting-routes-better-ux-with-modals-36i0) - Implementation examples
- [React Keyboard Navigation](https://whereisthemouse.com/create-a-list-component-with-keyboard-navigation-in-react) - Best practices for arrow key handling

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies; using established Radix patterns
- Architecture: HIGH - Implementation already exists and follows documented patterns
- Pitfalls: HIGH - Well-documented in Next.js GitHub issues and existing codebase

**Research date:** 2026-02-05
**Valid until:** 30 days (stable patterns, no fast-moving dependencies)

---

## Implementation Assessment

### What Already Exists (Phase 24 deliverables):
1. `@modal/default.tsx` - Returns null for non-modal routes
2. `@modal/(.)create/[id]/page.tsx` - Intercepting route that renders CreationModal
3. `CreationModal` component with:
   - Escape key handling via `onEscapeKeyDown`
   - Backdrop click handling via `onPointerDownOutside`
   - Arrow key navigation between creations
   - Input element guard for keyboard handlers
   - `router.replace()` for inter-modal navigation
4. Full-page fallback at `/create/[id]/page.tsx`

### What Phase 25 Should Verify/Polish:
1. **NAV-03 (Escape closes modal):** Verify `onEscapeKeyDown` callback fires correctly and navigates back
2. **NAV-04 (Backdrop click closes modal):** Verify `onPointerDownOutside` fires correctly
3. **NAV-05 (Arrow keys navigate):** Verify navigation works, boundary behavior is correct
4. **Edge cases:** First/last item behavior, rapid navigation, content loading states

### Recommended Scope:
This phase is primarily **verification and polish** rather than new implementation. The success criteria functionality already exists. Tasks should focus on:
- Writing tests or manual verification procedures
- Documenting actual behavior vs. expected
- Fixing any gaps found during verification
- Adding visual feedback if desired (optional)
