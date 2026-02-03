"use client";

import { useMemo, useEffect, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import {
  MovieComposition,
  type MovieScene,
} from "@/remotion/compositions/MovieComposition";
import { useCurrentPlayerFrame } from "@/hooks/use-current-player-frame";

interface MoviePreviewPlayerProps {
  scenes: MovieScene[];
  fps: number;
  totalDurationInFrames: number;
  playerRef: React.RefObject<PlayerRef | null>;
  onActiveSceneChange?: (sceneIndex: number) => void;
}

export function MoviePreviewPlayer({
  scenes,
  fps,
  totalDurationInFrames,
  playerRef,
  onActiveSceneChange,
}: MoviePreviewPlayerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const currentFrame = useCurrentPlayerFrame(playerRef);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Compute cumulative start/end frame offsets for each scene (accounting for trim)
  const sceneTimings = useMemo(() => {
    let offset = 0;
    return scenes.map((scene) => {
      const trimStart = scene.trimStart ?? 0;
      const trimEnd = scene.trimEnd ?? 0;
      const effectiveDuration = Math.max(0, scene.durationInFrames - trimStart - trimEnd);
      const startFrame = offset;
      const endFrame = offset + effectiveDuration;
      offset = endFrame;
      return { startFrame, endFrame };
    });
  }, [scenes]);

  // Determine which scene is active based on current frame
  const activeSceneIndex = useMemo(() => {
    if (sceneTimings.length === 0) return -1;
    for (let i = 0; i < sceneTimings.length; i++) {
      const { startFrame, endFrame } = sceneTimings[i];
      if (currentFrame >= startFrame && currentFrame < endFrame) {
        return i;
      }
    }
    // Fallback: if frame is at or past the end, highlight last scene
    return sceneTimings.length - 1;
  }, [currentFrame, sceneTimings]);

  // Notify parent of active scene changes
  useEffect(() => {
    onActiveSceneChange?.(activeSceneIndex);
  }, [activeSceneIndex, onActiveSceneChange]);

  // Guard: don't render player for empty movies
  if (totalDurationInFrames === 0) {
    return null;
  }

  if (!isMounted) {
    return <div className="w-full h-full bg-black/10 animate-pulse" />;
  }

  return (
    <Player
      ref={playerRef}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      component={MovieComposition as any}
      inputProps={{ scenes }}
      durationInFrames={totalDurationInFrames}
      fps={fps}
      compositionWidth={1920}
      compositionHeight={1080}
      style={{ width: "100%" }}
      controls
      loop
    />
  );
}
