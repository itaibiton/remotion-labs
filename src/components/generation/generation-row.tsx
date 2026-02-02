"use client";

import { useState, useEffect } from "react";
import { Thumbnail } from "@remotion/player";
import { DynamicCode } from "@/remotion/compositions/DynamicCode";
import {
  ASPECT_RATIO_PRESETS,
  type AspectRatioKey,
} from "@/lib/aspect-ratios";
import { AlertCircle, Loader2, Save, FastForward, Rewind, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface GenerationRowProps {
  generation: {
    _id: string;
    prompt: string;
    code?: string;
    rawCode?: string;
    durationInFrames?: number;
    fps?: number;
    aspectRatio?: string;
    durationInSeconds?: number;
    status: "pending" | "success" | "failed";
    errorMessage?: string;
    createdAt: number;
    batchId?: string;
    variationIndex?: number;
    variationCount?: number;
  };
  onSelect: (generation: GenerationRowProps["generation"]) => void;
  onSave: (generation: GenerationRowProps["generation"]) => void;
  onDelete: (generation: GenerationRowProps["generation"]) => void;
  onRerun: (generation: GenerationRowProps["generation"]) => void;
  onExtendNext: (generation: GenerationRowProps["generation"]) => void;
  onExtendPrevious: (generation: GenerationRowProps["generation"]) => void;
  isDeleting?: boolean;
  hideActions?: boolean;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return new Date(timestamp).toLocaleDateString();
  }
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

export function GenerationRow({ generation, onSelect, onSave, onDelete, onRerun, onExtendNext, onExtendPrevious, isDeleting, hideActions }: GenerationRowProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isPending = generation.status === "pending";
  const isFailed = generation.status === "failed";
  const aspectRatioKey = (generation.aspectRatio ?? "16:9") as AspectRatioKey;
  const preset = ASPECT_RATIO_PRESETS[aspectRatioKey] ?? ASPECT_RATIO_PRESETS["16:9"];
  const durationInFrames = generation.durationInFrames ?? 90;
  const fps = generation.fps ?? 30;
  const frameToDisplay = Math.floor(durationInFrames / 2);

  return (
    <div className={`flex flex-col rounded-lg border overflow-hidden transition-colors ${isDeleting ? "animate-pulse opacity-60 pointer-events-none" : "hover:bg-muted/50"}`}>
      {/* Clickable thumbnail — fixed height, cover-clipped */}
      <div
        role="button"
        tabIndex={0}
        className={`relative w-full h-40 overflow-hidden ${isDeleting || isPending ? "pointer-events-none" : "cursor-pointer"}`}
        onClick={() => { if (!isDeleting && !isPending) onSelect(generation); }}
        onKeyDown={(e) => { if (e.key === "Enter" && !isDeleting && !isPending) onSelect(generation); }}
      >
        {isPending ? (
          <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
          </div>
        ) : isFailed ? (
          <div className="w-full h-full bg-red-950/50 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
        ) : isMounted && generation.code ? (
          <div className="absolute inset-0 flex items-center justify-center">
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
              style={{ width: "100%", minHeight: "100%", objectFit: "cover" }}
            />
          </div>
        ) : (
          <div className="w-full h-full bg-muted animate-pulse" />
        )}
      </div>

      {/* Metadata - pinned to bottom */}
      <div className="p-2.5 flex flex-col gap-1.5 mt-auto">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-sm font-medium truncate">{generation.prompt}</p>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p>{generation.prompt}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {isFailed && generation.errorMessage && (
          <p className="text-xs text-red-400 line-clamp-2">
            {generation.errorMessage}
          </p>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {aspectRatioKey}
          </span>
          {generation.durationInSeconds && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {generation.durationInSeconds}s
            </span>
          )}
          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {fps}fps
          </span>
          {isPending && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              generating...
            </span>
          )}
          {isFailed && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-950 text-red-400">
              failed
            </span>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {formatRelativeTime(generation.createdAt)}
          </span>
        </div>

        {/* Action buttons */}
        {!isPending && !hideActions && (
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-1 pt-0.5">
              {!isFailed && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSave(generation)} disabled={isDeleting}>
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>Save to Library</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onExtendPrevious(generation)} disabled={isDeleting}>
                        <Rewind className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>Extend Previous</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onExtendNext(generation)} disabled={isDeleting}>
                        <FastForward className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>Extend Next</p></TooltipContent>
                  </Tooltip>
                </>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRerun(generation)} disabled={isDeleting}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Rerun</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto text-destructive hover:text-destructive" onClick={() => onDelete(generation)} disabled={isDeleting}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Delete</p></TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
