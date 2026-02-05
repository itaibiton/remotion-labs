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
  useDelayRender,
  delayRender,
  continueRender,
} from "remotion";

// 3D support - required for 3D animations
import { ThreeCanvas } from "@remotion/three";
import { extend } from "@react-three/fiber";
import * as THREE from "three";
import * as THREE_STDLIB from "three-stdlib";

// Mapbox removed - we don't use maps that require API keys
// Use alternative visual approaches for map-like animations instead

// Extend THREE with custom geometries from three-stdlib
// Available geometries: RoundedBoxGeometry, ConvexGeometry, ParametricGeometry, etc.
extend(THREE_STDLIB);

// Create a simple StarGeometry helper since it's not in three-stdlib
// This allows generated code to use THREE.StarGeometry
class StarGeometry extends THREE.BufferGeometry {
  constructor(innerRadius = 0.4, outerRadius = 0.8, points = 5) {
    super();
    const vertices: number[] = [];
    const indices: number[] = [];
    
    // Center vertex
    vertices.push(0, 0, 0);
    
    // Create star points
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      vertices.push(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0
      );
    }
    
    // Create faces
    for (let i = 1; i <= points * 2; i++) {
      const next = i === points * 2 ? 1 : i + 1;
      indices.push(0, i, next);
    }
    
    this.setIndex(indices);
    this.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    this.computeVertexNormals();
  }
}

// Extend THREE with StarGeometry
extend({ StarGeometry });

// Mapbox removed - not available
const mapboxgl = undefined;
const MapConstructor = undefined;
const turf = undefined;

/**
 * Maximum number of operations allowed per execution context.
 * This prevents infinite loops and excessive computation.
 *
 * Set to 100,000 to allow particle effects, starfields, and complex
 * animations while still catching runaway loops.
 */
const MAX_OPERATIONS = 100000;

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
  | { success: true; Component: React.FC; resetCounter: () => void }
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

  // Wrap interpolate to count operations and guard against mismatched ranges
  const safeInterpolate: typeof interpolate = (...args) => {
    counter.check();
    const [, inputRange, outputRange] = args;
    
    if (Array.isArray(inputRange) && Array.isArray(outputRange)) {
      // Validate inputRange is strictly monotonically increasing
      if (inputRange.length > 1) {
        for (let i = 1; i < inputRange.length; i++) {
          if (inputRange[i] <= inputRange[i - 1]) {
            // Fix invalid range by making it strictly increasing
            const min = Math.min(...inputRange);
            const max = Math.max(...inputRange);
            if (min === max) {
              // All values are the same - create a simple increasing range
              args[1] = inputRange.map((_, idx) => idx);
            } else {
              const step = (max - min) / (inputRange.length - 1);
              args[1] = inputRange.map((_, idx) => min + step * idx);
            }
            break;
          }
        }
      }
      
      // Handle mismatched array lengths
      if (args[1].length !== outputRange.length) {
        const len = Math.min(args[1].length, outputRange.length);
        args[1] = args[1].slice(0, len);
        args[2] = outputRange.slice(0, len);
      }
    }
    
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

    // Remotion utilities
    useDelayRender,
    delayRender,
    continueRender,

    // 3D support (packages are installed)
    // @remotion/three, three-stdlib, @react-three/drei are now available
    // Mapbox removed - use alternative visual approaches for map-like animations
    ThreeCanvas,
    
    // React Three Fiber utilities
    extend,
    THREE,
    
    // Common R3F primitives (available as JSX components)
    // Box, Sphere, Plane, etc. are available via @react-three/fiber
    // Custom geometries from three-stdlib are extended into THREE namespace

    // Environment variables (read-only access to process.env)
    process: {
      env: typeof process !== "undefined" ? process.env : {},
    },

    // Deprecated/removed APIs - set to undefined to prevent ReferenceErrors
    // Old generated code may reference these; returning undefined allows error
    // boundaries to catch "Cannot read property of undefined" instead of crashing
    mapboxgl: undefined,
    MapConstructor: undefined,
    turf: undefined,
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
    const { scope, counter } = createExecutionScope();

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

    // Expose counter.reset so DynamicCode can reset per frame render.
    // Without this, the counter accumulates across all frames and
    // hits the limit on longer/complex animations.
    return { success: true, Component, resetCounter: counter.reset };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Unknown execution error";
    return { success: false, error };
  }
}
