---
phase: 06-code-generation-safe-execution
plan: 01
subsystem: security
tags: [ast, acorn, acorn-jsx, sucrase, validation, transformation, remotion, security]

# Dependency graph
requires:
  - phase: 05-render-pipeline
    provides: Template-based rendering foundation
provides:
  - AST-based code validation with acorn
  - JSX transformation with sucrase
  - Security allowlist for Remotion APIs
affects: [06-02, 06-03, code-executor, dynamic-code]

# Tech tracking
tech-stack:
  added: [acorn, acorn-jsx, sucrase]
  patterns: [AST validation, whitelist security, generic error messages]

key-files:
  created:
    - src/lib/remotion-allowlist.ts
    - src/lib/code-validator.ts
    - src/lib/code-transformer.ts

key-decisions:
  - "Whitelist-only imports (remotion, @remotion/*, react)"
  - "Generic error messages for security (don't reveal blocklist)"
  - "Classic JSX runtime for Remotion compatibility"
  - "Block all dynamic code execution, network, DOM, and Node.js access"

patterns-established:
  - "Security validation pipeline: parse -> validate -> transform"
  - "ValidationResult with line/column for Monaco inline errors"
  - "isImportAllowed() for @remotion/* prefix matching"

# Metrics
duration: 3min
completed: 2026-01-28
---

# Phase 6 Plan 1: Code Validation Infrastructure Summary

**AST-based validation pipeline with acorn/acorn-jsx for security and sucrase for JSX transformation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-28T10:41:08Z
- **Completed:** 2026-01-28T10:43:43Z
- **Tasks:** 3
- **Files modified:** 5 (including package.json, package-lock.json)

## Accomplishments

- Security allowlist defining allowed imports (remotion, react only), safe globals, and blocked patterns
- AST parser walking code to detect dangerous patterns (eval, fetch, document, etc.)
- JSX-to-JS transformer using sucrase for fast conversion
- Validation returns line/column info for Monaco editor integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create Remotion allowlist** - `e93a205` (feat)
2. **Task 2: Create AST validator with acorn** - `099a548` (feat)
3. **Task 3: Create JSX transformer with sucrase** - `1c8d5bd` (feat)

## Files Created/Modified

- `src/lib/remotion-allowlist.ts` - Security definitions: ALLOWED_IMPORTS, ALLOWED_GLOBALS, BLOCKED_PATTERNS
- `src/lib/code-validator.ts` - AST-based validation using acorn + acorn-jsx
- `src/lib/code-transformer.ts` - JSX to JS transformation using sucrase
- `package.json` - Added acorn, acorn-jsx, sucrase dependencies
- `package-lock.json` - Updated lockfile

## Decisions Made

- **Whitelist-only approach:** Only explicitly allowed imports can pass (remotion, @remotion/*, react)
- **Generic error messages:** Per security requirements, errors say "Code contains unsafe patterns" without revealing what was blocked
- **Classic JSX runtime:** Using React.createElement style for Remotion compatibility
- **Comprehensive blocking:** eval, Function, fetch, XMLHttpRequest, WebSocket, document, window, process, globalThis, require, import(), setTimeout, setInterval all blocked

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Validation pipeline ready for Plan 02 (code executor integration)
- validateRemotionCode() validates AI-generated code before execution
- transformJSX() converts validated JSX to executable JavaScript
- Foundation for DynamicCode meta-composition is complete

---
*Phase: 06-code-generation-safe-execution*
*Completed: 2026-01-28*
