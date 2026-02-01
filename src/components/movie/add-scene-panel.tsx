"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Thumbnail } from "@remotion/player";
import { DynamicCode } from "@/remotion/compositions/DynamicCode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AddScenePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddClip: (clipId: string) => void;
}

export function AddScenePanel({
  open,
  onOpenChange,
  onAddClip,
}: AddScenePanelProps) {
  const [isMounted, setIsMounted] = useState(false);
  const clips = useQuery(api.clips.list);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Scene</DialogTitle>
          <DialogDescription>
            Select a clip from your library to add as a scene.
          </DialogDescription>
        </DialogHeader>

        {clips === undefined ? (
          // Loading skeleton
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="aspect-video bg-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : clips.length === 0 ? (
          // Empty state
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-2">
              No clips in your library
            </p>
            <a
              href="/create"
              className="text-sm text-primary hover:underline"
            >
              Create a clip first
            </a>
          </div>
        ) : (
          // Clip grid
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
            {clips.map((clip) => (
              <button
                key={clip._id}
                className="text-left rounded-lg border bg-card overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer"
                onClick={() => {
                  onAddClip(clip._id);
                  onOpenChange(false);
                }}
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-black overflow-hidden">
                  {isMounted && clip.code ? (
                    <Thumbnail
                      component={DynamicCode}
                      inputProps={{
                        code: clip.code,
                        durationInFrames: clip.durationInFrames,
                        fps: clip.fps,
                      }}
                      compositionWidth={1920}
                      compositionHeight={1080}
                      frameToDisplay={Math.floor(clip.durationInFrames / 2)}
                      durationInFrames={clip.durationInFrames}
                      fps={clip.fps}
                      style={{ width: "100%" }}
                    />
                  ) : (
                    <div className="w-full h-full bg-muted animate-pulse" />
                  )}
                </div>

                {/* Info */}
                <div className="p-2">
                  <p className="text-sm font-medium truncate">{clip.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(clip.durationInFrames / clip.fps).toFixed(1)}s
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
