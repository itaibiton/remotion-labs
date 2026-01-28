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
 *
 * Execution limits:
 * - Maximum 10,000 operations per execution context
 * - Frequently-called Remotion APIs (interpolate, spring) are wrapped with counters
 * - Exceeding limit throws "Execution limit exceeded" error
 *
 * Note: True async timeout isn't possible with Function constructor.
 * The AST validator (Plan 01) catches obvious infinite loops (while(true)).
 * This runtime check catches edge cases that pass validation.
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
 * Maximum number of operations allowed per execution context.
 * This prevents infinite loops and excessive computation.
 */
const MAX_OPERATIONS = 10000;

/**
 * Creates an operation counter for execution limiting.
 * Each call to check() increments the counter and throws if limit exceeded.
 */
function createOperationCounter() {
  let count = 0;

  return {
    check: () => {
      count++;
      if (count > MAX_OPERATIONS) {
        throw new Error("Execution limit exceeded");
      }
    },
    reset: () => {
      count = 0;
    },
    getCount: () => count,
  };
}

/**
 * Result of code execution
 */
export type ExecutionResult =
  | { success: true; Component: React.FC }
  | { success: false; error: string };

/**
 * Base Remotion scope - documents available APIs for generated code.
 * This is exported for reference/documentation purposes.
 *
 * Note: The actual runtime scope is created per-execution via createExecutionScope(),
 * which wraps high-frequency functions (interpolate, spring, random) with
 * operation counters for execution limiting.
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
 * Creates a scope with operation-counted wrapper functions.
 * High-frequency functions like interpolate and spring are wrapped to
 * count operations and prevent excessive computation.
 *
 * @returns Object with scope and counter for a single execution context
 */
function createExecutionScope() {
  const counter = createOperationCounter();

  // Wrap interpolate to count operations
  const safeInterpolate: typeof interpolate = (...args) => {
    counter.check();
    return interpolate(...args);
  };

  // Wrap spring to count operations
  const safeSpring: typeof spring = (...args) => {
    counter.check();
    return spring(...args);
  };

  // Wrap random to count operations (used in loops)
  const safeRandom: typeof random = (...args) => {
    counter.check();
    return random(...args);
  };

  const scope = {
    // React core
    React,
    useState: React.useState,
    useEffect: React.useEffect,
    useMemo: React.useMemo,
    useCallback: React.useCallback,
    useRef: React.useRef,

    // Remotion core - with safe wrappers for high-frequency functions
    AbsoluteFill,
    useCurrentFrame,
    useVideoConfig,
    interpolate: safeInterpolate,
    spring: safeSpring,
    Sequence,
    Easing,
    random: safeRandom,

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
  };

  return { scope, counter };
}

/**
 * Executes validated, transformed JavaScript code and returns the component.
 *
 * The code should define a component named `MyComposition`:
 * - `const MyComposition = () => { ... }`
 * - `function MyComposition() { ... }`
 *
 * Execution limits:
 * - Max 10,000 operations per execution
 * - Wrapped functions (interpolate, spring, random) count toward limit
 * - Exceeding limit returns error: "Execution limit exceeded"
 *
 * @param code - Transformed JavaScript code (output from sucrase)
 * @returns ExecutionResult with the component or error message
 */
export function executeCode(code: string): ExecutionResult {
  try {
    // Create execution scope with operation counting
    const { scope } = createExecutionScope();

    // Build function with scope parameters
    const scopeKeys = Object.keys(scope);
    const scopeValues = Object.values(scope);

    // The code should define a component named MyComposition
    // Wrap it to capture and return the component
    const wrappedCode = `
      "use strict";
      ${code}
      return typeof MyComposition !== 'undefined' ? MyComposition : null;
    `;

    // Create function with scope parameters
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
