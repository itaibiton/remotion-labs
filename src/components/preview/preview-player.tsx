"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DynamicCode, type DynamicCodeProps } from "@/remotion/compositions/DynamicCode";

// Loading placeholder for Player
function LoadingPlaceholder() {
  return (
    <div className="aspect-video bg-black rounded-lg animate-pulse" />
  );
}

interface PreviewPlayerProps {
  code: string;
  durationInFrames: number;
  fps: number;
}

function PreviewPlayerInner({ code, durationInFrames, fps }: PreviewPlayerProps) {
  const playerRef = useRef<PlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  // Memoize inputProps to prevent unnecessary re-renders
  const inputProps: DynamicCodeProps = useMemo(
    () => ({
      code,
      durationInFrames,
      fps,
    }),
    [code, durationInFrames, fps]
  );

  // Handle play event
  const onPlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  // Handle pause event
  const onPause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Set up event listeners for player state
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);

    return () => {
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
    };
  }, [onPlay, onPause]);

  // Toggle play/pause
  const handlePlayPause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  }, [isPlaying]);

  // Replay from beginning
  const handleReplay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    player.seekTo(0);
    player.play();
  }, []);

  return (
    <div className="w-full space-y-4">
      {/* Player container */}
      <div className="rounded-lg overflow-hidden shadow-lg border">
        <Player
          ref={playerRef}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          component={DynamicCode as any}
          inputProps={inputProps}
          durationInFrames={durationInFrames}
          fps={fps}
          compositionWidth={1920}
          compositionHeight={1080}
          style={{ width: "100%" }}
          controls={false}
          loop={true}
          autoPlay={true}
        />
      </div>

      {/* Custom controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePlayPause}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleReplay}
          aria-label="Replay"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Wrapper that prevents SSR (Remotion uses browser APIs)
export function PreviewPlayer({ code, durationInFrames, fps }: PreviewPlayerProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <LoadingPlaceholder />;
  }

  return (
    <PreviewPlayerInner
      code={code}
      durationInFrames={durationInFrames}
      fps={fps}
    />
  );
}

// Alias for semantic clarity - DynamicPreviewPlayer for code-based generation
// Note: TemplatePlayer in /templates/template-player.tsx handles legacy props-based templates
export { PreviewPlayer as DynamicPreviewPlayer };
