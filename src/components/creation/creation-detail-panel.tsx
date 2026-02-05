"use client";

import { useState, useEffect, useCallback, KeyboardEvent } from "react";
import { Thumbnail } from "@remotion/player";
import { DynamicCode } from "@/remotion/compositions/DynamicCode";
import {
  ASPECT_RATIO_PRESETS,
  type AspectRatioKey,
} from "@/lib/aspect-ratios";
import { formatRelativeTime } from "@/lib/date-utils";
import { Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Save,
  Trash2,
  RotateCcw,
  FastForward,
  Rewind,
  Loader2,
} from "lucide-react";

type Generation = Doc<"generations">;

interface CreationDetailPanelProps {
  generation: Generation;
  onSave: () => void;
  onDelete: () => void;
  onRerun: () => void;
  onExtendNext: () => void;
  onExtendPrevious: () => void;
  /** Whether to show refinement input at top of panel */
  showRefinement?: boolean;
  /** Called when user submits refinement prompt */
  onRefine?: (prompt: string) => Promise<void>;
  /** Whether refinement is in progress */
  isRefining?: boolean;
}

export function CreationDetailPanel({
  generation,
  onSave,
  onDelete,
  onRerun,
  onExtendNext,
  onExtendPrevious,
  showRefinement = false,
  onRefine,
  isRefining = false,
}: CreationDetailPanelProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [refinementPrompt, setRefinementPrompt] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleRefineSubmit = useCallback(async () => {
    if (!refinementPrompt.trim() || isRefining || !onRefine) return;
    await onRefine(refinementPrompt.trim());
    setRefinementPrompt("");
  }, [refinementPrompt, isRefining, onRefine]);

  const handleRefineKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleRefineSubmit();
      }
    },
    [handleRefineSubmit]
  );

  const isSuccess = generation.status === "success";
  const hasCode = !!generation.code;
  const canPerformActions = isSuccess && hasCode;

  const aspectRatioKey = (generation.aspectRatio ?? "16:9") as AspectRatioKey;
  const preset =
    ASPECT_RATIO_PRESETS[aspectRatioKey] ?? ASPECT_RATIO_PRESETS["16:9"];
  const durationInFrames = generation.durationInFrames ?? 90;
  const fps = generation.fps ?? 30;
  const durationInSeconds = (durationInFrames / fps).toFixed(1);
  const frameToDisplay = Math.floor(durationInFrames / 2);

  return (
    <div className="p-4 space-y-4">
      {/* Refinement input section */}
      {showRefinement && onRefine && (
        <div className="pb-4 border-b">
          <h4 className="text-xs font-medium uppercase text-muted-foreground mb-2">
            Refine Animation
          </h4>
          <Textarea
            value={refinementPrompt}
            onChange={(e) => setRefinementPrompt(e.target.value)}
            onKeyDown={handleRefineKeyDown}
            placeholder="Describe changes..."
            className="min-h-[60px] resize-none mb-2"
            rows={2}
            disabled={isRefining}
          />
          <Button
            onClick={handleRefineSubmit}
            disabled={!refinementPrompt.trim() || isRefining}
            size="sm"
            className="w-full"
          >
            {isRefining ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Refine"
            )}
          </Button>
        </div>
      )}

      {/* Prompt section */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium uppercase text-muted-foreground">
          Prompt
        </h4>
        <p className="text-sm">{generation.prompt}</p>
      </div>

      {/* Thumbnail section */}
      {canPerformActions && isMounted && generation.code && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium uppercase text-muted-foreground">
            Preview
          </h4>
          <div
            className="rounded overflow-hidden max-w-[200px]"
            style={{ aspectRatio: `${preset.width} / ${preset.height}` }}
          >
            <Thumbnail
              component={DynamicCode}
              inputProps={{
                code: generation.code,
                durationInFrames,
                fps,
              }}
              compositionWidth={preset.width}
              compositionHeight={preset.height}
              frameToDisplay={frameToDisplay}
              durationInFrames={durationInFrames}
              fps={fps}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </div>
      )}

      {/* Metadata section */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium uppercase text-muted-foreground">
          Details
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Aspect Ratio</span>
            <p>{aspectRatioKey}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Duration</span>
            <p>{durationInSeconds}s</p>
          </div>
          <div>
            <span className="text-muted-foreground">FPS</span>
            <p>{fps}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Created</span>
            <p>{formatRelativeTime(generation.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Actions section */}
      <div className="space-y-2 pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={onSave}
          disabled={!canPerformActions}
        >
          <Save className="h-4 w-4 mr-2" />
          Save to Library
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={onExtendPrevious}
          disabled={!canPerformActions}
        >
          <Rewind className="h-4 w-4 mr-2" />
          Extend Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={onExtendNext}
          disabled={!canPerformActions}
        >
          <FastForward className="h-4 w-4 mr-2" />
          Extend Next
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={onRerun}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Rerun
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-destructive hover:text-destructive"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete generation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this generation. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                onDelete();
                setShowDeleteConfirm(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
