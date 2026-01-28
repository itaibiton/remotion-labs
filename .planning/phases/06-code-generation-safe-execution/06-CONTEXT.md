# Phase 6: Code Generation & Safe Execution - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Generate full Remotion JSX code from text prompts and execute it safely in a validated sandbox. Users can view the generated code in a read-only editor. This replaces the current props-based generation entirely.

Requirements: CODE-01, CODE-02, CODE-03, CODE-04, ANIM-02, ANIM-03, ANIM-04

</domain>

<decisions>
## Implementation Decisions

### Code Generation Scope
- Claude generates **full Remotion compositions** (complete with AbsoluteFill, useCurrentFrame, interpolate, etc.)
- **Reasonable complexity limits** should be enforced (cap nested components, sequences, max duration)
- **Full Remotion API access** — all Remotion features available (useVideoConfig, Audio, Img, staticFile, random(), etc.)

### Editor Experience
- Use **Monaco Editor** for code display (VS Code's editor, full TypeScript support)
- **Line numbers always visible** — standard code editor experience
- **Prominent copy button** for easy code copying to clipboard

### Validation Feedback
- **Inline errors in editor** — red squiggles + hover tooltips on problematic lines (VS Code style)
- **Generic security messages** — "Code contains unsafe patterns" (don't reveal blocklist to prevent probing)
- On failure, user can **regenerate + modify prompt** to get different output

### Generation Flow
- **Replace props-based generation entirely** — all prompts go through full code generation
- **Templates become code examples** — selecting a template shows its code, user modifies prompt to customize
- Use **Remotion's llms.txt as base** for Claude system prompt
- **Keep current step-by-step progress** — "Analyzing..." → "Generating..." → "Validating..."

### Claude's Discretion
- Editor layout (below preview, side-by-side, or collapsible)
- Randomness handling (enforce seeded random vs allow Math.random based on Remotion best practices)
- Validation timing (after generation or auto-retry on failure)

</decisions>

<specifics>
## Specific Ideas

- Remotion's official llms.txt should be the foundation for the Claude system prompt
- Monaco Editor gives VS Code-like experience users expect
- Templates transform from "starting point selectors" to "code examples library"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-code-generation-safe-execution*
*Context gathered: 2026-01-28*
