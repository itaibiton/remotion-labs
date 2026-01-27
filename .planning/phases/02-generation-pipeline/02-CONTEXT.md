# Phase 2: Generation Pipeline - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can enter text prompts and receive validated animation code via Claude API. The prompt input, generation process, validation, and error handling are in scope. Preview playback is Phase 3. Templates are Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Prompt Input UX
- Simple text area, not chat interface or guided form
- Show 3-4 clickable example prompts users can try
- Soft character limit with warning (show count, warn at threshold, allow submission)
- Centered hero layout — prompt box prominent in center of page

### Generation Feedback
- Progress steps shown: "Analyzing prompt..." → "Generating code..." → "Validating..."
- Show estimated time ("Usually takes ~10-30 seconds")
- Cancel button visible during generation
- Auto-show preview immediately when generation completes successfully

### Error Handling
- Specific error messages with suggestions for fixing the prompt
- Keep prompt in text area on failure (user can edit and retry)
- Validation failures ask user to retry (not auto-retry silently)
- Limit retries — after N failures, suggest trying a simpler prompt
- Preserve prompt between attempts

### Code Output
- Code hidden entirely for v1 (premium feature later)
- Auto-save each generation to user's history
- Store: prompt, generated code, timestamp, animation settings
- "Regenerate" button to get different result from same prompt

### Claude's Discretion
- Exact character limit threshold
- Number of retry attempts before suggestion message
- Progress step timing and animations
- Example prompt content and selection

</decisions>

<specifics>
## Specific Ideas

- Code viewing/editing is planned as a premium feature — keep it hidden for now
- Animation history should be automatic, no manual save action needed
- Error messages should help users improve their prompts, not just say "try again"

</specifics>

<deferred>
## Deferred Ideas

- Code viewing/editing — premium feature, future phase
- Animation history browsing UI — noted for future (auto-save now, browse later)

</deferred>

---

*Phase: 02-generation-pipeline*
*Context gathered: 2026-01-27*
