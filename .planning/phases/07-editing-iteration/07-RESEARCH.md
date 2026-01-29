# Phase 7: Editing & Iteration - Research

**Researched:** 2026-01-29
**Domain:** Monaco editor editing, real-time code validation, Claude multi-turn chat refinement
**Confidence:** HIGH

## Summary

Phase 7 transforms the existing read-only Monaco code editor into an editable workspace with live validation and adds conversational chat refinement via Claude's multi-turn Messages API. The phase builds on a solid foundation: Phase 6 already has Monaco editor integration (`@monaco-editor/react` v4.7), AST-based code validation (acorn + acorn-jsx), JSX transformation (sucrase), sandboxed code execution, and a Claude generation action in Convex.

The technical domains break into three areas: (1) Editor editing mode -- toggling Monaco's `readOnly` option, handling `onChange` with debounced validation, and providing inline error markers; (2) Validation feedback -- transforming generic security errors into actionable, Remotion-specific suggestions; (3) Chat refinement -- extending the Convex generation action to support multi-turn conversation history passed via the Claude Messages API.

All three areas use well-established patterns with existing libraries already in the project. No new dependencies are required. The `@monaco-editor/react` v4.7 `Editor` component supports controlled mode via `value` prop and `onChange` callback. Monaco's `setModelMarkers` API provides inline error display. The Anthropic SDK's stateless `messages.create` supports multi-turn by passing full conversation history. The key integration challenge is coordinating state flow: editor code changes -> debounced validation -> conditional preview update, while keeping the chat conversation history synchronized with manual edits.

**Primary recommendation:** Build incrementally -- first make the editor editable with live validation, then add chat refinement as a separate action, then wire the unified input field that switches between generation and refinement modes.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@monaco-editor/react` | 4.7.0 | React Monaco editor wrapper | Already installed; provides `value`, `onChange`, `onMount`, `onValidate`, `options` props |
| `@anthropic-ai/sdk` | ^0.71.2 | Claude API multi-turn conversation | Already installed; `messages.create` with messages array for chat refinement |
| `acorn` + `acorn-jsx` | 8.15.0 / 5.3.2 | AST-based code validation | Already installed; validates user edits client-side |
| `sucrase` | ^3.35.1 | JSX-to-JS transformation | Already installed; transforms user-edited code before execution |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `convex` | ^1.31.6 | Backend actions/mutations | Chat refinement action, conversation state |
| `sonner` | ^2.0.7 | Toast notifications | Generation status, error feedback |
| `lucide-react` | ^0.563.0 | Icons | Edit/lock toggle, status badges, chat UI icons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side debounce (useEffect+setTimeout) | `use-debounce` package | Adds dependency for a 10-line pattern; not worth it |
| Client-side conversation state | Convex table for messages | Adds schema complexity; conversation is session-scoped per CONTEXT.md (clears on regenerate) |
| `useDeferredValue` for preview | Manual debounce | `useDeferredValue` is render-aware but doesn't prevent validation re-runs; debounce is more explicit and predictable for this use case |

**Installation:**
```bash
# No new packages needed - all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    code-editor/
      code-display.tsx          # MODIFY: Add editing mode, onChange, debounced validation
    generation/
      prompt-input.tsx          # MODIFY: Unified input field (generate vs refine)
      chat-messages.tsx         # NEW: Chat message history display
    preview/
      preview-player.tsx        # EXISTING: Already handles code prop changes
  lib/
    code-validator.ts           # MODIFY: Add actionable error suggestions
    code-executor.ts            # EXISTING: No changes needed
    code-transformer.ts         # EXISTING: No changes needed (client-side JSX transform)
    remotion-allowlist.ts       # EXISTING: Reference for suggestion text
  app/
    create/
      create-page-client.tsx    # MODIFY: Add chat state, edit toggle, unified input logic
convex/
  generateAnimation.ts          # MODIFY: Add refine action with conversation history
  schema.ts                     # EXISTING: No schema changes needed
