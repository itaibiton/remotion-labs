"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  widthPercent: string;
  trimStart: number;
  trimEnd: number;
  totalDurationInFrames: number;
  onRemove: (index: number) => void;
  onTrimChange: (index: number, trim: { trimStart?: number; trimEnd?: number }) => void;
}

export function TimelineScene({
  id,
  clip,
  index,
  isActive,
  widthPercent,
  trimStart,
  trimEnd,
  totalDurationInFrames,
  onRemove,
  onTrimChange,
}: TimelineSceneProps) {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // Local trim state for real-time visual feedback during drag
  const [localTrimStart, setLocalTrimStart] = useState(trimStart);
  const [localTrimEnd, setLocalTrimEnd] = useState(trimEnd);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync local state with props when not dragging
  useEffect(() => {
    setLocalTrimStart(trimStart);
    setLocalTrimEnd(trimEnd);
  }, [trimStart, trimEnd]);

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

  // Calculate pixels per frame based on container width
  // We need the actual rendered width to convert between pixels and frames
  const [containerWidth, setContainerWidth] = useState(100);

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width);
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  // Calculate pixelsPerFrame based on container width and effective duration
  const pixelsPerFrame = containerWidth > 0 && effectiveDuration > 0
    ? containerWidth / effectiveDuration
    : 1;

  // Handle trim delta for left handle
  const handleLeftTrimDelta = useCallback((deltaFrames: number) => {
    setLocalTrimStart((prev) => {
      const newTrim = Math.max(0, prev + deltaFrames);
      // Ensure we don't trim past the end (leave at least 1 frame)
      const maxTrim = baseDuration - localTrimEnd - 1;
      return Math.min(maxTrim, newTrim);
    });
  }, [baseDuration, localTrimEnd]);

  // Handle trim delta for right handle
  const handleRightTrimDelta = useCallback((deltaFrames: number) => {
    setLocalTrimEnd((prev) => {
      const newTrim = Math.max(0, prev + deltaFrames);
      // Ensure we don't trim past the start (leave at least 1 frame)
      const maxTrim = baseDuration - localTrimStart - 1;
      return Math.min(maxTrim, newTrim);
    });
  }, [baseDuration, localTrimStart]);

  // Handle trim end (persist to database)
  const handleLeftTrimEnd = useCallback(() => {
    if (localTrimStart !== trimStart) {
      onTrimChange(index, { trimStart: localTrimStart });
    }
  }, [index, localTrimStart, trimStart, onTrimChange]);

  const handleRightTrimEnd = useCallback(() => {
    if (localTrimEnd !== trimEnd) {
      onTrimChange(index, { trimEnd: localTrimEnd });
    }
  }, [index, localTrimEnd, trimEnd, onTrimChange]);

  // Max trim for left handle: can trim up to baseDuration - trimEnd - 1
  const maxLeftTrim = Math.max(0, baseDuration - localTrimEnd - 1 - localTrimStart);
  // Max trim for right handle: can trim up to baseDuration - trimStart - 1
  const maxRightTrim = Math.max(0, baseDuration - localTrimStart - 1 - localTrimEnd);

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      style={{ ...style, width: widthPercent, minWidth: "80px" }}
      className={`group relative h-[110px] flex-shrink-0 rounded-lg border bg-card overflow-hidden ${isActive ? "ring-2 ring-primary" : ""}`}
    >
      {/* Left trim handle - NOT part of drag system */}
      {clip && (
        <TrimHandle
          side="left"
          onTrimDelta={handleLeftTrimDelta}
          onTrimEnd={handleLeftTrimEnd}
          pixelsPerFrame={pixelsPerFrame}
          maxTrimFrames={maxLeftTrim}
          currentTrimFrames={localTrimStart}
        />
      )}

      {/* Center drag area - activates sorting */}
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="absolute inset-x-2 inset-y-0 cursor-grab active:cursor-grabbing z-10"
      />

      {/* Right trim handle - NOT part of drag system */}
      {clip && (
        <TrimHandle
          side="right"
          onTrimDelta={handleRightTrimDelta}
          onTrimEnd={handleRightTrimEnd}
          pixelsPerFrame={pixelsPerFrame}
          maxTrimFrames={maxRightTrim}
          currentTrimFrames={localTrimEnd}
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
            // Prevent drag activation when clicking remove
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
          // Missing clip placeholder
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
