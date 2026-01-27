import { z } from "zod";

/**
 * Hex color validation regex (#RRGGBB format)
 */
const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

/**
 * Zod schema for text animation properties
 * Used to validate Claude API responses before storage
 */
export const textAnimationSchema = z.object({
  text: z
    .string()
    .min(1, "Text is required")
    .max(500, "Text must be 500 characters or less"),
  style: z.enum(["fade-in", "typewriter", "slide-up", "scale"]),
  fontFamily: z.string().default("Inter"),
  fontSize: z
    .number()
    .min(12, "Font size must be at least 12")
    .max(200, "Font size must be 200 or less")
    .default(48),
  color: z
    .string()
    .regex(hexColorRegex, "Color must be a valid hex color (#RRGGBB)"),
  backgroundColor: z
    .string()
    .regex(hexColorRegex, "Background color must be a valid hex color (#RRGGBB)")
    .optional(),
  durationInFrames: z
    .number()
    .min(30, "Duration must be at least 30 frames (1 second)")
    .max(600, "Duration must be 600 frames (20 seconds) or less")
    .default(90),
  fps: z.literal(30),
});

/**
 * TypeScript type inferred from the Zod schema
 */
export type TextAnimationProps = z.infer<typeof textAnimationSchema>;