```

### Pattern 1: Debounced Validation Pipeline
**What:** Editor changes trigger debounced validation -> transform -> preview update
**When to use:** Every character the user types in the editor
**Example:**
```typescript
// Source: React useEffect + setTimeout pattern, Monaco onChange API
function useCodeEditing(initialCode: string) {
  const [code, setCode] = useState(initialCode);
  const [validCode, setValidCode] = useState(initialCode);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isValid, setIsValid] = useState(true);

  // Debounced validation: runs ~500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      // 1. Validate with AST parser
      const validation = validateRemotionCode(code);

      if (!validation.valid) {
        setErrors(mapToActionableErrors(validation.errors, code));
        setIsValid(false);
        return; // Preview stays on last valid code
      }

      // 2. Transform JSX -> JS
      const transformed = transformJSX(code);
      if (!transformed.success) {
        setErrors([{ line: 1, column: 0, message: transformed.error! }]);
        setIsValid(false);
        return;
      }

      // 3. Update preview with new valid code
      setValidCode(transformed.code!);
      setErrors([]);
      setIsValid(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [code]);

  return { code, setCode, validCode, errors, isValid };
}
```

### Pattern 2: Monaco Read-Only Toggle
**What:** Toggle editor between read-only and editable modes at runtime
**When to use:** When user clicks "Edit" button to unlock editor
**Example:**
```typescript
// Source: Monaco editor.updateOptions() API
// https://github.com/microsoft/monaco-editor/issues/54

// In @monaco-editor/react, pass options dynamically:
const [isEditing, setIsEditing] = useState(false);
const editorRef = useRef<editor.IStandaloneCodeEditor>(null);

// Option 1: Via options prop (re-renders component)
<Editor
  value={code}
  onChange={(value) => setCode(value ?? '')}
  options={{
    readOnly: !isEditing,
    // ... other options
  }}
/>

// Option 2: Via editor instance (no re-render)
function toggleEdit() {
  setIsEditing(prev => {
    const next = !prev;
    editorRef.current?.updateOptions({ readOnly: !next });
    return next;
  });
}
```

### Pattern 3: Claude Multi-Turn Refinement
**What:** Send conversation history + current code to Claude for iterative refinement
**When to use:** When user submits a chat refinement message
**Example:**
```typescript
// Source: Anthropic Messages API docs
// https://platform.claude.com/docs/en/api/messages-examples

// Convex action for chat refinement
export const refine = action({
  args: {
    currentCode: v.string(),
    refinementPrompt: v.string(),
    conversationHistory: v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Build messages array: system prompt + history + new request
    const messages = [
      ...args.conversationHistory,
      {
        role: "user" as const,
        content: `Here is the current Remotion code:\n\n${args.currentCode}\n\nPlease modify it: ${args.refinementPrompt}`,
      },
    ];

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      system: REFINEMENT_SYSTEM_PROMPT,
      messages,
    });

    // Extract and validate code from response
    // ... same validation pipeline as generate action
  },
});
```

### Pattern 4: Inline Monaco Error Markers
**What:** Display validation errors as red squiggles in the editor with hover tooltips
**When to use:** After validation detects errors in user-edited code
**Example:**
```typescript
// Source: Monaco setModelMarkers API
// https://microsoft.github.io/monaco-editor/docs.html

function updateEditorMarkers(
  monacoInstance: Monaco,
  model: editor.ITextModel,
  errors: Array<{ line: number; column: number; message: string; endColumn?: number }>
) {
  if (errors.length === 0) {
    monaco.editor.setModelMarkers(model, "validation", []);
    return;
  }

  const markers: editor.IMarkerData[] = errors.map((err) => ({
    severity: monacoInstance.MarkerSeverity.Error,
    startLineNumber: err.line,
    startColumn: err.column + 1, // Monaco is 1-based
    endLineNumber: err.line,
    endColumn: err.endColumn ?? err.column + 20, // Reasonable span
    message: err.message,
  }));

  monacoInstance.editor.setModelMarkers(model, "validation", markers);
}
```

### Pattern 5: Unified Input Field (Generate vs Refine)
**What:** Single input field that acts as generation prompt or chat refinement based on context
**When to use:** Always -- the input field's behavior depends on whether code exists
**Example:**
```typescript
// Source: CONTEXT.md decisions
const hasCode = !!lastGeneration;

// Input field behavior
const placeholder = hasCode
  ? "Describe changes (e.g., 'make it faster', 'change color to blue')..."
  : "Describe the animation you want to create...";

