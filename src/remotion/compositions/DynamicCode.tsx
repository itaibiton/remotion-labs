"use client";

/**
 * DynamicCode Meta-Composition
 *
 * A Remotion composition that executes AI-generated code at runtime.
 * Receives validated, transformed JavaScript code as props and renders
 * the resulting component.
 *
 * This composition is used by:
 * - PreviewPlayer: For browser-based preview during generation
 * - Lambda: For server-side video rendering
 *
 * The code-as-inputProps pattern means:
 * - Lambda doesn't need to re-bundle for each generation
 * - Same composition works identically in both environments
 * - Execution is sandboxed via code-executor scope injection
 */

import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import { executeCode } from "@/lib/code-executor";

/**
 * Props for the DynamicCode composition.
 * These are passed via inputProps from Lambda or Player.
 */
export interface DynamicCodeProps {
  /** Validated, transformed JavaScript code (output from sucrase) */
  code: string;
  /** Total duration of the composition in frames */
  durationInFrames: number;
  /** Frames per second */
  fps: number;
  /** Video width in pixels (optional, defaults to 1920) */
  width?: number;
  /** Video height in pixels (optional, defaults to 1080) */
  height?: number;
}

/**
 * Error fallback component displayed when code execution fails.
 */
const ErrorFallback: React.FC<{ error: string }> = ({ error }) => (
  <AbsoluteFill
    style={{
      backgroundColor: "#1a1a1a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
    }}
  >
    <div
      style={{
        maxWidth: 800,
        textAlign: "center",
      }}
    >
      <h2
        style={{
          color: "#ef4444",
          fontSize: 32,
          fontFamily: "system-ui, sans-serif",
          marginBottom: 24,
          fontWeight: 600,
        }}
      >
        Execution Error
      </h2>
      <pre
        style={{
          color: "#fca5a5",
          fontSize: 16,
          fontFamily: "monospace",
          backgroundColor: "#2a2a2a",
          padding: 24,
          borderRadius: 8,
          textAlign: "left",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          border: "1px solid #3f3f3f",
        }}
      >
        {error}
      </pre>
    </div>
  </AbsoluteFill>
);

/**
 * DynamicCode composition that renders AI-generated Remotion code.
 *
 * The composition:
 * 1. Receives code as a prop (already validated and transformed)
 * 2. Executes it via executeCode with Remotion scope injection
 * 3. Renders the resulting component or shows an error state
 *
 * Execution is memoized to avoid re-running on every frame.
 */
export const DynamicCode: React.FC<DynamicCodeProps> = ({
  code,
  // These props are available for future use (e.g., passing to generated component)
  // Currently, the generated component uses useVideoConfig() to access these
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  durationInFrames,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fps,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  width,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  height,
}) => {
  // Memoize execution to avoid re-running on every frame
  const result = useMemo(() => executeCode(code), [code]);

  if (!result.success) {
    return <ErrorFallback error={result.error} />;
  }

  // Reset the operation counter before each frame render.
  // The counter is shared across all frames via the closure, so without
  // resetting, it accumulates and hits the limit on longer animations.
  result.resetCounter();

  const Component = result.Component;
  return <Component />;
};

export default DynamicCode;
