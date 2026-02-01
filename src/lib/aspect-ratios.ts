export const ASPECT_RATIO_PRESETS = {
  "16:9": { width: 1920, height: 1080, label: "Landscape" },
  "1:1": { width: 1080, height: 1080, label: "Square" },
  "9:16": { width: 1080, height: 1920, label: "Portrait" },
} as const;

export type AspectRatioKey = keyof typeof ASPECT_RATIO_PRESETS;
export const DEFAULT_ASPECT_RATIO: AspectRatioKey = "16:9";
