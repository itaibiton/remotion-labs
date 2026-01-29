"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const EXAMPLE_PROMPTS = [
  "Animated title that says 'Welcome' with a fade-in effect",
  "Kinetic typography: 'Think Different' with bold letters scaling in",
  "Typewriter text revealing 'Hello World' character by character",
  "Slide up text animation for 'Coming Soon' announcement",
];

const MAX_CHARS = 2000;
const WARN_CHARS = 1500;

interface PromptInputProps {
  onSubmit: (prompt: string) => Promise<void>;
  isGenerating: boolean;
  isRefining?: boolean;
  hasExistingCode?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function PromptInput({
  onSubmit,
  isGenerating,
  isRefining = false,
  hasExistingCode = false,
  disabled = false,
  placeholder,
}: PromptInputProps) {
  const [prompt, setPrompt] = useState("");

  const charCount = prompt.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isNearLimit = charCount > WARN_CHARS;

  // Determine default placeholder based on mode
  const resolvedPlaceholder =
    placeholder ??
    (hasExistingCode
      ? "Describe changes (e.g., 'make it faster', 'change color to blue')..."
      : "Describe the animation you want to create...");

  const handleSubmit = useCallback(async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isOverLimit || isGenerating || isRefining || disabled) {
      return;
    }
    try {
      await onSubmit(trimmedPrompt);
      setPrompt("");
    } catch {
      // Keep prompt text on failure so user can retry
    }
  }, [prompt, isOverLimit, isGenerating, isRefining, disabled, onSubmit]);

  const handleExampleClick = useCallback((example: string) => {
    setPrompt(example);
  }, []);

  const truncateExample = (text: string, maxLength = 35) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  const isDisabled = isGenerating || isRefining || disabled;
  const canSubmit = prompt.trim().length > 0 && !isOverLimit && !isDisabled;

  // Button text based on current state
  const buttonText = isRefining
    ? "Refining..."
    : isGenerating
      ? "Generating..."
      : hasExistingCode
        ? "Send"
        : "Generate Animation";

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="relative">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={resolvedPlaceholder}
          className={`${hasExistingCode ? "min-h-[80px]" : "min-h-[120px]"} resize-none pr-4 pb-8`}
          disabled={isDisabled}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSubmit) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <div
          className={`absolute bottom-2 right-3 text-xs ${
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

      {/* Example prompts - generation mode only */}
      {!hasExistingCode && (
        <div className="space-y-2">
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

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full"
      >
        {buttonText}
      </Button>
    </div>
  );
}
