import { useCallback, useSyncExternalStore } from "react";
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
    [ref]
  );

  const getSnapshot = useCallback(() => {
    return ref.current?.getCurrentFrame() ?? 0;
  }, [ref]);

  const getServerSnapshot = useCallback(() => {
    return 0;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
