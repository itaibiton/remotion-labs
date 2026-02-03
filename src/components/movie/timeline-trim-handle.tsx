"use client";

import { useState, useRef } from "react";

interface TrimHandleProps {
  side: "left" | "right";
  onTrimChange: (newTrimFrames: number) => void;
  onTrimEnd: () => void;
  scale: number;
  baseDuration: number;
  currentTrim: number;
  otherTrim: number; // The trim on the opposite side
}

/**
 * TrimHandle - drag handle for non-destructive clip trimming.
 * Simplified: directly calculates trim value from drag position.
 */
export function TrimHandle({
  side,
  onTrimChange,
  onTrimEnd,
  scale,
  baseDuration,
  currentTrim,
  otherTrim,
}: TrimHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, initialTrim: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      initialTrim: currentTrim,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaFrames = deltaX / scale;

    let newTrim: number;
    if (side === "left") {
      // Dragging right = more trim, dragging left = less trim
      newTrim = dragStartRef.current.initialTrim + deltaFrames;
    } else {
      // Dragging left = more trim, dragging right = less trim
      newTrim = dragStartRef.current.initialTrim - deltaFrames;
    }

    // Clamp: min 0, max = baseDuration - otherTrim - 1 (leave at least 1 frame)
    const maxTrim = baseDuration - otherTrim - 1;
    newTrim = Math.max(0, Math.min(maxTrim, newTrim));

    // Round to whole frames
    newTrim = Math.round(newTrim);

    onTrimChange(newTrim);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    onTrimEnd();
  };

  return (
    <div
      className={`absolute top-0 bottom-0 w-3 cursor-ew-resize touch-none z-20 flex items-center justify-center
        ${side === "left" ? "left-0" : "right-0"}
        ${isDragging ? "bg-primary" : "bg-transparent hover:bg-primary/30"}
        transition-colors group/handle`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Visual handle indicator */}
      <div className={`w-1 h-8 rounded-full ${isDragging ? "bg-primary-foreground" : "bg-primary/60 group-hover/handle:bg-primary"} transition-colors`} />
    </div>
  );
}
