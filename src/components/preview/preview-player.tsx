"use client";

import { useRef, useState, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DynamicCode, type DynamicCodeProps } from "@/remotion/compositions/DynamicCode";
import {
  ASPECT_RATIO_PRESETS,
  type AspectRatioKey,
} from "@/lib/aspect-ratios";

// Loading placeholder for Player
function LoadingPlaceholder({ aspectRatio = "16:9" }: { aspectRatio?: string }) {
  const preset = ASPECT_RATIO_PRESETS[aspectRatio as AspectRatioKey] ?? ASPECT_RATIO_PRESETS["16:9"];
  return (
    <div
      className="w-full bg-black rounded-lg animate-pulse"
      style={{ aspectRatio: `${preset.width} / ${preset.height}` }}
    />
  );
}

interface PreviewPlayerProps {
  code: string;
  durationInFrames: number;
  fps: number;
  aspectRatio?: string;
  /** When true, the player will fit within its parent container respecting max-height */
  constrained?: boolean;
  /** Whether to show built-in play/pause/replay controls. Default true. */
  showControls?: boolean;
}

const PreviewPlayerInner = forwardRef<PlayerRef, PreviewPlayerProps>(
  function PreviewPlayerInner(
    { code, durationInFrames, fps, aspectRatio = "16:9", constrained = false, showControls = true },
    ref
  ) {
    const internalRef = useRef<PlayerRef>(null);
    const [isPlaying, setIsPlaying] = useState(true);

    // Expose the internal ref via forwardRef
    useImperativeHandle(ref, () => internalRef.current!, []);

    const preset = ASPECT_RATIO_PRESETS[aspectRatio as AspectRatioKey] ?? ASPECT_RATIO_PRESETS["16:9"];

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
      const player = internalRef.current;
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
      const player = internalRef.current;
      if (!player) return;

      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    }, [isPlaying]);

    // Replay from beginning
    const handleReplay = useCallback(() => {
      const player = internalRef.current;
      if (!player) return;

      player.seekTo(0);
      player.play();
    }, []);

    // Determine aspect ratio category for layout
    const isPortrait = preset.height > preset.width;
    const isSquare = preset.height === preset.width;

    // Container styles depend on constrained mode and aspect ratio
    // For portrait (9:16): height-constrained, width auto
    // For square (1:1): height-constrained (like portrait) since width=100% would overflow height
    // For landscape (16:9): width is 100%, height auto from aspect ratio
    const containerStyle = constrained
      ? isPortrait || isSquare
        ? {
            height: "min(100%, 80vh)",
            width: "auto",
            aspectRatio: `${preset.width} / ${preset.height}`,
          }
        : {
            width: "100%",
            maxWidth: "100%",
            height: "auto",
            aspectRatio: `${preset.width} / ${preset.height}`,
          }
      : {
          aspectRatio: `${preset.width} / ${preset.height}`,
        };

    // For constrained landscape, we need the wrapper to take full width so video can expand
    // For portrait and square, center the narrower/equal video horizontally and constrain height
    const wrapperClassName = constrained
      ? isPortrait || isSquare
        ? "flex flex-col items-center justify-center h-full w-full gap-4"
        : "flex flex-col items-center w-full h-full gap-4"
      : "w-full space-y-4";

    return (
      <div className={wrapperClassName}>
        {/* Player container with aspect ratio */}
        <div
          className={`rounded-lg overflow-hidden shadow-lg border bg-black ${
            constrained ? (isPortrait || isSquare ? "" : "w-full") : "w-full"
          }`}
          style={containerStyle}
        >
          <Player
            ref={internalRef}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            component={DynamicCode as any}
            inputProps={inputProps}
            durationInFrames={durationInFrames}
            fps={fps}
            compositionWidth={preset.width}
            compositionHeight={preset.height}
            style={{ width: "100%", height: "100%" }}
            controls={false}
            loop={true}
            autoPlay={true}
          />
        </div>

        {/* Custom controls - only show if showControls is true */}
        {showControls && (
          <div className="flex items-center justify-center gap-2 shrink-0">
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
        )}
      </div>
    );
  }
);

// Wrapper that prevents SSR (Remotion uses browser APIs)
export const PreviewPlayer = forwardRef<PlayerRef, PreviewPlayerProps>(
  function PreviewPlayer(
    { code, durationInFrames, fps, aspectRatio = "16:9", constrained = false, showControls = true },
    ref
  ) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    if (!isMounted) {
      return <LoadingPlaceholder aspectRatio={aspectRatio} />;
    }

    // Validate required props before rendering Player
    if (!code || typeof durationInFrames !== "number" || typeof fps !== "number") {
      const preset = ASPECT_RATIO_PRESETS[aspectRatio as AspectRatioKey] ?? ASPECT_RATIO_PRESETS["16:9"];
      return (
        <div
          className="w-full bg-black rounded-lg flex items-center justify-center"
          style={{ aspectRatio: `${preset.width} / ${preset.height}` }}
        >
          <p className="text-red-400 text-sm">Invalid animation data</p>
        </div>
      );
    }

    return (
      <PreviewPlayerInner
        ref={ref}
        code={code}
        durationInFrames={durationInFrames}
        fps={fps}
        aspectRatio={aspectRatio}
        constrained={constrained}
        showControls={showControls}
      />
    );
  }
);

// Alias for semantic clarity - DynamicPreviewPlayer for code-based generation
// Note: TemplatePlayer in /templates/template-player.tsx handles legacy props-based templates
export { PreviewPlayer as DynamicPreviewPlayer };
