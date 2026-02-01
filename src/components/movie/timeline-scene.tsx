"use client";

import { useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Thumbnail } from "@remotion/player";
import { DynamicCode } from "@/remotion/compositions/DynamicCode";
import { X } from "lucide-react";

interface TimelineSceneProps {
  id: string;
  clip: {
    _id: string;
    code: string;
    name: string;
    durationInFrames: number;
    fps: number;
  } | null;
  index: number;
  isActive?: boolean;
  onRemove: (index: number) => void;
}

export function TimelineScene({
  id,
  clip,
  index,
  isActive,
  onRemove,
}: TimelineSceneProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative w-[160px] h-[110px] flex-shrink-0 rounded-lg border bg-card overflow-hidden cursor-grab active:cursor-grabbing ${isActive ? "ring-2 ring-primary" : ""}`}
    >
      {/* Remove button */}
      <button
        className="absolute top-1 right-1 z-10 rounded-full bg-background/80 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onRemove(index);
        }}
        onPointerDown={(e) => {
          // Prevent drag activation when clicking remove
          e.stopPropagation();
        }}
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {clip ? (
        <>
          {/* Thumbnail preview */}
          <div className="h-[72px] bg-black overflow-hidden">
            {isMounted ? (
              <Thumbnail
                component={DynamicCode}
                inputProps={{
                  code: clip.code,
                  durationInFrames: clip.durationInFrames,
                  fps: clip.fps,
                }}
                compositionWidth={1920}
                compositionHeight={1080}
                frameToDisplay={Math.floor(clip.durationInFrames / 2)}
                durationInFrames={clip.durationInFrames}
                fps={clip.fps}
                style={{ width: "100%" }}
              />
            ) : (
              <div className="w-full h-full bg-muted animate-pulse" />
            )}
          </div>

          {/* Info area */}
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-medium truncate max-w-[100px]">
              {clip.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {(clip.durationInFrames / clip.fps).toFixed(1)}s
            </span>
          </div>
        </>
      ) : (
        // Missing clip placeholder
        <div className="flex items-center justify-center h-full bg-destructive/10">
          <span className="text-xs text-destructive font-medium">
            Missing clip
          </span>
        </div>
      )}
    </div>
  );
}
