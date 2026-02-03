/**
 * Timeline snapping utilities for trim and drag operations.
 * Snaps to: adjacent clip edges, playhead position, timeline boundaries.
 */

export type SnapTargetType = "clip-edge" | "playhead" | "timeline-boundary";

export interface SnapTarget {
  frame: number;
  type: SnapTargetType;
  label?: string; // For debugging/accessibility
}

export interface SnapResult {
  snapped: boolean;
  frame: number;
  target: SnapTarget | null;
}

/**
 * Find the nearest snap target within the threshold.
 * Returns the snap target if within threshold, null otherwise.
 *
 * @param currentFrame - The frame position being dragged to
 * @param snapTargets - Array of potential snap targets
 * @param thresholdPx - Snap threshold in pixels
 * @param scale - Current zoom scale (pixels per frame)
 */
export function findSnapTarget(
  currentFrame: number,
  snapTargets: SnapTarget[],
  thresholdPx: number,
  scale: number
): SnapResult {
  const thresholdFrames = thresholdPx / scale;
  let nearestTarget: SnapTarget | null = null;
  let nearestDistance = Infinity;

  for (const target of snapTargets) {
    const distance = Math.abs(currentFrame - target.frame);
    if (distance <= thresholdFrames && distance < nearestDistance) {
      nearestDistance = distance;
      nearestTarget = target;
    }
  }

  if (nearestTarget) {
    return {
      snapped: true,
      frame: nearestTarget.frame,
      target: nearestTarget,
    };
  }

  return {
    snapped: false,
    frame: currentFrame,
    target: null,
  };
}

/**
 * Build snap targets from scene data, playhead, and timeline boundaries.
 * Excludes the scene being edited to prevent self-snapping.
 *
 * @param scenes - Array of scenes with frame offsets
 * @param playheadFrame - Current playhead position in frames
 * @param totalDuration - Total movie duration in frames
 * @param excludeSceneIndex - Index of scene being edited (exclude its edges)
 */
export function buildSnapTargets(
  scenes: Array<{
    startFrame: number;
    endFrame: number;
  }>,
  playheadFrame: number,
  totalDuration: number,
  excludeSceneIndex?: number
): SnapTarget[] {
  const targets: SnapTarget[] = [];

  // Timeline boundaries
  targets.push({ frame: 0, type: "timeline-boundary", label: "Timeline start" });
  targets.push({ frame: totalDuration, type: "timeline-boundary", label: "Timeline end" });

  // Playhead
  targets.push({ frame: playheadFrame, type: "playhead", label: "Playhead" });

  // Clip edges (excluding the scene being edited)
  scenes.forEach((scene, index) => {
    if (index === excludeSceneIndex) return;

    targets.push({
      frame: scene.startFrame,
      type: "clip-edge",
      label: `Clip ${index + 1} start`,
    });
    targets.push({
      frame: scene.endFrame,
      type: "clip-edge",
      label: `Clip ${index + 1} end`,
    });
  });

  return targets;
}

/**
 * Calculate scene frame ranges from scenes array.
 * Accounts for trim values to get effective ranges.
 */
export function calculateSceneFrameRanges(
  scenes: Array<{
    durationInFrames: number;
    trimStart?: number;
    trimEnd?: number;
  }>
): Array<{ startFrame: number; endFrame: number }> {
  const ranges: Array<{ startFrame: number; endFrame: number }> = [];
  let offset = 0;

  for (const scene of scenes) {
    const trimStart = scene.trimStart ?? 0;
    const trimEnd = scene.trimEnd ?? 0;
    const effectiveDuration = scene.durationInFrames - trimStart - trimEnd;

    ranges.push({
      startFrame: offset,
      endFrame: offset + effectiveDuration,
    });

    offset += effectiveDuration;
  }

  return ranges;
}
