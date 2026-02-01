"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Film } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export interface AddToMovieDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clipId: string;
}

export function AddToMovieDialog({
  open,
  onOpenChange,
  clipId,
}: AddToMovieDialogProps) {
  const movies = useQuery(api.movies.list);
  const addScene = useMutation(api.movies.addScene);
  const [addingTo, setAddingTo] = useState<string | null>(null);

  const handleAddToMovie = async (movieId: string) => {
    setAddingTo(movieId);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await addScene({ movieId: movieId as any, clipId: clipId as any });
      toast.success("Added to movie!");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add to movie"
      );
    } finally {
      setAddingTo(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Movie</DialogTitle>
          <DialogDescription>
            Select a movie to add this clip as a scene.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {/* Loading state */}
          {movies === undefined && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 rounded-md bg-muted animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {movies !== undefined && movies.length === 0 && (
            <div className="text-center py-6">
              <Film className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                No movies yet
              </p>
              <Link
                href="/movies"
                className="text-sm text-primary underline hover:no-underline"
                onClick={() => onOpenChange(false)}
              >
                Create your first movie
              </Link>
            </div>
          )}

          {/* Movie list */}
          {movies &&
            movies.length > 0 &&
            movies.map((movie) => (
              <button
                key={movie._id}
                className="w-full flex items-center gap-3 p-3 rounded-md border hover:bg-accent hover:text-accent-foreground transition-colors text-left disabled:opacity-50"
                onClick={() => handleAddToMovie(movie._id)}
                disabled={addingTo !== null}
              >
                <Film className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{movie.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {movie.scenes.length} scene{movie.scenes.length !== 1 ? "s" : ""}
                  </p>
                </div>
                {addingTo === movie._id && (
                  <span className="text-xs text-muted-foreground">Adding...</span>
                )}
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
