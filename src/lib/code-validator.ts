/**
 * AST-based Code Validator
 *
 * Parses JSX code using acorn + acorn-jsx and validates against the allowlist.
 * This is the security boundary - all AI-generated code must pass validation.
 *
 * Security principle: Reject anything suspicious with generic error messages.
 * We don't reveal what patterns are blocked to prevent gaming the system.
 */

import * as acorn from "acorn";
import jsx from "acorn-jsx";
import {
  isImportAllowed,
  BLOCKED_PATTERNS,
  BLOCKED_MEMBER_PATTERNS,
} from "./remotion-allowlist";

/**
 * Result of code validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    line: number;
    column: number;
    message: string; // Generic message, does not reveal blocklist details
    suggestion?: string; // Actionable fix suggestion for editor display
  }>;
}

// Create JSX-enabled parser
const Parser = acorn.Parser.extend(jsx());

// AST node types we care about
type ASTNode = acorn.Node & {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

/**
 * Validates Remotion/React code against security allowlist.
 *
 * Checks:
 * - Import sources must be in ALLOWED_IMPORTS
 * - No blocked identifiers (eval, Function, etc.)
 * - No dynamic imports (import())
 * - No require() calls
 * - No dangerous member access (document.*, window.*, process.*)
 *
 * @param code - JSX/TSX source code to validate
 * @returns ValidationResult with errors if any
 */
export function validateRemotionCode(code: string): ValidationResult {
  const errors: ValidationResult["errors"] = [];

  // Step 1: Parse the code into AST
  let ast: ASTNode;
  try {
    ast = Parser.parse(code, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true, // Required for line/column info
    }) as ASTNode;
  } catch (e) {
    const parseError = e as { loc?: { line: number; column: number }; message?: string };
    return {
      valid: false,
      errors: [
        {
          line: parseError.loc?.line ?? 1,
          column: parseError.loc?.column ?? 0,
          message: "Code contains syntax errors",
          suggestion: "Check for missing brackets, quotes, or semicolons near this line.",
        },
      ],
    };
  }

  // Step 2: Walk the AST and validate
  walkNode(ast, errors);

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Recursively walks AST nodes and validates each one
 */
function walkNode(node: ASTNode, errors: ValidationResult["errors"]): void {
  if (!node || typeof node !== "object") return;

  // Validate this node based on type
  switch (node.type) {
    case "ImportDeclaration":
      validateImport(node, errors);
      break;

    case "Identifier":
      validateIdentifier(node, errors);
      break;

    case "CallExpression":
      validateCallExpression(node, errors);
      break;

    case "MemberExpression":
      validateMemberExpression(node, errors);
      break;

    case "NewExpression":
      validateNewExpression(node, errors);
      break;

    case "ImportExpression":
      // Dynamic import() - always block
      addError(errors, node, "Code contains unsafe patterns", "import");
      break;
  }

  // Recursively walk child nodes
  for (const key of Object.keys(node)) {
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === "object" && "type" in item) {
          walkNode(item as ASTNode, errors);
        }
      }
    } else if (child && typeof child === "object" && "type" in child) {
      walkNode(child as ASTNode, errors);
    }
  }
}

/**
 * Validates import declarations - only allowed sources permitted
 */
function validateImport(node: ASTNode, errors: ValidationResult["errors"]): void {
  const source = node.source?.value;
  if (typeof source === "string" && !isImportAllowed(source)) {
    addError(errors, node, "Code contains unsafe patterns", "import");
  }
}

/**
 * Validates identifiers against blocked patterns
 */
function validateIdentifier(node: ASTNode, errors: ValidationResult["errors"]): void {
  const name = node.name;
  if (typeof name === "string" && BLOCKED_PATTERNS.has(name)) {
    // Check if this identifier is used as a variable name (safe) vs reference (unsafe)
    // We block all blocked pattern identifiers to be safe
    addError(errors, node, "Code contains unsafe patterns", name);
  }
}

/**
 * Validates function calls - blocks dangerous calls
 */
function validateCallExpression(node: ASTNode, errors: ValidationResult["errors"]): void {
  const callee = node.callee;

  // Block: require('module')
  if (callee?.type === "Identifier" && callee.name === "require") {
    addError(errors, node, "Code contains unsafe patterns", callee.name);
    return;
  }

  // Block: eval('code')
  if (callee?.type === "Identifier" && callee.name === "eval") {
    addError(errors, node, "Code contains unsafe patterns", callee.name);
    return;
  }

  // Block: Function('code')
  if (callee?.type === "Identifier" && callee.name === "Function") {
    addError(errors, node, "Code contains unsafe patterns", callee.name);
    return;
  }
}

/**
 * Validates member expressions - blocks dangerous property access
 */
