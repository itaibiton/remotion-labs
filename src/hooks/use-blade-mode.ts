"use client";

import { useState, useEffect, useCallback } from "react";
// @ts-expect-error - tinykeys has issues with moduleResolution, but works at runtime
import { tinykeys } from "tinykeys";

interface UseBladeModOptions {
  onSplitAtPlayhead?: () => void;
}

/**
 * useBladeMode - manages blade tool state with keyboard shortcuts.
 *
 * Keyboard shortcuts:
 * - B: Toggle blade mode
 * - Escape/V/A: Exit blade mode (common NLE conventions)
 * - Cmd/Ctrl+B: Split at playhead (when callback provided)
 */
export function useBladeMode(options: UseBladeModOptions = {}) {
  const { onSplitAtPlayhead } = options;
  const [isBladeMode, setIsBladeMode] = useState(false);

  const toggleBladeMode = useCallback(() => {
    setIsBladeMode((prev) => !prev);
  }, []);

  const exitBladeMode = useCallback(() => {
    setIsBladeMode(false);
  }, []);

  useEffect(() => {
    // Guard: don't trigger shortcuts when typing in inputs
    const isInputElement = (e: KeyboardEvent): boolean => {
      const target = e.target as HTMLElement;
      return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      );
    };

    const unsubscribe = tinykeys(window, {
      b: (e: KeyboardEvent) => {
        if (isInputElement(e)) return;
        e.preventDefault();
        toggleBladeMode();
      },
      Escape: (e: KeyboardEvent) => {
        if (isInputElement(e)) return;
        exitBladeMode();
      },
      v: (e: KeyboardEvent) => {
        if (isInputElement(e)) return;
        exitBladeMode();
      },
      a: (e: KeyboardEvent) => {
        if (isInputElement(e)) return;
        exitBladeMode();
      },
      "$mod+b": (e: KeyboardEvent) => {
        if (isInputElement(e)) return;
        e.preventDefault();
        onSplitAtPlayhead?.();
      },
    });

    return unsubscribe;
  }, [toggleBladeMode, exitBladeMode, onSplitAtPlayhead]);

  return {
    isBladeMode,
    toggleBladeMode,
    exitBladeMode,
  };
}
