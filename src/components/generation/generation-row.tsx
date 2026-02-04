"use client";

import { useState, useEffect } from "react";
import { Thumbnail } from "@remotion/player";
import { DynamicCode } from "@/remotion/compositions/DynamicCode";
import {
  ASPECT_RATIO_PRESETS,
  type AspectRatioKey,
} from "@/lib/aspect-ratios";
import { AlertCircle, Loader2, Save, FastForward, Rewind, RotateCcw, Trash2, Sparkles, BookmarkPlus } from "lucide-react";
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
  onUsePrompt?: (generation: GenerationRowProps["generation"]) => void;
  onSaveAsTemplate?: (generation: GenerationRowProps["generation"]) => void;
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

export function GenerationRow({ generation, onSelect, onSave, onDelete, onRerun, onExtendNext, onExtendPrevious, isDeleting, hideActions, onUsePrompt, onSaveAsTemplate }: GenerationRowProps) {
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
    <div
      role="button"
      tabIndex={0}
      className={`group relative aspect-video rounded-lg overflow-hidden ${isDeleting ? "animate-pulse opacity-60 pointer-events-none" : ""} ${isDeleting || isPending ? "pointer-events-none" : "cursor-pointer"}`}
      onClick={() => { if (!isDeleting && !isPending) onSelect(generation); }}
      onKeyDown={(e) => { if (e.key === "Enter" && !isDeleting && !isPending) onSelect(generation); }}
    >
      {/* Thumbnail fills entire card */}
      {isPending ? (
        <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        </div>
      ) : isFailed ? (
        <div className="w-full h-full bg-red-950/50 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
      ) : isMounted && generation.code ? (
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
      ) : (
        <div className="w-full h-full bg-muted animate-pulse" />
      )}

      {/* Hover overlay with UI */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2.5">
        {/* Prompt text */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-sm font-medium text-white truncate">{generation.prompt}</p>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p>{generation.prompt}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {isFailed && generation.errorMessage && (
          <p className="text-xs text-red-400 line-clamp-2 mt-1">
            {generation.errorMessage}
          </p>
        )}

        {/* Metadata badges */}
        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
          <span className="text-xs px-1.5 py-0.5 rounded bg-white/20 text-white/90">
            {aspectRatioKey}
          </span>
          {generation.durationInSeconds && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-white/20 text-white/90">
              {generation.durationInSeconds}s
            </span>
          )}
          <span className="text-xs px-1.5 py-0.5 rounded bg-white/20 text-white/90">
            {fps}fps
          </span>
          {isPending && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/30 text-primary-foreground">
              generating...
            </span>
          )}
          {isFailed && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/30 text-red-300">
              failed
            </span>
          )}
          <span className="text-xs text-white/70 ml-auto">
            {formatRelativeTime(generation.createdAt)}
          </span>
        </div>

        {/* Feed card actions — icon buttons with tooltips */}
        {!isPending && !isFailed && hideActions && (onUsePrompt || onSaveAsTemplate) && (
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-1 pt-1.5">
              {onUsePrompt && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); onUsePrompt(generation); }}>
                      <Sparkles className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>Use Prompt</p></TooltipContent>
                </Tooltip>
              )}
              {onSaveAsTemplate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); onSaveAsTemplate(generation); }}>
                      <BookmarkPlus className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>Save as Template</p></TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        )}

        {/* Action buttons */}
        {!isPending && !hideActions && (
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-1 pt-1.5">
              {!isFailed && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); onSave(generation); }} disabled={isDeleting}>
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>Save to Library</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); onExtendPrevious(generation); }} disabled={isDeleting}>
                        <Rewind className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>Extend Previous</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); onExtendNext(generation); }} disabled={isDeleting}>
                        <FastForward className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>Extend Next</p></TooltipContent>
                  </Tooltip>
                </>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); onRerun(generation); }} disabled={isDeleting}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Rerun</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto text-red-400 hover:text-red-300 hover:bg-white/20" onClick={(e) => { e.stopPropagation(); onDelete(generation); }} disabled={isDeleting}>
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
