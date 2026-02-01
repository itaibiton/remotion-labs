"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { Film, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreateMovieDialog } from "./create-movie-dialog";

export function MovieList() {
  const movies = useQuery(api.movies.list);
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleCreated = (movieId: string) => {
    router.push(`/movie/${movieId}`);
  };

  // Loading state
  if (movies === undefined) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg overflow-hidden border">
            <div className="aspect-video bg-muted animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-3 bg-muted animate-pulse rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (movies.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Film className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-1">No movies yet</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Create a movie to arrange your clips into scenes
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Movie
          </Button>
        </div>
        <CreateMovieDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onCreated={handleCreated}
        />
      </>
    );
  }

  // Normal state
  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Movie
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {movies.map((movie) => (
          <Card
            key={movie._id}
            className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all overflow-hidden group"
            onClick={() => router.push(`/movie/${movie._id}`)}
          >
            <div className="aspect-video bg-primary/10 flex items-center justify-center">
              <Film className="h-10 w-10 text-primary/40" />
            </div>
            <div className="p-3 space-y-1">
              <p className="font-medium text-sm truncate">{movie.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {movie.scenes.length} scene
                  {movie.scenes.length !== 1 ? "s" : ""}
                </span>
                <span>·</span>
                <span>
                  {movie.totalDurationInFrames > 0
                    ? `${(movie.totalDurationInFrames / movie.fps).toFixed(1)}s`
                    : "Empty"}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <CreateMovieDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={handleCreated}
      />
    </>
  );
}
