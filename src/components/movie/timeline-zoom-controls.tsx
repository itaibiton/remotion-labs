"use client";

import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimelineZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  scale: number;
  minScale: number;
  maxScale: number;
}

export function TimelineZoomControls({
  onZoomIn,
  onZoomOut,
  scale,
  minScale,
  maxScale,
}: TimelineZoomControlsProps) {
  // Display scale as percentage relative to default (3 px/frame = 100%)
  const displayPercent = Math.round((scale / 3) * 100);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onZoomOut}
        disabled={scale <= minScale}
        title="Zoom out (Ctrl + scroll down)"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <span className="text-xs text-muted-foreground min-w-[3rem] text-center tabular-nums">
        {displayPercent}%
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onZoomIn}
        disabled={scale >= maxScale}
        title="Zoom in (Ctrl + scroll up)"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
    </div>
  );
}