const handleSubmit = async (text: string) => {
  if (!hasCode) {
    // No existing code: fresh generation
    await handleGenerate(text);
  } else if (text.toLowerCase().startsWith("start over:")) {
    // Explicit regeneration: clear everything
    const newPrompt = text.replace(/^start over:\s*/i, "");
    clearChatHistory();
    clearEditor();
    await handleGenerate(newPrompt);
  } else {
    // Refinement: send to Claude with current code + history
    await handleRefine(text);
  }
};
```

### Anti-Patterns to Avoid
- **Validating on every keystroke without debounce:** Will cause jank and excessive CPU usage from AST parsing. Always debounce with ~500ms delay.
- **Storing conversation history in Convex database:** Per CONTEXT.md, conversation clears on regeneration. Client-side React state is the right scope.
- **Re-running code execution on invalid code:** Only pass code to `executeCode` and preview when validation passes. Preview freezes on last valid state.
- **Showing diff/accept UI for chat responses:** CONTEXT.md explicitly says "Chat responses auto-apply to editor -- no diff/accept step."
- **Passing raw JSX to preview:** Remember the existing pipeline: raw JSX -> `validateRemotionCode()` -> `transformJSX()` -> transformed JS -> preview. User edits are raw JSX; they must go through the full pipeline.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Editor error display | Custom error overlay/panel | Monaco `setModelMarkers` API | Already has red squiggles, hover tooltips, gutter icons |
| Code undo/redo | Custom undo stack | Monaco built-in Ctrl+Z/Cmd+Z | CONTEXT.md: "Monaco built-in undo/redo" |
| Multi-turn conversation | Custom message threading | Anthropic `messages.create` with messages array | API handles context natively; just pass full history |
| JSX syntax highlighting | Custom tokenizer | Monaco `language="typescript"` (already set) | Monaco handles JSX/TSX highlighting out of box |
| Debounce implementation | lodash/external library | `useEffect` + `setTimeout` + cleanup | 10 lines of code; no dependency needed |
| Status badge (valid/invalid) | Complex validation state | Simple boolean from validation result | Validation already returns `{ valid: boolean }` |

**Key insight:** The existing Phase 6 infrastructure (validator, transformer, executor, Monaco) already handles 80% of the work. Phase 7 is primarily about connecting these pieces with React state management and adding the chat refinement Convex action.

## Common Pitfalls

### Pitfall 1: Raw JSX vs Transformed JS Confusion
**What goes wrong:** User edits raw JSX in the editor, but the preview/executor expects transformed JavaScript (sucrase output). Passing raw JSX directly to `executeCode()` will fail silently or produce errors.
**Why it happens:** Phase 6 stores transformed code from the generation action. The editor currently displays this transformed code. For editing, we need to either (a) store and display original JSX, or (b) have the editor work with transformed JS.
**How to avoid:** The generation action already transforms code before storage. For user editing, the pipeline must be: user edits raw code in editor -> client-side `validateRemotionCode()` -> client-side `transformJSX()` -> pass transformed JS to preview. This means the editor should display the raw JSX (not transformed JS), and the generation action should return/store both raw and transformed versions. Alternatively, have Claude generate code without explicit import statements (which is already the case per the system prompt -- "don't write import statements"), so the "raw" code is effectively valid JS with JSX that sucrase can transform client-side.
**Warning signs:** Preview shows "Execution Error" after user makes a valid edit; `React.createElement is not defined` errors.

### Pitfall 2: Stale Validation Reference After Code Update
**What goes wrong:** Chat refinement updates the code, but validation runs against the old code because of React state batching or stale closures.
**Why it happens:** When chat refinement returns new code and updates the editor, the debounced validation effect may still reference the previous code string.
**How to avoid:** When chat refinement returns new code, set it directly as both the editor code AND the valid code (since it passed server-side validation already). Skip the debounced validation for AI-generated updates; only run it for manual user edits. Use a flag or ref to distinguish between AI-set code and user-typed code.
**Warning signs:** Briefly seeing error markers after AI-generated code is applied; preview flickering.

### Pitfall 3: Monaco Markers Not Clearing
**What goes wrong:** Error markers (red squiggles) remain visible after the user fixes the error.
**Why it happens:** `setModelMarkers` must be called with an empty array to clear markers. If validation only sets markers on error but never clears them on success, they persist.
**How to avoid:** Always call `setModelMarkers(model, "validation", [])` when validation passes. Clear markers at the start of each validation cycle.
**Warning signs:** Red squiggles visible on code that is syntactically and semantically valid.

### Pitfall 4: Conversation History Growing Without Bound
**What goes wrong:** Each refinement adds user + assistant messages to history. After many iterations, the messages array exceeds Claude's context window or becomes very expensive.
**Why it happens:** Full conversation history is sent with every API call (stateless API).
**How to avoid:** Cap conversation history at a reasonable number of turns (e.g., last 10 exchanges = 20 messages). The current code is always sent fresh anyway, so older conversation context is less important. Show a note to the user when history is trimmed.
**Warning signs:** Slow API responses; API errors about context length; high token costs.

### Pitfall 5: Code in Editor vs Code in Preview Diverge
**What goes wrong:** Editor shows one version of code, but preview shows a different version (the last valid one). User is confused about what they're looking at.
**Why it happens:** By design, preview freezes on last valid state. But if the divergence isn't communicated clearly, users think the preview is "broken."
**How to avoid:** Use the status badge (green check vs red X) prominently. When validation fails, show a clear indicator that "Preview shows last valid version." The red squiggles in the editor + the status badge together communicate the state.
**Warning signs:** User repeatedly clicking "Run" or refreshing, thinking preview is stuck.

### Pitfall 6: Editing Transformed Code Is Confusing
**What goes wrong:** The Phase 6 generation action stores transformed JS (sucrase output), which replaces JSX syntax with `React.createElement` calls. If the editor displays this transformed code, it's much harder for users to read and edit.
**Why it happens:** The generation pipeline transforms JSX to JS for the executor, and the client receives only the transformed version.
**How to avoid:** Modify the generation action to return BOTH the original JSX code AND the transformed code. Display the original JSX in the editor (what the user/AI wrote). Run validation + transform on the client side for preview. Store original JSX for editing, transformed for execution.
**Warning signs:** Editor showing `React.createElement("div", null, ...)` instead of `<div>...</div>`.

## Code Examples

Verified patterns from official sources:

### Monaco Editor Controlled Mode with onChange
```typescript
// Source: @monaco-editor/react README
// https://github.com/suren-atoyan/monaco-react

