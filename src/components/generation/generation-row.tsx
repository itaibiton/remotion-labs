"use client";

import { useState, useEffect } from "react";
import { Thumbnail } from "@remotion/player";
import { DynamicCode } from "@/remotion/compositions/DynamicCode";
import {
  ASPECT_RATIO_PRESETS,
  type AspectRatioKey,
} from "@/lib/aspect-ratios";
import { AlertCircle } from "lucide-react";
import { GenerationRowActions } from "./generation-row-actions";

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
    status: "success" | "failed";
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

export function GenerationRow({ generation, onSelect, onSave, onDelete, onRerun, onExtendNext }: GenerationRowProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isFailed = generation.status === "failed";
  const aspectRatioKey = (generation.aspectRatio ?? "16:9") as AspectRatioKey;
  const preset = ASPECT_RATIO_PRESETS[aspectRatioKey] ?? ASPECT_RATIO_PRESETS["16:9"];
  const durationInFrames = generation.durationInFrames ?? 90;
  const fps = generation.fps ?? 30;
  const frameToDisplay = Math.floor(durationInFrames / 2);

  return (
    <div className="w-full flex flex-row gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left">
      {/* Clickable content area */}
      <button
        type="button"
        className="flex flex-row gap-4 flex-1 min-w-0 text-left"
        onClick={() => onSelect(generation)}
      >
        {/* Thumbnail */}
        <div
          className="flex-shrink-0 rounded-md overflow-hidden bg-black"
          style={{ width: 200, aspectRatio: `${preset.width} / ${preset.height}` }}
        >
          {isFailed ? (
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
              style={{ width: "100%" }}
            />
          ) : (
            <div className="w-full h-full bg-muted animate-pulse" />
          )}
        </div>

        {/* Metadata */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
          <p className="text-sm font-medium line-clamp-2">{generation.prompt}</p>

          {isFailed && generation.errorMessage && (
            <p className="text-xs text-red-400 line-clamp-1">
              {generation.errorMessage}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
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
            {isFailed && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-red-950 text-red-400">
                failed
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {formatRelativeTime(generation.createdAt)}
          </p>
        </div>
      </button>

      {/* Action menu */}
      <div className="flex items-start pt-1">
        <GenerationRowActions
          generation={generation}
          onSave={onSave}
          onDelete={onDelete}
          onRerun={onRerun}
          onExtendNext={onExtendNext}
        />
      </div>
    </div>
  );
}
