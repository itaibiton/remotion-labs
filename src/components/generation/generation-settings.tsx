"use client";

import {
  ASPECT_RATIO_PRESETS,
  type AspectRatioKey,
} from "@/lib/aspect-ratios";
import type { GenerationSettings } from "@/hooks/use-generation-settings";
import { Button } from "@/components/ui/button";
import { Monitor, Square, Smartphone } from "lucide-react";

const ASPECT_RATIO_ICONS: Record<AspectRatioKey, React.ReactNode> = {
  "16:9": <Monitor className="h-4 w-4" />,
  "1:1": <Square className="h-4 w-4" />,
  "9:16": <Smartphone className="h-4 w-4" />,
};

const DURATION_OPTIONS = [1, 2, 3, 5, 10] as const;
const FPS_OPTIONS = [15, 24, 30, 60] as const;
const VARIATION_OPTIONS = [1, 2, 3, 4] as const;

interface GenerationSettingsPanelProps {
  settings: GenerationSettings;
  onUpdateSetting: <K extends keyof GenerationSettings>(
    key: K,
    value: GenerationSettings[K]
  ) => void;
  onReset: () => void;
}

export function GenerationSettingsPanel({
  settings,
  onUpdateSetting,
  onReset,
}: GenerationSettingsPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Aspect Ratio */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground">
          Aspect Ratio
        </label>
        <div className="flex gap-2">
          {(Object.keys(ASPECT_RATIO_PRESETS) as AspectRatioKey[]).map(
            (ratio) => (
              <Button
                key={ratio}
                variant={
                  settings.aspectRatio === ratio ? "default" : "outline"
                }
                size="sm"
                onClick={() => onUpdateSetting("aspectRatio", ratio)}
              >
                {ASPECT_RATIO_ICONS[ratio]}
                <span className="ml-1">
                  {ASPECT_RATIO_PRESETS[ratio].label}
                </span>
              </Button>
            )
          )}
        </div>
      </div>

      {/* Duration */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground">
          Duration
        </label>
        <div className="flex gap-2">
          {DURATION_OPTIONS.map((duration) => (
            <Button
              key={duration}
              variant={
                settings.durationInSeconds === duration ? "default" : "outline"
              }
              size="sm"
              onClick={() => onUpdateSetting("durationInSeconds", duration)}
            >
              {duration}s
            </Button>
          ))}
        </div>
      </div>

      {/* FPS */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground">
          FPS
        </label>
        <div className="flex gap-2">
          {FPS_OPTIONS.map((fps) => (
            <Button
              key={fps}
              variant={settings.fps === fps ? "default" : "outline"}
              size="sm"
              onClick={() => onUpdateSetting("fps", fps)}
            >
              {fps}
            </Button>
          ))}
        </div>
      </div>

      {/* Variations */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground">
          Variations
        </label>
        <div className="flex gap-2">
          {VARIATION_OPTIONS.map((count) => (
            <Button
              key={count}
              variant={
                settings.variationCount === count ? "default" : "outline"
              }
              size="sm"
              onClick={() => onUpdateSetting("variationCount", count)}
            >
              {count}
            </Button>
          ))}
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={onReset}
        className="self-start text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Reset to defaults
      </button>
    </div>
  );
}
