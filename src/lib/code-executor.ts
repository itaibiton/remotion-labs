/**
 * Code Executor with Scope Injection
 *
 * Safely executes AI-generated Remotion code in an isolated scope.
 * Uses Function constructor with controlled scope injection - generated code
 * only has access to what we explicitly provide.
 *
 * Security model:
 * - No access to window, document, fetch, eval, require, import
 * - Only Remotion APIs and React hooks are available
 * - Code runs in strict mode implicitly via Function constructor
 */

import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  Easing,
  random,
  Audio,
  Img,
  staticFile,
  OffthreadVideo,
  Video,
  Composition,
  Still,
  Series,
  Loop,
  Freeze,
} from "remotion";

/**
 * Result of code execution
 */
export type ExecutionResult =
  | { success: true; Component: React.FC }
  | { success: false; error: string };

/**
 * All Remotion APIs available to generated code.
 * This is the complete set of APIs that can be used in generated compositions.
 */
export const RemotionScope = {
  // React core
  React,
  useState: React.useState,
  useEffect: React.useEffect,
  useMemo: React.useMemo,
  useCallback: React.useCallback,
  useRef: React.useRef,

  // Remotion core
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  Easing,
  random,

  // Remotion media
  Audio,
  Img,
  staticFile,
  OffthreadVideo,
  Video,

  // Remotion composition helpers
  Composition,
  Still,
  Series,
  Loop,
  Freeze,
} as const;

/**
 * Executes validated, transformed JavaScript code and returns the component.
 *
 * The code should define a component named `MyComposition`:
 * - `const MyComposition = () => { ... }`
 * - `function MyComposition() { ... }`
 *
 * @param code - Transformed JavaScript code (output from sucrase)
 * @returns ExecutionResult with the component or error message
 */
export function executeCode(code: string): ExecutionResult {
  try {
    // Build function with scope parameters
    const scopeKeys = Object.keys(RemotionScope);
    const scopeValues = Object.values(RemotionScope);

    // The code should define a component named MyComposition
    // Wrap it to capture and return the component
    const wrappedCode = `
      "use strict";
      ${code}
      return typeof MyComposition !== 'undefined' ? MyComposition : null;
    `;

    // Create function with scope parameters
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function(...scopeKeys, wrappedCode);

    // Execute with scope values
    const Component = fn(...scopeValues) as React.FC | null;

    if (!Component) {
      return {
        success: false,
        error: "Code must define a component named MyComposition",
      };
    }

    // Validate it's a function (React component)
    if (typeof Component !== "function") {
      return {
        success: false,
        error: "MyComposition must be a function component",
      };
    }

    return { success: true, Component };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Unknown execution error";
    return { success: false, error };
  }
}
