"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { PreviewPlayer } from "@/components/preview/preview-player";
import { CreationDetailPanel } from "@/components/creation/creation-detail-panel";
import { CreationEditBar } from "@/components/creation/creation-edit-bar";
import { VariationStack } from "@/components/creation/variation-stack";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface CreationDetailPageProps {
  generationId: string;
}

export function CreationDetailPage({ generationId }: CreationDetailPageProps) {
  const generation = useQuery(api.generations.get, {
    id: generationId as Id<"generations">,
  });

  // Query for variations (children of this generation)
  const variations = useQuery(api.generations.listByParent, {
    parentId: generationId as Id<"generations">,
  });

  if (generation === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (generation === null) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Generation not found</p>
        <Button asChild variant="outline">
          <Link href="/create">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Create
          </Link>
        </Button>
      </div>
    );
  }

  const isPending = generation.status === "pending";
  const isFailed = generation.status === "failed";
  const isPortrait = generation.aspectRatio === "9:16";

  return (
    <div className="flex flex-col h-full max-h-screen overflow-hidden">
      {/* Header with back button */}
      <div className="shrink-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center gap-4 px-6 py-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/create">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <h1 className="text-lg font-medium truncate flex-1">
            {generation.prompt.slice(0, 60)}
            {generation.prompt.length > 60 ? "..." : ""}
          </h1>
        </div>
      </div>

      {/* Edit bar at top */}
      <div className="shrink-0 px-6 py-3 border-b">
        <CreationEditBar
          generationId={generationId}
          initialPrompt={generation.prompt}
        />
      </div>

      {/* Main content - flex-1 with min-h-0 prevents overflow */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Preview area - overflow-hidden prevents scrollbar flash during hydration */}
        <div className="flex-1 min-h-0 overflow-hidden p-6 flex flex-col">
          {/* Main preview - responsive container that fits all aspect ratios */}
          <div className={`flex-1 min-h-0 flex overflow-hidden ${
            isPortrait
              ? "items-center justify-center"
              : "flex-col justify-center"
          }`}>
            {isPending ? (
              <div
                className="bg-muted animate-pulse flex items-center justify-center rounded-lg"
                style={
                  isPortrait
                    ? {
                        aspectRatio: "9 / 16",
                        height: "100%",
                        maxHeight: "100%",
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
                  isPortrait
                    ? {
                        aspectRatio: "9 / 16",
                        height: "100%",
                        maxHeight: "100%",
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
                  <p className="text-red-400 font-medium">Generation Failed</p>
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

        {/* Details panel */}
        <div className="w-full lg:w-80 xl:w-96 shrink-0 border-t lg:border-t-0 lg:border-l bg-muted/30 overflow-y-auto">
          <CreationDetailPanel generation={generation} />
        </div>
      </div>
    </div>
  );
}