function validateMemberExpression(node: ASTNode, errors: ValidationResult["errors"]): void {
  const object = node.object;
  const property = node.property;

  // Get object name if it's an identifier
  const objectName = object?.type === "Identifier" ? object.name : null;
  const propertyName = property?.type === "Identifier" ? property.name : null;

  // Block: document.*, window.*, process.*, globalThis.*
  if (
    objectName &&
    BLOCKED_PATTERNS.has(objectName) &&
    propertyName // Only if accessing a property
  ) {
    addError(errors, node, "Code contains unsafe patterns", objectName);
    return;
  }

  // Block specific dangerous member patterns: Object.constructor, etc.
  if (objectName && propertyName) {
    for (const [blockedObj, blockedProp] of BLOCKED_MEMBER_PATTERNS) {
      if (objectName === blockedObj && propertyName === blockedProp) {
        addError(errors, node, "Code contains unsafe patterns", blockedProp);
        return;
      }
    }
  }
}

/**
 * Validates new expressions - blocks dangerous constructors
 */
function validateNewExpression(node: ASTNode, errors: ValidationResult["errors"]): void {
  const callee = node.callee;

  // Block: new Function('code')
  if (callee?.type === "Identifier" && callee.name === "Function") {
    addError(errors, node, "Code contains unsafe patterns", callee.name);
    return;
  }

  // Block: new WebSocket(), new XMLHttpRequest(), etc.
  if (callee?.type === "Identifier" && BLOCKED_PATTERNS.has(callee.name)) {
    addError(errors, node, "Code contains unsafe patterns", callee.name);
  }
}

/**
 * Maps blocked identifiers to actionable fix suggestions referencing Remotion APIs.
 * These suggestions help users understand WHAT to use instead of the blocked pattern.
 */
function getSuggestionForBlockedPattern(identifier: string): string | undefined {
  const suggestions: Record<string, string> = {
    // Network access
    fetch: "Network requests are not available. Use interpolate() or spring() for data-driven animations.",
    XMLHttpRequest: "Network requests are not available. Use interpolate() or spring() for data-driven animations.",
    WebSocket: "Network requests are not available. Use interpolate() for animations.",
    EventSource: "Network requests are not available. Use interpolate() for animations.",
    Request: "Network requests are not available. Use interpolate() or spring() for data-driven animations.",
    Response: "Network requests are not available. Use interpolate() for animations.",
    Headers: "Network requests are not available. Use interpolate() for animations.",
    // Timers
    setTimeout: "'setTimeout' is not available. Use <Sequence from={frameNumber}> for timed animations.",
    setInterval: "'setInterval' is not available. Use useCurrentFrame() for frame-based animation loops.",
    clearTimeout: "Timer APIs are not available. Use <Sequence from={frameNumber}> for timed animations.",
    clearInterval: "Timer APIs are not available. Use useCurrentFrame() for frame-based animation loops.",
    // DOM/Browser
    document: "DOM access is not available. Use <AbsoluteFill> and inline styles for layout.",
    window: "Browser globals are not available. Use useVideoConfig() for width, height, fps.",
    navigator: "Browser globals are not available. Use useVideoConfig() for dimensions.",
    location: "Browser globals are not available. Use useVideoConfig() for dimensions.",
    history: "Browser globals are not available. Use <Sequence> for navigation-like transitions.",
    localStorage: "Browser storage is not available. Use React state (useState) instead.",
    sessionStorage: "Browser storage is not available. Use React state (useState) instead.",
    indexedDB: "Browser storage is not available. Use React state (useState) instead.",
    // Node.js globals
    process: "Node.js globals are not available in the Remotion sandbox.",
    global: "Node.js globals are not available. Use useVideoConfig() for environment info.",
    globalThis: "Global scope access is not available. Use the pre-injected Remotion APIs.",
    __dirname: "Node.js path globals are not available in the Remotion sandbox.",
    __filename: "Node.js path globals are not available in the Remotion sandbox.",
    Buffer: "Node.js Buffer is not available in the Remotion sandbox.",
    setImmediate: "Node.js setImmediate is not available. Use useCurrentFrame() for frame-based logic.",
    clearImmediate: "Node.js clearImmediate is not available. Use useCurrentFrame() for frame-based logic.",
    // Dynamic code execution
    eval: "Dynamic code execution is not allowed. Write your logic directly.",
    Function: "The Function constructor is not allowed. Define functions with arrow syntax or function declarations.",
    // Module system
    require: "Use the pre-injected APIs instead of require(). All Remotion and React APIs are already available.",
    import: "Import statements are not needed. All APIs (AbsoluteFill, interpolate, spring, etc.) are pre-injected.",
    module: "Module system access is not available. All APIs are pre-injected.",
    exports: "Module system access is not available. All APIs are pre-injected.",
    // Dangerous APIs
    Proxy: "Proxy is not available in the sandbox.",
    Reflect: "Reflect is not available in the sandbox.",
    constructor: "Direct constructor access is not allowed. Use standard object creation patterns.",
    prototype: "Prototype manipulation is not allowed.",
    __proto__: "Prototype manipulation is not allowed.",
  };
  return suggestions[identifier];
}

/**
 * Helper to add an error with location info and optional suggestion
 */
function addError(
  errors: ValidationResult["errors"],
  node: ASTNode,
  message: string,
  identifier?: string
): void {
  errors.push({
    line: node.loc?.start?.line ?? 1,
    column: node.loc?.start?.column ?? 0,
    message,
    suggestion: identifier ? getSuggestionForBlockedPattern(identifier) : undefined,
  });
}
