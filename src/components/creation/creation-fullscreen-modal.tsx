"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import type { PlayerRef } from "@remotion/player";
import { PreviewPlayer } from "@/components/preview/preview-player";
import { VideoControls } from "@/components/preview/video-controls";
import { CreationDetailPanel } from "@/components/creation/creation-detail-panel";
import { VariationStack } from "@/components/creation/variation-stack";
import { Loader2, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import {
  ASPECT_RATIO_PRESETS,
  type AspectRatioKey,
} from "@/lib/aspect-ratios";

interface CreationFullscreenModalProps {
  generationId: string;
}

export function CreationFullscreenModal({
  generationId,
}: CreationFullscreenModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerRef>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Mutations and actions for detail panel
  const removeGeneration = useMutation(api.generations.remove);
  const saveClip = useMutation(api.clips.save);
  const generate = useAction(api.generateAnimation.generate);
  const prequelAction = useAction(api.generateAnimation.generatePrequel);
  const refineAction = useAction(api.generateAnimation.refine);

  // Local state for refinement
  const [isRefining, setIsRefining] = useState(false);
  const [refinedCode, setRefinedCode] = useState<{
    rawCode: string;
    code: string;
    durationInFrames: number;
    fps: number;
  } | null>(null);

  const generation = useQuery(api.generations.get, {
    id: generationId as Id<"generations">,
  });

  // Query for variations (children of this generation)
  const variations = useQuery(api.generations.listByParent, {
    parentId: generationId as Id<"generations">,
  });

  // Query for all user generations (for arrow key navigation)
  const allGenerations = useQuery(api.generations.list, {});

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    router.replace("/create");
  }, [router, isClosing]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  // Arrow key navigation between creations
  useEffect(() => {
    if (!allGenerations || allGenerations.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys if not focused on an input/textarea
      const activeEl = document.activeElement;
      if (
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const currentIndex = allGenerations.findIndex(
        (g) => g._id === generationId
      );
      if (currentIndex === -1) return;

      let nextIndex: number | null = null;

      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        // Go to newer (previous in the list since it's sorted desc)
        nextIndex = currentIndex - 1;
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        // Go to older (next in the list)
        nextIndex = currentIndex + 1;
      }

      if (
        nextIndex !== null &&
        nextIndex >= 0 &&
        nextIndex < allGenerations.length
      ) {
        e.preventDefault();
        const nextGen = allGenerations[nextIndex];
        if (nextGen) {
          router.replace(`/create/${nextGen._id}`);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [allGenerations, generationId, router]);

  const isPending = generation?.status === "pending";
  const isFailed = generation?.status === "failed";

  // Action handlers for detail panel
  const handleSave = useCallback(async () => {
    if (!generation?.code || !generation?.rawCode) {
      toast.error("Cannot save: generation has no code");
      return;
    }
    try {
      await saveClip({
        name: generation.prompt.slice(0, 50) || "Untitled",
        code: generation.code,
        rawCode: generation.rawCode,
        durationInFrames: generation.durationInFrames ?? 90,
        fps: generation.fps ?? 30,
      });
      toast.success("Saved to clip library!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save clip");
    }
  }, [generation, saveClip]);

  const handleDelete = useCallback(async () => {
    if (!generation) return;
    try {
      await removeGeneration({ id: generation._id });
      toast.success("Generation deleted");
      handleClose();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to delete generation"
      );
    }
  }, [generation, removeGeneration, handleClose]);

  const handleRerun = useCallback(async () => {
    if (!generation?.prompt) {
      toast.error("Cannot rerun: no prompt found");
      return;
    }
    try {
      await generate({
        prompt: generation.prompt,
        aspectRatio: generation.aspectRatio ?? "16:9",
        durationInSeconds: generation.durationInSeconds ?? 3,
        fps: generation.fps ?? 30,
      });
      toast.success("Rerun started!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rerun failed");
    }
  }, [generation, generate]);

  const handleExtendNext = useCallback(async () => {
    if (!generation?.code || !generation?.rawCode) {
      toast.error("Cannot extend: generation has no code");
      return;
    }
    try {
      const clipId = await saveClip({
        name: generation.prompt.slice(0, 50) || "Untitled",
        code: generation.code,
        rawCode: generation.rawCode,
        durationInFrames: generation.durationInFrames ?? 90,
        fps: generation.fps ?? 30,
      });
      toast.success("Saved as clip -- opening continuation...");
      handleClose();
      setTimeout(() => {
        router.push(`/create?sourceClipId=${clipId}`);
      }, 200);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to start continuation"
      );
    }
  }, [generation, saveClip, router, handleClose]);

  const handleExtendPrevious = useCallback(async () => {
    if (!generation?.code || !generation?.rawCode) {
      toast.error("Cannot extend: generation has no code");
      return;
    }
    try {
      const clipId = await saveClip({
        name: generation.prompt.slice(0, 50) || "Untitled",
        code: generation.code,
        rawCode: generation.rawCode,
        durationInFrames: generation.durationInFrames ?? 90,
        fps: generation.fps ?? 30,
      });
      await prequelAction({
        sourceClipId: clipId as Id<"clips">,
        prompt: undefined,
        aspectRatio: generation.aspectRatio ?? "16:9",
        durationInSeconds: generation.durationInSeconds ?? 3,
      });
      toast.success("Prequel generated!");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Prequel generation failed"
      );
    }
  }, [generation, saveClip, prequelAction]);

  // Refinement handler
  const handleRefine = useCallback(
    async (prompt: string) => {
      if (!generation?.rawCode) {
        toast.error("Cannot refine: no code to refine");
        return;
      }
      setIsRefining(true);
      try {
        const result = await refineAction({
          currentCode: generation.rawCode,
          refinementPrompt: prompt,
          conversationHistory: [],
        });
        setRefinedCode(result);
        toast.success("Animation refined!");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Refinement failed");
      } finally {
        setIsRefining(false);
      }
    },
    [generation, refineAction]
  );

  // Reset refinedCode when navigating to different generation
  useEffect(() => {
    setRefinedCode(null);
  }, [generationId]);

  // Get aspect ratio preset for sizing
  const aspectRatioKey = (generation?.aspectRatio ?? "16:9") as AspectRatioKey;
  const preset =
    ASPECT_RATIO_PRESETS[aspectRatioKey] ?? ASPECT_RATIO_PRESETS["16:9"];
  const isPortrait = preset.height > preset.width;
  const isSquare = preset.height === preset.width;

  // Handle backdrop click - only close if clicking the backdrop itself
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  // Don't render if we're closing or if pathname doesn't include the generation ID
  if (isClosing || !pathname?.includes(generationId)) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 md:ml-64">
      {/* Backdrop + Content wrapper */}
      <div
        className="absolute inset-0 bg-black/90 flex flex-col lg:flex-row"
        onClick={handleBackdropClick}
      >
        {/* Center video area */}
        <div
          ref={containerRef}
          className="flex-1 relative group min-h-[50vh] lg:min-h-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            className="absolute top-4 left-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Loading state */}
          {generation === undefined && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
          )}

          {/* Not found state */}
          {generation === null && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-white/50 mx-auto mb-4" />
                <p className="text-white/70">Generation not found</p>
              </div>
            </div>
          )}

          {/* Main content */}
          {generation && (
            <>
              {/* Centered video */}
              <div className="absolute inset-0 flex items-center justify-center p-4 lg:p-8 pointer-events-none">
                {isPending ? (
                  <div
                    className="bg-white/5 animate-pulse flex items-center justify-center rounded-lg pointer-events-auto"
                    style={
                      isPortrait || isSquare
                        ? {
                            aspectRatio: `${preset.width} / ${preset.height}`,
                            height: "80%",
                            maxHeight: "80vh",
                            width: "auto",
                          }
                        : {
                            aspectRatio: `${preset.width} / ${preset.height}`,
                            width: "100%",
                            maxWidth: "90%",
                            height: "auto",
                          }
                    }
                  >
                    <Loader2 className="h-8 w-8 animate-spin text-white/50" />
                  </div>
                ) : isFailed ? (
                  <div
                    className="bg-red-950/20 flex items-center justify-center rounded-lg border border-red-500/20 pointer-events-auto"
                    style={
                      isPortrait || isSquare
                        ? {
                            aspectRatio: `${preset.width} / ${preset.height}`,
                            height: "80%",
                            maxHeight: "80vh",
                            width: "auto",
                          }
                        : {
                            aspectRatio: `${preset.width} / ${preset.height}`,
                            width: "100%",
                            maxWidth: "90%",
                            height: "auto",
                          }
                    }
                  >
                    <div className="text-center">
                      <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                      <p className="text-red-400 font-medium">
                        Generation Failed
                      </p>
                      {generation.errorMessage && (
                        <p className="text-red-400/70 text-sm mt-1 max-w-md">
                          {generation.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                ) : generation.code ? (
                  <div className="w-full h-full flex items-center justify-center pointer-events-auto">
                    <PreviewPlayer
                      ref={playerRef}
                      code={refinedCode?.code ?? generation.code}
                      durationInFrames={
                        refinedCode?.durationInFrames ??
                        generation.durationInFrames ??
                        90
                      }
                      fps={refinedCode?.fps ?? generation.fps ?? 30}
                      aspectRatio={generation.aspectRatio ?? "16:9"}
                      showControls={false}
                      constrained
                    />
                  </div>
                ) : null}
              </div>

              {/* Bottom controls - hover visible */}
              {generation.code && !isPending && !isFailed && (
                <VideoControls
                  playerRef={playerRef}
                  durationInFrames={
                    refinedCode?.durationInFrames ??
                    generation.durationInFrames ??
                    90
                  }
                  fps={refinedCode?.fps ?? generation.fps ?? 30}
                  containerRef={containerRef}
                />
              )}
            </>
          )}
        </div>

        {/* Right panel */}
        <div
          className="w-full lg:w-80 max-h-[50vh] lg:max-h-none bg-background border-t lg:border-t-0 lg:border-l overflow-y-auto shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {generation && (
            <>
              <CreationDetailPanel
                generation={generation}
                onSave={handleSave}
                onDelete={handleDelete}
                onRerun={handleRerun}
                onExtendNext={handleExtendNext}
                onExtendPrevious={handleExtendPrevious}
                showRefinement={true}
                onRefine={handleRefine}
                isRefining={isRefining}
              />

              {/* Variation Stack */}
              {variations && variations.length > 0 && (
                <div className="px-4 pb-4 border-t pt-4">
                  <h3 className="text-sm font-medium mb-3">Variations</h3>
                  <VariationStack
                    variations={variations}
                    parentId={generationId}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
