# Phase 7: Editing & Iteration - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can modify generated code directly in the Monaco editor and refine animations through conversational chat. The editor transitions from read-only (Phase 6) to editable. Chat refinement sends the current code to Claude for iterative improvements. Validation runs on every change with specific fix suggestions.

</domain>

<decisions>
## Implementation Decisions

### Editor behavior
- Debounced auto-update: preview refreshes ~500ms after user stops typing
- Toggle edit mode: editor starts read-only, user clicks "Edit" button to unlock editing
- Monaco built-in undo/redo (Ctrl+Z/Cmd+Z) — no version history system
- "Reset to original" button to revert to last AI-generated code, discarding manual edits

### Claude's Discretion (Editor)
- Editor height: fixed vs resizable — Claude picks based on layout constraints

### Chat refinement flow
- Chat lives below the prompt input area, messages flow vertically
- Full conversation history visible (all user + Claude messages, scrollable)
- Chat responses auto-apply to editor — no diff/accept step
- Every refinement request includes the full current editor code (including manual edits)
- Unified input field: if code exists, input acts as chat refinement. User can type "start over: [new prompt]" to regenerate from scratch

### Validation feedback
- Preview freezes on last valid state when validation fails (no error overlay in preview)
- Specific actionable suggestions for all error types (e.g., "Line 12: 'fetch' is not available. Use interpolate() for animations instead.")
- Errors shown inline in editor only (Monaco red squiggles + hover tooltips, no separate panel)
- Status badge on editor header: green checkmark (valid) or red X (errors)

### Edit vs Generate boundary
- Chat always uses current editor code as context — manual edits are included
- "Regenerate" (new prompt from scratch) does full reset: clears chat history, editor, and preview
- Unified input, context-aware: single input field that acts as refinement when code exists

</decisions>

<specifics>
## Specific Ideas

- Transition from Phase 6's read-only editor to editable should feel like "unlocking" the editor — clear visual change when Edit button is clicked
- Chat input should feel like a natural continuation of the initial prompt — same input area, just with conversation context
- Fix suggestions should reference available Remotion APIs specifically (e.g., "use interpolate() instead" not "use an allowed function")

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-editing-iteration*
*Context gathered: 2026-01-29*
