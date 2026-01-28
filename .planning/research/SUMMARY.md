# Project Research Summary

**Project:** RemotionLab v1.1 - Full Code Generation
**Domain:** AI-powered video creation with code execution
**Researched:** 2026-01-28
**Confidence:** MEDIUM-HIGH

## Executive Summary

RemotionLab v1.1 transitions from props-based generation (Claude outputs JSON props for fixed templates) to full code generation (Claude outputs Remotion JSX that must be validated and executed). This is fundamentally a **security challenge disguised as a feature request**. Research reveals that AI-generated code contains vulnerabilities 40-65% of the time, and code execution without proper sandboxing is the #1 risk in agentic AI systems.

The recommended approach uses an **Interpreter Pattern with AST Validation**: Claude generates JSX code, which is parsed by acorn, validated against a strict whitelist by ast-guard, transformed by sucrase, and executed via Function constructor with controlled scope injection. For Lambda rendering, a pre-bundled "DynamicCode" meta-composition accepts code as a prop and runs the same validation pipeline. This avoids the need for runtime bundling (which Remotion explicitly does not support in serverless) while enabling unlimited animation possibilities.

The key risk is security: prompt injection, code execution without sandboxing, and package hallucination are all critical pitfalls. Mitigation requires defense-in-depth: input sanitization, AST validation before execution, controlled scope injection, execution timeouts, and monitoring. Secondary risks include user expectation mismatch (code generation is less reliable than props) and bundle size explosion from adding compilation infrastructure.

## Key Findings

### Recommended Stack

The existing v1.0 stack (Next.js 16, Clerk, Convex, Remotion Lambda, Claude API) remains unchanged. v1.1 adds a code execution layer:

**Core additions for v1.1:**
- **acorn + acorn-jsx**: JavaScript/JSX parser (55M weekly downloads, battle-tested) - Parse generated code to AST
- **ast-guard**: AST validation library (purpose-built for LLM code) - Whitelist-only globals, block dangerous patterns
- **sucrase**: Fast JSX transpilation (20x faster than Babel) - Transform JSX to executable JS

**Why NOT alternatives:**
- E2B/Vercel Sandbox: Adds 150ms latency, $150/mo minimum, overkill for controlled JSX
- iframe sandbox: Breaks Remotion hooks/context (cannot access useCurrentFrame across iframe)
- Re-bundle per generation: Remotion explicitly states bundle() cannot be called in serverless
- eval(): Security vulnerability, accesses local scope

**Total bundle addition:** ~700KB (acorn 130KB, acorn-jsx 12KB, ast-guard ~50KB, sucrase 500KB)

### Expected Features

**Must have (table stakes):**
- Code preview (Monaco editor for viewing generated code)
- Code validation pipeline (AST + security checks before execution)
- Safe execution environment (controlled scope, no network/DOM access)
- Preview integration (Remotion Player renders validated code)
- Expanded animation types (shapes, motion graphics beyond text-only)

**Should have (competitive):**
- Inline code editing (modify generated code without full regeneration)
- Iteration via chat ("make the text bigger" refines existing code)
- Error recovery suggestions (AI suggests fixes when validation fails)
- Template-to-code conversion (existing templates become editable code starting points)

**Defer (v2+):**
- Visual edits (click on preview elements to modify)
- Real-time preview updates (hot reload as code changes)
- Multi-scene compositions (intro -> main -> outro)
- Export to standalone Remotion project
- Version history beyond current session

### Architecture Approach

The research compared three approaches and recommends **Interpreter Pattern with AST Validation** using a meta-composition for Lambda. The key insight is that Lambda requires pre-bundled compositions - you cannot bundle() at runtime in serverless. The DynamicCode composition accepts code as a prop and executes it through the same validation pipeline.

**Major components:**
1. **Code Validator** (lib/code-validator.ts) - acorn + ast-guard, whitelist Remotion APIs, block dangerous patterns
2. **Code Transformer** (lib/jsx-transformer.ts) - sucrase, JSX to JS conversion
3. **Code Executor** (lib/code-executor.ts) - Function constructor with controlled scope injection
4. **DynamicCode Composition** (remotion/compositions/DynamicCode.tsx) - Meta-composition that accepts code as prop for Lambda rendering
5. **Enhanced Claude Prompt** - System prompt based on Remotion llms.txt with explicit API guidance

**Key architectural decision:** Lambda uses pre-bundled DynamicCode composition that runs validation internally. Code is passed as inputProps, not bundled at runtime.

### Critical Pitfalls

1. **Executing AI code without proper sandboxing** - Use controlled scope injection via Function constructor. Block window, document, fetch, localStorage. AST validation rejects eval, import, require.

2. **Prompt injection leading to malicious code** - Input sanitization (strip control characters, normalize unicode). Output validation (AST parse, forbidden pattern detection, allowlist validation). Rate limiting slows probe attempts.

