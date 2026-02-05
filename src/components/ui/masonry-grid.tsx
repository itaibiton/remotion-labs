"use client";

import { useMemo, Component, type ReactNode, type ErrorInfo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useColumns } from "@/hooks/use-columns";
import { distributeToColumns } from "@/lib/masonry-utils";
import { AlertCircle } from "lucide-react";

/**
 * Error boundary for individual masonry grid items.
 * Prevents a single broken item from crashing the entire grid.
 */
class MasonryItemErrorBoundary extends Component<
  { children: ReactNode; itemKey: string },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; itemKey: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn(`[MasonryGrid] Item "${this.props.itemKey}" failed to render:`, error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full aspect-video bg-amber-950/50 flex flex-col items-center justify-center gap-2 rounded-sm">
          <AlertCircle className="h-5 w-5 text-amber-400" />
          <span className="text-xs text-amber-300">Render error</span>
        </div>
      );
    }
    return this.props.children;
  }
}

interface MasonryGridProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  getItemHeight: (item: T) => number;
  getItemKey: (item: T) => string;
  columns?: { sm: number; md: number; lg: number; xl?: number };
  gap?: number;
  /** Optional item to prepend (e.g., loading skeleton) */
  prependItem?: React.ReactNode;
  prependKey?: string;
  prependHeight?: number;
}

const itemVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

export function MasonryGrid<T>({
  items,
  renderItem,
  getItemHeight,
  getItemKey,
  columns = { sm: 2, md: 3, lg: 4 },
  gap = 12,
  prependItem,
  prependKey,
  prependHeight,
}: MasonryGridProps<T>) {
  const columnCount = useColumns(columns);

  // Distribute items across columns
  const distributedColumns = useMemo(() => {
    // If we have a prepend item, add a placeholder to help balance
    const itemsWithPrepend = prependItem
      ? [{ __isPrepend: true, height: prependHeight ?? 1 } as unknown as T, ...items]
      : items;

    return distributeToColumns(itemsWithPrepend, columnCount, (item) => {
      if ((item as { __isPrepend?: boolean }).__isPrepend) {
        return prependHeight ?? 1;
      }
      return getItemHeight(item);
    });
  }, [items, columnCount, getItemHeight, prependItem, prependHeight]);

  return (
    <div
      className="flex w-full"
      style={{ gap }}
    >
      {distributedColumns.map((columnItems, columnIndex) => (
        <div
          key={columnIndex}
          className="flex-1 flex flex-col"
          style={{ gap }}
        >
          <AnimatePresence mode="popLayout">
            {columnItems.map((item) => {
              // Handle prepend item
              if ((item as { __isPrepend?: boolean }).__isPrepend) {
                return prependItem ? (
                  <motion.div
                    key={prependKey ?? "prepend"}
                    layout
                    variants={itemVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    {prependItem}
                  </motion.div>
                ) : null;
              }

              const key = getItemKey(item);
              return (
                <motion.div
                  key={key}
                  layout
                  variants={itemVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <MasonryItemErrorBoundary itemKey={key}>
                    {renderItem(item)}
                  </MasonryItemErrorBoundary>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton component for masonry grid loading states.
 * Creates placeholders with varied heights to simulate the masonry layout.
 */
export function MasonryGridSkeleton({
  columns = { sm: 2, md: 3, lg: 4 },
  gap = 12,
  itemCount = 8,
}: {
  columns?: { sm: number; md: number; lg: number; xl?: number };
  gap?: number;
  itemCount?: number;
}) {
  const columnCount = useColumns(columns);

  // Create skeleton items with varied aspect ratios
  const skeletonItems = useMemo(() => {
    const aspectRatios = ["16:9", "1:1", "9:16"];
    return Array.from({ length: itemCount }, (_, i) => ({
      id: `skeleton-${i}`,
      aspectRatio: aspectRatios[i % aspectRatios.length],
    }));
  }, [itemCount]);

  const heightMap: Record<string, number> = {
    "16:9": 0.5625,
    "1:1": 1.0,
    "9:16": 1.778,
  };

  const distributedColumns = useMemo(() => {
    return distributeToColumns(
      skeletonItems,
      columnCount,
      (item) => heightMap[item.aspectRatio] ?? 0.5625
    );
  }, [skeletonItems, columnCount]);

  return (
    <div className="flex w-full" style={{ gap }}>
      {distributedColumns.map((columnItems, columnIndex) => (
        <div
          key={columnIndex}
          className="flex-1 flex flex-col"
          style={{ gap }}
        >
          {columnItems.map((item) => (
            <div
              key={item.id}
              className="w-full bg-muted animate-pulse rounded-sm"
              style={{ aspectRatio: item.aspectRatio.replace(":", " / ") }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
