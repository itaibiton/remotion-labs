"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { PlayerRef } from "@remotion/player";
import { Play, Pause, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentPlayerFrame } from "@/hooks/use-current-player-frame";

interface VideoControlsProps {
  playerRef: React.RefObject<PlayerRef | null>;
  durationInFrames: number;
  fps: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function VideoControls({
  playerRef,
  durationInFrames,
  fps,
  containerRef,
}: VideoControlsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wasPlayingRef = useRef(false);
  const scrubberRef = useRef<HTMLDivElement>(null);

  const currentFrame = useCurrentPlayerFrame(playerRef);
  const progress = durationInFrames > 0 ? (currentFrame / durationInFrames) * 100 : 0;

  // Check if player is playing
  const isPlaying = playerRef.current?.isPlaying() ?? false;

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    if (player.isPlaying()) {
      player.pause();
    } else {
      player.play();
    }
  }, [playerRef]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await container.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  }, [containerRef]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Get frame from mouse X position
  const getFrameFromX = useCallback(
    (clientX: number) => {
      const scrubber = scrubberRef.current;
      if (!scrubber) return 0;

      const rect = scrubber.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      return Math.round(percentage * (durationInFrames - 1));
    },
    [durationInFrames]
  );

  // Scrubber pointer handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDragging(true);
      wasPlayingRef.current = playerRef.current?.isPlaying() ?? false;
      playerRef.current?.pause();
      const frame = getFrameFromX(e.clientX);
      playerRef.current?.seekTo(frame);
    },
    [getFrameFromX, playerRef]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const frame = getFrameFromX(e.clientX);
      playerRef.current?.seekTo(frame);
    },
    [isDragging, getFrameFromX, playerRef]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    if (wasPlayingRef.current) {
      playerRef.current?.play();
    }
  }, [playerRef]);

  // Click to seek
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) return;
      const frame = getFrameFromX(e.clientX);
      playerRef.current?.seekTo(frame);
    },
    [isDragging, getFrameFromX, playerRef]
  );

  // Format time display
  const formatTime = (frames: number) => {
    const seconds = frames / fps;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentTime = formatTime(currentFrame);
  const totalTime = formatTime(durationInFrames);

  return (
    <div className="absolute bottom-0 inset-x-0 px-4 pb-4 pt-12 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <div className="flex items-center gap-3 h-10 text-white">
        {/* Play/Pause button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePlay}
          className="text-white hover:bg-white/20 hover:text-white h-8 w-8"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        {/* Time display */}
        <span className="text-xs font-mono tabular-nums min-w-[70px]">
          {currentTime} / {totalTime}
        </span>

        {/* Timeline scrubber */}
        <div
          ref={scrubberRef}
          className="flex-1 relative h-8 cursor-pointer touch-none"
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Background track */}
          <div className="absolute inset-y-3 inset-x-0 bg-white/20 rounded-full" />
          {/* Progress fill */}
          <div
            className="absolute inset-y-3 left-0 bg-white rounded-full"
            style={{ width: `${progress}%` }}
          />
          {/* Draggable thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md transition-transform hover:scale-125"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>

        {/* Fullscreen button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFullscreen}
          className="text-white hover:bg-white/20 hover:text-white h-8 w-8"
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
