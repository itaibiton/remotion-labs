"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePaginatedQuery } from "convex-helpers/react/cache";
import { api } from "../../../convex/_generated/api";
import { GenerationRow } from "./generation-row";
import { Loader2 } from "lucide-react";
import { MasonryGrid, MasonryGridSkeleton } from "@/components/ui/masonry-grid";
import { getHeightWeight } from "@/lib/masonry-utils";

interface GenerationFeedProps {
  onSaveGeneration: (generation: any) => void;
  onDeleteGeneration: (generation: any) => void;
  onRerunGeneration: (generation: any) => void;
  onExtendNextGeneration: (generation: any) => void;
  onExtendPreviousGeneration: (generation: any) => void;
  deletingIds?: Set<string>;
  queryType?: "user" | "public";
  hideActions?: boolean;
  onUsePrompt?: (generation: any) => void;
  onSaveAsTemplate?: (generation: any) => void;
  /** Show a loading skeleton card as the first item */
  showLoadingSkeleton?: boolean;
  /** Label for the loading skeleton */
  loadingLabel?: string;
  /** Aspect ratio of the loading skeleton */
  loadingAspectRatio?: string;
}

export function GenerationFeed({
  onSaveGeneration,
  onDeleteGeneration,
  onRerunGeneration,
  onExtendNextGeneration,
  onExtendPreviousGeneration,
  deletingIds,
  queryType = "user",
  hideActions,
  onUsePrompt,
  onSaveAsTemplate,
  showLoadingSkeleton,
  loadingLabel,
  loadingAspectRatio = "16:9",
}: GenerationFeedProps) {
  const queryFn = queryType === "public"
    ? api.generations.listPublicPaginated
    : api.generations.listPaginated;

  const { results, status, loadMore } = usePaginatedQuery(
    queryFn,
    {},
    { initialNumItems: 20 }
  );

  // Infinite scroll: observe a sentinel element at the bottom
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting) {
        loadMoreRef.current(20);
      }
    },
    []
  );

  useEffect(() => {
    if (status !== "CanLoadMore") return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: "400px",
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [status, handleIntersect]);

  // Loading first page
  if (status === "LoadingFirstPage") {
    return <MasonryGridSkeleton columns={{ sm: 2, md: 3, lg: 4 }} gap={12} itemCount={8} />;
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

  // Loading skeleton prepend item
  const loadingSkeletonNode = showLoadingSkeleton ? (
    <div
      className="bg-muted animate-pulse flex items-center justify-center"
      style={{ aspectRatio: loadingAspectRatio.replace(":", " / ") }}
    >
      <div className="text-center">
        <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent mb-2" />
        <p className="text-xs text-muted-foreground">
          {loadingLabel || "Generating..."}
        </p>
      </div>
    </div>
  ) : undefined;

  return (
    <div className="flex flex-col gap-3">
      {/* Masonry grid */}
      <MasonryGrid
        items={results}
        renderItem={(gen: any) => (
          <GenerationRow
            generation={gen}
            onSave={onSaveGeneration}
            onDelete={onDeleteGeneration}
            onRerun={onRerunGeneration}
            onExtendNext={onExtendNextGeneration}
            onExtendPrevious={onExtendPreviousGeneration}
            isDeleting={deletingIds?.has(gen._id) ?? false}
            hideActions={hideActions}
            onUsePrompt={onUsePrompt}
            onSaveAsTemplate={onSaveAsTemplate}
          />
        )}
        getItemHeight={(gen: any) => getHeightWeight(gen.aspectRatio ?? "16:9")}
        getItemKey={(gen: any) => gen._id}
        columns={{ sm: 2, md: 3, lg: 4 }}
        gap={12}
        prependItem={loadingSkeletonNode}
        prependKey="loading-skeleton"
        prependHeight={getHeightWeight(loadingAspectRatio)}
      />

      {/* Infinite scroll sentinel */}
      {status === "CanLoadMore" && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Loading More */}
      {status === "LoadingMore" && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
