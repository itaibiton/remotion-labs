"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface Scene {
  clipId: Id<"clips">;
  durationOverride?: number;
  trimStart?: number;
  trimEnd?: number;
}

interface HistoryEntry {
  scenes: Scene[];
  timestamp: number;
}

interface UseTimelineHistoryOptions {
  movieId: Id<"movies"> | undefined;
  currentScenes: Scene[] | undefined;
  maxHistorySize?: number;
}

export function useTimelineHistory({
  movieId,
  currentScenes,
  maxHistorySize = 50,
}: UseTimelineHistoryOptions) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);

  const lastScenesRef = useRef<string | null>(null);
  const restoreScenes = useMutation(api.movies.restoreScenes);

  // Track scene changes and add to history
  useEffect(() => {
    if (!currentScenes || isRestoring) return;

    const scenesJson = JSON.stringify(currentScenes);

    // Skip if scenes haven't actually changed
    if (scenesJson === lastScenesRef.current) return;

    // If this is the first state, just store it without adding to history
    if (lastScenesRef.current === null) {
      lastScenesRef.current = scenesJson;
      return;
    }

    // Parse the previous state
    const previousScenes = JSON.parse(lastScenesRef.current) as Scene[];

    // Add previous state to history
    setHistory((prev) => {
      const newHistory = [
        ...prev,
        { scenes: previousScenes, timestamp: Date.now() },
      ];
      // Limit history size
      if (newHistory.length > maxHistorySize) {
        return newHistory.slice(-maxHistorySize);
      }
      return newHistory;
    });

    // Clear future when new change happens (not from undo/redo)
    setFuture([]);

    // Update ref
    lastScenesRef.current = scenesJson;
  }, [currentScenes, isRestoring, maxHistorySize]);

  const undo = useCallback(async () => {
    if (!movieId || history.length === 0 || !currentScenes) return;

    const previousEntry = history[history.length - 1];

    setIsRestoring(true);
    try {
      // Save current state to future
      setFuture((prev) => [
        ...prev,
        { scenes: currentScenes, timestamp: Date.now() },
      ]);

      // Remove from history
      setHistory((prev) => prev.slice(0, -1));

      // Restore previous state
      await restoreScenes({
        movieId,
        scenes: previousEntry.scenes,
      });

      // Update ref to prevent re-adding to history
      lastScenesRef.current = JSON.stringify(previousEntry.scenes);
    } finally {
      setIsRestoring(false);
    }
  }, [movieId, history, currentScenes, restoreScenes]);

  const redo = useCallback(async () => {
    if (!movieId || future.length === 0 || !currentScenes) return;

    const nextEntry = future[future.length - 1];

    setIsRestoring(true);
    try {
      // Save current state to history
      setHistory((prev) => [
        ...prev,
        { scenes: currentScenes, timestamp: Date.now() },
      ]);

      // Remove from future
      setFuture((prev) => prev.slice(0, -1));

      // Restore next state
      await restoreScenes({
        movieId,
        scenes: nextEntry.scenes,
      });

      // Update ref to prevent re-adding to history
      lastScenesRef.current = JSON.stringify(nextEntry.scenes);
    } finally {
      setIsRestoring(false);
    }
  }, [movieId, future, currentScenes, restoreScenes]);

  const canUndo = history.length > 0 && !isRestoring;
  const canRedo = future.length > 0 && !isRestoring;

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    historyLength: history.length,
    futureLength: future.length,
    isRestoring,
  };
}
