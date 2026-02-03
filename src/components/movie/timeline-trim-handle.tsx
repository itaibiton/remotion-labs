"use client";

import { useState, useRef } from "react";

interface TrimHandleProps {
  side: "left" | "right";
  onTrimDelta: (deltaFrames: number) => void;
  onTrimEnd: () => void;
  pixelsPerFrame: number;
  maxTrimFrames: number;
  currentTrimFrames: number;
}

/**
 * TrimHandle - drag handle for non-destructive clip trimming.
 * Uses pointer capture pattern (same as playhead) for smooth cross-boundary dragging.
 */
export function TrimHandle({
  side,
  onTrimDelta,
  onTrimEnd,
  pixelsPerFrame,
  maxTrimFrames,
  currentTrimFrames,
}: TrimHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const accumulatedDeltaRef = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation(); // Prevent @dnd-kit activation
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    startXRef.current = e.clientX;
    accumulatedDeltaRef.current = 0;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startXRef.current;
    // For left handle: positive deltaX = more trim (shrink start)
    // For right handle: negative deltaX = more trim (shrink end)
    const rawDeltaFrames = Math.round(deltaX / pixelsPerFrame);
    const effectiveDelta = side === "left" ? rawDeltaFrames : -rawDeltaFrames;

    // Clamp: can't trim more than maxTrimFrames, can't restore more than currentTrimFrames
    const clampedDelta = Math.max(
      -currentTrimFrames, // Can restore up to current trim
      Math.min(maxTrimFrames, effectiveDelta) // Can trim up to max
    );

    if (clampedDelta !== accumulatedDeltaRef.current) {
      onTrimDelta(clampedDelta - accumulatedDeltaRef.current);
      accumulatedDeltaRef.current = clampedDelta;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    onTrimEnd();
  };

  return (
    <div
      className={`absolute top-0 bottom-0 w-2 cursor-ew-resize touch-none z-20
        ${side === "left" ? "left-0 rounded-l-lg" : "right-0 rounded-r-lg"}
        ${isDragging ? "bg-primary/50" : "bg-primary/20 hover:bg-primary/40"}
        transition-colors`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
