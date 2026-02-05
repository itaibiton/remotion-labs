"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { PreviewPlayer } from "@/components/preview/preview-player";
import { CreationDetailPanel } from "@/components/creation/creation-detail-panel";
import { CreationEditBar } from "@/components/creation/creation-edit-bar";
import { VariationStack } from "@/components/creation/variation-stack";
import { Loader2, AlertCircle } from "lucide-react";

interface CreationModalProps {
  generationId: string;
}

export function CreationModal({ generationId }: CreationModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(true);

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
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
              />
            </div>

            {/* Content area */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Left side: Preview + Variations */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col">
                {/* Main preview - responsive container that fits all aspect ratios */}
                {/* Portrait/Square: center horizontally, fill height */}
                {/* Landscape: fill width, center vertically */}
                <div className={`flex-1 min-h-0 flex ${
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
                      code={generation.code}
                      durationInFrames={generation.durationInFrames ?? 90}
                      fps={generation.fps ?? 30}
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
                <CreationDetailPanel generation={generation} />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
