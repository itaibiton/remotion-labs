import type { TextAnimationProps } from "@/remotion/compositions/TextAnimation";

/**
 * Template extends TextAnimationProps with metadata for gallery display
 */
export interface Template {
  id: string;
  name: string;
  description: string;
  category: CategoryId;
  props: TextAnimationProps;
}

/**
 * Category definitions for template filtering
 */
export const CATEGORIES = [
  { id: "all", label: "All Templates" },
  { id: "social", label: "Social Media" },
  { id: "business", label: "Business" },
  { id: "creative", label: "Creative" },
  { id: "minimal", label: "Minimal" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

/**
 * Curated template collection
 * Each template has pre-configured TextAnimationProps optimized for the style
 */
export const TEMPLATES = [
  // Social Media category
  {
    id: "bold-announcement",
    name: "Bold Announcement",
    description: "Eye-catching scale animation perfect for social media announcements",
    category: "social",
    props: {
      text: "Big News!",
      style: "scale",
      fontFamily: "Inter",
      fontSize: 120,
      color: "#FFFFFF",
      backgroundColor: "#E11D48",
      durationInFrames: 90,
      fps: 30,
    },
  },
  {
    id: "story-text",
    name: "Story Text",
    description: "Elegant fade-in for Instagram and TikTok stories",
    category: "social",
    props: {
      text: "Your Story",
      style: "fade-in",
      fontFamily: "Inter",
      fontSize: 80,
      color: "#FFFFFF",
      backgroundColor: "#7C3AED",
      durationInFrames: 60,
      fps: 30,
    },
  },
  // Business category
  {
    id: "corporate-title",
    name: "Corporate Title",
    description: "Professional slide-up animation for presentations",
    category: "business",
    props: {
      text: "Q4 Results",
      style: "slide-up",
      fontFamily: "Inter",
      fontSize: 96,
      color: "#1E293B",
      backgroundColor: "#F1F5F9",
      durationInFrames: 75,
      fps: 30,
    },
  },
  {
    id: "presentation-text",
    name: "Presentation Text",
    description: "Clean fade-in for business presentations",
    category: "business",
    props: {
      text: "Welcome",
      style: "fade-in",
      fontFamily: "Inter",
      fontSize: 88,
      color: "#0F172A",
      backgroundColor: "#FFFFFF",
      durationInFrames: 60,
      fps: 30,
    },
  },
  // Creative category
  {
    id: "neon-glow",
    name: "Neon Glow",
    description: "Vibrant scale animation with neon aesthetics",
    category: "creative",
    props: {
      text: "Create",
      style: "scale",
      fontFamily: "Inter",
      fontSize: 110,
      color: "#22D3EE",
      backgroundColor: "#0F0F23",
      durationInFrames: 90,
      fps: 30,
    },
  },
  {
    id: "typewriter-effect",
    name: "Typewriter Effect",
    description: "Classic typewriter animation for storytelling",
    category: "creative",
    props: {
      text: "Once upon a time...",
      style: "typewriter",
      fontFamily: "Inter",
      fontSize: 72,
      color: "#D4D4D4",
      backgroundColor: "#18181B",
      durationInFrames: 120,
      fps: 30,
    },
  },
  // Minimal category
  {
    id: "minimal-fade",
    name: "Minimal Fade",
    description: "Simple fade-in for understated elegance",
    category: "minimal",
    props: {
      text: "Hello",
      style: "fade-in",
      fontFamily: "Inter",
      fontSize: 64,
      color: "#525252",
      backgroundColor: "#FAFAFA",
      durationInFrames: 60,
      fps: 30,
    },
  },
  {
    id: "clean-slide",
    name: "Clean Slide",
    description: "Smooth slide-up animation for modern aesthetics",
    category: "minimal",
    props: {
      text: "Simplicity",
      style: "slide-up",
      fontFamily: "Inter",
      fontSize: 72,
      color: "#171717",
      backgroundColor: "#FFFFFF",
      durationInFrames: 75,
      fps: 30,
    },
  },
] as const satisfies readonly Template[];

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/**
 * Get templates filtered by category
 * Returns all templates if category is "all"
 */
export function getTemplatesByCategory(category: CategoryId): readonly Template[] {
  if (category === "all") {
    return TEMPLATES;
  }
  return TEMPLATES.filter((t) => t.category === category);
}
