"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { type PlayerRef } from "@remotion/player";
import { api } from "../../../convex/_generated/api";
import { Film, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Timeline } from "./timeline";
import { AddScenePanel } from "./add-scene-panel";
import { MoviePreviewPlayer } from "@/components/movie/movie-preview-player";
import { MovieRenderButton } from "@/components/movie/movie-render-button";
import { MovieExportButtons } from "@/components/movie/movie-export-buttons";
import { useBladeMode } from "@/hooks/use-blade-mode";
import { useCurrentPlayerFrame } from "@/hooks/use-current-player-frame";


export function MovieEditor({ movieId }: { movieId: string }) {
  const [showAddScene, setShowAddScene] = useState(false);
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(-1);
  const playerRef = useRef<PlayerRef>(null);
  const currentFrame = useCurrentPlayerFrame(playerRef);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const movie = useQuery(api.movies.getWithClips, { id: movieId as any });
  const addScene = useMutation(api.movies.addScene);
  const removeScene = useMutation(api.movies.removeScene);
  const reorderScenes = useMutation(api.movies.reorderScenes);
  const trimSceneMutation = useMutation(api.movies.trimScene);
  const splitSceneMutation = useMutation(api.movies.splitScene);

  const handleAddClip = async (clipId: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await addScene({ movieId: movie!._id as any, clipId: clipId as any });
      toast.success("Scene added");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add scene"
      );
    }
  };

  const handleRemoveScene = async (sceneIndex: number) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await removeScene({ movieId: movie!._id as any, sceneIndex });
      toast.success("Scene removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove scene"
      );
    }
  };

  const handleReorder = async (newScenes: Array<{ clipId: string; trimStart?: number; trimEnd?: number }>) => {
    try {
      await reorderScenes({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        movieId: movie!._id as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sceneOrder: newScenes.map((s) => ({
          clipId: s.clipId as any,
          trimStart: s.trimStart,
          trimEnd: s.trimEnd,
        })),
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reorder"
      );
    }
  };

  const handleTrimScene = async (sceneIndex: number, trimStart?: number, trimEnd?: number) => {
    try {
      await trimSceneMutation({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        movieId: movie!._id as any,
        sceneIndex,
        trimStart,
        trimEnd,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to trim scene"
      );
    }
  };

  // Prepare scenes data with corresponding clips for the timeline
  // Must be above early returns so hooks below are always called
  const scenesWithClips = useMemo(
    () =>
      movie
        ? movie.scenes.map((scene, index) => ({
            clipId: scene.clipId,
            trimStart: scene.trimStart,
            trimEnd: scene.trimEnd,
            clip: movie.sceneClips[index] ?? null,
          }))
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [movie ? JSON.stringify(movie.scenes) : null, movie?.sceneClips]
  );

  // Build valid scenes array for the preview player (only scenes with loaded clips)
  // Include trimStart/trimEnd for non-destructive playback
  const validScenes = useMemo(
    () =>
      scenesWithClips
        .filter((s) => s.clip !== null)
        .map((s) => ({
          code: s.clip!.code,
          durationInFrames: s.clip!.durationInFrames,
          fps: s.clip!.fps,
          trimStart: s.trimStart ?? 0,
          trimEnd: s.trimEnd ?? 0,
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(scenesWithClips)]
  );

  // Calculate total duration accounting for trim values
  const totalDurationInFrames = useMemo(
    () => validScenes.reduce((sum, s) => {
      const effectiveDuration = Math.max(0, s.durationInFrames - s.trimStart - s.trimEnd);
      return sum + effectiveDuration;
    }, 0),
    [validScenes]
  );

  // Build export scenes array with rawCode for zip export
  const exportScenes = useMemo(
    () =>
      scenesWithClips
        .filter((s) => s.clip !== null)
        .map((s) => ({
          rawCode: s.clip!.rawCode,
          name: s.clip!.name,
          durationInFrames: s.clip!.durationInFrames,
          fps: s.clip!.fps,
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(scenesWithClips)]
  );

  // Find which scene contains a given playback frame and convert to clip frame
  const findSceneAtFrame = useCallback((targetFrame: number): { sceneIndex: number; frameInClip: number } | null => {
    let offset = 0;
    for (let i = 0; i < scenesWithClips.length; i++) {
      const scene = scenesWithClips[i];
      if (!scene.clip) continue;

      const trimStart = scene.trimStart ?? 0;
      const trimEnd = scene.trimEnd ?? 0;
      const baseDuration = scene.clip.durationInFrames;
      const effectiveDuration = Math.max(0, baseDuration - trimStart - trimEnd);

      if (targetFrame >= offset && targetFrame < offset + effectiveDuration) {
        // Frame is in this scene - convert playback frame to clip frame
        const frameInScene = targetFrame - offset;
        const frameInClip = trimStart + frameInScene;
        return { sceneIndex: i, frameInClip };
      }

      offset += effectiveDuration;
    }
    return null;
  }, [scenesWithClips]);

  // Split handler for blade mode
  const handleSplitAtPlayhead = useCallback(async () => {
    if (!movie) return;

    const location = findSceneAtFrame(currentFrame);
    if (!location) {
      toast.error("No clip at playhead position");
      return;
    }

    try {
      await splitSceneMutation({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        movieId: movie._id as any,
        sceneIndex: location.sceneIndex,
        splitFrame: location.frameInClip,
      });
      toast.success("Clip split");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to split clip");
    }
  }, [movie, currentFrame, findSceneAtFrame, splitSceneMutation]);

  // Blade mode with keyboard shortcuts
  const { isBladeMode, toggleBladeMode } = useBladeMode({
    onSplitAtPlayhead: handleSplitAtPlayhead,
  });

  // Loading state
  if (movie === undefined) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="border-b px-6 py-4">
          <div className="h-7 bg-muted animate-pulse rounded w-48 mb-2" />
          <div className="h-4 bg-muted animate-pulse rounded w-32" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Not found state
  if (movie === null) {
    return (
      <div className="flex-1 flex items-center justify-center text-center">
        <div>
          <Film className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-1">Movie not found</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This movie may have been deleted or the link is invalid.
          </p>
          <Button asChild>
            <Link href="/movie">Back to Movies</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold">{movie.name}</h1>
          <p className="text-sm text-muted-foreground">
            {movie.scenes.length} scene
            {movie.scenes.length !== 1 ? "s" : ""} ·{" "}
            {movie.totalDurationInFrames > 0
              ? `${(movie.totalDurationInFrames / movie.fps).toFixed(1)}s`
              : "Empty"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MovieRenderButton
            movieId={movieId}
            disabled={validScenes.length === 0}
          />
          <MovieExportButtons
            movieName={movie.name}
            scenes={exportScenes}
            totalDurationInFrames={totalDurationInFrames}
            fps={movie.fps}
            disabled={validScenes.length === 0}
          />
          <Button onClick={() => setShowAddScene(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Scene
          </Button>
        </div>
      </div>

      {/* Content area */}
      {movie.scenes.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <Film className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-1">No scenes yet</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Add clips from your library to build your movie
            </p>
            <Button onClick={() => setShowAddScene(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Scene
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Preview — fixed proportion, vertically centered */}
          <div className="flex-[3] min-h-0 flex items-center justify-center p-4 bg-black/5">
            <div style={{ height: "100%", aspectRatio: "16 / 9", maxWidth: "100%" }}>
              <MoviePreviewPlayer
                scenes={validScenes}
                fps={movie.fps}
                totalDurationInFrames={totalDurationInFrames}
                playerRef={playerRef}
                onActiveSceneChange={setActiveSceneIndex}
              />
            </div>
          </div>
          {/* Timeline — fills remaining space */}
          <div className="flex-[2] min-h-0 overflow-y-auto p-4">
            <Timeline
              scenes={scenesWithClips}
              activeSceneIndex={activeSceneIndex}
              totalDurationInFrames={totalDurationInFrames}
              fps={movie.fps}
              playerRef={playerRef}
              onReorder={handleReorder}
              onRemove={handleRemoveScene}
              onTrimScene={handleTrimScene}
              isBladeMode={isBladeMode}
              onToggleBladeMode={toggleBladeMode}
              onSplit={handleSplitAtPlayhead}
            />
          </div>
        </div>
      )}

      {/* Add Scene Dialog */}
      <AddScenePanel
        open={showAddScene}
        onOpenChange={setShowAddScene}
        onAddClip={handleAddClip}
      />
    </div>
  );
}
