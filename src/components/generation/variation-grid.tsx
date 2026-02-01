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

interface Generation {
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
}

interface VariationGridProps {
  variations: Generation[];
  onSelectVariation: (generation: Generation) => void;
  onSave: (generation: Generation) => void;
  onDelete: (generation: Generation) => void;
  onRerun: (generation: Generation) => void;
  onExtendNext: (generation: Generation) => void;
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

export function VariationGrid({
  variations,
  onSelectVariation,
  onSave,
  onDelete,
  onRerun,
  onExtendNext,
}: VariationGridProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (variations.length === 0) return null;

  const firstVariation = variations[0];
  const aspectRatioKey = (firstVariation.aspectRatio ?? "16:9") as AspectRatioKey;
  const preset =
    ASPECT_RATIO_PRESETS[aspectRatioKey] ?? ASPECT_RATIO_PRESETS["16:9"];
  const fps = firstVariation.fps ?? 30;
  const gridCols =
    variations.length === 1 ? "grid-cols-1" : "grid-cols-2";

  return (
    <div className="w-full p-3 rounded-lg border text-left">
      {/* Metadata row */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium line-clamp-2">
            {firstVariation.prompt}
          </p>
          <div className="flex items-center gap-2 flex-wrap mt-1.5">
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {aspectRatioKey}
            </span>
            {firstVariation.durationInSeconds && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {firstVariation.durationInSeconds}s
              </span>
            )}
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {fps}fps
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {variations.length} variations
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            {formatRelativeTime(firstVariation.createdAt)}
          </p>
          <GenerationRowActions
            generation={firstVariation}
            onSave={onSave}
            onDelete={onDelete}
            onRerun={onRerun}
            onExtendNext={onExtendNext}
          />
        </div>
      </div>

      {/* Thumbnail grid */}
      <div className={`grid ${gridCols} gap-2`}>
        {variations.map((variation, i) => {
          const isFailed = variation.status === "failed";
          const durationInFrames = variation.durationInFrames ?? 90;
          const varFps = variation.fps ?? 30;
          const frameToDisplay = Math.floor(durationInFrames / 2);

          return (
            <button
              key={variation._id}
              type="button"
              className="relative rounded-md overflow-hidden bg-black hover:ring-2 hover:ring-primary/50 transition-all group/variation"
              style={{
                aspectRatio: `${preset.width} / ${preset.height}`,
              }}
              onClick={() => onSelectVariation(variation)}
            >
              {isFailed ? (
                <div className="w-full h-full bg-red-950/50 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-red-400" />
                </div>
              ) : isMounted && variation.code ? (
                <Thumbnail
                  component={DynamicCode}
                  inputProps={{
                    code: variation.code,
                    durationInFrames,
                    fps: varFps,
                  }}
                  compositionWidth={preset.width}
                  compositionHeight={preset.height}
                  frameToDisplay={frameToDisplay}
                  durationInFrames={durationInFrames}
                  fps={varFps}
                  style={{ width: "100%" }}
                />
              ) : (
                <div className="w-full h-full bg-muted animate-pulse" />
              )}
              {/* V{n} badge */}
              <span className="absolute top-1 left-1 bg-black/70 text-white text-xs font-mono px-1.5 py-0.5 rounded">
                V{(variation.variationIndex ?? i) + 1}
              </span>
              {/* Action menu - top right corner */}
              <div
                className="absolute top-1 right-1 opacity-0 group-hover/variation:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <GenerationRowActions
                  generation={variation}
                  onSave={onSave}
                  onDelete={onDelete}
                  onRerun={onRerun}
                  onExtendNext={onExtendNext}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
