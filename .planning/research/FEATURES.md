# Feature Landscape: Full Code Generation (v1.1)

**Domain:** AI-powered code generation for creative tools (video/animation)
**Researched:** 2026-01-28
**Milestone:** v1.1 Full Code Generation
**Confidence:** HIGH (based on patterns from v0.dev, Bolt.new, Cursor, and Remotion docs)

## Executive Summary

RemotionLab v1.0 generates JSON props for fixed templates. v1.1 transitions to **full code generation** where Claude generates actual Remotion JSX code, enabling unlimited animation possibilities beyond the current text-only animations.

This research focuses specifically on **code generation UX patterns** from the 2026 AI coding tools landscape (v0.dev, Bolt.new, Cursor, Windsurf) and applies them to the creative/animation domain.

**Current system:** User prompt -> Claude generates JSON props -> Fixed TextAnimation component renders
**Target system:** User prompt -> Claude generates Remotion JSX code -> Validation -> Safe execution -> Preview/render

---

## Table Stakes

Features users expect from any AI code generation tool. Missing these makes the product feel broken.

| Feature | Why Expected | Complexity | Depends On | Notes |
|---------|--------------|------------|------------|-------|
| **Code Preview** | Users want to see what was generated before execution | Low | Generation pipeline | Monaco Editor is industry standard; @monaco-editor/react works without webpack config |
| **Syntax Highlighting** | Code without highlighting looks unprofessional and hard to understand | Low | Code Preview | Monaco provides TypeScript/JSX highlighting out of the box |
| **Error Messages on Generation Failure** | Users need to know why generation failed | Low | Existing (already built) | v1.0 has this; extend for code-specific errors (syntax, validation) |
| **Code Validation Before Execution** | Prevents runtime crashes, security vulnerabilities | High | AST parser | Must parse, validate structure, check for dangerous patterns; study found AI code has 1.7x more issues |
| **Safe Execution Environment** | Users must not be able to break the system or access sensitive data | High | Sandbox technology | Core security requirement; iframe sandbox is proven approach |
| **Regenerate Option** | First generation often needs refinement; <50% of AI code accepted without changes | Low | Generation pipeline | "Try again" with same or modified prompt |
| **Preview Before Render** | Users need to see animation before committing to expensive Lambda render | Medium | Safe execution | Remotion Player integration already exists; needs to work with dynamic code |
| **Expanded Animation Types** | Shapes, motion graphics, transitions beyond just text | Medium | Full Remotion API access | Users expect more than 4 text styles (fade-in, typewriter, slide-up, scale) |

---

## Differentiators

Features that set RemotionLab apart in the AI code generation space. Not expected, but highly valued.

| Feature | Value Proposition | Complexity | Depends On | Notes |
|---------|-------------------|------------|------------|-------|
| **Inline Code Editing** | Edit generated code directly without full regeneration | Medium | Code Preview | Cursor pioneered "select and describe changes"; 40% faster iteration |
| **Visual Edits** | Click on preview elements to modify them | High | Preview + code sync | Lovable's killer feature; Firebase Studio has similar |
| **Iteration via Chat** | "Make the text bigger" instead of editing code | Medium | Conversation context | v0.dev's refinement loop; maintains generation history |
| **Real-time Preview Updates** | Preview updates as code changes | High | Hot reload in sandbox | WebContainer enables; Bolt.new and Windsurf have this |
| **Code Explanation** | AI explains what the generated code does | Low | Generation pipeline | Builds trust, helps users learn Remotion; educational value |
| **Error Recovery Suggestions** | AI suggests fixes when code fails validation | Medium | Validation + LLM | "Your code uses Math.random() which isn't deterministic. Use random('seed') instead." |
| **Template-to-Code Conversion** | Use existing templates as editable code starting points | Low | Existing templates | 8 templates already exist; convert props to full JSX |
| **Export to Remotion Project** | Download code as standalone Remotion project | Medium | Code generation | For power users who want to continue in their own IDE; unique differentiator |
| **Version History** | Undo/redo through generation iterations | Medium | Storage | Track each generation/edit; allow reverting to previous versions |
| **Multi-Scene Compositions** | Generate sequences with multiple scenes | High | Sequence understanding | "Intro -> main content -> outro" workflow using Remotion's Sequence/Series |

---

## Anti-Features

