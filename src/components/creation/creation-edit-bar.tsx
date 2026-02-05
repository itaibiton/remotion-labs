"use client";

// Stub component - will be replaced in Phase 26
// This stub allows CreationModal to compile and be tested
// CRITICAL: This contains a focusable textarea for NAV-05 arrow key guard testing

import { Textarea } from "@/components/ui/textarea";

interface CreationEditBarProps {
  generationId: string;
  initialPrompt: string;
}

export function CreationEditBar({
  generationId,
  initialPrompt,
}: CreationEditBarProps) {
  return (
    <div className="w-full">
      <div className="text-xs text-muted-foreground mb-2">
        Edit bar - Phase 26 (generationId: {generationId.slice(0, 8)}...)
      </div>
      <Textarea
        placeholder={initialPrompt}
        defaultValue={initialPrompt}
        className="w-full resize-none"
        rows={2}
      />
    </div>
  );
}
