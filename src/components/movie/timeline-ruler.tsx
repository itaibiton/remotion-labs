"use client";

import { useMemo } from "react";
import { formatTimecode } from "@/lib/format-timecode";

interface TimelineRulerProps {
  totalDurationInFrames: number;
  fps: number;
  scale: number;
}

export function TimelineRuler({ totalDurationInFrames, fps, scale }: TimelineRulerProps) {
  const marks = useMemo(() => {
    if (totalDurationInFrames === 0 || fps === 0) return [];

    const totalSeconds = totalDurationInFrames / fps;
    // Use 5-second intervals if total > 30s, otherwise 1-second intervals
    const interval = totalSeconds > 30 ? 5 : 1;
    const result: Array<{ frame: number; position: number }> = [];

    for (let second = 0; second <= totalSeconds; second += interval) {
      const frame = second * fps;
      // Position in pixels using scale
      const position = frame * scale;
      result.push({ frame, position });
    }

    return result;
  }, [totalDurationInFrames, fps, scale]);

  if (marks.length === 0) {
    return null;
  }

  // Total width of ruler based on scale
  const rulerWidth = totalDurationInFrames * scale;

  return (
    <div
      className="relative h-6 cursor-pointer select-none"
      style={{ width: `${rulerWidth}px`, minWidth: '100%' }}
    >
      {marks.map(({ frame, position }) => (
        <div
          key={frame}
          className="absolute flex flex-col items-center"
          style={{ left: `${position}px`, transform: "translateX(-50%)" }}
        >
          <div className="h-2 w-px bg-muted-foreground" />
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {formatTimecode(frame, fps)}
          </span>
        </div>
      ))}
    </div>
  );
}