Features to deliberately NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Unrestricted Code Execution** | Security nightmare; could exfiltrate data, crash servers, mine crypto | Strict sandbox with allowlist of permitted APIs, no network access, memory/time limits |
| **Full IDE Experience** | Scope creep; VS Code took years to build; Cursor is a funded company | Monaco editor with syntax highlighting and basic editing is sufficient |
| **Collaborative Real-time Editing** | CRDT implementation is extremely complex; even Google Docs struggles | Single-user editing; collaboration via share/export |
| **Custom Font Uploads** | File handling complexity, font licensing issues, security concerns | Support Google Fonts (Remotion has built-in support) and system fonts |
| **Audio Generation** | Different AI domain entirely; complicates rendering pipeline | Visual-only for v1.1; audio is separate future milestone |
| **Node.js Server Access** | Sandbox escape vector; security risk | Browser-only sandbox; no server-side code execution by users |
| **Arbitrary npm Package Installation** | Supply chain attacks, sandbox escapes, unpredictable behavior | Curated allowlist of safe packages (Remotion core, @remotion/* packages only) |
| **Infinite Undo History** | Storage costs, complexity, performance | Reasonable limit (20-50 iterations per session) |
| **Visual Drag-and-Drop Editor** | Different product entirely; competes with Canva, Rive | Code-first approach; visual editing only for property modifications |
| **Full React Ecosystem Access** | Security and bundle size concerns | Remotion APIs only; no arbitrary React libraries |

---

## Feature Dependencies

```
                        +------------------+
                        |   Text Prompt    |
                        +--------+---------+
                                 |
                                 v
                    +------------+------------+
                    |  Claude Code Generation |
                    |  (Remotion JSX output)  |
                    +------------+------------+
                                 |
                                 v
               +-----------------+------------------+
               |                                    |
               v                                    v
    +----------+----------+              +---------+---------+
    |   Code Preview      |              |  Code Validation  |
    |   (Monaco Editor)   |              |  (AST + Security) |
    +----------+----------+              +---------+---------+
               |                                    |
               |   +----------------+               |
               +-->|  Inline Editing |<-------------+
                   +-------+--------+     (re-validate on edit)
                           |
                           v
                   +-------+--------+
                   | Safe Execution |
                   |   (Sandbox)    |
                   +-------+--------+
                           |
                           v
                   +-------+--------+
                   | Remotion Player|
                   |   (Preview)    |
                   +-------+--------+
                           |
                           v
                   +-------+--------+
                   |  Render to MP4 |
                   |  (Lambda)      |
                   +------ +--------+
```

**Dependency Chain:**
1. **Code Generation** must output valid Remotion JSX
2. **Code Validation** must pass before **Safe Execution**
3. **Safe Execution** must work before **Preview** can show dynamic code
4. **Preview** already integrates with **Render** (v1.0)
5. **Inline Editing** requires both **Code Preview** and **Validation** to re-validate changes

**Parallel Tracks:**
- Chat-based iteration can be built alongside code editing
- Export feature is independent once generation works
- Error recovery suggestions layer onto validation
- Version history is independent infrastructure

---

## MVP Recommendation for v1.1

### Must Have (Table Stakes)

These features are required for code generation to work at all.

1. **Code Generation Pipeline** - Claude generates complete Remotion JSX instead of JSON props
   - System prompt based on Remotion's llms.txt guidelines
   - Handle imports, component structure, animation APIs

2. **Code Preview** - Monaco editor shows generated code
   - Syntax highlighting for TypeScript/JSX
   - Read-only initially (editing comes next)

3. **Code Validation Pipeline** - Parse and validate before execution
   - TypeScript/JSX parsing (AST analysis)
   - Security checks (no eval, no fetch, no Math.random)
   - Remotion-specific validation (determinism requirements)

4. **Safe Execution Sandbox** - Execute code without system access
   - Iframe sandbox with `sandbox="allow-scripts"`
   - Limited API surface (only Remotion globals)
   - Memory and execution time limits

5. **Preview Integration** - Remotion Player renders dynamic code
   - Bridge sandbox output to Player component
   - Maintain existing playback controls

### Should Have (Key Differentiators)

Add after core pipeline works.

6. **Inline Editing** - Users can modify code before preview/render
   - Monaco editor becomes editable
   - Re-validate on every change
   - Syntax error highlighting

7. **Regenerate with Context** - "Make it faster" refines existing code
   - Send previous generation + modification request
   - Claude maintains conversation context

8. **Error Recovery Suggestions** - Clear messages with actionable fixes
   - Parse validation errors
   - Suggest Remotion-specific fixes (random -> random('seed'), etc.)

### Defer to Post-MVP

- Visual edits (click on preview to modify)
- Real-time preview updates (hot reload)
- Multi-scene compositions
- Export to standalone project
- Version history beyond current session

---

## Sandbox Security Requirements

Based on 2026 best practices for executing AI-generated code.

### Required Restrictions

| Restriction | Why | Implementation |
|-------------|-----|----------------|
| No network access | Prevent data exfiltration | Iframe sandbox without `allow-same-origin` |
| No localStorage/cookies | Prevent persistence attacks | Sandbox attribute blocks by default |
| No parent window access | Prevent DOM manipulation | `sandbox` attribute + separate origin |
| Time limit | Prevent infinite loops | Kill execution after 30 seconds |
| Memory limit | Prevent memory exhaustion | Browser handles via separate process |
| No eval/Function | Prevent code injection | AST validation + CSP headers |

### Allowed APIs (Allowlist)

| API | Reason |
|-----|--------|
| Remotion hooks (`useCurrentFrame`, `useVideoConfig`) | Core animation APIs |
| Remotion components (`AbsoluteFill`, `Sequence`, `Series`) | Layout and timing |
| Remotion utilities (`interpolate`, `spring`, `random`) | Animation helpers |
| React core (`useState`, `useEffect`, `useMemo`) | Component logic |
| CSS (inline styles) | Styling animations |
| `@remotion/google-fonts` | Font loading |
| Math (except Math.random) | Calculations |

### Blocked Patterns (AST Check)

| Pattern | Risk |
|---------|------|
| `eval(...)` | Code injection |
| `new Function(...)` | Code injection |
| `fetch(...)` / `XMLHttpRequest` | Network access |
| `Math.random()` | Non-deterministic rendering |
| `Date.now()` / `new Date()` | Non-deterministic rendering |
| `window.*` / `document.*` | DOM access |
| `localStorage` / `sessionStorage` | Persistence |
| `import(...)` dynamic imports | Arbitrary code loading |

---

## Remotion Code Generation Guidelines

From Remotion's official llms.txt system prompt.

### Required Structure

```typescript
// Every composition must have:
- registerRoot(Root) in entry file
- <Composition> with id, component, durationInFrames, width, height, fps
- Default: fps=30, width=1920, height=1080
```

### Animation Patterns

| Pattern | API | Notes |
|---------|-----|-------|
| Frame-based animation | `useCurrentFrame()` | Core hook for all animations |
| Config access | `useVideoConfig()` | Get fps, duration, dimensions |
| Value interpolation | `interpolate()` | Always include `extrapolateLeft: 'clamp'`, `extrapolateRight: 'clamp'` |
| Physics-based motion | `spring()` | Pass `fps`, `frame`, and `config` |
| Deterministic randomness | `random('seed')` | Never use `Math.random()` |
| Layering | `<AbsoluteFill>` | Z-index via nesting order |
| Timing | `<Sequence from={frame}>` | Delay elements |
| Sequential elements | `<Series>` | No gaps between items |

### Critical Requirements

1. **All code must be deterministic** - Same input = same output
2. **TypeScript only** - No plain JavaScript
3. **No side effects** - Components must be pure
4. **Proper extrapolation** - Always clamp `interpolate()` outputs

---

## Complexity Estimates

| Feature | Estimated Effort | Risk Level | Notes |
|---------|------------------|------------|-------|
| Monaco Editor Integration | 1-2 days | Low | @monaco-editor/react is well-documented |
| Code Validation Pipeline | 3-5 days | Medium | AST parsing, security rules, error messages |
| Sandbox Execution | 5-8 days | High | Security-critical, many edge cases to handle |
| Claude Code Generation Prompt | 2-3 days | Medium | Prompt engineering, testing various inputs |
| Preview Integration with Dynamic Code | 2-3 days | Medium | Bridge sandbox to Remotion Player |
| Inline Editing with Re-validation | 2-3 days | Low | Builds on validation pipeline |
| Chat-based Iteration | 3-4 days | Medium | Context management, conversation state |

**Total MVP estimate:** 3-4 weeks of focused development

---

## Success Metrics

| Metric | Target | Why |
|--------|--------|-----|
| Generation success rate | >85% | Code should compile and render most of the time |
| Time to first preview | <10 seconds | Users expect fast feedback |
| Validation catch rate | >99% of unsafe code | Security is non-negotiable |
| User iteration count | <3 regenerations per final video | Good first generation reduces iteration |
| Code export usage | >20% of power users | Validates differentiator value |

---

## Sources

### AI Code Generation UX Patterns
- [Top 10 Vibe Coding Tools 2026](https://www.toools.design/blog-posts/top-10-vibe-coding-tools-designers-will-love-in-2026) - Design-centric AI patterns
- [AI Coding Trends 2026 - Medium](https://medium.com/ai-software-engineer/12-ai-coding-emerging-trends-that-will-dominate-2026-dont-miss-out-dae9f4a76592) - Industry direction
- [MIT Technology Review - AI Coding](https://www.technologyreview.com/2025/12/15/1128352/rise-of-ai-coding-developers-2026/) - Developer perspectives
- [Best AI Code Editors 2026](https://playcode.io/blog/best-ai-code-editors-2026) - Editor feature comparison

### AI App Builders (UX Reference)
- [v0 vs Bolt Comparison](https://www.index.dev/blog/v0-vs-bolt-ai-app-builder-review) - Iteration workflow patterns
- [Best AI App Builders 2026](https://getmocha.com/blog/best-ai-app-builder-2026/) - Feature expectations
- [Bolt.new WebContainers](https://aitoolsinsights.com/articles/stackblitz-bolt-new-infrastructure-explained) - In-browser execution
- [2026 AI Coding Platform Wars](https://medium.com/@aftab001x/the-2026-ai-coding-platform-wars-replit-vs-windsurf-vs-bolt-new-f908b9f76325) - Competitive landscape

### Remotion + AI
- [Remotion AI Documentation](https://www.remotion.dev/docs/ai/claude-code) - Official Claude integration guide
- [Remotion System Prompt for LLMs](https://www.remotion.dev/llms.txt) - Full guidelines for AI code generation
- [Remotion Skills Guide](https://gaga.art/blog/remotion-skills/) - Skills feature overview
- [Claude Code + Remotion](https://medium.com/@ai-with-eric/claude-code-remotion-professional-content-with-zero-video-skills-3545498407ff) - Real-world usage

### Sandbox Security
- [Claude Code Sandboxing - Anthropic](https://www.anthropic.com/engineering/claude-code-sandboxing) - Official sandboxing approach
- [Claude Code Security Best Practices](https://www.backslash.security/blog/claude-code-security-best-practices) - Security guidelines
- [WebContainers AI](https://webcontainers.io/ai) - Browser-based execution
- [Top Sandbox Platforms 2026](https://www.koyeb.com/blog/top-sandbox-code-execution-platforms-for-ai-code-execution-2026) - Platform comparison
- [Iframe Security 2026](https://qrvey.com/blog/iframe-security/) - Iframe sandboxing best practices
- [JavaScript Sandboxing Deep Dive](https://dev.to/leapcell/a-deep-dive-into-javascript-sandboxing-97b) - Technical implementation

### Code Quality & Validation
- [AI-Generated Code Statistics](https://techintelpro.com/news/ai/enterprise-ai/study-ai-generated-code-has-17x-more-issues-than-human-code) - Quality benchmarks
- [AI Code Security - Jit](https://www.jit.io/resources/ai-security/ai-generated-code-the-security-blind-spot-your-team-cant-ignore) - Security considerations

### Code Editors
- [Monaco Editor React](https://github.com/suren-atoyan/monaco-react) - React integration
- [Monaco Editor Documentation](https://monaco-react.surenatoyan.com/) - API reference

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Table Stakes Features | HIGH | Consistent patterns across v0, Bolt, Cursor, Windsurf |
| Differentiators | HIGH | Clear market differentiation from competitor research |
| Anti-Features | HIGH | Security best practices well-documented; clear risks |
| Sandbox Approach | MEDIUM | Multiple valid approaches (iframe, WebContainer); needs technical spike |
| Complexity Estimates | MEDIUM | Based on similar projects; actual depends on codebase specifics |
| Remotion Guidelines | HIGH | Directly from official llms.txt documentation |

---
*Research completed: 2026-01-28*
*Previous version: 2026-01-27 (v1.0 features)*
*This version: v1.1 Full Code Generation focus*
*Feeds into: Requirements definition, Phase planning*
