"use client";

// Stub component - will be replaced in Phase 26
// This stub allows CreationModal to compile and be tested

import { Doc } from "../../../convex/_generated/dataModel";

type Generation = Doc<"generations">;

interface CreationDetailPanelProps {
  generation: Generation;
}

export function CreationDetailPanel({ generation }: CreationDetailPanelProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="text-sm text-muted-foreground">
        Details panel - Phase 26
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-medium uppercase text-muted-foreground">
          Prompt
        </h4>
        <p className="text-sm">{generation.prompt}</p>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-medium uppercase text-muted-foreground">
          Status
        </h4>
        <p className="text-sm capitalize">{generation.status}</p>
      </div>

      {generation.aspectRatio && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium uppercase text-muted-foreground">
            Aspect Ratio
          </h4>
          <p className="text-sm">{generation.aspectRatio}</p>
        </div>
      )}
    </div>
  );
}
