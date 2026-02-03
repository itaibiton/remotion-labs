"use client";

import { useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Thumbnail } from "@remotion/player";
import { DynamicCode } from "@/remotion/compositions/DynamicCode";
import { X, FastForward } from "lucide-react";
import { useRouter } from "next/navigation";
import { TrimHandle } from "./timeline-trim-handle";

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
  trimStart: number;
  trimEnd: number;
  scale: number;
  onRemove: (index: number) => void;
  onTrimChange: (index: number, trim: { trimStart?: number; trimEnd?: number }) => void;
}

export function TimelineScene({
  id,
  clip,
  index,
  isActive,
  trimStart,
  trimEnd,
  scale,
  onRemove,
  onTrimChange,
}: TimelineSceneProps) {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  // Local trim state for real-time visual feedback during drag
  const [localTrimStart, setLocalTrimStart] = useState(trimStart);
  const [localTrimEnd, setLocalTrimEnd] = useState(trimEnd);
  const [isTrimming, setIsTrimming] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync local state with props when NOT trimming
  useEffect(() => {
    if (!isTrimming) {
      setLocalTrimStart(trimStart);
      setLocalTrimEnd(trimEnd);
    }
  }, [trimStart, trimEnd, isTrimming]);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Calculate base duration and effective duration
  const baseDuration = clip?.durationInFrames ?? 0;
  const effectiveDuration = Math.max(1, baseDuration - localTrimStart - localTrimEnd);

  // Calculate width from local effective duration for live visual feedback during trim
  const liveWidthPx = effectiveDuration * scale;

  // Handle left trim change (live update)
  const handleLeftTrimChange = (newTrim: number) => {
    setIsTrimming(true);
    setLocalTrimStart(newTrim);
  };

  // Handle right trim change (live update)
  const handleRightTrimChange = (newTrim: number) => {
    setIsTrimming(true);
    setLocalTrimEnd(newTrim);
  };

  // Handle left trim end (persist to database)
  const handleLeftTrimEnd = () => {
    setIsTrimming(false);
    if (localTrimStart !== trimStart) {
      onTrimChange(index, { trimStart: localTrimStart });
    }
  };

  // Handle right trim end (persist to database)
  const handleRightTrimEnd = () => {
    setIsTrimming(false);
    if (localTrimEnd !== trimEnd) {
      onTrimChange(index, { trimEnd: localTrimEnd });
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, width: `${Math.max(liveWidthPx, 80)}px` }}
      className={`group relative h-[110px] flex-shrink-0 rounded-lg border bg-card overflow-hidden ${isActive ? "ring-2 ring-primary" : ""}`}
    >
      {/* Left trim handle */}
      {clip && (
        <TrimHandle
          side="left"
          onTrimChange={handleLeftTrimChange}
          onTrimEnd={handleLeftTrimEnd}
          scale={scale}
          baseDuration={baseDuration}
          currentTrim={localTrimStart}
          otherTrim={localTrimEnd}
        />
      )}

      {/* Center drag area - activates sorting */}
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="absolute inset-x-3 inset-y-0 cursor-grab active:cursor-grabbing z-10"
      />

      {/* Right trim handle */}
      {clip && (
        <TrimHandle
          side="right"
          onTrimChange={handleRightTrimChange}
          onTrimEnd={handleRightTrimEnd}
          scale={scale}
          baseDuration={baseDuration}
          currentTrim={localTrimEnd}
          otherTrim={localTrimStart}
        />
      )}

      {/* Content layer - pointer-events-none to allow drag/trim through */}
      <div className="pointer-events-none absolute inset-0">
        {/* Remove button */}
        <button
          className="pointer-events-auto absolute top-1 right-1 z-30 rounded-full bg-background/80 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onRemove(index);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Generate next scene button */}
        {clip && (
          <button
            className="pointer-events-auto absolute bottom-1 right-1 z-30 rounded-full bg-primary/80 text-primary-foreground p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              router.push(`/create?sourceClipId=${clip._id}`);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            title="Generate next scene"
          >
            <FastForward className="h-3 w-3" />
          </button>
        )}

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
                {(effectiveDuration / clip.fps).toFixed(1)}s
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full bg-destructive/10">
            <span className="text-xs text-destructive font-medium">
              Missing clip
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
