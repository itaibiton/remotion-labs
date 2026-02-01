---
phase: 16-per-creation-actions
plan: 16-01
title: Action dropdown with save, delete, and rerun actions
status: complete
subsystem: generation-feed
tags: [dropdown-menu, actions, save, delete, rerun, radix-ui]
requires:
  - 13-generation-feed-settings
  - 14-variations
provides:
  - Per-generation action dropdown (save, delete, rerun)
  - generations.remove mutation
  - shadcn/ui dropdown-menu component
affects:
  - 16-02 (bulk actions may extend this pattern)
tech-stack:
  added:
    - "@radix-ui/react-dropdown-menu"
  patterns:
    - Sibling AlertDialog + DropdownMenu (avoids portal conflicts)
    - onSelect for keyboard-accessible menu items
    - stopPropagation for nested interactive elements
    - Callback prop threading (CreateContent -> Feed -> Row/Grid -> Actions)
key-files:
  created:
    - src/components/ui/dropdown-menu.tsx
    - src/components/generation/generation-row-actions.tsx
  modified:
    - convex/generations.ts
    - src/components/generation/generation-row.tsx
    - src/components/generation/variation-grid.tsx
    - src/components/generation/generation-feed.tsx
    - src/app/(app)/create/create-page-client.tsx
decisions:
  - AlertDialog sibling of DropdownMenu, not nested inside portal
  - variant="destructive" on AlertDialogAction via Button asChild pattern
  - GenerationRow restructured from button to div for valid HTML nesting
  - Direct save (no dialog) from feed action - auto-names from prompt
  - Rerun preserves all original settings (aspect ratio, duration, fps, variation count)
  - Per-variation overlay actions shown on hover (opacity transition)
  - Batch-level actions use first variation as representative
metrics:
  duration: ~5 min
  completed: 2026-02-01
---

# Phase 16 Plan 01: Action Dropdown with Save, Delete, and Rerun Actions Summary

Per-generation three-dot action dropdown menu with save-to-library, delete (with confirmation), and rerun capabilities wired through feed into create page.

## What Was Built

### 1. shadcn/ui Dropdown Menu Component (`dropdown-menu.tsx`)
Installed `@radix-ui/react-dropdown-menu` and created the full shadcn wrapper component with data-slot attributes, cn() className merging, and portal rendering. Exports all standard subcomponents (Root, Trigger, Content, Item, Separator, Label, Group, Sub, CheckboxItem, RadioGroup, RadioItem, Shortcut).

### 2. `generations.remove` Mutation
Added a public mutation to `convex/generations.ts` that deletes a generation by ID after verifying the authenticated user owns it. Follows the exact same pattern as `clips.remove`.

### 3. GenerationRowActions Component
Created the core action dropdown component with:
- Three-dot MoreHorizontal trigger button (ghost variant, 8x8)
- Save to Library item (disabled for failed generations or missing code)
- Rerun item
- Delete item with destructive styling and AlertDialog confirmation
- AlertDialog as sibling of DropdownMenu to avoid portal conflicts
- stopPropagation on trigger to prevent row selection

### 4. GenerationRow Restructure
Changed outer element from `<button>` to `<div>` to avoid HTML spec violation (buttons cannot contain buttons). Content area wrapped in inner `<button>` for click-to-select. GenerationRowActions placed as last child.

### 5. VariationGrid Action Triggers
Added two action entry points:
- Batch-level: Action dropdown next to timestamp in metadata row
- Per-variation: Overlay action menu in top-right corner (opacity 0 -> 1 on hover via `group/variation`)

### 6. Create Page Handler Wiring
Added three handler functions in `CreateContent`:
- `handleSaveGeneration`: Direct save to clip library with prompt-truncated name
- `handleDeleteGeneration`: Call `generations.remove` mutation
- `handleRerunGeneration`: Re-trigger generation with original settings (aspect ratio, duration, fps, variation count), routing to `generateVariations` when `variationCount > 1`

All callbacks threaded: CreateContent -> GenerationFeed -> GenerationRow/VariationGrid -> GenerationRowActions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AlertDialogAction destructive styling**
- **Found during:** Task 3 (GenerationRowActions creation)
- **Issue:** Plan used `className="bg-destructive text-destructive-foreground hover:bg-destructive/90"` on AlertDialogAction, but the existing AlertDialogAction component uses `Button asChild` wrapper with a `variant` prop
- **Fix:** Used `variant="destructive"` prop instead of raw className, which is the correct API for this codebase's AlertDialogAction
- **Files modified:** `generation-row-actions.tsx`

**2. [Rule 2 - Missing Critical] DropdownMenuItem destructive variant**
- **Found during:** Task 3
- **Issue:** Plan used `className="text-destructive focus:text-destructive"` for delete menu item, but the dropdown-menu component supports a `variant="destructive"` data attribute with proper focus styling
- **Fix:** Used `variant="destructive"` prop on DropdownMenuItem which applies proper data-variant styling
- **Files modified:** `generation-row-actions.tsx`

**3. [Rule 2 - Missing Critical] Icon sizing in DropdownMenuItem**
- **Found during:** Task 3
- **Issue:** Plan used `mr-2` on icons inside DropdownMenuItem, but the component already applies `gap-2` and `[&>svg]:size-4` for consistent icon sizing
- **Fix:** Removed `mr-2` from icons since the gap-2 class on DropdownMenuItem handles spacing
- **Files modified:** `generation-row-actions.tsx`

## Verification Results

- TypeScript compilation (`npx tsc --noEmit`): PASS - zero errors
- All 7 files created/modified successfully
- Convex generations module exports `remove` mutation alongside `store`, `list`, `listPaginated`, `get`

## Next Phase Readiness

Ready for 16-02 (bulk actions / additional feed enhancements). The action callback pattern established here can be extended for batch operations.
