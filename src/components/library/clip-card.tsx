"use client";

import { useState, useEffect } from "react";
import { Thumbnail } from "@remotion/player";
import { DynamicCode } from "@/remotion/compositions/DynamicCode";
import { Button } from "@/components/ui/button";
import { Trash2, ExternalLink, FastForward, Rewind } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Doc } from "../../../convex/_generated/dataModel";

export interface ClipCardProps {
  clip: Doc<"clips">;
  onOpen: (clipId: string) => void;
  onDelete: (clipId: string) => void;
}

export function ClipCard({ clip, onOpen, onDelete }: ClipCardProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className="group relative aspect-video rounded-lg overflow-hidden cursor-pointer"
        onClick={() => onOpen(clip._id)}
        onKeyDown={(e) => { if (e.key === "Enter") onOpen(clip._id); }}
      >
        {/* Thumbnail fills entire card */}
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
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}

        {/* Hover overlay with UI */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2.5">
          {/* Clip name */}
          <p className="font-medium text-sm text-white truncate">{clip.name}</p>
          <p className="text-xs text-white/70">
            {(clip.durationInFrames / clip.fps).toFixed(1)}s
          </p>

          {/* Action buttons */}
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-1 pt-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(clip._id);
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Open</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/create?sourceClipId=${clip._id}&mode=prequel`);
                    }}
                  >
                    <Rewind className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Generate Previous</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/create?sourceClipId=${clip._id}`);
                    }}
                  >
                    <FastForward className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Generate Next</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 ml-auto text-red-400 hover:text-red-300 hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Delete</p></TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete clip?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{clip.name}&quot;? This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete(clip._id);
                setShowDeleteDialog(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
