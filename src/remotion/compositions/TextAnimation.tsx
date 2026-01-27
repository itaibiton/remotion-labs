"use client";

import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

// Load Inter as fallback font
const { fontFamily } = loadFont();

export interface TextAnimationProps {
  text: string;
  style: "fade-in" | "typewriter" | "slide-up" | "scale";
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor?: string;
  durationInFrames: number;
  fps: number;
}

export const TextAnimation: React.FC<TextAnimationProps> = ({
  text,
  style,
  fontFamily: customFontFamily,
  fontSize,
  color,
  backgroundColor = "transparent",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Use custom font with Inter as fallback
  const usedFontFamily = customFontFamily || fontFamily;

  // Calculate animation values based on style
  let opacity = 1;
  let transform = "none";
  let displayText = text;

  switch (style) {
    case "fade-in": {
      // Fade in over first 30 frames
      opacity = interpolate(frame, [0, 30], [0, 1], {
        extrapolateRight: "clamp",
        extrapolateLeft: "clamp",
      });
      break;
    }

    case "typewriter": {
      // Reveal characters progressively over 80% of duration
      const typewriterDuration = Math.floor(durationInFrames * 0.8);
      const progress = interpolate(frame, [0, typewriterDuration], [0, 1], {
        extrapolateRight: "clamp",
        extrapolateLeft: "clamp",
      });
      const charsToShow = Math.floor(progress * text.length);
      displayText = text.slice(0, charsToShow);

      // Add blinking cursor
      const cursorVisible = Math.floor(frame / 15) % 2 === 0;
      if (cursorVisible && charsToShow < text.length) {
        displayText += "|";
      }
      break;
    }

    case "slide-up": {
      // Slide up with opacity fade using easing
      const slideProgress = interpolate(frame, [0, 30], [0, 1], {
        extrapolateRight: "clamp",
        extrapolateLeft: "clamp",
        easing: Easing.out(Easing.cubic),
      });

      const translateY = interpolate(slideProgress, [0, 1], [100, 0], {
        extrapolateRight: "clamp",
        extrapolateLeft: "clamp",
      });

      opacity = interpolate(slideProgress, [0, 1], [0, 1], {
        extrapolateRight: "clamp",
        extrapolateLeft: "clamp",
      });

      transform = `translateY(${translateY}px)`;
      break;
    }

    case "scale": {
      // Bouncy scale-in using spring physics
      const scaleValue = spring({
        frame,
        fps,
        config: {
          stiffness: 100,
          damping: 10,
        },
      });

      transform = `scale(${scaleValue})`;
      break;
    }
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontFamily: usedFontFamily,
          fontSize,
          color,
          opacity,
          transform,
          textAlign: "center",
          padding: "0 40px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {displayText}
      </div>
    </AbsoluteFill>
  );
};

export default TextAnimation;