3. **Package hallucination** - Explicit import allowlist (only remotion, @remotion/*, react). AST import extraction validates before execution. No dynamic imports permitted.

4. **Infinite loops and resource exhaustion** - Execution timeout (5 seconds). Loop detection in AST with iteration counters. Web Worker for compute isolation.

5. **Preview/render divergence** - Reject Math.random() (require seeded random). Reject Date.now() outside allowed patterns. Block window.* access. Provide Remotion-specific abstractions.

## Implications for Roadmap

Based on research, suggested phase structure for v1.1:

### Phase 1: Code Validation & Safe Execution Foundation
**Rationale:** Security is foundational. Cannot ship code generation without sandbox.
**Delivers:** Validated code execution pipeline that blocks dangerous patterns.
**Addresses:** Code preview, code validation, safe execution, expanded animation types.
**Avoids:** Pitfalls 1-4 (sandbox, prompt injection, hallucination, infinite loops).

Build order within phase:
1. Implement ast-guard validation with Remotion whitelist
2. Implement sucrase transformation
3. Implement Function constructor execution with scope injection
4. Create DynamicCode meta-composition for Lambda
5. Deploy updated Lambda bundle (one-time)
6. Add Monaco editor for code preview (read-only initially)

### Phase 2: User Editing & Iteration
**Rationale:** Once safe execution exists, enable user interaction with code.
**Delivers:** Editable code, chat-based refinement, error recovery.
**Uses:** Code editor (Monaco), state management for edit history.
**Implements:** Inline editing, regenerate with context, error recovery suggestions.

Build order within phase:
1. Make Monaco editor editable
2. Add re-validation on every edit
3. Implement state machine (GENERATED -> EDITING -> REGENERATING)
4. Add chat-based iteration (send previous code + modification request)
5. Add error recovery suggestions (parse validation errors, suggest fixes)

### Phase 3: Polish & Advanced Features
**Rationale:** Core functionality complete, add differentiators.
**Delivers:** Template conversion, export capability, generation history.
**Addresses:** Deferred features that enhance but don't block launch.

Build order within phase:
1. Convert existing templates to editable code starting points
2. Add generation/edit version history
3. Add "Export to Remotion project" for power users
4. Performance optimization (lazy load editor, bundle splitting)

### Phase Ordering Rationale

- **Security before features:** Phase 1 establishes sandbox and validation before any user-facing code editing. This matches PITFALLS.md guidance: "Phase 1 of v1.1 - Never execute AI code without sandbox."
- **Read-only before editable:** Code preview (read-only Monaco) ships in Phase 1. Editing ships in Phase 2. Reduces complexity and risk in initial release.
- **Core before polish:** Export, templates, history are valuable but not blocking. Ship working code generation first.
- **Matches ARCHITECTURE.md build order:** Schema -> Validation -> Execution -> Editor -> Iteration.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Code execution sandbox implementation needs technical spike. ast-guard is newer library (MEDIUM confidence). Function constructor security needs thorough testing.
- **Phase 2:** State management for code editor is complex (Pitfall 6). Evaluate CodeMirror vs Monaco before committing.

Phases with standard patterns (skip research-phase):
- **Phase 3:** Export to Remotion project and template conversion are straightforward file generation. Version history is standard database pattern.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | acorn, sucrase are battle-tested. ast-guard is purpose-built for this use case. |
| Features | HIGH | Consistent patterns across v0.dev, Bolt.new, Cursor. Remotion llms.txt is authoritative. |
| Architecture | MEDIUM | Meta-composition pattern verified against Remotion docs. Function constructor approach needs testing. |
| Pitfalls | HIGH | Security research from NVIDIA, OWASP, Endor Labs. Multiple sources confirm same risks. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **ast-guard validation in practice:** Newer library, needs testing with real Claude output. May need custom rules for Remotion-specific patterns.
- **Function constructor security:** Approach is sound in theory, needs adversarial testing before production.
- **Bundle size impact:** 700KB addition is estimate. Measure actual impact and implement lazy loading if needed.
- **Claude prompt engineering:** System prompt for code generation needs iteration. Start with Remotion llms.txt, refine based on output quality.
- **Preview/render parity:** Need automated visual regression tests comparing Player preview to Lambda render output.

## Sources

### Primary (HIGH confidence)
- [Remotion Lambda Documentation](https://www.remotion.dev/docs/lambda) - bundle() cannot be called in serverless
- [Remotion deploySite](https://www.remotion.dev/docs/lambda/deploysite) - Bundle deployment pattern
- [Remotion llms.txt](https://www.remotion.dev/llms.txt) - Official system prompt for AI code generation
- [Remotion Parameterized Rendering](https://www.remotion.dev/docs/parameterized-rendering) - InputProps pattern
- [OWASP LLM01](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) - Prompt injection risks
- [OWASP Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) - Mitigation strategies

### Secondary (MEDIUM confidence)
- [acorn GitHub](https://github.com/acornjs/acorn) - 55M weekly downloads, used by ESLint
- [sucrase GitHub](https://github.com/alangpierce/sucrase) - 8M weekly downloads, 20x faster than Babel
- [ast-guard Documentation](https://agentfront.dev/docs/guides/ast-guard) - Purpose-built for LLM code validation
- [NVIDIA Code Execution Risks](https://developer.nvidia.com/blog/how-code-execution-drives-key-risks-in-agentic-ai-systems/) - #1 risk in agentic AI
- [Endor Labs AI Code Security](https://www.endorlabs.com/learn/the-most-common-security-vulnerabilities-in-ai-generated-code) - 40-65% vulnerability rate

### Tertiary (LOW confidence)
- [Sandpack Documentation](https://sandpack.codesandbox.io/) - Alternative sandbox approach, not recommended for this use case
- [CHI Expectation vs Experience](https://dl.acm.org/doi/fullHtml/10.1145/3491101.3519665) - UX research on code generation tools

---
*Research completed: 2026-01-28*
*Previous version: 2026-01-27 (v1.0)*
*Ready for roadmap: yes*
