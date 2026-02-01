"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Settings2, Loader2 } from "lucide-react";
import { useImageUpload } from "@/hooks/use-image-upload";
import { ImageAttachment } from "@/components/generation/image-attachment";
import { GenerationSettingsPanel } from "@/components/generation/generation-settings";
import type { GenerationSettings } from "@/hooks/use-generation-settings";

const EXAMPLE_PROMPTS = [
  "Animated title that says 'Welcome' with a fade-in effect",
  "Kinetic typography: 'Think Different' with bold letters scaling in",
  "Typewriter text revealing 'Hello World' character by character",
  "Slide up text animation for 'Coming Soon' announcement",
];

const MAX_CHARS = 2000;
const WARN_CHARS = 1500;

interface InputBarProps {
  onSubmit: (prompt: string, imageIds: string[]) => Promise<void>;
  isGenerating: boolean;
  isRefining?: boolean;
  hasExistingCode?: boolean;
  disabled?: boolean;
  placeholder?: string;
  settings: GenerationSettings;
  onUpdateSetting: <K extends keyof GenerationSettings>(
    key: K,
    value: GenerationSettings[K]
  ) => void;
  onResetSettings: () => void;
}

export function InputBar({
  onSubmit,
  isGenerating,
  isRefining = false,
  hasExistingCode = false,
  disabled = false,
  placeholder,
  settings,
  onUpdateSetting,
  onResetSettings,
}: InputBarProps) {
  const [prompt, setPrompt] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { images, addImages, removeImage, uploadAll, clear } = useImageUpload();

  const charCount = prompt.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isNearLimit = charCount > WARN_CHARS;

  const resolvedPlaceholder =
    placeholder ??
    (hasExistingCode
      ? "Describe changes (e.g., 'make it faster', 'change color to blue')..."
      : "Describe the animation you want to create...");

  const isDisabled = isGenerating || isRefining || disabled;
  const canSubmit =
    prompt.trim().length > 0 && !isOverLimit && !isDisabled && !isUploading;

  const buttonText = isUploading
    ? "Uploading..."
    : isRefining
      ? "Refining..."
      : isGenerating
        ? "Generating..."
        : hasExistingCode
          ? "Send"
          : "Generate";

  const handleSubmit = useCallback(async () => {
    const trimmedPrompt = prompt.trim();
    if (
      !trimmedPrompt ||
      isOverLimit ||
      isGenerating ||
      isRefining ||
      disabled
    )
      return;

    try {
      let imageIds: string[] = [];
      if (images.length > 0) {
        setIsUploading(true);
        imageIds = await uploadAll();
        setIsUploading(false);
      }
      await onSubmit(trimmedPrompt, imageIds);
      setPrompt("");
      clear();
    } catch {
      setIsUploading(false);
      // Keep prompt and images on failure so user can retry
    }
  }, [
    prompt,
    isOverLimit,
    isGenerating,
    isRefining,
    disabled,
    images.length,
    uploadAll,
    onSubmit,
    clear,
  ]);

  const handleExampleClick = useCallback((example: string) => {
    setPrompt(example);
  }, []);

  const truncateExample = (text: string, maxLength = 35) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  // Drag-drop handlers on the container
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDisabled) setIsDragging(true);
    },
    [isDisabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (isDisabled) return;
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length > 0) addImages(files);
    },
    [isDisabled, addImages]
  );

  // Paste handler on textarea
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const files = e.clipboardData.files;
      const imageFiles = Array.from(files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (imageFiles.length > 0) {
        e.preventDefault();
        addImages(imageFiles);
      }
      // If no image files, let paste proceed normally (text paste)
    },
    [addImages]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        addImages(Array.from(files));
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [addImages]
  );

  const variationOptions = [1, 2, 3, 4] as const;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-2">
      {/* Main input container with border */}
      <div
        className={`rounded-xl border bg-background shadow-sm transition-all ${
          isDragging ? "ring-2 ring-primary ring-offset-2" : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Image chips section (top, inside border) */}
        {images.length > 0 && (
          <div className="px-3 pt-3">
            <ImageAttachment
              images={images}
              onRemove={removeImage}
              onAddFiles={addImages}
              disabled={isGenerating || isUploading}
              maxImages={3}
            />
          </div>
        )}

        {/* Textarea */}
        <div className="relative">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={resolvedPlaceholder}
            className={`${hasExistingCode ? "min-h-[80px]" : "min-h-[100px]"} resize-none border-0 focus-visible:ring-0 shadow-none pr-4 pb-6`}
            disabled={isDisabled}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSubmit) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          {/* Character count */}
          <div
            className={`absolute bottom-1.5 right-3 text-xs ${
              isOverLimit
                ? "text-red-500"
                : isNearLimit
                  ? "text-yellow-500"
                  : "text-muted-foreground"
            }`}
          >
            {charCount}/{MAX_CHARS}
          </div>
        </div>

        {/* Toolbar row */}
        <div className="flex items-center gap-2 px-3 pb-3 pt-1">
          {/* Left side controls */}
          <div className="flex items-center gap-1">
            {/* Image upload button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={images.length >= 3 || isGenerating || isUploading}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach image"
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={handleFileInputChange}
            />

            {/* Settings toggle */}
            <Button
              variant={showSettings ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowSettings(!showSettings)}
              aria-label="Toggle settings"
            >
              <Settings2 className="h-4 w-4" />
            </Button>

            {/* Variation selector (hidden in refinement mode) */}
            {!hasExistingCode && (
              <div className="flex items-center gap-0.5 ml-1">
                {variationOptions.map((n) => (
                  <Button
                    key={n}
                    variant={
                      settings.variationCount === n ? "default" : "ghost"
                    }
                    size="icon"
                    className="h-7 w-7 text-xs"
                    onClick={() => onUpdateSetting("variationCount", n)}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Right side - Generate button */}
          <div className="ml-auto">
            <Button onClick={handleSubmit} disabled={!canSubmit} size="sm">
              {(isGenerating || isUploading) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {buttonText}
            </Button>
          </div>
        </div>
      </div>

      {/* Settings panel (below the bordered container) */}
      {showSettings && !hasExistingCode && (
        <div className="p-4 border rounded-lg">
          <GenerationSettingsPanel
            settings={settings}
            onUpdateSetting={onUpdateSetting}
            onReset={onResetSettings}
          />
        </div>
      )}

      {/* Example prompts (generation mode only, when no prompt typed) */}
      {!hasExistingCode && !prompt && (
        <div className="space-y-2 pt-2">
          <span className="text-sm text-muted-foreground">Try:</span>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                disabled={isDisabled}
                className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {truncateExample(example)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hint for refinement mode */}
      {hasExistingCode && (
        <p className="text-xs text-muted-foreground">
          Type &quot;start over: [prompt]&quot; to regenerate from scratch
        </p>
      )}
    </div>
  );
}
