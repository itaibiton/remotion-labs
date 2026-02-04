"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { GenerationRow } from "./generation-row";
import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface GenerationFeedProps {
  onSelectGeneration: (generation: any) => void;
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
}

const itemVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

export function GenerationFeed({
  onSelectGeneration,
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
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col rounded-lg border overflow-hidden">
            <div className="w-full aspect-video bg-muted animate-pulse" />
            <div className="p-2.5 flex flex-col gap-2">
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
              <div className="flex gap-1.5">
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
    <div className="flex flex-col gap-3">
      {/* Bento grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <AnimatePresence mode="popLayout">
          {/* Loading skeleton card */}
          {showLoadingSkeleton && (
            <motion.div
              key="loading-skeleton"
              layout
              variants={itemVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <div className="flex flex-col rounded-lg border overflow-hidden">
                <div className="w-full aspect-video bg-muted animate-pulse flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {loadingLabel || "Generating..."}
                    </p>
                  </div>
                </div>
                <div className="p-2.5 flex flex-col gap-2">
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Generation cards — each rendered individually */}
          {results.map((gen: any) => (
            <motion.div
              key={gen._id}
              layout
              variants={itemVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <GenerationRow
                generation={gen}
                onSelect={onSelectGeneration}
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
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

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
