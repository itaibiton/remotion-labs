"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Film } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function MovieEditor({ movieId }: { movieId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const movie = useQuery(api.movies.getWithClips, { id: movieId as any });

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
          {/* Placeholder for future preview/render buttons (Phase 11) */}
        </div>
      </div>

      {/* Timeline area - placeholder for Plan 03 */}
      <div className="flex-1 flex flex-col">
        {movie.scenes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <Film className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-1">No scenes yet</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Add clips from your library to build your movie
              </p>
              {/* Add Scene button - will be wired in Plan 03 */}
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Timeline component will be rendered here in Plan 03 */}
            <p className="text-muted-foreground text-sm">
              Timeline: {movie.scenes.length} scenes loaded
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
