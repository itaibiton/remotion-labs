"use client";

import { useMemo } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { GenerationRow } from "./generation-row";
import { VariationGrid } from "./variation-grid";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface GenerationFeedProps {
  onSelectGeneration: (generation: any) => void;
  onSaveGeneration: (generation: any) => void;
  onDeleteGeneration: (generation: any) => void;
  onRerunGeneration: (generation: any) => void;
  onExtendNextGeneration: (generation: any) => void;
  onExtendPreviousGeneration: (generation: any) => void;
}

interface BatchGroup {
  batchId: string | null;
  generations: any[];
}

function groupByBatch(generations: any[]): BatchGroup[] {
  const groups: BatchGroup[] = [];
  const batchMap = new Map<string, any[]>();

  for (const gen of generations) {
    if (gen.batchId && gen.variationCount && gen.variationCount > 1) {
      const existing = batchMap.get(gen.batchId);
      if (existing) {
        existing.push(gen);
      } else {
        const group: any[] = [gen];
        batchMap.set(gen.batchId, group);
        groups.push({ batchId: gen.batchId, generations: group });
      }
    } else {
      // Single generation or no batch: standalone row
      groups.push({ batchId: null, generations: [gen] });
    }
  }

  // Sort variations within each batch by variationIndex
  for (const group of groups) {
    group.generations.sort(
      (a: any, b: any) => (a.variationIndex ?? 0) - (b.variationIndex ?? 0)
    );
  }

  return groups;
}

export function GenerationFeed({
  onSelectGeneration,
  onSaveGeneration,
  onDeleteGeneration,
  onRerunGeneration,
  onExtendNextGeneration,
  onExtendPreviousGeneration,
}: GenerationFeedProps) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.generations.listPaginated,
    {},
    { initialNumItems: 10 }
  );

  const batches = useMemo(() => groupByBatch(results), [results]);

  // Loading first page
  if (status === "LoadingFirstPage") {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-row gap-4 p-3 rounded-lg border"
          >
            <div className="flex-shrink-0 w-[200px] aspect-video bg-muted animate-pulse rounded-md" />
            <div className="flex-1 flex flex-col justify-center gap-2">
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
              <div className="flex gap-2">
                <div className="h-5 w-10 bg-muted animate-pulse rounded" />
                <div className="h-5 w-10 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (results.length === 0 && status === "Exhausted") {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">
          No generations yet. Enter a prompt above to create your first animation.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Generation rows / variation grids */}
      {batches.map((batch) => {
        if (batch.generations.length === 1) {
          // Single generation: render as existing GenerationRow
          const gen = batch.generations[0];
          return (
            <GenerationRow
              key={gen._id}
              generation={gen}
              onSelect={onSelectGeneration}
              onSave={onSaveGeneration}
              onDelete={onDeleteGeneration}
              onRerun={onRerunGeneration}
              onExtendNext={onExtendNextGeneration}
              onExtendPrevious={onExtendPreviousGeneration}
            />
          );
        }
        // Multi-variation batch: render variation grid
        return (
          <VariationGrid
            key={batch.batchId!}
            variations={batch.generations}
            onSelectVariation={onSelectGeneration}
            onSave={onSaveGeneration}
            onDelete={onDeleteGeneration}
            onRerun={onRerunGeneration}
            onExtendNext={onExtendNextGeneration}
            onExtendPrevious={onExtendPreviousGeneration}
          />
        );
      })}

      {/* Load More */}
      {status === "CanLoadMore" && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadMore(10)}
          >
            Load More
          </Button>
        </div>
      )}

      {/* Loading More */}
      {status === "LoadingMore" && (
        <div className="flex justify-center pt-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* All loaded */}
      {status === "Exhausted" && results.length > 0 && (
        <p className="text-center text-xs text-muted-foreground pt-4">
          All generations loaded
        </p>
      )}
    </div>
  );
}
