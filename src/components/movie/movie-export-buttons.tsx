"use client";

import { useState } from "react";
import { Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateMovieProjectZip } from "@/lib/export-movie-zip";
import { downloadBlob } from "@/lib/export-utils";

interface MovieExportButtonsProps {
  movieName: string;
  scenes: Array<{
    rawCode: string;
    name: string;
    durationInFrames: number;
    fps: number;
  }>;
  totalDurationInFrames: number;
  fps: number;
  disabled?: boolean;
}

export function MovieExportButtons({
  movieName,
  scenes,
  totalDurationInFrames,
  fps,
  disabled = false,
}: MovieExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await generateMovieProjectZip({
        movieName,
        scenes,
        totalDurationInFrames,
        fps,
      });

      const safeName = movieName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      downloadBlob(blob, `${safeName || "movie"}-remotion-project.zip`);
      toast.success("Movie project zip downloaded!");
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to export movie project";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || isExporting}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Package className="h-4 w-4" />
      )}
      Export Remotion Project
    </Button>
  );
}
