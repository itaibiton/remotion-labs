/**
 * Format a frame number as MM:SS or SS.f depending on duration.
 * For short clips (< 60s), shows SS.f (e.g., "4.5").
 * For longer clips, shows MM:SS (e.g., "1:23").
 */
export function formatTimecode(frame: number, fps: number): string {
  const totalSeconds = frame / fps;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(0).padStart(2, "0")}`;
  }
  return `${seconds.toFixed(1)}`;
}
