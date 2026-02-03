"use client";

import { SnapTargetType } from "@/lib/timeline-snap";

interface SnapIndicatorProps {
  frame: number;
  scale: number;
  type: SnapTargetType;
  visible: boolean;
}

/**
 * Visual indicator line shown when a trim handle snaps to a target.
 * Positioned absolutely within the timeline container.
 * Color varies by snap target type for visual feedback.
 */
export function SnapIndicator({ frame, scale, type, visible }: SnapIndicatorProps) {
  if (!visible) return null;

  // Color based on snap target type
  const colorClass = {
    "clip-edge": "bg-blue-400",
    "playhead": "bg-yellow-400",
    "timeline-boundary": "bg-green-400",
  }[type];

  return (
    <div
      className={`absolute top-0 bottom-0 w-0.5 ${colorClass} pointer-events-none z-40 animate-pulse`}
      style={{
        left: `${frame * scale}px`,
        transform: "translateX(-50%)", // Center the line on the frame
      }}
      role="presentation"
      aria-hidden="true"
    />
  );
}
