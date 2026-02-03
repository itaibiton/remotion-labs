"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { PlayerRef } from "@remotion/player";
import { useCurrentPlayerFrame } from "@/hooks/use-current-player-frame";
import { useTimelineZoom } from "@/hooks/use-timeline-zoom";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { TimelineScene } from "./timeline-scene";
import { TimelineRuler } from "./timeline-ruler";
import { TimelinePlayhead } from "./timeline-playhead";
import { TimelineZoomControls } from "./timeline-zoom-controls";

interface TimelineProps {
  scenes: Array<{
    clipId: string;
    trimStart?: number;
    trimEnd?: number;
    clip: {
      _id: string;
      code: string;
      name: string;
      durationInFrames: number;
      fps: number;
    } | null;
  }>;
  activeSceneIndex?: number;
  totalDurationInFrames: number;
  fps: number;
  playerRef: React.RefObject<PlayerRef | null>;
  onReorder: (newScenes: Array<{ clipId: string; trimStart?: number; trimEnd?: number }>) => void;
  onRemove: (sceneIndex: number) => void;
  onTrimScene: (sceneIndex: number, trimStart?: number, trimEnd?: number) => void;
}

export function Timeline({ scenes, activeSceneIndex, totalDurationInFrames, fps, playerRef, onReorder, onRemove, onTrimScene }: TimelineProps) {
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentFrame = useCurrentPlayerFrame(playerRef);

  // Zoom state
  const { scale, zoomIn, zoomOut, handleWheel, minScale, maxScale } = useTimelineZoom();

  // Calculate timeline width based on scale (pixels per frame)
  const timelineWidth = totalDurationInFrames * scale;

  // Attach wheel handler for Ctrl+scroll zoom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handler = (e: WheelEvent) => handleWheel(e);
    container.addEventListener("wheel", handler, { passive: false });
    return () => container.removeEventListener("wheel", handler);
  }, [handleWheel]);

  // Optimistic local state to prevent flicker on reorder
  const [localScenes, setLocalScenes] = useState(scenes);

  // Sync from props when the server state changes
  useEffect(() => {
    setLocalScenes(scenes);
  }, [JSON.stringify(scenes)]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  // Stable IDs derived from index -- used for both SortableContext items and TimelineScene id
  const sceneIds = localScenes.map((_, i) => `scene-${i}`);

  // Calculate pixel widths for each scene based on EFFECTIVE duration (accounting for trim) and scale
  const sceneWidths = localScenes.map((scene) => {
    const baseDuration = scene.clip?.durationInFrames ?? 0;
    const trimStart = scene.trimStart ?? 0;
    const trimEnd = scene.trimEnd ?? 0;
    const effectiveDuration = Math.max(1, baseDuration - trimStart - trimEnd);
    return effectiveDuration * scale;
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sceneIds.indexOf(String(active.id));
    const newIndex = sceneIds.indexOf(String(over.id));
    const newOrder = arrayMove(localScenes, oldIndex, newIndex);

    // Optimistic update -- immediate visual feedback
    setLocalScenes(newOrder);

    // Persist to database (include trimStart/trimEnd in reorder)
    onReorder(newOrder.map((s) => ({
      clipId: s.clipId,
      trimStart: s.trimStart,
      trimEnd: s.trimEnd,
    })));
  }

  // Handle trim change from TimelineScene
  const handleTrimChange = useCallback((index: number, trim: { trimStart?: number; trimEnd?: number }) => {
    onTrimScene(index, trim.trimStart, trim.trimEnd);
  }, [onTrimScene]);

  // Click-to-seek: clicking on the timeline background/ruler seeks to that position
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Don't seek if clicking on a clip or playhead (only background/ruler)
    if ((e.target as HTMLElement).closest('[data-sortable]')) return;
    if ((e.target as HTMLElement).closest('[data-playhead]')) return;
    const container = timelineContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    // Convert click position to frame using scale
    const clickX = e.clientX - rect.left;
    const frame = Math.round(clickX / scale);
    const clampedFrame = Math.max(0, Math.min(frame, totalDurationInFrames - 1));
    playerRef.current?.seekTo(clampedFrame);
  }, [playerRef, totalDurationInFrames, scale]);

  return (
    <div>
      {/* Header with zoom controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <span className="text-sm text-muted-foreground">Timeline</span>
        <TimelineZoomControls
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          scale={scale}
          minScale={minScale}
          maxScale={maxScale}
        />
      </div>

      {/* Scrollable timeline area */}
      <div
        ref={scrollContainerRef}
        className="relative overflow-x-auto"
      >
        {/* Timeline content with fixed width based on scale */}
        <div
          ref={timelineContainerRef}
          className="relative cursor-pointer"
          style={{ width: `${Math.max(timelineWidth, 100)}px`, minWidth: '100%' }}
          onClick={handleTimelineClick}
        >
          {/* Playhead indicator */}
          <TimelinePlayhead
            currentFrame={currentFrame}
            totalDurationInFrames={totalDurationInFrames}
            playerRef={playerRef}
            containerRef={timelineContainerRef}
            scale={scale}
          />

          {/* Ruler */}
          <div className="px-4">
            <TimelineRuler
              totalDurationInFrames={totalDurationInFrames}
              fps={fps}
              scale={scale}
            />
          </div>

          {/* Clip track */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToHorizontalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sceneIds}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex flex-row p-4 min-h-[140px] bg-muted/20 rounded-lg border border-dashed">
                {localScenes.map((scene, index) => (
                  <TimelineScene
                    key={`scene-${index}`}
                    id={`scene-${index}`}
                    clip={scene.clip}
                    index={index}
                    isActive={index === activeSceneIndex}
                    widthPx={sceneWidths[index]}
                    trimStart={scene.trimStart ?? 0}
                    trimEnd={scene.trimEnd ?? 0}
                    scale={scale}
                    onRemove={onRemove}
                    onTrimChange={handleTrimChange}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-2 text-center">
        Drag to reorder | Drag edges to trim | Ctrl+scroll to zoom
      </p>
    </div>
  );
}
