"use client";

import { useState, useEffect, useCallback } from "react";
import { validateRemotionCode } from "@/lib/code-validator";
import { transformJSX } from "@/lib/code-transformer";

/**
 * Validation error with line/column info and optional fix suggestion.
 * Mapped from code-validator errors for Monaco marker display.
 */
export interface ValidationError {
  line: number;
  column: number;
  message: string;
  suggestion?: string;
}

/**
 * Validation state returned by the debounced validation hook.
 */
export interface ValidationState {
  isValid: boolean;
  errors: ValidationError[];
  transformedCode: string | null;
}

/**
 * Full return type of the hook, including resetToValid callback.
 */
export interface DebouncedValidationResult extends ValidationState {
  resetToValid: () => void;
}

/**
 * Debounced validation hook for user-edited code.
 *
 * Runs validateRemotionCode + transformJSX after the user stops typing
 * for `delay` milliseconds. Returns current validation state including
 * isValid, errors (with suggestions), and transformedCode.
 *
 * When `skipValidation` is true, no validation is scheduled. This is
 * used when AI-generated code is applied (already validated server-side).
 *
 * @param code - Current editor code (raw JSX)
 * @param delay - Debounce delay in ms (default 500)
 * @param skipValidation - Skip validation for AI-generated code updates (default false)
 */
export function useDebouncedValidation(
  code: string,
  delay: number = 500,
  skipValidation: boolean = false
): DebouncedValidationResult {
  const [state, setState] = useState<ValidationState>({
    isValid: true,
    errors: [],
    transformedCode: null,
  });

  useEffect(() => {
    if (skipValidation) return;

    const timer = setTimeout(() => {
      // Step 1: AST validation
      const validation = validateRemotionCode(code);
      if (!validation.valid) {
        setState({
          isValid: false,
          errors: validation.errors.map((err) => ({
            line: err.line,
            column: err.column,
            message: err.suggestion ?? err.message,
            suggestion: err.suggestion,
          })),
          transformedCode: null,
        });
        return;
      }

      // Step 2: JSX transformation
      const transformed = transformJSX(code);
      if (!transformed.success) {
        setState({
          isValid: false,
          errors: [
            {
              line: 1,
              column: 0,
              message: transformed.error ?? "Transform failed",
            },
          ],
          transformedCode: null,
        });
        return;
      }

      // Step 3: Valid code - update state
      setState({
        isValid: true,
        errors: [],
        transformedCode: transformed.code ?? null,
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [code, delay, skipValidation]);

  /**
   * Reset validation state to a known-good state.
   * Used when AI generates new code (already validated server-side).
   */
  const resetToValid = useCallback(() => {
    setState({
      isValid: true,
      errors: [],
      transformedCode: null,
    });
  }, []);

  return { ...state, resetToValid };
}
