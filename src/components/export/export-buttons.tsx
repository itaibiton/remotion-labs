"use client";

import { useState } from "react";
import { FileCode, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateSingleFile } from "@/lib/export-single-file";
import { generateProjectZip } from "@/lib/export-project-zip";
import { downloadTextFile, downloadBlob } from "@/lib/export-utils";

interface ExportButtonsProps {
  rawCode: string;
  prompt: string;
  durationInFrames: number;
  fps: number;
}

export function ExportButtons({
  rawCode,
  prompt,
  durationInFrames,
  fps,
}: ExportButtonsProps) {
  const [isExportingFile, setIsExportingFile] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);

  const handleExportFile = async () => {
    setIsExportingFile(true);
    try {
      const content = generateSingleFile({
        rawCode,
        prompt,
        durationInFrames,
        fps,
      });
      downloadTextFile(content, "MyComposition.tsx");
      toast.success("File downloaded!");
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to export file";
      toast.error(message);
    } finally {
      setIsExportingFile(false);
    }
  };

  const handleExportZip = async () => {
    setIsExportingZip(true);
    try {
      const blob = await generateProjectZip({
        rawCode,
        prompt,
        durationInFrames,
        fps,
      });
      downloadBlob(blob, "remotionlab-export.zip");
      toast.success("Project zip downloaded!");
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to export project";
      toast.error(message);
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="flex flex-row gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportFile}
        disabled={isExportingFile}
      >
        {isExportingFile ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileCode className="h-4 w-4" />
        )}
        Export .tsx
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportZip}
        disabled={isExportingZip}
      >
        {isExportingZip ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Package className="h-4 w-4" />
        )}
        Export Project (.zip)
      </Button>
    </div>
  );
}
