"use client";

import { Loader2 } from "lucide-react";
import {
  ASPECT_RATIO_PRESETS,
  type AspectRatioKey,
} from "@/lib/aspect-ratios";

interface PendingGenerationSkeletonProps {
  prompt: string;
  type: "prequel" | "generation";
  aspectRatio?: string;
  count?: number;
}

export function PendingGenerationSkeleton({
  prompt,
  type,
  aspectRatio = "16:9",
  count = 1,
}: PendingGenerationSkeletonProps) {
  const label = type === "prequel" ? "Generating prequel..." : "Generating...";
  const preset =
    ASPECT_RATIO_PRESETS[aspectRatio as AspectRatioKey] ??
    ASPECT_RATIO_PRESETS["16:9"];
  const thumbAspect = `${preset.width} / ${preset.height}`;

  if (count > 1) {
    // Grid layout matching VariationGrid
    const gridCols = count === 1 ? "grid-cols-1" : "grid-cols-2";
    return (
      <div className="w-full p-3 rounded-lg border">
        {/* Metadata row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary/80">{label}</p>
            <p className="text-sm line-clamp-2 text-muted-foreground">
              {prompt}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="h-5 w-10 bg-muted animate-pulse rounded" />
              <div className="h-5 w-8 bg-muted animate-pulse rounded" />
              <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary/60">
                {count} variations
              </span>
            </div>
          </div>
        </div>

        {/* Thumbnail grid */}
        <div className={`grid ${gridCols} gap-2`}>
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="relative rounded-md overflow-hidden bg-muted animate-pulse flex items-center justify-center"
              style={{ aspectRatio: thumbAspect }}
            >
              <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
              <span className="absolute top-1 left-1 bg-black/70 text-white text-xs font-mono px-1.5 py-0.5 rounded">
                V{i + 1}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Single skeleton row
  return (
    <div className="w-full flex flex-row gap-4 p-3 rounded-lg border">
      {/* Pulsing thumbnail with spinner */}
      <div
        className="flex-shrink-0 rounded-md overflow-hidden bg-muted animate-pulse flex items-center justify-center"
        style={{ width: 200, aspectRatio: thumbAspect }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
      </div>

      {/* Metadata */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
        <p className="text-sm font-medium text-primary/80">{label}</p>
        <p className="text-sm line-clamp-2 text-muted-foreground">{prompt}</p>

        {/* Pulsing metadata placeholders */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-10 bg-muted animate-pulse rounded" />
          <div className="h-5 w-8 bg-muted animate-pulse rounded" />
          <div className="h-5 w-12 bg-muted animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}
