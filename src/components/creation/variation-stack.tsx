"use client";

// Stub component - will be replaced in Phase 28
// This stub allows CreationModal to compile and be tested
// Only renders when variations exist (optional UI)

import { Doc } from "../../../convex/_generated/dataModel";

type Generation = Doc<"generations">;

interface VariationStackProps {
  variations: Generation[];
  parentId: string;
}

export function VariationStack({ variations, parentId }: VariationStackProps) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">
        Variation stack - Phase 28 (parent: {parentId.slice(0, 8)}...)
      </div>
      <div className="text-sm">
        {variations.length} variation{variations.length !== 1 ? "s" : ""}
      </div>
      <ul className="space-y-1">
        {variations.map((variation) => (
          <li
            key={variation._id}
            className="text-xs text-muted-foreground truncate"
          >
            {variation._id}
          </li>
        ))}
      </ul>
    </div>
  );
}
