"use client";

import { useLocalStorage } from "./use-local-storage";

export interface GenerationSettings {
  aspectRatio: "16:9" | "1:1" | "9:16";
  durationInSeconds: number;
  fps: number;
  variationCount: number;
}

export const DEFAULT_SETTINGS: GenerationSettings = {
  aspectRatio: "16:9",
  durationInSeconds: 3,
  fps: 30,
  variationCount: 1,
};

const STORAGE_KEY = "remotionlab-generation-settings";

export function useGenerationSettings() {
  const [settings, setSettings] = useLocalStorage<GenerationSettings>(
    STORAGE_KEY,
    DEFAULT_SETTINGS
  );

  const updateSetting = <K extends keyof GenerationSettings>(
    key: K,
    value: GenerationSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return { settings, updateSetting, resetSettings };
}
