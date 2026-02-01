"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Film, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Timeline } from "./timeline";
import { AddScenePanel } from "./add-scene-panel";

export function MovieEditor({ movieId }: { movieId: string }) {
  const [showAddScene, setShowAddScene] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const movie = useQuery(api.movies.getWithClips, { id: movieId as any });
  const addScene = useMutation(api.movies.addScene);
  const removeScene = useMutation(api.movies.removeScene);
  const reorderScenes = useMutation(api.movies.reorderScenes);

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

  const handleReorder = async (newScenes: Array<{ clipId: string }>) => {
    try {
      await reorderScenes({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        movieId: movie!._id as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sceneOrder: newScenes.map((s) => ({ clipId: s.clipId as any })),
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reorder"
      );
    }
  };

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

  // Prepare scenes data with corresponding clips for the timeline
  const scenesWithClips = movie.scenes.map((scene, index) => ({
    clipId: scene.clipId,
    clip: movie.sceneClips[index] ?? null,
  }));

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between">
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
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowAddScene(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Scene
          </Button>
        </div>
      </div>

      {/* Timeline area */}
      <div className="flex-1 flex flex-col">
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
          <div className="p-6">
            <Timeline
              scenes={scenesWithClips}
              onReorder={handleReorder}
              onRemove={handleRemoveScene}
            />
          </div>
        )}
      </div>

      {/* Add Scene Dialog */}
      <AddScenePanel
        open={showAddScene}
        onOpenChange={setShowAddScene}
        onAddClip={handleAddClip}
      />
    </div>
  );
}
