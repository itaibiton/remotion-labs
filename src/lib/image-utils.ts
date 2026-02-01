/**
 * Client-side image processing utilities for reference image uploads.
 * Handles validation, EXIF stripping, and resizing before Convex storage upload.
 */

export const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** Maximum file size in bytes (10MB) */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Claude's recommended max dimension for optimal TTFT */
export const MAX_DIMENSION = 1568;

/** Maximum number of reference images per generation */
export const MAX_IMAGES = 3;

/**
 * Validates an image file for type and size constraints.
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    return {
      valid: false,
      error: `Unsupported format: ${file.type}. Use JPEG, PNG, WebP, or GIF.`,
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max 10MB.`,
    };
  }
  return { valid: true };
}

/**
 * Strips EXIF metadata and resizes an image by re-encoding through canvas.
 * Preserves aspect ratio. Output format is PNG for PNG inputs, JPEG (quality 0.92) otherwise.
 *
 * @param file - The image file to process
 * @param maxDimension - Maximum width or height (default: 1568 for Claude optimal TTFT)
 * @returns A Blob of the processed image
 */
export function stripExifAndResize(
  file: File,
  maxDimension: number = MAX_DIMENSION,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate scaled dimensions preserving aspect ratio
      let { naturalWidth: width, naturalHeight: height } = img;
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas 2d context"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      // Re-encode to strip all metadata; preserve PNG format, else use JPEG
      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas toBlob returned null"));
          }
        },
        outputType,
        0.92,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}
