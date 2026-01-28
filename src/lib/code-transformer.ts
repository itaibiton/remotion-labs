/**
 * JSX to JavaScript Transformer
 *
 * Uses sucrase for fast JSX-to-JS transformation.
 * Sucrase is chosen over Babel for:
 * - 10x faster transformation (important for per-generation transforms)
 * - Simpler API, single purpose
 * - Good enough for JSX -> JS (no need for polyfills/complex transforms)
 */

import { transform as sucraseTransform } from "sucrase";

/**
 * Result of JSX transformation
 */
export interface TransformResult {
  success: boolean;
  code?: string; // Transformed JS code
  error?: string; // Error message if transformation failed
}

/**
 * Transforms JSX/TSX code to plain JavaScript.
 *
 * Uses classic React.createElement style which is compatible with Remotion.
 * Handles both JSX and TypeScript syntax.
 *
 * @param jsxCode - JSX/TSX source code
 * @returns TransformResult with transformed code or error
 */
export function transformJSX(jsxCode: string): TransformResult {
  try {
    const result = sucraseTransform(jsxCode, {
      transforms: ["jsx", "typescript"],
      jsxRuntime: "classic", // React.createElement style
      production: true, // Omit development-only code
    });

    return {
      success: true,
      code: result.code,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Unknown transformation error";

    // Try to extract line info from sucrase error
    const lineMatch = error.match(/\((\d+):(\d+)\)/);
    const lineInfo = lineMatch ? ` at line ${lineMatch[1]}` : "";

    return {
      success: false,
      error: `JSX transformation failed${lineInfo}: ${cleanErrorMessage(error)}`,
    };
  }
}

/**
 * Cleans up error messages for user display.
 * Removes internal details while keeping useful information.
 */
function cleanErrorMessage(error: string): string {
  // Remove file paths that might be in the error
  let cleaned = error.replace(/at\s+[^\s]+:\d+:\d+/g, "");

  // Remove duplicate position info
  cleaned = cleaned.replace(/\((\d+):(\d+)\)\s*$/g, "");

  // Trim whitespace
  cleaned = cleaned.trim();

  return cleaned || "Invalid syntax";
}
