"use client";

import { useState, useCallback, KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface CreationEditBarProps {
  generationId: string;
  initialPrompt: string;
  onRefine?: (prompt: string) => Promise<void>;
  isRefining?: boolean;
}

export function CreationEditBar({
  generationId,
  initialPrompt,
  onRefine,
  isRefining = false,
}: CreationEditBarProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isRefining || !onRefine) return;
    await onRefine(prompt.trim());
    setPrompt(""); // Clear on success
  }, [prompt, isRefining, onRefine]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Cmd/Ctrl+Enter submits
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="flex gap-2 items-start w-full">
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe changes to this animation..."
        className="min-h-[60px] resize-none flex-1"
        rows={2}
        disabled={isRefining}
      />
      <Button
        onClick={handleSubmit}
        disabled={!prompt.trim() || isRefining || !onRefine}
        className="shrink-0"
      >
        {isRefining ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Refine"
        )}
      </Button>
    </div>
  );
}
