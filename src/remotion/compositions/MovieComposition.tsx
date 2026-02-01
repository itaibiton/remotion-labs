"use client";

import React from "react";
import { Series } from "remotion";
import { DynamicCode } from "./DynamicCode";

export interface MovieScene {
  code: string;
  durationInFrames: number;
  fps: number;
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
 * Used by Phase 11 for movie preview (Player) and rendering (Lambda).
 */
export const MovieComposition: React.FC<MovieCompositionProps> = ({
  scenes,
}) => {
  return (
    <Series>
      {scenes.map((scene, index) => (
        <Series.Sequence key={index} durationInFrames={scene.durationInFrames}>
          <DynamicCode
            code={scene.code}
            durationInFrames={scene.durationInFrames}
            fps={scene.fps}
          />
        </Series.Sequence>
      ))}
    </Series>
  );
};
