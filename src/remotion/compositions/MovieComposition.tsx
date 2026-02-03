"use client";

import React from "react";
import { Series, Sequence } from "remotion";
import { DynamicCode } from "./DynamicCode";

export interface MovieScene {
  code: string;
  durationInFrames: number;
  fps: number;
  trimStart?: number;  // Frames to skip from start (default 0)
  trimEnd?: number;    // Frames to cut from end (default 0)
}

export interface MovieCompositionProps {
  scenes: MovieScene[];
}

/**
 * MovieComposition sequences N DynamicCode instances using Remotion's <Series>.
 *
 * Each <Series.Sequence> automatically resets useCurrentFrame() to 0 within
 * its child, so generated clip code works unchanged inside the Series context.
 *
 * Non-destructive trim is achieved by:
 * 1. Setting Series.Sequence durationInFrames to effective duration (base - trimStart - trimEnd)
 * 2. Using inner Sequence with from={-trimStart} to offset the clip start
 *
 * Used by Phase 11 for movie preview (Player) and rendering (Lambda).
 */
export const MovieComposition: React.FC<MovieCompositionProps> = ({
  scenes,
}) => {
  return (
    <Series>
      {scenes.map((scene, index) => {
        const trimStart = scene.trimStart ?? 0;
        const trimEnd = scene.trimEnd ?? 0;
        const effectiveDuration = Math.max(1, scene.durationInFrames - trimStart - trimEnd);

        return (
          <Series.Sequence key={index} durationInFrames={effectiveDuration}>
            {/* Negative from skips the trimStart frames */}
            <Sequence from={-trimStart}>
              <DynamicCode
                code={scene.code}
                durationInFrames={scene.durationInFrames}
                fps={scene.fps}
              />
            </Sequence>
          </Series.Sequence>
        );
      })}
    </Series>
  );
};
