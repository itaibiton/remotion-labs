"use client";

import { useState, useCallback } from "react";

interface UseTimelineZoomOptions {
  minScale?: number;
  maxScale?: number;
  defaultScale?: number;
}

interface UseTimelineZoomReturn {
  scale: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setScale: (scale: number) => void;
  handleWheel: (e: WheelEvent) => void;
  minScale: number;
  maxScale: number;
}

export function useTimelineZoom(options: UseTimelineZoomOptions = {}): UseTimelineZoomReturn {
  const { minScale = 0.5, maxScale = 20, defaultScale = 3 } = options;
  const [scale, setScaleState] = useState(defaultScale);

  const clampScale = useCallback((s: number) => {
    return Math.min(maxScale, Math.max(minScale, s));
  }, [minScale, maxScale]);

  const setScale = useCallback((newScale: number) => {
    setScaleState(clampScale(newScale));
  }, [clampScale]);

  const zoomIn = useCallback(() => {
    setScaleState((s) => clampScale(s * 1.25));
  }, [clampScale]);

  const zoomOut = useCallback(() => {
    setScaleState((s) => clampScale(s / 1.25));
  }, [clampScale]);

  const resetZoom = useCallback(() => {
    setScaleState(defaultScale);
  }, [defaultScale]);

  const handleWheel = useCallback((e: WheelEvent) => {
    // Only zoom with Ctrl (Windows/Linux) or Meta (Mac) modifier
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setScaleState((s) => clampScale(s * factor));
  }, [clampScale]);

  return {
    scale,
    zoomIn,
    zoomOut,
    resetZoom,
    setScale,
    handleWheel,
    minScale,
    maxScale,
  };
}
