"use client";

import { useState, useCallback, useRef } from "react";
import type { PlayerRef } from "@remotion/player";

interface TimelinePlayheadProps {
  currentFrame: number;
  totalDurationInFrames: number;
  playerRef: React.RefObject<PlayerRef | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  scale: number;
}

export function TimelinePlayhead({
  currentFrame,
  totalDurationInFrames,
  playerRef,
  containerRef,
  scale,
}: TimelinePlayheadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const wasPlayingRef = useRef(false);

  // Position in pixels using scale
  const position = currentFrame * scale;

  const getFrameFromX = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return 0;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    // Convert pixels to frame using scale
    const frame = Math.round(x / scale);
    return Math.max(0, Math.min(frame, totalDurationInFrames - 1));
  }, [containerRef, totalDurationInFrames, scale]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    wasPlayingRef.current = playerRef.current?.isPlaying() ?? false;
    playerRef.current?.pause();
    const frame = getFrameFromX(e.clientX);
    playerRef.current?.seekTo(frame);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const frame = getFrameFromX(e.clientX);
    playerRef.current?.seekTo(frame);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    if (wasPlayingRef.current) {
      playerRef.current?.play();
    }
  };

  return (
    <div
      data-playhead
      className="absolute top-0 bottom-0 z-50 cursor-ew-resize touch-none group"
      style={{
        left: `${position - 6}px`,
        width: '12px',
        pointerEvents: 'auto',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Visible line (2px wide, centered) */}
      <div className="absolute left-[5px] top-0 bottom-0 w-0.5 bg-primary group-hover:bg-primary/80 pointer-events-none" />
      {/* Playhead triangle at top */}
      <div className="absolute left-[3px] top-0 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-primary pointer-events-none" />
    </div>
  );
}