import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

interface EditableCodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  isEditing: boolean;
  errors: Array<{ line: number; column: number; message: string }>;
}

export function EditableCodeEditor({
  code,
  onChange,
  isEditing,
  errors
}: EditableCodeEditorProps) {
  const monacoRef = useRef<Monaco>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor>(null);

  const handleMount = useCallback(
    (editorInstance: editor.IStandaloneCodeEditor, monaco: Monaco) => {
      editorRef.current = editorInstance;
      monacoRef.current = monaco;
    },
    []
  );

  // Update markers whenever errors change
  useEffect(() => {
    const monaco = monacoRef.current;
    const model = editorRef.current?.getModel();
    if (!monaco || !model) return;

    if (errors.length === 0) {
      monaco.editor.setModelMarkers(model, "validation", []);
      return;
    }

    const markers: editor.IMarkerData[] = errors.map((err) => ({
      severity: monaco.MarkerSeverity.Error,
      startLineNumber: err.line,
      startColumn: err.column + 1,
      endLineNumber: err.line,
      endColumn: err.column + 20,
      message: err.message,
    }));
    monaco.editor.setModelMarkers(model, "validation", markers);
  }, [errors]);

  return (
    <Editor
      height="400px"
      language="typescript"
      theme="vs-dark"
      value={code}
      onChange={(value) => onChange(value ?? "")}
      onMount={handleMount}
      options={{
        readOnly: !isEditing,
        minimap: { enabled: false },
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        fontSize: 13,
        wordWrap: "on",
        automaticLayout: true,
      }}
    />
  );
}
```

### Debounced Validation Hook
```typescript
// Source: React useEffect + setTimeout pattern
// Verified: standard React pattern, no library needed

