/**
 * Export Utilities
 *
 * Shared helpers for code export: Remotion API detection, metadata extraction,
 * and browser download triggers.
 *
 * Used by both single-file and project-zip export generators.
 */

/**
 * Map of Remotion API identifiers to their import source.
 * Covers all Remotion-specific globals from remotion-allowlist.ts.
 * Does NOT include JS globals (Math, Array, etc.) or React hooks (useState, etc.).
 */
export const REMOTION_APIS: Record<string, string> = {
  // Remotion Core Components
  AbsoluteFill: "remotion",
  Sequence: "remotion",
  Audio: "remotion",
  Img: "remotion",
  Video: "remotion",
  OffthreadVideo: "remotion",
  Series: "remotion",
  Loop: "remotion",
  Freeze: "remotion",
  Still: "remotion",

  // Remotion Hooks
  useCurrentFrame: "remotion",
  useVideoConfig: "remotion",
  useCurrentScale: "remotion",

  // Remotion Animation
  interpolate: "remotion",
  spring: "remotion",
  Easing: "remotion",
  interpolateColors: "remotion",
  measureSpring: "remotion",

  // Remotion Utilities
  staticFile: "remotion",
  random: "remotion",
  continueRender: "remotion",
  delayRender: "remotion",
  getInputProps: "remotion",
  getRemotionEnvironment: "remotion",
};

/**
 * Scan code for Remotion API identifiers using word-boundary regex.
 * Returns array of matched API names (sorted alphabetically).
 *
 * Does NOT include React (handled separately by generators).
 * Does NOT include scaffold-only APIs (Composition, registerRoot) — those are
 * added by the generators themselves.
 */
export function detectUsedAPIs(code: string): string[] {
  return Object.keys(REMOTION_APIS)
    .filter((api) => {
      const regex = new RegExp(`\\b${api}\\b`);
      return regex.test(code);
    })
    .sort();
}

/**
 * Extract DURATION and FPS metadata from rawCode comments.
 * Returns parsed numeric values and cleaned code with metadata comments stripped.
 *
 * Metadata format:
 *   // DURATION: 90
 *   // FPS: 30
 *
 * Defaults: 90 frames, 30 fps if not found.
 */
export function extractMetadata(rawCode: string): {
  durationInFrames: number;
  fps: number;
  cleanedCode: string;
} {
  const durationMatch = rawCode.match(/\/\/\s*DURATION:\s*(\d+)/);
  const fpsMatch = rawCode.match(/\/\/\s*FPS:\s*(\d+)/);

  const durationInFrames = durationMatch ? parseInt(durationMatch[1], 10) : 90;
  const fps = fpsMatch ? parseInt(fpsMatch[1], 10) : 30;

  const cleanedCode = rawCode
    .replace(/\/\/\s*DURATION:\s*\d+\s*\n?/g, "")
    .replace(/\/\/\s*FPS:\s*\d+\s*\n?/g, "")
    .trim();

  return { durationInFrames, fps, cleanedCode };
}

/**
 * Trigger a browser file download from a Blob.
 * Creates a temporary anchor element, triggers click, then cleans up.
 *
 * Follows the pattern from download-button.tsx with added URL.revokeObjectURL
 * to prevent memory leaks.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download a text string as a file.
 * Creates a Blob with UTF-8 encoding and triggers download.
 */
export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, filename);
}
