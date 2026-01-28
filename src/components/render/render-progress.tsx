"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { DownloadButton } from "./download-button";

interface RenderProgressProps {
  renderJobId: Id<"renders">;
}

export function RenderProgress({ renderJobId }: RenderProgressProps) {
  // Reactive subscription - automatically updates when render state changes
  const render = useQuery(api.renders.get, { id: renderJobId });

  if (!render) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  // Complete state
  if (render.status === "complete") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium">Render complete!</span>
        </div>
        {render.outputUrl && (
          <DownloadButton url={render.outputUrl} />
        )}
        {render.outputSize && (
          <p className="text-xs text-muted-foreground">
            Size: {formatBytes(render.outputSize)}
          </p>
        )}
      </div>
    );
  }

  // Failed state
  if (render.status === "failed") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-red-600">
          <XCircle className="h-5 w-5" />
          <span className="font-medium">Render failed</span>
        </div>
        {render.error && (
          <p className="text-sm text-muted-foreground">{render.error}</p>
        )}
      </div>
    );
  }

  // Rendering state - show progress bar
  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm font-medium">Rendering...</span>
        </div>
        <span className="text-sm text-muted-foreground">{render.progress}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${render.progress}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        This usually takes 30-60 seconds
      </p>
    </div>
  );
}

// Helper to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
