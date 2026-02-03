"use client";

import { useState, useEffect, useMemo } from "react";
import type { PlayerRef } from "@remotion/player";
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

interface TimelineProps {
  scenes: Array<{
    clipId: string;
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
  onReorder: (newScenes: Array<{ clipId: string }>) => void;
  onRemove: (sceneIndex: number) => void;
}

export function Timeline({ scenes, activeSceneIndex, totalDurationInFrames, fps, playerRef, onReorder, onRemove }: TimelineProps) {
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

  // Calculate proportional widths for each scene based on duration
  const sceneWidths = useMemo(() => {
    return localScenes.map((scene) => {
      const duration = scene.clip?.durationInFrames ?? 0;
      if (totalDurationInFrames === 0) return "0%";
      const percent = (duration / totalDurationInFrames) * 100;
      return `${percent}%`;
    });
  }, [localScenes, totalDurationInFrames]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sceneIds.indexOf(String(active.id));
    const newIndex = sceneIds.indexOf(String(over.id));
    const newOrder = arrayMove(localScenes, oldIndex, newIndex);

    // Optimistic update -- immediate visual feedback
    setLocalScenes(newOrder);

    // Persist to database
    onReorder(newOrder.map((s) => ({ clipId: s.clipId })));
  }

  return (
    <div>
      <div className="px-4">
        <TimelineRuler totalDurationInFrames={totalDurationInFrames} fps={fps} />
      </div>
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
          <div className="flex flex-row overflow-x-auto p-4 min-h-[140px] bg-muted/20 rounded-lg border border-dashed">
            {localScenes.map((scene, index) => (
              <TimelineScene
                key={`scene-${index}`}
                id={`scene-${index}`}
                clip={scene.clip}
                index={index}
                isActive={index === activeSceneIndex}
                widthPercent={sceneWidths[index]}
                onRemove={onRemove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Drag to reorder scenes
      </p>
    </div>
  );
}
