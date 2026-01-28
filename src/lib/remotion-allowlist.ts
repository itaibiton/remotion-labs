/**
 * Remotion Code Allowlist
 *
 * Defines allowed imports, globals, and blocked patterns for code validation.
 * This is the security foundation - only explicitly allowed code patterns can execute.
 *
 * Security principle: Whitelist-only approach
 * - Only known-safe imports are allowed
 * - Only Remotion/React globals are permitted
 * - All dynamic code execution is blocked
 * - All network/DOM/Node.js access is blocked
 */

/**
 * Allowed import sources - only these packages can be imported.
 * Uses prefix matching for @remotion/* packages.
 */
export const ALLOWED_IMPORTS: ReadonlySet<string> = new Set([
  // Core Remotion
  "remotion",

  // Remotion sub-packages (commonly used)
  "@remotion/google-fonts",
  "@remotion/animation-utils",
  "@remotion/layout-utils",
  "@remotion/shapes",
  "@remotion/noise",
  "@remotion/paths",
  "@remotion/media-utils",
  "@remotion/transitions",
  "@remotion/motion-blur",
  "@remotion/gif",

  // React (required for JSX)
  "react",
]);

/**
 * Check if an import source is allowed.
 * Handles exact matches and @remotion/* prefix.
 */
export function isImportAllowed(source: string): boolean {
  // Exact match
  if (ALLOWED_IMPORTS.has(source)) {
    return true;
  }

  // Allow any @remotion/* subpackage
  if (source.startsWith("@remotion/")) {
    return true;
  }

  return false;
}

/**
 * Allowed global identifiers - safe Remotion/React APIs.
 * These can appear in code without being blocked.
 */
export const ALLOWED_GLOBALS: ReadonlySet<string> = new Set([
  // React
  "React",
  "useState",
  "useEffect",
  "useMemo",
  "useCallback",
  "useRef",
  "Fragment",

  // Remotion Core
  "AbsoluteFill",
  "Sequence",
  "Audio",
  "Img",
  "Video",
  "Series",
  "Loop",
  "OffthreadVideo",

  // Remotion Hooks
  "useCurrentFrame",
  "useVideoConfig",
  "useCurrentScale",
  "staticFile",
  "random",
  "continueRender",
  "delayRender",
  "getInputProps",

  // Remotion Animation
  "interpolate",
  "spring",
  "Easing",
  "interpolateColors",
  "measureSpring",

  // Remotion Utilities
  "getRemotionEnvironment",

  // Common JS globals (safe)
  "Math",
  "Array",
  "Object",
  "String",
  "Number",
  "Boolean",
  "JSON",
  "Date",
  "RegExp",
  "Map",
  "Set",
  "Promise",
  "console",
  "undefined",
  "null",
  "NaN",
  "Infinity",
  "parseInt",
  "parseFloat",
  "isNaN",
  "isFinite",
  "encodeURIComponent",
  "decodeURIComponent",
]);

/**
 * Blocked patterns - dangerous identifiers that must be rejected.
 * If any of these appear in code, validation fails.
 *
 * Categories:
 * 1. Dynamic code execution (eval, Function constructor)
 * 2. Module system manipulation (import, require)
 * 3. Network access (fetch, XMLHttpRequest, WebSocket)
 * 4. DOM access (document, window)
 * 5. Node.js globals (process, __dirname, etc.)
 * 6. Global scope manipulation
 */
export const BLOCKED_PATTERNS: ReadonlySet<string> = new Set([
  // Dynamic code execution
  "eval",
  "Function",

  // Module system (dynamic)
  "require",
  "import",
  "module",
  "exports",

  // Network access
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "Request",
  "Response",
  "Headers",

  // DOM access
  "document",
  "window",
  "location",
  "navigator",
  "history",
  "localStorage",
  "sessionStorage",
  "indexedDB",

  // Node.js globals
  "process",
  "global",
  "globalThis",
  "__dirname",
  "__filename",
  "Buffer",
  "setImmediate",
  "clearImmediate",

  // Timers (could be used for denial of service)
  "setTimeout",
  "setInterval",
  "clearTimeout",
  "clearInterval",

  // Other dangerous APIs
  "Proxy",
  "Reflect",
  "constructor",
  "prototype",
  "__proto__",
]);

/**
 * Blocked member access patterns - object.property combinations to reject.
 * These catch things like Object.constructor or Function.prototype.
 */
export const BLOCKED_MEMBER_PATTERNS: ReadonlyArray<[string, string]> = [
  ["Object", "constructor"],
  ["Function", "prototype"],
  ["Function", "constructor"],
  ["Array", "constructor"],
  ["String", "constructor"],
  ["Number", "constructor"],
  ["Boolean", "constructor"],
];