import { useState, useEffect, useRef } from "react";
import { validateRemotionCode } from "@/lib/code-validator";
import { transformJSX } from "@/lib/code-transformer";

interface ValidationState {
  isValid: boolean;
  errors: Array<{ line: number; column: number; message: string }>;
  transformedCode: string | null;
}

export function useDebouncedValidation(
  code: string,
  delay: number = 500,
  skipValidation: boolean = false
): ValidationState {
  const [state, setState] = useState<ValidationState>({
    isValid: true,
    errors: [],
    transformedCode: null,
  });

  useEffect(() => {
    if (skipValidation) return;

    const timer = setTimeout(() => {
      // Step 1: AST validation
      const validation = validateRemotionCode(code);
      if (!validation.valid) {
        setState({
          isValid: false,
          errors: validation.errors,
          transformedCode: null,
        });
        return;
      }

      // Step 2: JSX transformation
      const transformed = transformJSX(code);
      if (!transformed.success) {
        setState({
          isValid: false,
          errors: [{ line: 1, column: 0, message: transformed.error ?? "Transform failed" }],
          transformedCode: null,
        });
        return;
      }

      // Step 3: Valid code
      setState({
        isValid: true,
        errors: [],
        transformedCode: transformed.code ?? null,
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [code, delay, skipValidation]);

  return state;
}
```

### Claude Refinement Action (Convex)
```typescript
// Source: Anthropic Messages API docs
// https://platform.claude.com/docs/en/api/messages-examples

import Anthropic from "@anthropic-ai/sdk";

const REFINEMENT_SYSTEM_PROMPT = `You are a Remotion animation code modifier. You receive existing Remotion code and a user request to modify it.

IMPORTANT: Output ONLY the complete modified code. No markdown, no explanations, no code blocks.

Your output must:
1. Be the complete, modified version of the code (not a diff or partial update)
2. Keep the component named "MyComposition"
3. Keep the // DURATION and // FPS comments
4. Use only the APIs listed below (no import statements)
   Available: React, useState, useEffect, useMemo, useCallback
   AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Easing, random
   Audio, Img, staticFile, Video, OffthreadVideo, Composition, Still, Series, Loop, Freeze

FORBIDDEN: import/require statements, eval, Function, fetch, document, window, process`;

// Message type for conversation history
type ChatMessage = { role: "user" | "assistant"; content: string };

// Build the messages array for Claude
function buildRefinementMessages(
  conversationHistory: ChatMessage[],
  currentCode: string,
  refinementPrompt: string
): Anthropic.MessageParam[] {
  return [
    ...conversationHistory,
    {
      role: "user",
      content: `Current code:\n\`\`\`\n${currentCode}\n\`\`\`\n\nModification requested: ${refinementPrompt}`,
    },
  ];
}
```

### Actionable Error Suggestions
```typescript
// Source: custom mapping based on existing allowlist + CONTEXT.md requirement
// Maps generic "unsafe patterns" to specific, actionable suggestions

interface ActionableError {
  line: number;
  column: number;
  message: string;          // User-friendly message
  suggestion?: string;      // Specific fix suggestion
}

function mapToActionableError(
  error: { line: number; column: number; message: string },
  codeLine: string
): ActionableError {
  // Check for specific blocked patterns in the error's line
  const blockedPatterns: Record<string, string> = {
    "fetch": "Network requests are not available. Use interpolate() or spring() for animations.",
    "setTimeout": "'setTimeout' is not available. Use Sequence with 'from' prop for timing.",
    "setInterval": "'setInterval' is not available. Use useCurrentFrame() for frame-based animation.",
    "document": "DOM access is not available. Use AbsoluteFill and inline styles for layout.",
    "window": "Browser globals are not available. Use useVideoConfig() for dimensions.",
    "eval": "Dynamic code execution is not allowed.",
    "require": "Use the pre-injected APIs instead of require().",
    "import": "Import statements are not needed. All APIs are pre-injected.",
  };

  for (const [pattern, suggestion] of Object.entries(blockedPatterns)) {
    if (codeLine.includes(pattern)) {
      return {
        ...error,
        message: `Line ${error.line}: '${pattern}' is not available.`,
        suggestion,
      };
    }
  }

  // Syntax error
  if (error.message === "Code contains syntax errors") {
    return {
      ...error,
      message: `Line ${error.line}: Syntax error. Check for missing brackets, quotes, or semicolons.`,
    };
  }

  // Default
  return {
    ...error,
    message: `Line ${error.line}: ${error.message}`,
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ControlledEditor` component | Single `Editor` component with `value` prop | @monaco-editor/react v4 | Use `value` + `onChange` for controlled mode |
| `onChange(event, value)` | `onChange(value, event)` | @monaco-editor/react v4 | Value is now first parameter |
| `lodash.debounce` | `useEffect` + `setTimeout` | React 18+ patterns | No external dependency needed |
| Separate search/chat fields | Unified input with context awareness | UX pattern trend | Single field adapts based on state |
| `useDeferredValue` for live preview | Traditional debounce for validation | React 19 (available but) | Debounce is more predictable for validation; `useDeferredValue` is render-aware but doesn't prevent validation from running |

**Deprecated/outdated:**
- `ControlledEditor` from `@monaco-editor/react` v3: Removed in v4. Use `Editor` with `value` prop instead.
- `onChange(event, value)` signature: v4 changed to `onChange(value, event)` -- value is first arg.

## Open Questions

Things that couldn't be fully resolved:

1. **Raw JSX vs Transformed Code in Editor**
   - What we know: The current `generateAnimation.ts` action stores only transformed JS (sucrase output). The editor in Phase 6 displays this transformed code. For editing to be user-friendly, the editor should display original JSX.
   - What's unclear: Whether Claude's output (which is JSX without import statements) can be stored as-is alongside the transformed version, or whether the generation action needs refactoring.
   - Recommendation: Modify the generation action to return both `code` (original JSX) and `transformedCode` (sucrase output). Store the original JSX in a new field. Display JSX in editor, transform client-side for preview. This is a schema-level decision the planner should address in the first plan.

2. **Conversation History Scope**
   - What we know: CONTEXT.md says conversation clears on regeneration. Client-side React state is the right storage.
   - What's unclear: Whether to also store the initial generation prompt as the first conversation message for continuity.
   - Recommendation: Include the initial prompt as the first user message in conversation history. When AI responds with code, include a synthetic assistant message summarizing the code. This gives Claude full context for refinements.

3. **Editor Height: Fixed vs Resizable**
   - What we know: CONTEXT.md marks this as "Claude's Discretion."
   - What's unclear: What height works best with the new chat UI below the prompt.
   - Recommendation: Use fixed height of 400px (up from current 300px to give editing room). The layout already uses a 2-column grid (preview | editor). Adding chat below the prompt area in the left column keeps the layout balanced. Resizable adds complexity without clear value for v1.

## Sources

### Primary (HIGH confidence)
- `@monaco-editor/react` v4 API - onChange, value, options, onMount, onValidate props verified via npm docs and GitHub README
- Monaco `setModelMarkers` API - IMarkerData structure, severity levels, clear pattern verified via official docs
- Anthropic Messages API - multi-turn conversation pattern, messages array, system prompt, TypeScript SDK verified via official docs at platform.claude.com
- Existing codebase analysis - code-validator.ts, code-executor.ts, code-transformer.ts, generateAnimation.ts, code-display.tsx, create-page-client.tsx read directly

### Secondary (MEDIUM confidence)
- Monaco `editor.updateOptions({ readOnly })` for dynamic toggle - verified via GitHub issues and community docs, consistent across multiple sources
- Debounce patterns (useEffect + setTimeout) - well-established React pattern verified across multiple sources
- `useDeferredValue` vs debounce comparison - verified via React docs and recent community articles (Dec 2025)

### Tertiary (LOW confidence)
- None. All findings verified with at least two sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and verified in codebase
- Architecture: HIGH - Patterns derived from existing codebase structure + verified library APIs
- Pitfalls: HIGH - Identified from direct codebase analysis (raw vs transformed code, marker clearing, state sync)
- Chat refinement: HIGH - Anthropic API is well-documented and straightforward

**Research date:** 2026-01-29
**Valid until:** 2026-02-28 (30 days - stable libraries, no major version changes expected)
