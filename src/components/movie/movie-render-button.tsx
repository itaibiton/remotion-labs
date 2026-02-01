"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Video, Loader2, Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface MovieRenderButtonProps {
  movieId: string;
  disabled?: boolean;
}

export function MovieRenderButton({
  movieId,
  disabled = false,
}: MovieRenderButtonProps) {
  const startMovieRender = useAction(api.triggerRender.startMovieRender);
  const [isStarting, setIsStarting] = useState(false);

  // Track latest render for this movie
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const render = useQuery(api.renders.getByMovie, { movieId: movieId as any });

  const handleRender = async () => {
    setIsStarting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await startMovieRender({ movieId: movieId as any });
      toast.success("Movie render started!");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start render";
      toast.error(message);
    } finally {
      setIsStarting(false);
    }
  };

  // State: render in progress (pending or rendering)
  if (
    render &&
    (render.status === "pending" || render.status === "rendering") &&
    !isStarting
  ) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        Rendering {render.progress}%
      </Button>
    );
  }

  // State: render complete
  if (render && render.status === "complete" && !isStarting) {
    return (
      <div className="flex items-center gap-1">
        {render.outputUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={render.outputUrl} download="movie.mp4" target="_blank">
              <Download className="h-4 w-4" />
              Download MP4
            </a>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRender}
          disabled={disabled}
        >
          <RotateCcw className="h-4 w-4" />
          Re-render
        </Button>
      </div>
    );
  }

  // State: no render, failed render, or starting
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRender}
      disabled={disabled || isStarting}
    >
      {isStarting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Starting...
        </>
      ) : (
        <>
          <Video className="h-4 w-4" />
          Render MP4
        </>
      )}
    </Button>
  );
}
