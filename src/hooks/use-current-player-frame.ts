import { useCallback, useSyncExternalStore, useState, useEffect } from "react";
import type { PlayerRef } from "@remotion/player";

/**
 * Efficiently tracks the current frame of a Remotion Player using useSyncExternalStore.
 *
 * This avoids useState + setInterval patterns that cause unnecessary re-renders.
 * The hook subscribes to the Player's "frameupdate" event and reads the frame
 * imperatively via getSnapshot.
 *
 * @param ref - React ref to a Remotion PlayerRef
 * @returns The current frame number (0 if player is not mounted)
 */
export function useCurrentPlayerFrame(
  ref: React.RefObject<PlayerRef | null>
): number {
  // Track when player becomes available to trigger re-subscription
  const [playerReady, setPlayerReady] = useState(false);

  // Check for player availability on mount and periodically
  useEffect(() => {
    if (ref.current) {
      setPlayerReady(true);
      return;
    }

    // Poll for player availability (it mounts async)
    const interval = setInterval(() => {
      if (ref.current) {
        setPlayerReady(true);
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [ref]);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const player = ref.current;
      if (!player) {
        return () => {};
      }

      const handler = () => {
        onStoreChange();
      };

      player.addEventListener("frameupdate", handler);
      return () => {
        player.removeEventListener("frameupdate", handler);
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ref, playerReady] // Re-subscribe when player becomes ready
  );

  const getSnapshot = useCallback(() => {
    return ref.current?.getCurrentFrame() ?? 0;
  }, [ref]);

  const getServerSnapshot = useCallback(() => {
    return 0;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
