"use client";

import { useState, useEffect } from "react";
import { Thumbnail } from "@remotion/player";
import { DynamicCode } from "@/remotion/compositions/DynamicCode";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ExternalLink } from "lucide-react";
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
import type { Doc } from "../../../convex/_generated/dataModel";

export interface ClipCardProps {
  clip: Doc<"clips">;
  onOpen: (clipId: string) => void;
  onDelete: (clipId: string) => void;
}

export function ClipCard({ clip, onOpen, onDelete }: ClipCardProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      <Card
        className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all overflow-hidden group"
        onClick={() => onOpen(clip._id)}
      >
        {/* Thumbnail preview */}
        <div className="aspect-video bg-black relative overflow-hidden">
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

        {/* Info and actions */}
        <div className="p-3 space-y-2">
          <div>
            <p className="font-medium text-sm truncate">{clip.name}</p>
            <p className="text-xs text-muted-foreground">
              {(clip.durationInFrames / clip.fps).toFixed(1)}s
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(clip._id);
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Open
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </Card>

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
