"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { PreviewPlayer } from "@/components/preview/preview-player";
import { CreationDetailPanel } from "@/components/creation/creation-detail-panel";
import { CreationEditBar } from "@/components/creation/creation-edit-bar";
import { VariationStack } from "@/components/creation/variation-stack";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface CreationModalProps {
  generationId: string;
}

export function CreationModal({ generationId }: CreationModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(true);

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
    // Close the dialog first, then navigate
    // This ensures proper animation and state cleanup
    setIsOpen(false);
  }, []);

  // Navigate after dialog closes
  useEffect(() => {
    if (!isOpen) {
      // Small delay to allow close animation
      const timer = setTimeout(() => {
        router.push("/create");
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, router]);

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

      if (nextIndex !== null && nextIndex >= 0 && nextIndex < allGenerations.length) {
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
      toast.error(e instanceof Error ? e.message : "Failed to delete generation");
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
      // Use setTimeout to ensure modal closes before navigation
      setTimeout(() => {
        router.push(`/create?sourceClipId=${clipId}`);
      }, 200);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start continuation");
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
      toast.error(e instanceof Error ? e.message : "Prequel generation failed");
    }
  }, [generation, saveClip, prequelAction]);

  // Refinement handler for edit bar
  const handleRefine = useCallback(async (prompt: string) => {
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
  }, [generation, refineAction]);

  // Reset refinedCode when navigating to different generation
  useEffect(() => {
    setRefinedCode(null);
  }, [generationId]);

  // Instantly unmount when closing to prevent any flash
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        ref={modalRef}
        className="!max-w-[95vw] !w-[1200px] max-h-[90vh] h-[85vh] p-0 gap-0 overflow-hidden"
        showCloseButton={true}
      >
        <VisuallyHidden>
          <DialogTitle>
            {generation?.prompt?.slice(0, 60) ?? "Loading..."}
          </DialogTitle>
        </VisuallyHidden>

        {/* Loading state */}
        {generation === undefined && (
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Not found state */}
        {generation === null && (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Generation not found</p>
            </div>
          </div>
        )}

        {/* Main content */}
        {generation && (
          <div className="flex flex-col h-full">
            {/* Edit bar at top */}
            <div className="px-6 py-3 border-b shrink-0">
              <CreationEditBar
                generationId={generationId}
                initialPrompt={generation.prompt}
                onRefine={handleRefine}
                isRefining={isRefining}
              />
            </div>

            {/* Content area */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Left side: Preview + Variations */}
              <div className="flex-1 min-h-0 overflow-hidden p-6 flex flex-col">
                {/* Main preview - responsive container that fits all aspect ratios */}
                <div className={`flex-1 min-h-0 flex overflow-hidden ${
                  generation.aspectRatio === "9:16" || generation.aspectRatio === "1:1"
                    ? "items-center justify-center"
                    : "flex-col justify-center"
                }`}>
                  {isPending ? (
                    <div
                      className="bg-muted animate-pulse flex items-center justify-center rounded-lg"
                      style={
                        // Portrait (9:16) and Square (1:1): height is constraint, width auto
                        // Landscape (16:9): width 100%, height auto from aspect ratio
                        generation.aspectRatio === "9:16" || generation.aspectRatio === "1:1"
                          ? {
                              aspectRatio: (generation.aspectRatio ?? "1:1").replace(":", " / "),
                              height: "100%",
                              width: "auto",
                            }
                          : {
                              aspectRatio: (generation.aspectRatio ?? "16:9").replace(
                                ":",
                                " / "
                              ),
                              width: "100%",
                              height: "auto",
                            }
                      }
                    >
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : isFailed ? (
                    <div
                      className="bg-red-950/20 flex items-center justify-center rounded-lg border border-red-500/20"
                      style={
                        generation.aspectRatio === "9:16" || generation.aspectRatio === "1:1"
                          ? {
                              aspectRatio: (generation.aspectRatio ?? "1:1").replace(":", " / "),
                              height: "100%",
                              width: "auto",
                            }
                          : {
                              aspectRatio: (generation.aspectRatio ?? "16:9").replace(
                                ":",
                                " / "
                              ),
                              width: "100%",
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
                    <PreviewPlayer
                      code={refinedCode?.code ?? generation.code}
                      durationInFrames={refinedCode?.durationInFrames ?? generation.durationInFrames ?? 90}
                      fps={refinedCode?.fps ?? generation.fps ?? 30}
                      aspectRatio={generation.aspectRatio ?? "16:9"}
                      constrained
                    />
                  ) : null}
                </div>

                {/* Variation Stack */}
                {variations && variations.length > 0 && (
                  <div className="mt-6 shrink-0">
                    <h3 className="text-sm font-medium mb-3">Variations</h3>
                    <VariationStack
                      variations={variations}
                      parentId={generationId}
                    />
                  </div>
                )}
              </div>

              {/* Right side: Details panel */}
              <div className="w-72 border-l bg-muted/30 overflow-y-auto shrink-0">
                <CreationDetailPanel
                  generation={generation}
                  onSave={handleSave}
                  onDelete={handleDelete}
                  onRerun={handleRerun}
                  onExtendNext={handleExtendNext}
                  onExtendPrevious={handleExtendPrevious}
                />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
